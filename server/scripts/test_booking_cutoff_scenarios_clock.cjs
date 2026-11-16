const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

async function runClockScenarios() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

  const { getAuthoritativeCaptureEvidence } = await import('../controllers/paymentController.js');
  const PaymentRecord = (await import('../models/PaymentRecord.js')).default;
  const Session = (await import('../models/Session.js')).default;
  const User = (await import('../models/User.js')).default;

  console.log('================================================================');
  console.log('  TESTING CONTROLLABLE CLOCK BOOKING & RECONCILIATION SCENARIOS ');
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

  // Base slot times: 4:15 PM to 4:45 PM IST (10:45Z to 11:15Z)
  const slotStart = new Date('2026-11-12T10:45:00.000Z');
  const slotEnd = new Date('2026-11-12T11:15:00.000Z');
  const cutoff = new Date('2026-11-12T11:05:00.000Z'); // 4:35 PM IST

  // -------------------------------------------------------------------------
  // SCENARIO 1: Captured at 4:22 PM (before cutoff), Webhook received at 4:36 PM (after cutoff)
  // -------------------------------------------------------------------------
  {
    const captureTime = new Date('2026-11-12T10:52:00.000Z'); // 4:22 PM IST
    const webhookReceiptTime = new Date('2026-11-12T11:06:00.000Z'); // 4:36 PM IST

    // Payment entity from Razorpay has captured_at = 4:22 PM
    const payment = {
      id: 'pay_test_s1',
      status: 'captured',
      captured: true,
      captured_at: Math.floor(captureTime.getTime() / 1000),
      created_at: Math.floor(captureTime.getTime() / 1000)
    };

    const webhookPayload = {
      event: 'payment.captured',
      created_at: Math.floor(webhookReceiptTime.getTime() / 1000),
      payload: { payment: { entity: payment } }
    };

    const evidence = getAuthoritativeCaptureEvidence({
      payment,
      webhookPayload,
      bookingCutoff: cutoff
    });

    const isEligibleForBooking = evidence.capturedAt && (evidence.capturedAt.getTime() < cutoff.getTime());

    assert(
      isEligibleForBooking === true && evidence.timestampSource === 'RAZORPAY_PAYMENT_CAPTURED_AT',
      'Scenario 1: Payment captured at 4:22 PM with webhook at 4:36 PM is eligible for booking confirmation'
    );
  }

  // -------------------------------------------------------------------------
  // SCENARIO 1B: UPI payment without captured_at verified before cutoff (4:22 PM)
  // -------------------------------------------------------------------------
  {
    const serverReceiptTime = new Date('2026-11-12T10:52:56.000Z'); // 4:22:56 PM IST (< 4:35 PM)
    const payment = {
      id: 'pay_test_s1b',
      status: 'captured',
      captured: true,
      captured_at: undefined, // UPI entity omits captured_at
      created_at: Math.floor(new Date('2026-11-12T10:52:41.000Z').getTime() / 1000)
    };

    const evidence = getAuthoritativeCaptureEvidence({
      payment,
      bookingCutoff: cutoff,
      gatewayCaptureVerificationReceivedAt: serverReceiptTime
    });

    assert(
      evidence.hasAuthoritativeTimestamp === true &&
      evidence.capturedAt.getTime() < cutoff.getTime() &&
      evidence.timestampSource === 'VERIFIED_BEFORE_CUTOFF',
      'Scenario 1B: UPI payment verified as captured before cutoff is authoritatively proven timely (VERIFIED_BEFORE_CUTOFF)'
    );
  }

  // -------------------------------------------------------------------------
  // SCENARIO 2: Payment captured at exactly 4:35 PM (exact cutoff)
  // -------------------------------------------------------------------------
  {
    const captureTime = new Date('2026-11-12T11:05:00.000Z'); // 4:35:00 PM IST
    const serverReceiptTime = captureTime;
    const payment = {
      id: 'pay_test_s2',
      status: 'captured',
      captured: true,
      captured_at: Math.floor(captureTime.getTime() / 1000),
      created_at: Math.floor(captureTime.getTime() / 1000)
    };

    const evidence = getAuthoritativeCaptureEvidence({
      payment,
      bookingCutoff: cutoff,
      gatewayCaptureVerificationReceivedAt: serverReceiptTime
    });

    const isEligibleForBooking = evidence.capturedAt && (evidence.capturedAt.getTime() < cutoff.getTime());

    assert(
      isEligibleForBooking === false,
      'Scenario 2: Payment captured at exactly 4:35 PM is ineligible for session booking (strictly < cutoff rule)'
    );
  }

  // -------------------------------------------------------------------------
  // SCENARIO 3: Payment captured at 4:35:05 PM (5 seconds after cutoff)
  // -------------------------------------------------------------------------
  {
    const captureTime = new Date('2026-11-12T11:05:05.000Z'); // 4:35:05 PM IST
    const serverReceiptTime = captureTime;
    const payment = {
      id: 'pay_test_s3',
      status: 'captured',
      captured: true,
      captured_at: Math.floor(captureTime.getTime() / 1000),
      created_at: Math.floor(captureTime.getTime() / 1000)
    };

    const evidence = getAuthoritativeCaptureEvidence({
      payment,
      bookingCutoff: cutoff,
      gatewayCaptureVerificationReceivedAt: serverReceiptTime
    });

    const isEligibleForBooking = evidence.capturedAt && (evidence.capturedAt.getTime() < cutoff.getTime());

    assert(
      isEligibleForBooking === false && evidence.capturedAt.getTime() >= cutoff.getTime(),
      'Scenario 3: Payment captured at 4:35:05 PM (5s late) is ineligible for booking; safely routes to wallet credit'
    );
  }

  // -------------------------------------------------------------------------
  // SCENARIO 4: Verification of actual affected payment pay_TzEnLHLGU1RlZa in DB
  // -------------------------------------------------------------------------
  {
    const pRecord = await PaymentRecord.findOne({ paymentId: 'pay_TzEnLHLGU1RlZa' });
    console.log('pRecord sessionId is:', pRecord?.sessionId);
    const session = await Session.findOne({ sessionId: pRecord?.sessionId });
    console.log('session found is:', session ? session.sessionId : 'null');

    assert(
      pRecord && pRecord.status === 'verified' && pRecord.walletCredited === false && Boolean(pRecord.sessionId),
      'Scenario 4: Payment pay_TzEnLHLGU1RlZa in MongoDB is marked verified with confirmed sessionId'
    );

    assert(
      session && session.status === 'confirmed' && session.sessionId === pRecord.sessionId,
      `Scenario 4B: Session ${pRecord.sessionId} exists with status confirmed in MongoDB`
    );
  }

  console.log('\n================================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runClockScenarios().catch(err => {
  console.error('Test runner exception:', err);
  process.exit(1);
});
