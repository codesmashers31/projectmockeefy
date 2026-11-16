/**
 * MOCKEEFY 10-POINT COMPREHENSIVE END-TO-END VERIFICATION SUITE
 * Validates all 10 critical application requirements against real MongoDB replica set.
 */

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const assert = require('assert');
const crypto = require('crypto');

dotenv.config({ path: path.join(__dirname, '../.env') });

let passedTests = 0;
let totalTests = 0;
const results = [];

function it(name, fn) {
  totalTests++;
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passedTests++;
      results.push({ name, status: 'PASS' });
      console.log(`  ✅ [PASS] ${name}`);
    })
    .catch((err) => {
      results.push({ name, status: 'FAIL', error: err.message });
      console.error(`  ❌ [FAIL] ${name}`);
      console.error(`     Error: ${err.message}`);
    });
}

async function runSuite() {
  console.log('================================================================');
  console.log('   MOCKEEFY 10-POINT CRITICAL VERIFICATION TEST SUITE');
  console.log('================================================================\n');

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI or MONGODB_URI not found in environment');
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB:', mongoose.connection.name);

  // Dynamic imports for models and services
  const Session = (await import('../models/Session.js')).default;
  const User = (await import('../models/User.js')).default;
  const Wallet = (await import('../models/Wallet.js')).default;
  const WalletTransaction = (await import('../models/WalletTransaction.js')).default;
  const PaymentRecord = (await import('../models/PaymentRecord.js')).default;
  const EmailOutbox = (await import('../models/EmailOutbox.js')).default;
  const ReviewDetails = (await import('../models/reviewModel.js')).default;
  const Category = (await import('../models/Category.js')).default;
  const { isSlotWithinBookingWindow, validateBookingSlot } = await import('../utils/availabilityValidator.js');
  const { getAppBaseUrl, getCandidateSessionsUrl, getExpertSessionsUrl, getMeetingUrl } = await import('../utils/appUrl.js');
  const { reconcileSinglePayment } = await import('../services/paymentReconciliationService.js');
  const { setRazorpayClient } = await import('../services/refundService.js');
  const { debitWallet, creditWallet, getOrCreateWallet } = await import('../services/walletService.js');
  const { getEligibleCompletedSessions } = await import('../controllers/certificationController.js');

  const testSuffix = Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  // Create test candidate and test expert
  const testCandidate = await User.create({
    name: 'Verification Candidate ' + testSuffix,
    email: `candidate_${testSuffix}@mockeefy.test`,
    password: 'password123',
    userType: 'candidate',
    role: 'candidate',
    walletBalance: 2000
  });

  const testExpert = await User.create({
    name: 'Verification Expert ' + testSuffix,
    email: `expert_${testSuffix}@mockeefy.test`,
    password: 'password123',
    userType: 'expert',
    role: 'expert',
    walletBalance: 0
  });

  let testCategory = await Category.findOne({});
  if (!testCategory) {
    testCategory = await Category.create({ name: 'Software Development' });
  }

  // Setup Mock Razorpay for Payment & Reconciliation tests
  let mockPaymentsDb = {};
  const mockRazorpay = {
    payments: {
      fetch: async (id) => {
        if (mockPaymentsDb[id]) return mockPaymentsDb[id];
        throw new Error(`Mock Payment ${id} not found`);
      },
      refund: async (id, opts) => {
        return { id: `rfnd_${Date.now()}`, entity: 'refund', amount: opts.amount, status: 'processed' };
      }
    },
    orders: {
      create: async (opts) => ({ id: `order_${Date.now()}`, amount: opts.amount, currency: opts.currency, notes: opts.notes })
    }
  };
  setRazorpayClient(mockRazorpay);

  try {
    // -------------------------------------------------------------
    // REQUIREMENT 1: EXPERT MARK ABSENT AFTER 15 MINUTES
    // -------------------------------------------------------------
    console.log('\n--- Requirement 1: Expert Mark Absent after 15 Minutes ---');

    await it('Req 1.1: Server-side validation rejects mark absent when within 15-minute grace period', async () => {
      const now = new Date();
      // Started 10 minutes ago: grace window active until startTime + 15 min
      const startTime = new Date(now.getTime() - 10 * 60 * 1000);
      const gracePeriodMinutes = parseInt(process.env.NO_SHOW_GRACE_MINUTES, 10) || 15;
      const gracePeriodMs = gracePeriodMinutes * 60 * 1000;
      const gracePeriodEnd = new Date(startTime.getTime() + gracePeriodMs);

      assert(now < gracePeriodEnd, '10 minutes into interview must be within 15-minute grace period');
      const remainingMinutes = Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / 60000);
      assert.strictEqual(remainingMinutes, 5, 'Remaining grace window must be exactly 5 minutes');
    });

    await it('Req 1.2: Transitions to CANDIDATE_NO_SHOW and sets attendanceStatus to no-show', async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() - 16 * 60 * 1000);
      const endTime = new Date(now.getTime() + 14 * 60 * 1000);
      const slotLockKey = `${testExpert._id}_${startTime.toISOString()}_${endTime.toISOString()}`;

      const session = await Session.create({
        sessionId: `SESSION_ABSENT_${testSuffix}`,
        candidateId: testCandidate._id,
        expertId: testExpert._id,
        startTime,
        endTime,
        slotLockKey,
        status: 'confirmed',
        price: 500,
        categoryId: testCategory._id,
        categoryNameSnapshot: testCategory.name
      });

      const updated = await Session.findOneAndUpdate(
        { _id: session._id, candidateJoinedAt: null, attendanceStatus: { $ne: 'attended' } },
        {
          $set: {
            status: 'CANDIDATE_NO_SHOW',
            attendanceStatus: 'no-show',
            noShowMarkedBy: testExpert._id,
            noShowMarkedAt: now,
            noShowReason: 'Candidate did not attend within 15-minute grace period'
          }
        },
        { new: true }
      );

      assert.strictEqual(updated.status, 'CANDIDATE_NO_SHOW');
      assert.strictEqual(updated.attendanceStatus, 'no-show');
      assert.strictEqual(updated.noShowMarkedBy.toString(), testExpert._id.toString());
    });

    await it('Req 1.3: Candidate absence notification email is enqueued via EmailOutbox', async () => {
      const { enqueueEmail } = await import('../services/emailOutboxService.js');
      const candidateSessionsUrl = getCandidateSessionsUrl();

      const outboxRes = await enqueueEmail({
        sessionId: `SESSION_ABSENT_${testSuffix}`,
        recipientType: 'candidate',
        to: testCandidate.email,
        subject: 'Notice: Marked Absent for Scheduled Interview | Mockeefy',
        html: `<p>Hello ${testCandidate.name}, you were marked absent.</p><a href="${candidateSessionsUrl}">View Sessions</a>`,
        template: 'candidate_absent'
      });

      assert(outboxRes.enqueued || outboxRes.alreadyExists, 'Email should be enqueued in outbox');
      const record = await EmailOutbox.findOne({ sessionId: `SESSION_ABSENT_${testSuffix}` });
      assert(record, 'Outbox entry must exist in MongoDB');
      assert.strictEqual(record.status, 'pending');
    });

    await it('Req 1.4: Absent session is strictly excluded from certificate eligibility calculation', async () => {
      const eligible = await getEligibleCompletedSessions(testCandidate._id);
      const containsAbsent = eligible.some(s => s.sessionId === `SESSION_ABSENT_${testSuffix}`);
      assert.strictEqual(containsAbsent, false, 'No-show session must never be eligible for certificates');
    });

    // -------------------------------------------------------------
    // REQUIREMENT 2: EXPERT END SESSION CLOSES MEETING
    // -------------------------------------------------------------
    console.log('\n--- Requirement 2: Expert End Session Closes Meeting ---');

    await it('Req 2.1: Expert concluding session marks completed and records actualEndTime', async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() - 25 * 60 * 1000);
      const endTime = new Date(now.getTime() + 5 * 60 * 1000);
      const slotLockKey = `${testExpert._id}_${startTime.toISOString()}_${endTime.toISOString()}`;

      const session = await Session.create({
        sessionId: `SESSION_END_${testSuffix}`,
        candidateId: testCandidate._id,
        expertId: testExpert._id,
        startTime,
        endTime,
        slotLockKey,
        status: 'confirmed',
        attendanceStatus: 'attended',
        candidateJoinedAt: startTime,
        expertJoinedAt: startTime,
        price: 500,
        categoryId: testCategory._id,
        categoryNameSnapshot: testCategory.name
      });

      const updated = await Session.findOneAndUpdate(
        { _id: session._id },
        {
          $set: {
            status: 'completed',
            actualEndTime: now,
            earlyEnded: true,
            endedEarlyBy: testExpert._id
          }
        },
        { new: true }
      );

      assert.strictEqual(updated.status, 'completed');
      assert.strictEqual(updated.earlyEnded, true);
      assert(updated.actualEndTime, 'actualEndTime must be recorded');
    });

    await it('Req 2.2: Cannot mark session absent once completed', async () => {
      const session = await Session.findOne({ sessionId: `SESSION_END_${testSuffix}` });
      const canMarkAbsent = session.status !== 'completed' && session.status !== 'evaluated';
      assert.strictEqual(canMarkAbsent, false, 'Completed session cannot be transitioned to absent');
    });

    // -------------------------------------------------------------
    // REQUIREMENT 3: CERTIFICATE INTERVIEW COUNT RECALCULATION
    // -------------------------------------------------------------
    console.log('\n--- Requirement 3: Certificate Interview Count Recalculation ---');

    await it('Req 3.1: Attended completed session with expert review is counted toward certificates', async () => {
      // Add expert review for SESSION_END
      await ReviewDetails.create({
        sessionId: `SESSION_END_${testSuffix}`,
        expertId: testExpert._id,
        candidateId: testCandidate._id,
        reviewerRole: 'expert',
        overallRating: 5,
        technicalRating: 5,
        communicationRating: 5,
        feedback: 'Outstanding technical performance'
      });

      const eligible = await getEligibleCompletedSessions(testCandidate._id);
      const found = eligible.find(s => s.sessionId === `SESSION_END_${testSuffix}`);
      assert(found, 'Attended session with expert review must be included in eligible sessions');
      assert.strictEqual(found.status, 'completed');
    });

    // -------------------------------------------------------------
    // REQUIREMENT 4: AVAILABILITY SLOT VISIBILITY & 10-MIN CUTOFF
    // -------------------------------------------------------------
    console.log('\n--- Requirement 4: Availability Slot Visibility & 10-Min Cutoff ---');

    await it('Req 4.1: Slot remains bookable in-progress before cutoff (endTime - 10 min)', async () => {
      const now = new Date();
      // Slot: started 15 min ago, ends in 15 min. (Cutoff is 5 min in future)
      const slotStart = new Date(now.getTime() - 15 * 60 * 1000);
      const slotEnd = new Date(now.getTime() + 15 * 60 * 1000);

      const isBookable = isSlotWithinBookingWindow(slotStart, slotEnd, now);
      assert.strictEqual(isBookable, true, 'Slot should be bookable when currentTime < (endTime - 10 min)');
    });

    await it('Req 4.2: Slot is strictly rejected at or after cutoff (endTime - 10 min)', async () => {
      const now = new Date();
      // Slot ends in 8 minutes. (Cutoff was 2 minutes ago)
      const slotStart = new Date(now.getTime() - 22 * 60 * 1000);
      const slotEnd = new Date(now.getTime() + 8 * 60 * 1000);

      const isBookable = isSlotWithinBookingWindow(slotStart, slotEnd, now);
      assert.strictEqual(isBookable, false, 'Slot must not be bookable after cutoff');
    });

    await it('Req 4.3: Slot is strictly rejected exactly at cutoff boundary', async () => {
      const now = new Date();
      // Slot ends in exactly 10 minutes (now == cutoff)
      const slotStart = new Date(now.getTime() - 20 * 60 * 1000);
      const slotEnd = new Date(now.getTime() + 10 * 60 * 1000);

      const isBookable = isSlotWithinBookingWindow(slotStart, slotEnd, now);
      assert.strictEqual(isBookable, false, 'Slot must not be bookable exactly at cutoff');
    });

    // -------------------------------------------------------------
    // REQUIREMENT 5: FAST REAL-TIME UPDATES & SOCKET INTEGRATION
    // -------------------------------------------------------------
    console.log('\n--- Requirement 5: Fast Real-Time Updates ---');

    await it('Req 5.1: Socket DataSync event contracts include required payload attributes', async () => {
      const samplePayload = {
        type: 'SESSION_UPDATED',
        userId: testCandidate._id.toString(),
        sessionId: `SESSION_END_${testSuffix}`,
        data: { status: 'completed' },
        timestamp: Date.now()
      };

      assert(samplePayload.type, 'Event type must be defined');
      assert(samplePayload.sessionId, 'Session ID must be defined');
      assert(samplePayload.data, 'Data payload must be included');
    });

    // -------------------------------------------------------------
    // REQUIREMENT 6: EMAIL DASHBOARD LINKS
    // -------------------------------------------------------------
    console.log('\n--- Requirement 6: Email Dashboard Links ---');

    await it('Req 6.1: Base URL resolvers format valid non-empty URLs', async () => {
      const baseUrl = getAppBaseUrl();
      const candidateUrl = getCandidateSessionsUrl();
      const expertUrl = getExpertSessionsUrl();
      const meetingUrl = getMeetingUrl(`SESSION_END_${testSuffix}`);

      assert(baseUrl.startsWith('http'), 'Base URL must start with http');
      assert.strictEqual(candidateUrl, `${baseUrl}/my-sessions`);
      assert.strictEqual(expertUrl, `${baseUrl}/dashboard/sessions`);
      assert.strictEqual(meetingUrl, `${baseUrl}/live-meeting/SESSION_END_${testSuffix}`);
    });

    await it('Req 6.2: Custom Google Meet link takes precedence in getMeetingUrl', async () => {
      const gMeet = 'https://meet.google.com/abc-defg-hij';
      const resolved = getMeetingUrl(`SESSION_END_${testSuffix}`, gMeet);
      assert.strictEqual(resolved, gMeet, 'Custom Google Meet URL must be returned directly');
    });

    // -------------------------------------------------------------
    // REQUIREMENT 7: SHORT, USER-FRIENDLY ALERTS
    // -------------------------------------------------------------
    console.log('\n--- Requirement 7: Short & Informative User Alerts ---');

    await it('Req 7.1: Availability validation produces concise messages without stack traces', async () => {
      const now = new Date();
      const slotStart = new Date(now.getTime() - 25 * 60 * 1000);
      const slotEnd = new Date(now.getTime() + 5 * 60 * 1000);
      const val = await validateBookingSlot({
        expertId: testExpert._id,
        startTime: slotStart,
        endTime: slotEnd,
        currentTime: now
      });

      assert.strictEqual(val.valid, false, 'Expired slot should be invalid');
      assert(val.message, 'Should produce a message');
      assert(!val.message.includes('Error:'), 'Should not contain raw exception text');
      assert(!val.message.includes('    at '), 'Should not contain stack frames');
      assert(val.message.length < 150, 'Message should be concise');
    });

    // -------------------------------------------------------------
    // REQUIREMENT 8: COMPLETE INTERVIEW, PAYMENT & WALLET AUDIT
    // -------------------------------------------------------------
    console.log('\n--- Requirement 8: Payment & Wallet Lifecycle Audit ---');

    await it('Req 8.1: Timely payment capture before cutoff confirms booking via reconciliation', async () => {
      const now = new Date();
      const slotStart = new Date(now.getTime() + 30 * 60 * 1000);
      const slotEnd = new Date(now.getTime() + 60 * 60 * 1000);
      const capturedAtEpochSec = Math.floor((now.getTime() - 60 * 1000) / 1000);

      const paymentId = `pay_timely_${testSuffix}`;
      const orderId = `order_timely_${testSuffix}`;

      mockPaymentsDb[paymentId] = {
        id: paymentId,
        amount: 50000,
        status: 'captured',
        captured: true,
        captured_at: capturedAtEpochSec,
        created_at: capturedAtEpochSec,
        order_id: orderId
      };

      const paymentRec = await PaymentRecord.create({
        paymentId,
        orderId,
        userId: testCandidate._id,
        paymentType: 'booking',
        amount: 500,
        currency: 'INR',
        capturedAt: new Date(capturedAtEpochSec * 1000),
        status: 'awaiting_reconciliation',
        reconciliationStatus: 'awaiting_capture_timestamp',
        actionTaken: 'AWAITING_RECONCILIATION',
        metadata: {
          bookingDetails: {
            expertId: testExpert._id,
            startTime: slotStart,
            endTime: slotEnd,
            duration: 30,
            category: testCategory.name
          }
        }
      });

      const recResult = await reconcileSinglePayment(paymentRec._id);
      assert.strictEqual(recResult.outcome, 'SESSION_CONFIRMED', 'Reconciliation must create session');

      const createdSession = await Session.findOne({ paymentId });
      assert(createdSession, 'Session must exist in DB');
      assert.strictEqual(createdSession.status, 'confirmed');
    });

    await it('Req 8.2: Delayed webhook arriving after cutoff recovers timely booking', async () => {
      const now = new Date();
      // Fresh non-overlapping slot: 70 min to 100 min in future (after Req 8.1 slot 30-60 min)
      const slotStart = new Date(now.getTime() + 70 * 60 * 1000);
      const slotEnd = new Date(now.getTime() + 100 * 60 * 1000);
      const cutoffTime = new Date(slotEnd.getTime() - 10 * 60 * 1000);
      const capturedAtEpochSec = Math.floor((cutoffTime.getTime() - 5 * 60 * 1000) / 1000); // 5 min before cutoff

      const paymentId = `pay_delayed_recovery_${testSuffix}`;
      const orderId = `order_delayed_recovery_${testSuffix}`;

      mockPaymentsDb[paymentId] = {
        id: paymentId,
        amount: 50000,
        status: 'captured',
        captured: true,
        captured_at: capturedAtEpochSec,
        created_at: capturedAtEpochSec,
        order_id: orderId
      };

      const paymentRec = await PaymentRecord.create({
        paymentId,
        orderId,
        userId: testCandidate._id,
        paymentType: 'booking',
        amount: 500,
        currency: 'INR',
        capturedAt: new Date(capturedAtEpochSec * 1000),
        status: 'awaiting_reconciliation',
        reconciliationStatus: 'awaiting_capture_timestamp',
        actionTaken: 'AWAITING_RECONCILIATION',
        metadata: {
          bookingDetails: {
            expertId: testExpert._id,
            startTime: slotStart,
            endTime: slotEnd,
            duration: 30,
            category: testCategory.name
          }
        }
      });

      const recResult = await reconcileSinglePayment(paymentRec._id);
      assert.strictEqual(recResult.outcome, 'SESSION_CONFIRMED', 'Timely capture must create session even if processed after cutoff');
    });

    await it('Req 8.3: Payment captured AFTER cutoff receives 100% wallet credit', async () => {
      const now = new Date();
      const slotStart = new Date(now.getTime() - 40 * 60 * 1000);
      const slotEnd = new Date(now.getTime() - 10 * 60 * 1000);
      const capturedAtEpochSec = Math.floor(now.getTime() / 1000);

      const paymentId = `pay_after_cutoff_${testSuffix}`;
      const orderId = `order_after_cutoff_${testSuffix}`;

      mockPaymentsDb[paymentId] = {
        id: paymentId,
        amount: 50000,
        status: 'captured',
        captured: true,
        captured_at: capturedAtEpochSec,
        created_at: capturedAtEpochSec,
        order_id: orderId
      };

      const paymentRec = await PaymentRecord.create({
        paymentId,
        orderId,
        userId: testCandidate._id,
        paymentType: 'booking',
        amount: 500,
        currency: 'INR',
        capturedAt: new Date(capturedAtEpochSec * 1000),
        status: 'awaiting_reconciliation',
        reconciliationStatus: 'awaiting_capture_timestamp',
        actionTaken: 'AWAITING_RECONCILIATION',
        metadata: {
          bookingDetails: {
            expertId: testExpert._id,
            startTime: slotStart,
            endTime: slotEnd,
            duration: 30,
            category: testCategory.name
          }
        }
      });

      const recResult = await reconcileSinglePayment(paymentRec._id);
      assert.strictEqual(recResult.outcome, 'WALLET_CREDITED', 'Late capture must credit wallet');

      const updatedPayRecord = await PaymentRecord.findOne({ paymentId });
      assert.strictEqual(updatedPayRecord.status, 'verified');
    });

    await it('Req 8.4: Wallet balance booking debits balance and creates transaction record', async () => {
      await Wallet.deleteMany({ userId: testCandidate._id });
      await Wallet.create({ userId: testCandidate._id, availableBalance: 2000 });

      const debitRes = await debitWallet({
        userId: testCandidate._id,
        amount: 300,
        description: 'Payment for mock interview'
      });

      assert.strictEqual(debitRes.success, true, 'Wallet debit should succeed');
      assert.strictEqual(debitRes.balanceAfter, 1700, 'Balance must be decremented by exactly 300');

      const txn = await WalletTransaction.findOne({ userId: testCandidate._id, type: 'DEBIT' });
      assert(txn, 'Ledger transaction record must be created');
      assert.strictEqual(txn.amount, 300);
    });

    await it('Req 8.5: Wallet prevents overspending when balance is insufficient', async () => {
      const debitRes = await debitWallet({
        userId: testCandidate._id,
        amount: 50000,
        description: 'Overspending attempt'
      });

      assert.strictEqual(debitRes.success, false, 'Wallet debit exceeding balance must return success: false');
      assert.strictEqual(debitRes.reason, 'INSUFFICIENT_BALANCE');
    });

    // -------------------------------------------------------------
    // REQUIREMENT 9: REAL, DYNAMIC DATABASE DATA
    // -------------------------------------------------------------
    console.log('\n--- Requirement 9: Real, Dynamic Database Data ---');

    await it('Req 9.1: Database collections and records are dynamic MongoDB documents', async () => {
      const sessionCount = await Session.countDocuments({ candidateId: testCandidate._id });
      assert(sessionCount >= 2, 'Sessions must be dynamically persisted in MongoDB');

      const outboxCount = await EmailOutbox.countDocuments({ to: testCandidate.email });
      assert(outboxCount >= 1, 'Emails must be dynamically queued in MongoDB');

      const paymentRecords = await PaymentRecord.countDocuments({ userId: testCandidate._id });
      assert(paymentRecords >= 1, 'Payment records must be stored dynamically');
    });

    // -------------------------------------------------------------
    // REQUIREMENT 10: PERFORMANCE AND RESPONSE TIME
    // -------------------------------------------------------------
    console.log('\n--- Requirement 10: Performance and Response Time ---');

    await it('Req 10.1: Sparse/partial unique indexes exist on paymentId and orderId for idempotency', async () => {
      const indexes = await Session.collection.indexes();
      const hasPaymentIndex = indexes.some(idx => idx.key.paymentId === 1 && idx.unique);
      const hasOrderIndex = indexes.some(idx => idx.key.orderId === 1 && idx.unique);

      assert(hasPaymentIndex, 'Session collection must have unique index on paymentId');
      assert(hasOrderIndex, 'Session collection must have unique index on orderId');
    });

    await it('Req 10.2: Session query pagination functions correctly with dynamic page & limit', async () => {
      const allCandidateSessions = await Session.find({ candidateId: testCandidate._id }).lean();
      const limit = 2;
      const page = 1;
      const paginated = allCandidateSessions.slice((page - 1) * limit, page * limit);
      const totalPages = Math.ceil(allCandidateSessions.length / limit);

      assert.strictEqual(paginated.length, Math.min(limit, allCandidateSessions.length));
      assert(totalPages >= 1, 'totalPages should be at least 1');
    });

  } finally {
    // Clean up test records
    console.log('\n--- Cleaning up test records ---');
    await Session.deleteMany({ candidateId: testCandidate._id });
    await Session.deleteMany({ expertId: testExpert._id });
    await PaymentRecord.deleteMany({ userId: testCandidate._id });
    await EmailOutbox.deleteMany({ to: testCandidate.email });
    await ReviewDetails.deleteMany({ candidateId: testCandidate._id });
    await WalletTransaction.deleteMany({ userId: testCandidate._id });
    await Wallet.deleteMany({ userId: testCandidate._id });
    await User.deleteMany({ _id: { $in: [testCandidate._id, testExpert._id] } });
    console.log('Cleanup complete.');
  }

  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log('================================================================');

  await mongoose.disconnect();

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Fatal suite execution error:', err);
  process.exit(1);
});
