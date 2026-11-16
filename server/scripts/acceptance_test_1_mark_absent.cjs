/**
 * ACCEPTANCE TEST 1: MARK ABSENT
 *
 * Verifies all 9 criteria:
 * 1. At scheduled start (0 min), Mark Absent is locked (HTTP 400, grace active).
 * 2. At 14m 59s, it remains locked (HTTP 400, grace active).
 * 3. At exactly 15m 00s, boundary behavior: permitted (HTTP 200).
 * 4. Expert can mark candidate absent only after permitted waiting period.
 * 5. Candidate who already joined cannot be marked absent (HTTP 400).
 * 6. Duplicate absent requests cannot create duplicate updates (HTTP 400).
 * 7. Candidate receives in-app notification.
 * 8. Candidate receives actual absence email through EmailOutbox.
 * 9. Absent interview is strictly excluded from certificate eligibility.
 */

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const assert = require('assert');
const jwt = require('jsonwebtoken');

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_BASE = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'code@1234';

async function run() {
  console.log('================================================================');
  console.log('   ACCEPTANCE TEST 1: MARK ABSENT VERIFICATION');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('Connected to MongoDB:', mongoose.connection.name);

  const User = (await import('../models/User.js')).default;
  const Session = (await import('../models/Session.js')).default;
  const Notification = (await import('../models/Notification.js')).default;
  const EmailOutbox = (await import('../models/EmailOutbox.js')).default;
  const Category = (await import('../models/Category.js')).default;
  const { getEligibleCompletedSessions } = await import('../controllers/certificationController.js');

  const testSuffix = Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  // Create isolated candidate and expert
  const testCandidate = await User.create({
    name: 'Absent Candidate ' + testSuffix,
    email: `candidate_abs_${testSuffix}@mockeefy.test`,
    password: 'password123',
    userType: 'candidate',
    role: 'candidate',
    walletBalance: 1000
  });

  const testExpert = await User.create({
    name: 'Absent Expert ' + testSuffix,
    email: `expert_abs_${testSuffix}@mockeefy.test`,
    password: 'password123',
    userType: 'expert',
    role: 'expert',
    walletBalance: 0
  });

  let testCat = await Category.findOne({});
  if (!testCat) {
    testCat = await Category.create({ name: 'Web Development' });
  }

  // Generate auth tokens
  const expertToken = jwt.sign(
    { email: testExpert.email, userType: 'expert', name: testExpert.name, userId: testExpert._id },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  const candidateToken = jwt.sign(
    { email: testCandidate.email, userType: 'candidate', name: testCandidate.name, userId: testCandidate._id },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  try {
    const now = new Date();

    // ------------------------------------------------------------------
    // Case 1: At scheduled start (0s elapsed): Mark Absent MUST be locked
    // ------------------------------------------------------------------
    console.log('\n--- 1. Testing at Scheduled Start (0 min elapsed) ---');
    const start0 = new Date(now.getTime());
    const end0 = new Date(now.getTime() + 30 * 60 * 1000);
    const session0 = await Session.create({
      sessionId: `SESSION_START_0_${testSuffix}`,
      candidateId: testCandidate._id,
      expertId: testExpert._id,
      startTime: start0,
      endTime: end0,
      slotLockKey: `${testExpert._id}_${start0.toISOString()}_${end0.toISOString()}`,
      status: 'confirmed',
      price: 500,
      categoryId: testCat._id,
      categoryNameSnapshot: testCat.name
    });

    const res0 = await fetch(`${API_BASE}/sessions/${session0.sessionId}/no-show`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${expertToken}`
      },
      body: JSON.stringify({ reason: 'Attempting to mark absent at scheduled start' })
    });
    const data0 = await res0.json();
    console.log(`[0m elapsed] HTTP ${res0.status}:`, data0.message);
    assert.strictEqual(res0.status, 400, 'Should return HTTP 400 at scheduled start');
    assert.strictEqual(data0.success, false);
    assert(data0.message.includes('15-minute grace period'), 'Message must state 15-minute grace period');
    console.log('✅ Criteria 1 Passed: Mark Absent is locked at scheduled start.');

    // ------------------------------------------------------------------
    // Case 2: At 14m 59s elapsed: Mark Absent MUST remain locked
    // ------------------------------------------------------------------
    console.log('\n--- 2. Testing at 14 minutes 59 seconds elapsed ---');
    const start1459 = new Date(now.getTime() - (14 * 60 * 1000 + 59 * 1000));
    const end1459 = new Date(start1459.getTime() + 30 * 60 * 1000);
    const session1459 = await Session.create({
      sessionId: `SESSION_1459_${testSuffix}`,
      candidateId: testCandidate._id,
      expertId: testExpert._id,
      startTime: start1459,
      endTime: end1459,
      slotLockKey: `${testExpert._id}_${start1459.toISOString()}_${end1459.toISOString()}`,
      status: 'confirmed',
      price: 500,
      categoryId: testCat._id,
      categoryNameSnapshot: testCat.name
    });

    const res1459 = await fetch(`${API_BASE}/sessions/${session1459.sessionId}/no-show`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${expertToken}`
      },
      body: JSON.stringify({ reason: 'Attempting at 14m 59s' })
    });
    const data1459 = await res1459.json();
    console.log(`[14m 59s elapsed] HTTP ${res1459.status}:`, data1459.message);
    assert.strictEqual(res1459.status, 400, 'Should return HTTP 400 at 14m 59s');
    assert.strictEqual(data1459.success, false);
    assert(data1459.message.includes('1 min remaining'), 'Should report 1 min remaining');
    console.log('✅ Criteria 2 Passed: Mark Absent remains locked at 14m 59s.');

    // ------------------------------------------------------------------
    // Case 3 & 4: At exactly 15m 00s elapsed: Mark Absent is permitted
    // ------------------------------------------------------------------
    console.log('\n--- 3 & 4. Testing at exactly 15 minutes 00 seconds (Permitted) ---');
    const start1500 = new Date(now.getTime() - (15 * 60 * 1000));
    const end1500 = new Date(start1500.getTime() + 30 * 60 * 1000);
    const session1500 = await Session.create({
      sessionId: `SESSION_1500_${testSuffix}`,
      candidateId: testCandidate._id,
      expertId: testExpert._id,
      startTime: start1500,
      endTime: end1500,
      slotLockKey: `${testExpert._id}_${start1500.toISOString()}_${end1500.toISOString()}`,
      status: 'confirmed',
      price: 500,
      categoryId: testCat._id,
      categoryNameSnapshot: testCat.name
    });

    const res1500 = await fetch(`${API_BASE}/sessions/${session1500.sessionId}/no-show`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${expertToken}`
      },
      body: JSON.stringify({ reason: 'Candidate did not join within 15-minute grace period' })
    });
    const data1500 = await res1500.json();
    console.log(`[15m 00s elapsed] HTTP ${res1500.status}:`, data1500.message);
    assert.strictEqual(res1500.status, 200, 'Should return HTTP 200 at 15m 00s');
    assert.strictEqual(data1500.success, true);
    assert.strictEqual(data1500.data.status, 'CANDIDATE_NO_SHOW');
    assert.strictEqual(data1500.data.attendanceStatus, 'no-show');
    console.log('✅ Criteria 3 & 4 Passed: Expert successfully marked candidate absent after 15 minutes.');

    // ------------------------------------------------------------------
    // Case 5: Candidate who already joined CANNOT be marked absent
    // ------------------------------------------------------------------
    console.log('\n--- 5. Candidate who already joined cannot be marked absent ---');
    const startJoined = new Date(now.getTime() - 20 * 60 * 1000);
    const endJoined = new Date(startJoined.getTime() + 30 * 60 * 1000);
    const sessionJoined = await Session.create({
      sessionId: `SESSION_JOINED_${testSuffix}`,
      candidateId: testCandidate._id,
      expertId: testExpert._id,
      startTime: startJoined,
      endTime: endJoined,
      slotLockKey: `${testExpert._id}_${startJoined.toISOString()}_${endJoined.toISOString()}`,
      status: 'confirmed',
      attendanceStatus: 'attended',
      candidateJoinedAt: new Date(startJoined.getTime() + 2 * 60 * 1000), // Joined at 2 min
      price: 500,
      categoryId: testCat._id,
      categoryNameSnapshot: testCat.name
    });

    const resJoined = await fetch(`${API_BASE}/sessions/${sessionJoined.sessionId}/no-show`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${expertToken}`
      },
      body: JSON.stringify({ reason: 'Attempting on attended candidate' })
    });
    const dataJoined = await resJoined.json();
    console.log(`[Joined candidate] HTTP ${resJoined.status}:`, dataJoined.message);
    assert.strictEqual(resJoined.status, 400, 'Should reject no-show for attended candidate');
    assert(dataJoined.message.includes('attended') || dataJoined.message.includes('attendance has been detected'), 'Should state attendance detected');
    console.log('✅ Criteria 5 Passed: Attended candidate cannot be marked absent.');

    // ------------------------------------------------------------------
    // Case 6: Duplicate absent requests cannot create duplicate updates
    // ------------------------------------------------------------------
    console.log('\n--- 6. Duplicate absent requests rejection (Idempotency) ---');
    const resDup = await fetch(`${API_BASE}/sessions/${session1500.sessionId}/no-show`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${expertToken}`
      },
      body: JSON.stringify({ reason: 'Duplicate attempt' })
    });
    const dataDup = await resDup.json();
    console.log(`[Duplicate request] HTTP ${resDup.status}:`, dataDup.message);
    assert.strictEqual(resDup.status, 400, 'Should reject duplicate mark absent');
    assert(dataDup.message.includes('already been marked'), 'Message should indicate already marked');
    console.log('✅ Criteria 6 Passed: Duplicate mark absent is strictly rejected.');

    // ------------------------------------------------------------------
    // Case 7: Candidate receives an in-app notification
    // ------------------------------------------------------------------
    console.log('\n--- 7. In-App Notification check ---');
    const notif = await Notification.findOne({
      userId: testCandidate._id,
      type: 'session_no_show'
    }).lean();
    console.log('Notification found:', notif ? { title: notif.title, message: notif.message } : 'None');
    assert(notif, 'In-app notification must be recorded for candidate');
    assert(notif.message.includes('absent'), 'Notification message must state absence');
    console.log('✅ Criteria 7 Passed: Candidate in-app notification delivered.');

    // ------------------------------------------------------------------
    // Case 8: Candidate receives an actual absence email through EmailOutbox
    // ------------------------------------------------------------------
    console.log('\n--- 8. EmailOutbox record check ---');
    const outboxRecord = await EmailOutbox.findOne({
      sessionId: session1500.sessionId,
      recipientType: 'candidate'
    }).lean();
    console.log('EmailOutbox record:', outboxRecord ? {
      to: outboxRecord.to,
      subject: outboxRecord.subject,
      status: outboxRecord.status,
      idempotencyKey: outboxRecord.idempotencyKey
    } : 'None');
    assert(outboxRecord, 'EmailOutbox record must exist');
    assert.strictEqual(outboxRecord.status, 'pending');
    assert(outboxRecord.subject.includes('Marked Absent'), 'Subject must indicate marked absent');
    assert(outboxRecord.html.includes('missed sessions') || outboxRecord.html.includes('15-minute'), 'HTML content must mention absence policy');
    console.log('✅ Criteria 8 Passed: Absence email successfully enqueued in EmailOutbox.');

    // ------------------------------------------------------------------
    // Case 9: Absent interview is excluded from certificate eligibility
    // ------------------------------------------------------------------
    console.log('\n--- 9. Certificate eligibility exclusion check ---');
    const eligibleSessions = await getEligibleCompletedSessions(testCandidate._id);
    const absentIncluded = eligibleSessions.some(s => s.sessionId === session1500.sessionId);
    console.log('Eligible sessions count for candidate:', eligibleSessions.length);
    assert.strictEqual(absentIncluded, false, 'Absent session must never be included in certificate progress');
    console.log('✅ Criteria 9 Passed: Absent session strictly excluded from certificate eligibility.');

    console.log('\n🎉 ALL 9 TEST 1 CRITERIA VERIFIED SUCCESSFULLY WITH REAL BACKEND EVIDENCE!');
  } finally {
    // Clean up test data
    console.log('\n--- Cleaning up Test 1 data ---');
    await Session.deleteMany({ expertId: testExpert._id });
    await Notification.deleteMany({ userId: testCandidate._id });
    await EmailOutbox.deleteMany({ to: testCandidate.email });
    await User.deleteMany({ _id: { $in: [testCandidate._id, testExpert._id] } });
    console.log('Test 1 cleanup complete.');
    await mongoose.disconnect();
  }
}

run().catch(err => {
  console.error('Test 1 Failed:', err);
  process.exit(1);
});
