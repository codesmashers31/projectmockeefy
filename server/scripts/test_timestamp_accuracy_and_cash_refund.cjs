/**
 * MOCKEEFY TIMESTAMP ACCURACY, WEBHOOK SECURITY & CASH REFUND TEST SUITE
 * 
 * Verifies all requirements from prompt:
 * 1. Capture before cutoff but webhook event created after cutoff -> booking confirmed
 * 2. Capture after cutoff and delayed webhook -> wallet credit, no booking
 * 3. Webhook timestamp alone cannot determine exact capture time -> preserved in awaiting_reconciliation
 * 4. Missing webhook secret -> fails closed (rejects webhook processing)
 * 5. Missing raw body -> fails closed (rejects without JSON.stringify fallback)
 * 6. Invalid signature -> rejected (HTTP 400)
 * 7. Modified webhook payload -> signature mismatch rejected (HTTP 400)
 * 8. Razorpay refund succeeds but application response times out -> reconciles without duplicate refund or premature wallet credit
 * 9. Razorpay refund definitively fails and wallet restoration occurs once
 * 10. Refund remains pending and no duplicate refund is created
 * 11. Refund cannot exceed originating payment remaining refundable amount
 * 12. Previously refunded amounts are accounted for
 * 13. Refund cannot be issued twice for the same wallet credit
 * 14. Wallet funds already consumed cannot be refunded again
 * 15. Partial refunds are handled correctly
 */

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const assert = require('assert');
const crypto = require('crypto');

dotenv.config({ path: path.join(__dirname, '../.env') });

let passedTests = 0;
let totalTests = 0;

function it(name, fn) {
  totalTests++;
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passedTests++;
      console.log(`  ✅ [PASS] ${name}`);
    })
    .catch((err) => {
      console.error(`  ❌ [FAIL] ${name}`);
      console.error(`     Error: ${err.message}`);
    });
}

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    },
    setHeader(key, val) {
      this.headers[key] = val;
    }
  };
  return res;
}

async function runSuite() {
  console.log('\n========================================================================');
  console.log('🚀 RUNNING MOCKEEFY FINAL WEBHOOK TIMESTAMP & REFUND SECURITY TEST SUITE');
  console.log('========================================================================\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB replica set successfully.\n');

  const Wallet = (await import('../models/Wallet.js')).default;
  const WalletTransaction = (await import('../models/WalletTransaction.js')).default;
  const Session = (await import('../models/Session.js')).default;
  const PaymentRecord = (await import('../models/PaymentRecord.js')).default;
  const WebhookLog = (await import('../models/WebhookLog.js')).default;
  const User = (await import('../models/User.js')).default;
  const ExpertDetails = (await import('../models/expertModel.js')).default;
  const { creditWallet, debitWallet } = await import('../services/walletService.js');
  const { verifyPayment } = await import('../controllers/paymentController.js');
  const { razorpayWebhook } = await import('../controllers/webhookController.js');
  const { executeRefund, setRazorpayClient } = await import('../services/refundService.js');
  const { requestCashRefund } = await import('../controllers/walletController.js');

  const secret = process.env.RAZORPAY_KEY_SECRET || 'test_secret_mock';
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret_strict';
  process.env.RAZORPAY_KEY_SECRET = secret;
  process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;

  function generateValidSignature(orderId, paymentId) {
    return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  }

  function generateWebhookSignature(buffer, customSecret = webhookSecret) {
    return crypto.createHmac('sha256', customSecret).update(buffer).digest('hex');
  }

  // Setup test users
  let testExpert = await User.findOne({ email: 'audit.expert@mockeefy.com' });
  if (!testExpert) {
    testExpert = await User.create({
      name: 'Audit Expert',
      email: 'audit.expert@mockeefy.com',
      password: 'password123',
      userType: 'expert',
      role: 'expert'
    });
  }

  let expertDoc = await ExpertDetails.findOne({ userId: testExpert._id });
  if (!expertDoc) {
    expertDoc = await ExpertDetails.create({
      userId: testExpert._id,
      personalInformation: { userName: 'Audit Expert', email: testExpert.email, category: 'Engineering' },
      professionalDetails: { title: 'Lead Architect', level: 'Elite Mentor' },
      availability: {
        sessionDuration: 30,
        allowedDurations: [30, 60],
        weekly: { friday: [{ from: '00:00', to: '23:59' }] }
      },
      status: 'Active'
    });
  } else {
    expertDoc.status = 'Active';
    expertDoc.availability = {
      sessionDuration: 30,
      allowedDurations: [30, 60],
      weekly: { friday: [{ from: '00:00', to: '23:59' }] }
    };
    await expertDoc.save();
  }

  let testCandidate = await User.findOne({ email: 'audit.candidate@mockeefy.com' });
  if (!testCandidate) {
    testCandidate = await User.create({
      name: 'Audit Candidate',
      email: 'audit.candidate@mockeefy.com',
      password: 'password123',
      userType: 'candidate',
      role: 'candidate'
    });
  }

  const allTestPaymentIds = [
    'pay_audit_001', 'pay_audit_002', 'pay_audit_003', 'pay_audit_004', 'pay_audit_005',
    'pay_timeout_008', 'pay_fail_009', 'pay_pend_010', 'pay_refund_limit_011',
    'pay_prior_ref_012', 'pay_twice_ref_013', 'pay_consumed_014', 'pay_partial_015'
  ];

  await Session.deleteMany({ expertId: expertDoc._id });
  await Wallet.deleteMany({ userId: testCandidate._id });
  await WalletTransaction.deleteMany({ $or: [{ userId: testCandidate._id }, { paymentId: { $in: allTestPaymentIds } }] });
  await PaymentRecord.deleteMany({ $or: [{ userId: testCandidate._id }, { paymentId: { $in: allTestPaymentIds } }] });
  await WebhookLog.deleteMany({ razorpayEventId: { $regex: /^evt_/ } });

  // Slot: 1:50 PM to 2:20 PM -> Cutoff: 2:10:00 PM (14:10:00)
  const slotStart = new Date('2026-11-20T13:50:00.000Z');
  const slotEnd = new Date('2026-11-20T14:20:00.000Z');

  let mockPaymentsDb = {};
  const mockRazorpay = {
    payments: {
      fetch: async (id) => {
        if (mockPaymentsDb[id]) return mockPaymentsDb[id];
        throw new Error(`Mock Payment ${id} not found`);
      },
      refund: async (id, opts) => {
        const p = mockPaymentsDb[id];
        if (!p) throw new Error(`Payment ${id} not found`);
        if (p.mockRefundError) {
          throw p.mockRefundError;
        }
        const prevRefunded = p?.amount_refunded || 0;
        p.amount_refunded = prevRefunded + opts.amount;
        const refObj = {
          id: `rfnd_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          entity: 'refund',
          amount: opts.amount,
          status: p.mockRefundStatus || 'processed'
        };
        if (!p.refunds) p.refunds = { items: [] };
        p.refunds.items.push(refObj);
        return refObj;
      }
    }
  };
  setRazorpayClient(mockRazorpay);

  console.log('--- PART 1: WEBHOOK CAPTURE TIMING ACCURACY ---');

  await it('1. Capture before cutoff but webhook event created after cutoff -> booking confirmed', async () => {
    await Session.deleteMany({ candidateId: testCandidate._id });
    const payId = 'pay_audit_001';
    const ordId = 'order_audit_001';

    // Actual capture was at 2:09:50 PM (before cutoff 2:10:00 PM)
    const actualCaptureEpoch = Math.floor(new Date('2026-11-20T14:09:50.000Z').getTime() / 1000);
    // Webhook event was dispatched late at 2:10:05 PM (after cutoff)
    const webhookEventEpoch = Math.floor(new Date('2026-11-20T14:10:05.000Z').getTime() / 1000);

    mockPaymentsDb[payId] = {
      id: payId,
      amount: 50000,
      status: 'captured',
      captured: true,
      captured_at: actualCaptureEpoch, // Authoritative payment entity capture timestamp
      created_at: actualCaptureEpoch - 120,
      order_id: ordId
    };

    const webhookPayload = {
      id: `evt_late_event_${Date.now()}`,
      event: 'payment.captured',
      created_at: webhookEventEpoch, // Event created after cutoff
      payload: {
        payment: {
          entity: {
            id: payId,
            amount: 50000,
            currency: 'INR',
            order_id: ordId,
            captured_at: actualCaptureEpoch // Entity inside payload has true capture time
          }
        }
      }
    };

    const req = {
      body: {
        razorpay_order_id: ordId,
        razorpay_payment_id: payId,
        razorpay_signature: generateValidSignature(ordId, payId),
        webhookPayload,
        bookingDetails: {
          expertId: expertDoc._id,
          candidateId: testCandidate._id,
          startTime: slotStart,
          endTime: slotEnd,
          duration: 30,
          price: 500
        }
      }
    };
    const res = createMockRes();
    await verifyPayment(req, res);

    assert.strictEqual(res.statusCode, 200, 'Must confirm booking HTTP 200');
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.sessionId);
    assert.strictEqual(res.data.walletCredited, undefined, 'Must NOT convert to wallet credit');

    const record = await PaymentRecord.findOne({ paymentId: payId });
    assert.strictEqual(record.status, 'verified');
    assert.strictEqual(record.timestampSource, 'RAZORPAY_PAYMENT_CAPTURED_AT');

    await Session.deleteMany({ sessionId: res.data.sessionId });
  });

  await it('2. Capture after cutoff and delayed webhook -> wallet credit, no booking', async () => {
    await Session.deleteMany({ candidateId: testCandidate._id });
    const payId = 'pay_audit_002';
    const ordId = 'order_audit_002';

    // Actual capture was at 2:10:05 PM (after cutoff 2:10:00 PM)
    const actualCaptureEpoch = Math.floor(new Date('2026-11-20T14:10:05.000Z').getTime() / 1000);
    const webhookEventEpoch = Math.floor(new Date('2026-11-20T14:10:20.000Z').getTime() / 1000);

    mockPaymentsDb[payId] = {
      id: payId,
      amount: 50000,
      status: 'captured',
      captured: true,
      captured_at: actualCaptureEpoch,
      created_at: actualCaptureEpoch - 120,
      order_id: ordId
    };

    const req = {
      body: {
        razorpay_order_id: ordId,
        razorpay_payment_id: payId,
        razorpay_signature: generateValidSignature(ordId, payId),
        bookingDetails: {
          expertId: expertDoc._id,
          candidateId: testCandidate._id,
          startTime: slotStart,
          endTime: slotEnd,
          duration: 30,
          price: 500
        }
      }
    };
    const res = createMockRes();
    await verifyPayment(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.walletCredited, true);
    assert.strictEqual(res.data.cutoffExpired, true);

    const sessionCount = await Session.countDocuments({ candidateId: testCandidate._id });
    assert.strictEqual(sessionCount, 0, 'No session must be confirmed');
  });

  await it('3. Webhook timestamp alone cannot determine exact capture time -> preserved in awaiting_reconciliation', async () => {
    await Session.deleteMany({ candidateId: testCandidate._id });
    const payId = 'pay_audit_003';
    const ordId = 'order_audit_003';

    // Payment created before cutoff, but captured_at is unavailable
    const createdAtEpoch = Math.floor(new Date('2026-11-20T14:08:00.000Z').getTime() / 1000);
    // Webhook created after cutoff (2:10:05 PM)
    const webhookEventEpoch = Math.floor(new Date('2026-11-20T14:10:05.000Z').getTime() / 1000);

    mockPaymentsDb[payId] = {
      id: payId,
      amount: 50000,
      status: 'captured',
      captured: true,
      captured_at: null, // UNAVAILABLE
      created_at: createdAtEpoch,
      order_id: ordId
    };

    const webhookPayload = {
      id: `evt_ambiguous_${Date.now()}`,
      event: 'payment.captured',
      created_at: webhookEventEpoch,
      payload: {
        payment: {
          entity: {
            id: payId,
            amount: 50000,
            currency: 'INR',
            order_id: ordId,
            captured_at: null // UNAVAILABLE in webhook entity
          }
        }
      }
    };

    const req = {
      body: {
        razorpay_order_id: ordId,
        razorpay_payment_id: payId,
        razorpay_signature: generateValidSignature(ordId, payId),
        webhookPayload,
        bookingDetails: {
          expertId: expertDoc._id,
          candidateId: testCandidate._id,
          startTime: slotStart,
          endTime: slotEnd,
          duration: 30,
          price: 500
        }
      }
    };
    const res = createMockRes();
    await verifyPayment(req, res);

    // Because event created_at >= cutoff and captured_at is unavailable, timing is AMBIGUOUS
    // Must return HTTP 202 and preserve in awaiting_reconciliation without guessing!
    assert.strictEqual(res.statusCode, 202, 'Must return HTTP 202 awaiting reconciliation');
    assert.strictEqual(res.data.awaitingReconciliation, true);

    const sessionCount = await Session.countDocuments({ candidateId: testCandidate._id });
    assert.strictEqual(sessionCount, 0, 'Must NOT guess and confirm booking');

    const record = await PaymentRecord.findOne({ paymentId: payId });
    assert.strictEqual(record.status, 'awaiting_reconciliation');
    assert.strictEqual(record.timestampSource, 'RECONCILIATION_PENDING');
  });

  console.log('\n--- PART 2: WEBHOOK SECURITY (FAIL-CLOSED) ---');

  await it('4. Missing webhook secret -> fails closed (rejects webhook processing)', async () => {
    const origSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    delete process.env.RAZORPAY_WEBHOOK_SECRET;

    const dummyBody = { event: 'payment.captured', id: 'evt_no_sec' };
    const rawBuffer = Buffer.from(JSON.stringify(dummyBody));
    const req = {
      headers: { 'x-razorpay-signature': 'any_sig' },
      rawBody: rawBuffer,
      body: dummyBody
    };
    const res = createMockRes();
    await razorpayWebhook(req, res);

    assert.strictEqual(res.statusCode, 500, 'Must fail closed with HTTP 500 when secret missing');
    assert.ok(res.data.message.includes('Webhook secret not configured'));

    process.env.RAZORPAY_WEBHOOK_SECRET = origSecret;
  });

  await it('5. Missing raw body -> fails closed (rejects without JSON.stringify fallback)', async () => {
    const dummyBody = { event: 'payment.captured', id: 'evt_no_raw' };
    const req = {
      headers: { 'x-razorpay-signature': 'any_sig' },
      rawBody: null, // MISSING BUFFER
      body: dummyBody
    };
    const res = createMockRes();
    await razorpayWebhook(req, res);

    assert.strictEqual(res.statusCode, 400, 'Must reject with HTTP 400 when rawBody is missing');
    assert.ok(res.data.message.includes('requires raw request buffer'));
  });

  await it('6. Invalid signature -> rejected (HTTP 400)', async () => {
    const dummyBody = { event: 'payment.captured', id: 'evt_bad_sig' };
    const rawBuffer = Buffer.from(JSON.stringify(dummyBody));
    const req = {
      headers: { 'x-razorpay-signature': 'invalid_signature_hex_value_1234567890' },
      rawBody: rawBuffer,
      body: dummyBody
    };
    const res = createMockRes();
    await razorpayWebhook(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.message, 'Invalid signature');
  });

  await it('7. Modified webhook payload -> signature mismatch rejected (HTTP 400)', async () => {
    const originalBody = { event: 'payment.captured', id: 'evt_tampered', amount: 500 };
    const originalBuffer = Buffer.from(JSON.stringify(originalBody));
    const validSig = generateWebhookSignature(originalBuffer);

    // Tampered payload with modified amount
    const tamperedBody = { event: 'payment.captured', id: 'evt_tampered', amount: 50000 };
    const tamperedBuffer = Buffer.from(JSON.stringify(tamperedBody));

    const req = {
      headers: { 'x-razorpay-signature': validSig }, // Signature matches original, NOT tampered
      rawBody: tamperedBuffer, // Request body is tampered
      body: tamperedBody
    };
    const res = createMockRes();
    await razorpayWebhook(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.message, 'Invalid signature');
  });

  console.log('\n--- PART 3: AMBIGUOUS RAZORPAY REFUND OUTCOMES & RECONCILIATION ---');

  await it('8. Razorpay refund succeeds but application response times out -> reconciles without duplicate refund', async () => {
    const payId = 'pay_timeout_008';
    mockPaymentsDb[payId] = {
      id: payId,
      amount: 50000,
      amount_refunded: 50000, // Gateway processed it!
      status: 'captured',
      refunds: {
        items: [
          { id: 'rfnd_gateway_processed_008', amount: 50000, status: 'processed' }
        ]
      },
      mockRefundError: new Error('ETIMEDOUT: Connection to Razorpay acquiring bank timed out')
    };

    // Credit candidate wallet
    const candidateUser = new mongoose.Types.ObjectId();
    await creditWallet({
      userId: candidateUser,
      amount: 500,
      paymentId: payId,
      orderId: 'ord_timeout_008',
      reason: 'CUTOFF_EXPIRED_CREDIT'
    });

    const req = {
      user: { _id: candidateUser },
      body: { paymentId: payId }
    };
    const res = createMockRes();
    await requestCashRefund(req, res);

    // Because fetch detected Razorpay actually processed the refund:
    // It must return HTTP 200, reconcile as processed, and NOT restore the wallet debit (no double refund)!
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.refundStatus, 'processed');

    const wallet = await Wallet.findOne({ userId: candidateUser });
    assert.strictEqual(wallet.availableBalance, 0, 'Wallet balance must remain 0 (funds successfully sent to bank)');

    const restoreCount = await WalletTransaction.countDocuments({ userId: candidateUser, type: 'CREDIT', reason: 'REFUND_FAILED_RESTORE' });
    assert.strictEqual(restoreCount, 0, 'Must NOT restore debit because refund actually processed!');
  });

  await it('9. Razorpay refund definitively fails and wallet restoration occurs once', async () => {
    const payId = 'pay_fail_009';
    const definitiveError = new Error('BAD_REQUEST_ERROR: Payment cannot be refunded as payment is not captured');
    definitiveError.code = 'BAD_REQUEST_ERROR';

    mockPaymentsDb[payId] = {
      id: payId,
      amount: 50000,
      amount_refunded: 0,
      status: 'failed',
      mockRefundError: definitiveError
    };

    const candidateUser = new mongoose.Types.ObjectId();
    await creditWallet({
      userId: candidateUser,
      amount: 500,
      paymentId: payId,
      orderId: 'ord_fail_009',
      reason: 'CUTOFF_EXPIRED_CREDIT'
    });

    const req = {
      user: { _id: candidateUser },
      body: { paymentId: payId }
    };
    const res = createMockRes();
    await requestCashRefund(req, res);

    assert.strictEqual(res.statusCode, 500, 'Must return HTTP 500 for definitive failure');

    const wallet = await Wallet.findOne({ userId: candidateUser });
    assert.strictEqual(wallet.availableBalance, 500, 'Must restore ₹500 back to candidate wallet');

    const restoreCount = await WalletTransaction.countDocuments({ userId: candidateUser, type: 'CREDIT', reason: 'REFUND_FAILED_RESTORE' });
    assert.strictEqual(restoreCount, 1, 'Restoration must occur exactly once');
  });

  await it('10. Refund remains pending and no duplicate refund is created', async () => {
    const payId = 'pay_pend_010';
    mockPaymentsDb[payId] = {
      id: payId,
      amount: 50000,
      amount_refunded: 0,
      status: 'captured',
      mockRefundStatus: 'pending' // Gateway returns pending
    };

    const candidateUser = new mongoose.Types.ObjectId();
    await creditWallet({
      userId: candidateUser,
      amount: 500,
      paymentId: payId,
      orderId: 'ord_pend_010',
      reason: 'CUTOFF_EXPIRED_CREDIT'
    });

    const req1 = {
      user: { _id: candidateUser },
      body: { paymentId: payId }
    };
    const res1 = createMockRes();
    await requestCashRefund(req1, res1);

    assert.strictEqual(res1.statusCode, 202, 'Pending refund returns HTTP 202');
    assert.strictEqual(res1.data.refundStatus, 'pending');

    const walletAfter = await Wallet.findOne({ userId: candidateUser });
    assert.strictEqual(walletAfter.availableBalance, 0, 'Funds stay debited while pending with bank');

    // Attempting a second refund while pending is rejected as duplicate:
    const res2 = createMockRes();
    await requestCashRefund(req1, res2);
    assert.strictEqual(res2.statusCode, 400, 'Must block duplicate cash refund request');
  });

  console.log('\n--- PART 4: ADDITIONAL CASH REFUND SAFEGUARDS ---');

  await it('11. Refund cannot exceed originating payment remaining refundable amount', async () => {
    mockPaymentsDb['pay_refund_limit_011'] = {
      id: 'pay_refund_limit_011',
      amount: 50000,
      amount_refunded: 0,
      status: 'captured'
    };

    const res = await executeRefund({
      paymentId: 'pay_refund_limit_011',
      amount: 600, // ₹600 on ₹500 payment
      userId: testCandidate._id
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.refundStatus, 'failed');
  });

  await it('12. Previously refunded amounts are accounted for', async () => {
    mockPaymentsDb['pay_prior_ref_012'] = {
      id: 'pay_prior_ref_012',
      amount: 50000,
      amount_refunded: 30000, // ₹300 refunded already
      status: 'captured'
    };

    const res = await executeRefund({
      paymentId: 'pay_prior_ref_012',
      amount: 300, // ₹300 when only ₹200 remains
      userId: testCandidate._id
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.remainingRefundable, 200);
  });

  await it('13. Refund cannot be issued twice for the same wallet credit', async () => {
    const candidateUser = new mongoose.Types.ObjectId();
    await creditWallet({
      userId: candidateUser,
      amount: 500,
      paymentId: 'pay_twice_ref_013',
      reason: 'CUTOFF_EXPIRED_CREDIT'
    });
    mockPaymentsDb['pay_twice_ref_013'] = {
      id: 'pay_twice_ref_013',
      amount: 50000,
      amount_refunded: 0,
      status: 'captured'
    };

    const req = { user: { _id: candidateUser }, body: { paymentId: 'pay_twice_ref_013' } };
    const res1 = createMockRes();
    await requestCashRefund(req, res1);
    assert.strictEqual(res1.statusCode, 200);

    const res2 = createMockRes();
    await requestCashRefund(req, res2);
    assert.strictEqual(res2.statusCode, 400);
  });

  await it('14. Wallet funds already consumed cannot be refunded again', async () => {
    const candidateUser = new mongoose.Types.ObjectId();
    await creditWallet({
      userId: candidateUser,
      amount: 500,
      paymentId: 'pay_consumed_014',
      reason: 'CUTOFF_EXPIRED_CREDIT'
    });
    // Spend 400
    await debitWallet({ userId: candidateUser, amount: 400, reason: 'INTERVIEW_BOOKING_DEBIT' });

    mockPaymentsDb['pay_consumed_014'] = {
      id: 'pay_consumed_014',
      amount: 50000,
      amount_refunded: 0,
      status: 'captured'
    };

    const req = { user: { _id: candidateUser }, body: { paymentId: 'pay_consumed_014' } };
    const res = createMockRes();
    await requestCashRefund(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.data.message.includes('Insufficient'));
  });

  await it('15. Partial refunds are handled correctly', async () => {
    const candidateUser = new mongoose.Types.ObjectId();
    await creditWallet({
      userId: candidateUser,
      amount: 500,
      paymentId: 'pay_partial_015',
      reason: 'CUTOFF_EXPIRED_CREDIT'
    });
    mockPaymentsDb['pay_partial_015'] = {
      id: 'pay_partial_015',
      amount: 50000,
      amount_refunded: 0,
      status: 'captured'
    };

    const req = {
      user: { _id: candidateUser },
      body: { paymentId: 'pay_partial_015', amount: 200 }
    };
    const res = createMockRes();
    await requestCashRefund(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.refundAmount, 200);
    assert.strictEqual(res.data.updatedBalance, 300);

    const record = await PaymentRecord.findOne({ paymentId: 'pay_partial_015' });
    assert.strictEqual(record.amountRefunded, 200);
  });

  console.log('\n========================================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  if (passedTests === totalTests) {
    console.log('🎉 ALL FINAL WEBHOOK TIMESTAMP & REFUND SECURITY TESTS PASSED WITH 100% SUCCESS');
  } else {
    console.log(`⚠️ ${totalTests - passedTests} TESTS FAILED`);
  }
  console.log('========================================================================\n');

  process.exit(passedTests === totalTests ? 0 : 1);
}

runSuite().catch(err => {
  console.error('Fatal Suite Error:', err);
  process.exit(1);
});
