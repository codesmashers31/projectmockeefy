/**
 * MOCKEEFY FINAL SECURITY & PRODUCTION READINESS AUDIT TEST SUITE
 * 
 * Verifies:
 * 1. Atomic Double-Booking Protection (Promise.all concurrency collision + E11000 / reservation conflict)
 * 2. Razorpay Refund Correctness (idempotency, authoritative amount, status transitions: initiated, pending, processed, failed)
 * 3. Persistent Email Outbox (independent candidate & expert tracking, retry backoff, SMTP failure resilience)
 * 4. Production Meeting Links (centralized resolver, canonical routes, no localhost in production)
 * 5. Full Cutoff Edge-Cases (controllable clock: before start, at start, 1m before cutoff, exactly at cutoff, after cutoff)
 */

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const assert = require('assert');

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

async function runSuite() {
  console.log('\n===============================================================');
  console.log('🚀 RUNNING MOCKEEFY FINAL SECURITY & PRODUCTION AUDIT TEST SUITE');
  console.log('===============================================================\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB replica set successfully.\n');

  // Dynamic imports of models and services
  const Session = (await import('../models/Session.js')).default;
  const PaymentRecord = (await import('../models/PaymentRecord.js')).default;
  const SlotReservation = (await import('../models/SlotReservation.js')).default;
  const EmailOutbox = (await import('../models/EmailOutbox.js')).default;
  const { isSlotWithinBookingWindow, validateBookingSlot } = await import('../utils/availabilityValidator.js');
  const { acquireSlotReservation, confirmSlotReservation, releaseSlotReservation, buildSlotKey } = await import('../services/slotReservationService.js');
  const { executeRefund, setRazorpayClient } = await import('../services/refundService.js');
  const { enqueueEmail, processOutbox, setTransporter } = await import('../services/emailOutboxService.js');
  const { getAppBaseUrl, getMeetingUrl, getCandidateSessionsUrl, getExpertSessionsUrl } = await import('../utils/appUrl.js');

  const testExpertId = new mongoose.Types.ObjectId();
  const testCandidate1Id = new mongoose.Types.ObjectId();
  const testCandidate2Id = new mongoose.Types.ObjectId();

  console.log('--- SECTION 1: UNIVERSAL BOOKING CUTOFF (10-MINUTE RULE) ---');

  await it('30m Slot: Permitted before start (09:50 for 10:00-10:30 slot)', () => {
    const start = new Date('2026-11-20T10:00:00.000Z');
    const end = new Date('2026-11-20T10:30:00.000Z');
    const now = new Date('2026-11-20T09:50:00.000Z');
    assert.strictEqual(isSlotWithinBookingWindow(start, end, now), true);
  });

  await it('30m Slot: Permitted at start time (10:00 for 10:00-10:30 slot, 30m remains > 10m)', () => {
    const start = new Date('2026-11-20T10:00:00.000Z');
    const end = new Date('2026-11-20T10:30:00.000Z');
    const now = new Date('2026-11-20T10:00:00.000Z');
    assert.strictEqual(isSlotWithinBookingWindow(start, end, now), true);
  });

  await it('30m Slot: Permitted 1 minute before cutoff (10:19 for 10:00-10:30 slot, 11m remains)', () => {
    const start = new Date('2026-11-20T10:00:00.000Z');
    const end = new Date('2026-11-20T10:30:00.000Z');
    const now = new Date('2026-11-20T10:19:00.000Z');
    assert.strictEqual(isSlotWithinBookingWindow(start, end, now), true);
  });

  await it('30m Slot: BLOCKED exactly at cutoff (10:20 for 10:00-10:30 slot, exactly 10m remains)', () => {
    const start = new Date('2026-11-20T10:00:00.000Z');
    const end = new Date('2026-11-20T10:30:00.000Z');
    const now = new Date('2026-11-20T10:20:00.000Z');
    assert.strictEqual(isSlotWithinBookingWindow(start, end, now), false);
  });

  await it('30m Slot: BLOCKED after cutoff (10:25 for 10:00-10:30 slot, 5m remains)', () => {
    const start = new Date('2026-11-20T10:00:00.000Z');
    const end = new Date('2026-11-20T10:30:00.000Z');
    const now = new Date('2026-11-20T10:25:00.000Z');
    assert.strictEqual(isSlotWithinBookingWindow(start, end, now), false);
  });

  await it('60m Slot: Permitted 20 minutes before end (14:40 for 14:00-15:00 slot, cutoff is 14:50)', () => {
    const start = new Date('2026-11-20T14:00:00.000Z');
    const end = new Date('2026-11-20T15:00:00.000Z');
    const now = new Date('2026-11-20T14:40:00.000Z');
    assert.strictEqual(isSlotWithinBookingWindow(start, end, now), true);
  });

  await it('60m Slot: Permitted 11 minutes before end (14:49 for 14:00-15:00 slot)', () => {
    const start = new Date('2026-11-20T14:00:00.000Z');
    const end = new Date('2026-11-20T15:00:00.000Z');
    const now = new Date('2026-11-20T14:49:00.000Z');
    assert.strictEqual(isSlotWithinBookingWindow(start, end, now), true);
  });

  await it('60m Slot: BLOCKED exactly at cutoff (14:50 for 14:00-15:00 slot)', () => {
    const start = new Date('2026-11-20T14:00:00.000Z');
    const end = new Date('2026-11-20T15:00:00.000Z');
    const now = new Date('2026-11-20T14:50:00.000Z');
    assert.strictEqual(isSlotWithinBookingWindow(start, end, now), false);
  });

  console.log('\n--- SECTION 2: ATOMIC DOUBLE-BOOKING PROTECTION ---');

  const slotStart = new Date('2026-12-01T15:00:00.000Z');
  const slotEnd = new Date('2026-12-01T15:30:00.000Z');
  const slotKey = buildSlotKey(testExpertId, slotStart, slotEnd);

  // Clean up any test records
  await Session.deleteMany({ slotLockKey: slotKey });
  await SlotReservation.deleteMany({ slotKey });

  await it('Candidate 1 successfully acquires atomic slot reservation during checkout', async () => {
    const res = await acquireSlotReservation({
      expertId: testExpertId,
      candidateId: testCandidate1Id,
      startTime: slotStart,
      endTime: slotEnd,
      orderId: 'order_test_cand1_001',
      ttlMinutes: 15
    });
    assert.strictEqual(res.acquired, true);
    assert.strictEqual(res.slotKey, slotKey);
  });

  await it('Candidate 2 is ATOMICALLY REJECTED when attempting to reserve the same active slot', async () => {
    const res = await acquireSlotReservation({
      expertId: testExpertId,
      candidateId: testCandidate2Id,
      startTime: slotStart,
      endTime: slotEnd,
      orderId: 'order_test_cand2_002',
      ttlMinutes: 15
    });
    assert.strictEqual(res.acquired, false);
    assert.strictEqual(res.conflictType, 'active_reservation');
  });

  await it('Reservation confirmation updates status to confirmed with confirmedSessionId', async () => {
    const sessionId = `test-session-${Date.now()}`;
    await confirmSlotReservation({
      orderId: 'order_test_cand1_001',
      sessionId,
      paymentId: 'pay_test_001'
    });
    const updated = await SlotReservation.findOne({ orderId: 'order_test_cand1_001' });
    assert.strictEqual(updated.status, 'confirmed');
    assert.strictEqual(updated.confirmedSessionId, sessionId);
  });

  await it('Real concurrent Promise.all collision test: Only 1 session can persist the slotLockKey', async () => {
    const concurrentStart = new Date('2026-12-02T16:00:00.000Z');
    const concurrentEnd = new Date('2026-12-02T16:30:00.000Z');
    const cSlotLockKey = buildSlotKey(testExpertId, concurrentStart, concurrentEnd);

    await Session.deleteMany({ slotLockKey: cSlotLockKey });

    const attempt1 = async () => {
      try {
        const s = new Session({
          sessionId: `sess-racing-1-${Date.now()}`,
          expertId: testExpertId,
          candidateId: testCandidate1Id,
          startTime: concurrentStart,
          endTime: concurrentEnd,
          slotLockKey: cSlotLockKey,
          status: 'confirmed'
        });
        await s.save();
        return { success: true, id: s.sessionId };
      } catch (err) {
        return { success: false, code: err.code, message: err.message };
      }
    };

    const attempt2 = async () => {
      try {
        const s = new Session({
          sessionId: `sess-racing-2-${Date.now()}`,
          expertId: testExpertId,
          candidateId: testCandidate2Id,
          startTime: concurrentStart,
          endTime: concurrentEnd,
          slotLockKey: cSlotLockKey,
          status: 'confirmed'
        });
        await s.save();
        return { success: true, id: s.sessionId };
      } catch (err) {
        return { success: false, code: err.code, message: err.message };
      }
    };

    // Run both simultaneously
    const [result1, result2] = await Promise.all([attempt1(), attempt2()]);

    const successes = [result1, result2].filter(r => r.success);
    const failures = [result1, result2].filter(r => !r.success);

    assert.strictEqual(successes.length, 1, 'Exactly 1 concurrent booking must succeed');
    assert.strictEqual(failures.length, 1, 'Exactly 1 concurrent booking must fail');
    assert.strictEqual(failures[0].code, 11000, 'Failure must be MongoDB duplicate key E11000');

    // Clean up
    await Session.deleteMany({ slotLockKey: cSlotLockKey });
  });

  console.log('\n--- SECTION 3: RAZORPAY REFUND CORRECTNESS ---');

  // Inject Mock Razorpay Client to test refund state machine without charging real external banks
  const mockRazorpay = {
    payments: {
      fetch: async (id) => {
        if (id === 'pay_mock_100') {
          return { id, amount: 50000, status: 'captured', refund_status: null, order_id: 'order_mock_100' };
        }
        if (id === 'pay_mock_already_refunded') {
          return { id, amount: 50000, status: 'refunded', refund_status: 'full', amount_refunded: 50000, order_id: 'order_mock_101' };
        }
        if (id === 'pay_mock_pending') {
          return { id, amount: 75000, status: 'captured', refund_status: null, order_id: 'order_mock_102' };
        }
        if (id === 'pay_mock_fail') {
          return { id, amount: 30000, status: 'captured', refund_status: null, order_id: 'order_mock_103' };
        }
        throw new Error('Payment not found');
      },
      refund: async (id, opts) => {
        if (id === 'pay_mock_100') {
          return { id: 'rfnd_test_100', entity: 'refund', amount: opts.amount, status: 'processed' };
        }
        if (id === 'pay_mock_pending') {
          return { id: 'rfnd_test_pending', entity: 'refund', amount: opts.amount, status: 'pending' };
        }
        if (id === 'pay_mock_fail') {
          throw new Error('Gateway timeout contacting acquiring bank');
        }
        throw new Error('Unexpected payment id');
      }
    }
  };

  setRazorpayClient(mockRazorpay);

  await it('Refund uses authoritative captured amount from gateway (ignores manipulated client price)', async () => {
    await PaymentRecord.deleteMany({ paymentId: 'pay_mock_100' });
    const res = await executeRefund({
      paymentId: 'pay_mock_100',
      orderId: 'order_mock_100',
      userId: testCandidate1Id,
      reason: '10-minute cutoff reached',
      cutoffExpired: true,
      metadata: { clientPrice: 1 } // Client claimed 1 rupee, but gateway has 50000 paise (500 INR)
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.refundAmount, 500, 'Authoritative refund amount must be ₹500 based on gateway 50000 paise');
    assert.strictEqual(res.refundStatus, 'processed');
    assert.strictEqual(res.refundId, 'rfnd_test_100');

    const persisted = await PaymentRecord.findOne({ paymentId: 'pay_mock_100' });
    assert.strictEqual(persisted.status, 'refunded');
    assert.strictEqual(persisted.refundAmount, 500);
  });

  await it('Refund Idempotency: Duplicate refund attempts return existing record without duplicate gateway call', async () => {
    const res = await executeRefund({
      paymentId: 'pay_mock_100',
      orderId: 'order_mock_100',
      userId: testCandidate1Id,
      reason: 'Repeated callback'
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.alreadyRefunded, true);
    assert.strictEqual(res.refundId, 'rfnd_test_100');
  });

  await it('Refund Pending State: Captures pending state from Razorpay without dropping audit trail', async () => {
    await PaymentRecord.deleteMany({ paymentId: 'pay_mock_pending' });
    const res = await executeRefund({
      paymentId: 'pay_mock_pending',
      orderId: 'order_mock_102',
      userId: testCandidate2Id,
      reason: 'Slot conflict refund'
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.refundStatus, 'pending');
    assert.strictEqual(res.refundAmount, 750);
  });

  await it('Refund Gateway Failure: Persists failed state with audit error for background reconciliation', async () => {
    await PaymentRecord.deleteMany({ paymentId: 'pay_mock_fail' });
    const res = await executeRefund({
      paymentId: 'pay_mock_fail',
      orderId: 'order_mock_103',
      userId: testCandidate2Id,
      reason: 'Slot conflict refund'
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.refundStatus, 'failed');
    assert.ok(res.error.includes('Gateway timeout'));

    const persisted = await PaymentRecord.findOne({ paymentId: 'pay_mock_fail' });
    assert.strictEqual(persisted.status, 'failed');
    assert.ok(persisted.metadata.refundAttempts.length >= 1);
  });

  console.log('\n--- SECTION 4: PERSISTENT EMAIL OUTBOX & BACKGROUND WORKER ---');

  const testSessionId = `session-outbox-${Date.now()}`;
  await EmailOutbox.deleteMany({ sessionId: testSessionId });

  await it('Enqueue both Candidate and Expert emails independently in EmailOutbox', async () => {
    const candRes = await enqueueEmail({
      sessionId: testSessionId,
      recipientType: 'candidate',
      to: 'candidate.audit@mockeefy.com',
      subject: 'Your Mock Interview is Confirmed',
      html: '<h1>Booking Confirmed</h1>'
    });

    const expRes = await enqueueEmail({
      sessionId: testSessionId,
      recipientType: 'expert',
      to: 'expert.audit@mockeefy.com',
      subject: 'New Mock Interview Booked',
      html: '<h1>New Interview</h1>'
    });

    assert.strictEqual(candRes.enqueued, true);
    assert.strictEqual(expRes.enqueued, true);

    const outboxCount = await EmailOutbox.countDocuments({ sessionId: testSessionId });
    assert.strictEqual(outboxCount, 2);
  });

  await it('Outbox Idempotency: Duplicate payment callbacks do not create duplicate outbox entries', async () => {
    const duplicateRes = await enqueueEmail({
      sessionId: testSessionId,
      recipientType: 'candidate',
      to: 'candidate.audit@mockeefy.com',
      subject: 'Your Mock Interview is Confirmed',
      html: '<h1>Booking Confirmed</h1>'
    });

    assert.strictEqual(duplicateRes.alreadyExists, true);
    const outboxCount = await EmailOutbox.countDocuments({ sessionId: testSessionId });
    assert.strictEqual(outboxCount, 2, 'Outbox count must remain exactly 2');
  });

  await it('Worker resilience: Transient SMTP failure marks status=failed with retryCount=1 and backoff', async () => {
    // Inject failing transporter
    let failAttemptCount = 0;
    const failingTransporter = {
      sendMail: async () => {
        failAttemptCount++;
        throw new Error('SMTP connection refused: ETIMEDOUT 587');
      }
    };
    setTransporter(failingTransporter);

    const result = await processOutbox(10);
    assert.ok(result.failures >= 2);

    const candItem = await EmailOutbox.findOne({ sessionId: testSessionId, recipientType: 'candidate' });
    assert.strictEqual(candItem.status, 'failed');
    assert.strictEqual(candItem.retryCount, 1);
    assert.ok(candItem.lastError.includes('SMTP connection refused'));
    assert.ok(candItem.nextRetryAt.getTime() > Date.now(), 'nextRetryAt must be in the future due to backoff');
  });

  await it('Worker recovery: Successful retry marks status=sent without creating duplicate emails or sessions', async () => {
    // Reset nextRetryAt to now for immediate test execution
    await EmailOutbox.updateMany({ sessionId: testSessionId }, { $set: { nextRetryAt: new Date() } });

    // Inject working transporter
    const workingTransporter = {
      sendMail: async (mail) => {
        return { messageId: `msg_${Date.now()}` };
      }
    };
    setTransporter(workingTransporter);

    const result = await processOutbox(10);
    assert.ok(result.successes >= 2);

    const candItem = await EmailOutbox.findOne({ sessionId: testSessionId, recipientType: 'candidate' });
    assert.strictEqual(candItem.status, 'sent');
    assert.ok(candItem.sentAt !== null);
  });

  console.log('\n--- SECTION 5: PRODUCTION MEETING LINKS ---');

  await it('Central URL resolver enforces production domain and rejects localhost in production', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalClientUrl = process.env.CLIENT_URL;

    try {
      process.env.NODE_ENV = 'production';
      process.env.CLIENT_URL = 'http://localhost:5173';
      const prodUrl = getAppBaseUrl();
      assert.strictEqual(prodUrl, 'https://mockeefy.com', 'Production must never use localhost:5173');

      const meetingUrl = getMeetingUrl('session-prod-999');
      assert.strictEqual(meetingUrl, 'https://mockeefy.com/live-meeting/session-prod-999');

      const candUrl = getCandidateSessionsUrl();
      assert.strictEqual(candUrl, 'https://mockeefy.com/my-sessions');

      const expUrl = getExpertSessionsUrl();
      assert.strictEqual(expUrl, 'https://mockeefy.com/dashboard/sessions');
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.CLIENT_URL = originalClientUrl;
    }
  });

  await it('Meeting URL preserves validated Google Meet links when present', () => {
    const validMeet = 'https://meet.google.com/abc-defg-hij';
    const res = getMeetingUrl('sess-123', validMeet);
    assert.strictEqual(res, validMeet);
  });

  await it('Meeting URL falls back to Mockeefy Live Meeting route if Google Meet link is invalid', () => {
    const invalidMeet = 'not-a-valid-link';
    const res = getMeetingUrl('sess-123', invalidMeet);
    assert.ok(res.includes('/live-meeting/sess-123'));
  });

  // Clean up test records
  await Session.deleteMany({ expertId: testExpertId });
  await SlotReservation.deleteMany({ expertId: testExpertId });
  await EmailOutbox.deleteMany({ sessionId: testSessionId });
  await PaymentRecord.deleteMany({ paymentId: { $in: ['pay_mock_100', 'pay_mock_pending', 'pay_mock_fail'] } });

  console.log('\n===============================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  if (passedTests === totalTests) {
    console.log('🎉 ALL SECURITY & PRODUCTION AUDIT TESTS PASSED WITH 100% SUCCESS');
  } else {
    console.error(`⚠️ ${totalTests - passedTests} TESTS FAILED`);
  }
  console.log('===============================================================\n');

  await mongoose.disconnect();
  process.exit(passedTests === totalTests ? 0 : 1);
}

runSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
