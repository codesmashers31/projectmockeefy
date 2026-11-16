const mongoose = require('mongoose');
const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  console.log('========================================================================');
  console.log('🚀 TESTING NO-SHOW NOTIFICATIONS, OUTBOX GENERATION & IDEMPOTENCY');
  console.log('========================================================================\n');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB replica set:', mongoose.connection.name);

  const User = (await import('../models/User.js')).default;
  const Expert = (await import('../models/expertModel.js')).default;
  const Session = (await import('../models/Session.js')).default;
  const PaymentRecord = (await import('../models/PaymentRecord.js')).default;
  const Notification = (await import('../models/Notification.js')).default;
  const EmailOutbox = (await import('../models/EmailOutbox.js')).default;
  const { markCandidateNoShow } = await import('../controllers/sessionController.js');

  const testSuffix = Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  const expertUser = await User.create({
    name: 'Dr. NoShow Expert ' + testSuffix,
    email: `exp_noshow_${testSuffix}@mockeefy.test`,
    password: 'Password123!',
    role: 'expert',
    userType: 'expert',
    walletBalance: 0
  });

  const expertDoc = await Expert.create({
    userId: expertUser._id,
    name: expertUser.name,
    email: expertUser.email,
    approvalStatus: 'approved',
    verificationStatus: 'verified',
    category: 'Backend Architecture'
  });

  const candidateUser = await User.create({
    name: 'Absent Candidate ' + testSuffix,
    email: `cand_noshow_${testSuffix}@mockeefy.test`,
    password: 'Password123!',
    role: 'candidate',
    userType: 'candidate'
  });

  const sId = `ses_noshow_${testSuffix}`;
  const now = new Date();
  const startTime = new Date(now.getTime() - 17 * 60 * 1000);
  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

  const sess = await Session.create({
    sessionId: sId,
    expertId: expertDoc._id,
    candidateId: candidateUser._id,
    status: 'confirmed',
    attendanceStatus: 'scheduled',
    startTime,
    endTime,
    duration: 30,
    price: 500
  });

  await PaymentRecord.create({
    sessionId: sId,
    paymentId: `pay_${sId}`,
    orderId: `order_${sId}`,
    amount: 500,
    status: 'verified',
    source: 'RAZORPAY',
    userId: candidateUser._id,
    paymentType: 'booking'
  });

  // Call markCandidateNoShow
  let statusCode = 200;
  let resBody = null;
  const req = {
    params: { sessionId: sId },
    body: { reason: 'Candidate uncontactable after 15 minutes' },
    user: { userId: expertUser._id.toString(), userType: 'expert' }
  };
  const res = {
    status(c) { statusCode = c; return this; },
    json(d) { resBody = d; return this; }
  };

  await markCandidateNoShow(req, res);
  assert.strictEqual(statusCode, 200, 'markCandidateNoShow should succeed with 200');

  // 1. Verify Candidate in-app notification
  const candNotifs = await Notification.find({ userId: candidateUser._id, type: 'session_no_show' });
  assert.strictEqual(candNotifs.length, 1, 'Exactly one candidate no-show notification must be created');
  assert.ok(candNotifs[0].title.includes('Absent'), 'Notification title must mention Absent');
  assert.strictEqual(candNotifs[0].metadata?.sessionId, sId);
  assert.strictEqual(candNotifs[0].metadata?.link, '/my-sessions');
  console.log('  ✅ [PASS] Candidate notification verified: Title = "' + candNotifs[0].title + '", link = ' + candNotifs[0].metadata?.link);

  // 2. Verify Expert in-app notification
  const expNotifs = await Notification.find({ userId: expertUser._id, type: 'wallet_credit' });
  assert.strictEqual(expNotifs.length, 1, 'Exactly one expert wallet credit notification must be created');
  assert.ok(expNotifs[0].title.includes('No-Show Payout Credited'));
  assert.strictEqual(expNotifs[0].metadata?.sessionId, sId);
  console.log('  ✅ [PASS] Expert notification verified: Title = "' + expNotifs[0].title + '", Amount = ₹' + expNotifs[0].metadata?.amount);

  // 3. Verify Candidate EmailOutbox durable record
  const outboxEntries = await EmailOutbox.find({ sessionId: sId, recipientType: 'candidate' });
  assert.strictEqual(outboxEntries.length, 1, 'Exactly one EmailOutbox entry must be created for candidate');
  assert.strictEqual(outboxEntries[0].to, candidateUser.email.toLowerCase());
  assert.strictEqual(outboxEntries[0].idempotencyKey, `${sId}_candidate_session_no_show`);
  console.log('  ✅ [PASS] EmailOutbox record verified: To = ' + outboxEntries[0].to + ', IdempotencyKey = ' + outboxEntries[0].idempotencyKey);

  // 4. Test Idempotency: Attempt duplicate absent marking
  let dupStatus = 200;
  let dupBody = null;
  const resDup = {
    status(c) { dupStatus = c; return this; },
    json(d) { dupBody = d; return this; }
  };
  await markCandidateNoShow(req, resDup);
  assert.strictEqual(dupStatus, 400, 'Duplicate absent call must be rejected');

  const candNotifsAfter = await Notification.find({ userId: candidateUser._id, type: 'session_no_show' });
  assert.strictEqual(candNotifsAfter.length, 1, 'No duplicate candidate notification created');

  const expNotifsAfter = await Notification.find({ userId: expertUser._id, type: 'wallet_credit' });
  assert.strictEqual(expNotifsAfter.length, 1, 'No duplicate expert notification created');

  const outboxAfter = await EmailOutbox.find({ sessionId: sId, recipientType: 'candidate' });
  assert.strictEqual(outboxAfter.length, 1, 'No duplicate outbox entry created');
  console.log('  ✅ [PASS] Duplicate prevention strictly verified: Zero duplicate notifications or outbox records.');

  // Cleanup
  await Session.deleteOne({ _id: sess._id });
  await PaymentRecord.deleteOne({ sessionId: sId });
  await Notification.deleteMany({ userId: { $in: [candidateUser._id, expertUser._id] } });
  await EmailOutbox.deleteMany({ sessionId: sId });
  await Expert.deleteOne({ _id: expertDoc._id });
  await User.deleteMany({ _id: { $in: [candidateUser._id, expertUser._id] } });
  await mongoose.disconnect();

  console.log('\n========================================================================');
  console.log('🎉 NO-SHOW NOTIFICATIONS, OUTBOX GENERATION & IDEMPOTENCY 100% VERIFIED!');
  console.log('========================================================================');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
