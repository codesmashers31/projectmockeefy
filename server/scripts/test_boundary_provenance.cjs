const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

async function runBoundaryAudit() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const { getAuthoritativeCaptureEvidence } = await import('../controllers/paymentController.js');

  console.log('================================================================');
  console.log('       GATEWAY CAPTURE TIMESTAMP PROVENANCE BOUNDARY AUDIT       ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} - ${details}`);
      failed++;
    }
  }

  // Universal Cutoff: 4:35:00.000 PM IST (11:05:00.000Z)
  const cutoff = new Date('2026-11-12T11:05:00.000Z');

  // --------------------------------------------------------------------------
  // TEST 1: Gateway captured response received at 4:34:59 PM (1s before cutoff)
  // --------------------------------------------------------------------------
  {
    const gatewayReceivedAt = new Date('2026-11-12T11:04:59.000Z'); // 4:34:59 PM
    const payment = {
      id: 'pay_b1',
      order_id: 'order_b1',
      status: 'captured',
      captured: true,
      captured_at: undefined, // Omitted by UPI
      currency: 'INR'
    };

    const evidence = getAuthoritativeCaptureEvidence({
      payment,
      bookingCutoff: cutoff,
      gatewayCaptureVerificationReceivedAt: gatewayReceivedAt
    });

    assert(
      evidence.hasAuthoritativeTimestamp === true &&
      evidence.awaitingReconciliation === false &&
      evidence.timestampSource === 'VERIFIED_BEFORE_CUTOFF' &&
      evidence.capturedAt.getTime() === gatewayReceivedAt.getTime() &&
      evidence.capturedAt.getTime() < cutoff.getTime(),
      'Test 1: Gateway captured response received at 4:34:59 PM is eligible for booking'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 2: Gateway captured response received at exactly 4:35:00 PM (cutoff)
  // --------------------------------------------------------------------------
  {
    const gatewayReceivedAt = new Date('2026-11-12T11:05:00.000Z'); // 4:35:00.000 PM
    const payment = {
      id: 'pay_b2',
      order_id: 'order_b2',
      status: 'captured',
      captured: true,
      captured_at: undefined,
      currency: 'INR'
    };

    const evidence = getAuthoritativeCaptureEvidence({
      payment,
      bookingCutoff: cutoff,
      gatewayCaptureVerificationReceivedAt: gatewayReceivedAt
    });

    assert(
      evidence.awaitingReconciliation === true &&
      evidence.timestampSource === 'RECONCILIATION_PENDING' &&
      evidence.hasAuthoritativeTimestamp === false,
      'Test 2: Gateway captured response received at exactly 4:35:00 PM is NOT eligible without earlier capture evidence'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 3: Gateway captured response received at 4:35:01 PM (1s after cutoff)
  // --------------------------------------------------------------------------
  {
    const gatewayReceivedAt = new Date('2026-11-12T11:05:01.000Z'); // 4:35:01 PM
    const payment = {
      id: 'pay_b3',
      order_id: 'order_b3',
      status: 'captured',
      captured: true,
      captured_at: undefined,
      currency: 'INR'
    };

    const evidence = getAuthoritativeCaptureEvidence({
      payment,
      bookingCutoff: cutoff,
      gatewayCaptureVerificationReceivedAt: gatewayReceivedAt
    });

    assert(
      evidence.awaitingReconciliation === true &&
      evidence.hasAuthoritativeTimestamp === false,
      'Test 3: Gateway captured response received at 4:35:01 PM is NOT eligible without earlier capture evidence'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 4: Browser callback arrives before cutoff (4:34:50 PM),
  // but Gateway API response arrives after cutoff (4:35:02 PM)
  // MUST NOT assume timely capture!
  // --------------------------------------------------------------------------
  {
    // Client called at 4:34:50 PM, but Razorpay network delay caused response to return at 4:35:02 PM
    const gatewayReceivedAt = new Date('2026-11-12T11:05:02.000Z'); // 4:35:02 PM
    const payment = {
      id: 'pay_b4',
      order_id: 'order_b4',
      status: 'captured',
      captured: true,
      captured_at: undefined, // No earlier capture proof
      currency: 'INR'
    };

    const evidence = getAuthoritativeCaptureEvidence({
      payment,
      bookingCutoff: cutoff,
      gatewayCaptureVerificationReceivedAt: gatewayReceivedAt
    });

    assert(
      evidence.awaitingReconciliation === true &&
      evidence.hasAuthoritativeTimestamp === false &&
      evidence.timestampSource !== 'VERIFIED_BEFORE_CUTOFF',
      'Test 4: Callback before cutoff but Gateway response after cutoff does NOT assume timely capture'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 5: Gateway response arrives before cutoff (4:34:50 PM),
  // but Webhook arrives after cutoff (4:36:10 PM)
  // MUST be eligible!
  // --------------------------------------------------------------------------
  {
    const gatewayReceivedAt = new Date('2026-11-12T11:04:50.000Z'); // 4:34:50 PM (< cutoff)
    const webhookTime = new Date('2026-11-12T11:06:10.000Z'); // 4:36:10 PM (> cutoff)

    const payment = {
      id: 'pay_b5',
      order_id: 'order_b5',
      status: 'captured',
      captured: true,
      captured_at: undefined,
      currency: 'INR'
    };

    const webhookPayload = {
      event: 'payment.captured',
      created_at: Math.floor(webhookTime.getTime() / 1000),
      payload: { payment: { entity: payment } }
    };

    const evidence = getAuthoritativeCaptureEvidence({
      payment,
      webhookPayload,
      bookingCutoff: cutoff,
      gatewayCaptureVerificationReceivedAt: gatewayReceivedAt
    });

    assert(
      evidence.hasAuthoritativeTimestamp === true &&
      evidence.awaitingReconciliation === false &&
      evidence.capturedAt.getTime() === gatewayReceivedAt.getTime() &&
      evidence.capturedAt.getTime() < cutoff.getTime(),
      'Test 5: Gateway response before cutoff with delayed webhook after cutoff is eligible for booking'
    );
  }

  console.log('\n================================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runBoundaryAudit().catch(err => {
  console.error('Fatal in boundary audit:', err);
  process.exit(1);
});
