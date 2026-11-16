const mongoose = require('mongoose');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || "code@1234";

async function main() {
  console.log('================================================================================');
  console.log('   MOCKEEFY TASK 2 — VERIFY BACKEND IDEMPOTENCY & CONCURRENCY PROTECTION       ');
  console.log('================================================================================\n');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB Atlas.');

  const User = mongoose.models.User || (await import('../models/User.js')).default;
  const ExpertDetails = mongoose.models.ExpertDetails || (await import('../models/expertModel.js')).default;
  const Session = mongoose.models.Session || (await import('../models/Session.js')).default;
  const Wallet = mongoose.models.Wallet || (await import('../models/Wallet.js')).default;
  const WalletTransaction = mongoose.models.WalletTransaction || (await import('../models/WalletTransaction.js')).default;
  const Notification = mongoose.models.Notification || (await import('../models/Notification.js')).default;
  const EmailOutbox = mongoose.models.EmailOutbox || (await import('../models/EmailOutbox.js')).default;
  const Review = mongoose.models.Review || (await import('../models/reviewModel.js')).default;

  await EmailOutbox.syncIndexes();

  const { createNotification } = await import('../controllers/notificationController.js');
  const { enqueueEmail } = await import('../services/emailOutboxService.js');
  const { markCandidateNoShow, requestFeedback, joinSession, submitReview } = await import('../controllers/sessionController.js');

  const expert = await ExpertDetails.findOne({ status: "Active" });
  const expertUser = await User.findById(expert.userId || expert.user);
  let candidateUser = await User.findOne({ email: 'cand_integ_1794559099079_ffj8@mockeefy.test' });
  if (!candidateUser) candidateUser = await User.findOne({ userType: 'candidate' });

  const expertToken = jwt.sign(
    { email: expertUser.email, userType: 'expert', name: expertUser.name, userId: expertUser._id },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  const candidateToken = jwt.sign(
    { email: candidateUser.email, userType: 'candidate', name: candidateUser.name, userId: candidateUser._id },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  let passed = 0;
  let failed = 0;
  function assert(name, condition) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      failed++;
    }
  }

  // Helper mock response
  function createMockRes() {
    return {
      statusCode: 200,
      data: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(d) {
        this.data = d;
        return this;
      }
    };
  }

  console.log('\n--- 1. EMAIL OUTBOX CREATION IDEMPOTENCY ---');
  const testIdempKey = `task2_email_idemp_${Date.now()}`;
  const emailPayload = {
    sessionId: 'SESS_IDEMP_TEST',
    recipientType: 'candidate',
    to: 'idemp@mockeefy.com',
    subject: 'Idempotency Test Email',
    html: '<p>Testing concurrent outbox enqueue</p>',
    template: testIdempKey
  };

  // Launch 2 concurrent identical requests
  const [emailRes1, emailRes2] = await Promise.all([
    enqueueEmail(emailPayload),
    enqueueEmail(emailPayload)
  ]);

  const expectedKey = `${emailPayload.sessionId}_${emailPayload.recipientType}_${emailPayload.template}`;
  const outboxCount = await EmailOutbox.countDocuments({ idempotencyKey: expectedKey });
  console.log(`Email concurrency: res1.enqueued=${emailRes1.enqueued}, res2.enqueued=${emailRes2.enqueued}, total DB records=${outboxCount}`);
  assert('Email outbox: exactly 1 outbox record created for concurrent requests', outboxCount === 1);
  assert('Email outbox: duplicate enqueue detected and handled safely', (emailRes1.enqueued && !emailRes2.enqueued) || (!emailRes1.enqueued && emailRes2.enqueued));
  await EmailOutbox.deleteMany({ idempotencyKey: expectedKey });

  console.log('\n--- 2. PERSISTENT NOTIFICATION CREATION DEDUPLICATION ---');
  const notifKey = `notif_test_${Date.now()}`;
  const [notif1, notif2] = await Promise.all([
    createNotification({ userId: candidateUser._id, type: 'session', title: 'Session Booked', message: 'Your session has been confirmed', metadata: { sessionId: notifKey } }),
    createNotification({ userId: candidateUser._id, type: 'session', title: 'Session Booked', message: 'Your session has been confirmed', metadata: { sessionId: notifKey } })
  ]);

  const notifCount = await Notification.countDocuments({
    userId: candidateUser._id,
    'metadata.sessionId': notifKey
  });
  console.log(`Notification concurrency: notif1=${!!notif1}, notif2=${!!notif2}, total DB records=${notifCount}`);
  assert('Notification: deduplication window prevents duplicate notification records', notifCount === 1);
  await Notification.deleteMany({ userId: candidateUser._id, 'metadata.sessionId': notifKey });

  console.log('\n--- 3. EXPERT AVAILABILITY SAVE CHANGES IDEMPOTENCY ---');
  const availPayload = {
    sessionDuration: 30,
    maxPerDay: 6,
    weekly: {
      mon: [{ from: "10:00", to: "10:30" }]
    }
  };
  const [saveRes1, saveRes2] = await Promise.all([
    fetch('http://localhost:5000/api/expert/availability', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${expertToken}` },
      body: JSON.stringify(availPayload)
    }).then(r => r.json()),
    fetch('http://localhost:5000/api/expert/availability', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${expertToken}` },
      body: JSON.stringify(availPayload)
    }).then(r => r.json())
  ]);
  const expAfterSave = await ExpertDetails.findById(expert._id);
  let weeklyData = expAfterSave.availability.weekly;
  if (weeklyData instanceof Map) weeklyData = Object.fromEntries(weeklyData);
  const monSlotsCount = (weeklyData.mon || []).length;
  console.log(`Availability Save concurrency: res1.success=${saveRes1.success}, res2.success=${saveRes2.success}, mon slots count=${monSlotsCount}`);
  assert('Availability Save: concurrent saves produce exact single logical state in DB', saveRes1.success && saveRes2.success && monSlotsCount === 1);

  console.log('\n--- 4. PAYMENT METHOD ORDER CREATION (/api/payment/create-order) ---');
  const [orderRes1, orderRes2] = await Promise.all([
    fetch('http://localhost:5000/api/payment/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${candidateToken}` },
      body: JSON.stringify({
        amount: 500,
        currency: 'INR',
        bookingDetails: {
          expertId: expert._id.toString(),
          startTime: '2026-11-16T10:00:00+05:30',
          endTime: '2026-11-16T10:30:00+05:30',
          duration: 30
        }
      })
    }).then(r => r.json()),
    fetch('http://localhost:5000/api/payment/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${candidateToken}` },
      body: JSON.stringify({
        amount: 500,
        currency: 'INR',
        bookingDetails: {
          expertId: expert._id.toString(),
          startTime: '2026-11-16T10:00:00+05:30',
          endTime: '2026-11-16T10:30:00+05:30',
          duration: 30
        }
      })
    }).then(r => r.json())
  ]);
  console.log(`Order creation concurrency: res1.success=${orderRes1.success}, res2.success=${orderRes2.success}`);
  assert('Payment Order Creation: handled concurrently without crashes or corrupted state', orderRes1.success && orderRes2.success);

  console.log('\n--- 5. INTERVIEW BOOKING (WALLET PAYMENT) ATOMIC PROTECTION ---');
  // Fund candidate wallet with 1000 availableBalance
  let candWallet = await Wallet.findOne({ userId: candidateUser._id });
  if (!candWallet) {
    candWallet = await Wallet.create({ userId: candidateUser._id, availableBalance: 1000, frozenBalance: 0, currency: 'INR' });
  } else {
    candWallet.availableBalance = 1000;
    candWallet.frozenBalance = 0;
    await candWallet.save();
  }

  const initialBalance = candWallet.availableBalance;
  // Monday, Nov 16, 2026 10:00 AM (matches expert availability above)
  const bookingSlotTime = new Date("2026-11-16T10:00:00+05:30");
  const bookingEndTime = new Date("2026-11-16T10:30:00+05:30");
  const bookingSlotStr = bookingSlotTime.toISOString();

  // Send 2 concurrent identical wallet booking requests for the exact same slot
  console.log('Sending 2 concurrent book-with-wallet requests for Monday 10:00 AM slot...');
  const [bookRes1, bookRes2] = await Promise.all([
    fetch('http://localhost:5000/api/payment/book-with-wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${candidateToken}` },
      body: JSON.stringify({
        expertId: expert._id.toString(),
        startTime: bookingSlotStr,
        endTime: bookingEndTime.toISOString(),
        price: 500
      })
    }).then(r => r.json()),
    fetch('http://localhost:5000/api/payment/book-with-wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${candidateToken}` },
      body: JSON.stringify({
        expertId: expert._id.toString(),
        startTime: bookingSlotStr,
        endTime: bookingEndTime.toISOString(),
        price: 500
      })
    }).then(r => r.json())
  ]);

  console.log(`Booking concurrency results:`);
  console.log(`- Request 1: success=${bookRes1.success}, message=${bookRes1.message || 'Booked'}`);
  console.log(`- Request 2: success=${bookRes2.success}, message=${bookRes2.message || 'Booked'}`);

  const refreshedWallet = await Wallet.findOne({ userId: candidateUser._id });
  const balanceDifference = initialBalance - (refreshedWallet?.availableBalance || 0);
  const createdSessionsCount = await Session.countDocuments({
    expertId: expert._id,
    startTime: bookingSlotTime
  });

  console.log(`Wallet Balance: initial=${initialBalance}, current=${refreshedWallet?.availableBalance}, debited=${balanceDifference}`);
  console.log(`Created sessions count for slot: ${createdSessionsCount}`);

  assert('Booking Concurrency: Exactly 1 request succeeds and 1 is rejected', (bookRes1.success && !bookRes2.success) || (!bookRes1.success && bookRes2.success));
  assert('Booking Concurrency: Exactly 1 session created in DB', createdSessionsCount === 1);
  assert('Booking Concurrency: Exactly 1 financial debit (500 INR), zero duplicate debits', balanceDifference === 500);

  // Clean up created booking session
  await Session.deleteMany({ expertId: expert._id, startTime: bookingSlotTime });

  console.log('\n--- 6. SESSION JOIN ATOMIC ATTENDANCE PROTECTION ---');
  const joinSessId = `sess_join_idemp_${Date.now()}`;
  const joinSessionDoc = await Session.create({
    sessionId: joinSessId,
    candidateId: candidateUser._id,
    expertId: expert._id,
    startTime: new Date(Date.now() - 5 * 60 * 1000),
    endTime: new Date(Date.now() + 25 * 60 * 1000),
    status: 'confirmed',
    price: 500,
    attendanceStatus: 'scheduled',
    candidateJoinedAt: null
  });

  const resJ1 = createMockRes();
  const resJ2 = createMockRes();
  const reqJ = {
    params: { sessionId: joinSessId },
    user: { userId: candidateUser._id, userType: 'candidate' }
  };

  await Promise.all([
    joinSession(reqJ, resJ1),
    joinSession(reqJ, resJ2)
  ]);

  const refreshedJoinDoc = await Session.findOne({ sessionId: joinSessId });
  console.log(`Join concurrency: status=${refreshedJoinDoc.attendanceStatus}, joinedAt=${refreshedJoinDoc.candidateJoinedAt}`);
  assert('Session Join: attendanceStatus updated cleanly to attended', refreshedJoinDoc.attendanceStatus === 'attended');
  assert('Session Join: candidateJoinedAt set to a single valid timestamp', refreshedJoinDoc.candidateJoinedAt !== null);
  await Session.deleteOne({ sessionId: joinSessId });

  console.log('\n--- 7. MARK ABSENT (NO-SHOW) ATOMIC MUTATION & FINANCIAL SETTLEMENT ---');
  const noShowSessId = `sess_noshow_idemp_${Date.now()}`;
  const noShowSessionDoc = await Session.create({
    sessionId: noShowSessId,
    candidateId: candidateUser._id,
    expertId: expert._id,
    startTime: new Date(Date.now() - 16 * 60 * 1000), // 16 mins ago (> 15m grace period)
    endTime: new Date(Date.now() + 14 * 60 * 1000),
    status: 'confirmed',
    price: 500,
    attendanceStatus: 'scheduled',
    candidateJoinedAt: null
  });

  const resNS1 = createMockRes();
  const resNS2 = createMockRes();
  const reqNS = {
    params: { sessionId: noShowSessId },
    body: { reason: 'Candidate missed session' },
    user: { userId: expertUser._id, userType: 'expert' }
  };

  await Promise.all([
    markCandidateNoShow(reqNS, resNS1),
    markCandidateNoShow(reqNS, resNS2)
  ]);

  console.log(`Mark Absent concurrency: res1=${resNS1.statusCode} (${resNS1.data?.message || 'OK'}), res2=${resNS2.statusCode} (${resNS2.data?.message || 'OK'})`);
  const finalNoShowSession = await Session.findOne({ sessionId: noShowSessId });

  assert('Mark Absent: Exactly 1 request succeeds (HTTP 200) and concurrent duplicate rejected (HTTP 400 or 409 Conflict)',
    (resNS1.statusCode === 200 && (resNS2.statusCode === 400 || resNS2.statusCode === 409)) ||
    (resNS2.statusCode === 200 && (resNS1.statusCode === 400 || resNS1.statusCode === 409))
  );
  assert('Mark Absent: Final status is CANDIDATE_NO_SHOW exactly once', finalNoShowSession.status === 'CANDIDATE_NO_SHOW');
  await Session.deleteOne({ sessionId: noShowSessId });

  console.log('\n--- 8. FEEDBACK REQUEST & REMINDER IDEMPOTENCY ---');
  const feedbackSessId = `sess_fb_idemp_${Date.now()}`;
  await Session.create({
    sessionId: feedbackSessId,
    candidateId: candidateUser._id,
    expertId: expert._id,
    startTime: new Date(Date.now() - 60 * 60 * 1000),
    endTime: new Date(Date.now() - 30 * 60 * 1000),
    status: 'completed',
    price: 500,
    feedbackRequested: false,
    feedbackRequestCount: 0
  });

  const resFB1 = createMockRes();
  const resFB2 = createMockRes();
  const reqFB = {
    params: { sessionId: feedbackSessId },
    user: { userId: candidateUser._id, userType: 'candidate' }
  };

  await Promise.all([
    requestFeedback(reqFB, resFB1),
    requestFeedback(reqFB, resFB2)
  ]);

  const refreshedFBSess = await Session.findOne({ sessionId: feedbackSessId });
  console.log(`Feedback concurrency: res1=${resFB1.statusCode}, res2=${resFB2.statusCode}, count=${refreshedFBSess.feedbackRequestCount}`);
  assert('Feedback Request: Exactly 1 request succeeds and 2nd concurrent call rejected',
    (resFB1.statusCode === 200 && resFB2.statusCode === 400) || (resFB1.statusCode === 400 && resFB2.statusCode === 200)
  );
  assert('Feedback Request: feedbackRequestCount is exactly 1', refreshedFBSess.feedbackRequestCount === 1);
  await Session.deleteOne({ sessionId: feedbackSessId });

  console.log('\n--- 9. EXPERT REVIEW SUBMISSION DUPLICATE PROTECTION ---');
  const reviewSessId = `sess_rev_idemp_${Date.now()}`;
  await Session.create({
    sessionId: reviewSessId,
    candidateId: candidateUser._id,
    expertId: expert._id,
    startTime: new Date(Date.now() - 60 * 60 * 1000),
    endTime: new Date(Date.now() - 30 * 60 * 1000),
    status: 'completed',
    price: 500
  });

  const resRev1 = createMockRes();
  const resRev2 = createMockRes();
  const reqRev = {
    params: { sessionId: reviewSessId },
    body: {
      reviewerRole: 'expert',
      overallRating: 5,
      feedback: 'Excellent mock interview performance and clear answers.',
      technicalRating: 5,
      communicationRating: 5,
      problemSolvingRating: 5
    },
    user: { userId: expertUser._id, userType: 'expert' }
  };

  await Promise.all([
    submitReview(reqRev, resRev1),
    submitReview(reqRev, resRev2)
  ]);

  const createdReviewsCount = await Review.countDocuments({ sessionId: reviewSessId });
  console.log(`Review concurrency: res1=${resRev1.statusCode} (${resRev1.data?.message || 'OK'}), res2=${resRev2.statusCode} (${resRev2.data?.message || 'OK'}), reviews in DB=${createdReviewsCount}`);
  assert('Expert Review: exactly 1 review document created in DB', createdReviewsCount === 1);
  assert('Expert Review: duplicate submission handled idempotently (status 200 or 201)',
    (resRev1.statusCode === 201 || resRev1.statusCode === 200) &&
    (resRev2.statusCode === 200 || resRev2.statusCode === 201)
  );
  await Session.deleteOne({ sessionId: reviewSessId });
  await Review.deleteMany({ sessionId: reviewSessId });

  console.log('\n================================================================================');
  console.log(`   TASK 2 AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================================');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error in verify_task2:', err);
  process.exit(1);
});
