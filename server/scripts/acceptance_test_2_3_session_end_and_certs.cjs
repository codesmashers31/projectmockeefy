/**
 * ACCEPTANCE TESTS 2 & 3:
 * TEST 2: EXPERT ENDS SESSION (REAL-TIME SOCKET + CANDIDATE EXIT + RECONNECT)
 * TEST 3: CERTIFICATE COUNT RECALCULATION & FEEDBACK JOURNEY
 */

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const assert = require('assert');
const jwt = require('jsonwebtoken');
const ioClient = require('../../client/node_modules/socket.io-client');

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_BASE = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'code@1234';

async function run() {
  console.log('================================================================');
  console.log('   ACCEPTANCE TESTS 2 & 3: SESSION END & CERTIFICATE COUNT');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('Connected to MongoDB:', mongoose.connection.name);

  const User = (await import('../models/User.js')).default;
  const Session = (await import('../models/Session.js')).default;
  const ReviewDetails = (await import('../models/reviewModel.js')).default;
  const Category = (await import('../models/Category.js')).default;
  const { getEligibleCompletedSessions } = await import('../controllers/certificationController.js');

  const testSuffix = Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  // 1. Create isolated candidate and expert
  const candidateUser = await User.create({
    name: 'EndSession Candidate ' + testSuffix,
    email: `cand_endsession_${testSuffix}@mockeefy.test`,
    password: 'password123',
    userType: 'candidate',
    role: 'candidate',
    walletBalance: 1500
  });

  const expertUser = await User.create({
    name: 'EndSession Expert ' + testSuffix,
    email: `exp_endsession_${testSuffix}@mockeefy.test`,
    password: 'password123',
    userType: 'expert',
    role: 'expert',
    walletBalance: 0
  });

  let testCat = await Category.findOne({});
  if (!testCat) {
    testCat = await Category.create({ name: 'System Design' });
  }

  const candidateToken = jwt.sign(
    { email: candidateUser.email, userType: 'candidate', name: candidateUser.name, userId: candidateUser._id },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  const expertToken = jwt.sign(
    { email: expertUser.email, userType: 'expert', name: expertUser.name, userId: expertUser._id },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  let candidateSocket = null;
  let expertSocket = null;

  try {
    const now = new Date();
    // Started 5 min ago, scheduled for 30 min
    const startTime = new Date(now.getTime() - 5 * 60 * 1000);
    const endTime = new Date(now.getTime() + 25 * 60 * 1000);
    const sessionId = `SESSION_LIVE_${testSuffix}`;

    const sessionDoc = await Session.create({
      sessionId,
      candidateId: candidateUser._id,
      expertId: expertUser._id,
      startTime,
      endTime,
      slotLockKey: `${expertUser._id}_${startTime.toISOString()}_${endTime.toISOString()}`,
      status: 'confirmed',
      attendanceStatus: 'attended',
      candidateJoinedAt: startTime,
      expertJoinedAt: startTime,
      price: 600,
      categoryId: testCat._id,
      categoryNameSnapshot: testCat.name,
      meetingLink: `https://meet.google.com/test-${testSuffix}`
    });

    console.log(`Created live test session: ${sessionId}`);

    // -------------------------------------------------------------
    // TEST 2.1: Establish separate authenticated Socket.IO sessions
    // -------------------------------------------------------------
    console.log('\n--- Test 2.1: Connecting Candidate and Expert WebSockets ---');

    const connectSocket = (token) => {
      return new Promise((resolve, reject) => {
        const s = ioClient(SOCKET_URL, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true
        });
        s.on('connect', () => resolve(s));
        s.on('connect_error', (err) => reject(err));
      });
    };

    candidateSocket = await connectSocket(candidateToken);
    expertSocket = await connectSocket(expertToken);
    console.log(`Candidate Socket Connected: ${candidateSocket.id}`);
    console.log(`Expert Socket Connected: ${expertSocket.id}`);

    // Both join meeting session room
    candidateSocket.emit('join-session', sessionId);
    expertSocket.emit('join-session', sessionId);
    await new Promise(r => setTimeout(r, 200));

    // -------------------------------------------------------------
    // TEST 2.2: Candidate leaving or refreshing does not end session
    // -------------------------------------------------------------
    console.log('\n--- Test 2.2: Candidate leave / refresh isolation ---');
    // Candidate simulates leave
    candidateSocket.emit('leave-session', sessionId);
    await new Promise(r => setTimeout(r, 200));

    const checkDocBefore = await Session.findOne({ sessionId });
    assert.strictEqual(checkDocBefore.status, 'confirmed', 'Candidate leaving room must NOT change session status to completed');
    console.log('✅ Criteria Verified: Candidate leaving room does NOT end the expert session.');

    // Candidate rejoins session room
    candidateSocket.emit('join-session', sessionId);
    await new Promise(r => setTimeout(r, 200));

    // -------------------------------------------------------------
    // TEST 2.3: Expert clicks End Session -> Real-time sync & DB update
    // -------------------------------------------------------------
    console.log('\n--- Test 2.3: Expert ends session early ---');

    let receivedSyncPayload = null;
    let eventReceivedTimestamp = null;

    candidateSocket.on('DATA_SYNC', (payload) => {
      console.log('Candidate received DATA_SYNC:', payload.type);
      if (payload.type === 'SESSION_UPDATED') {
        receivedSyncPayload = payload;
        eventReceivedTimestamp = Date.now();
      }
    });

    const triggerTime = Date.now();
    const endRes = await fetch(`${API_BASE}/sessions/${sessionId}/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${expertToken}`
      },
      body: JSON.stringify({ attendanceOutcome: 'ATTENDED_COMPLETED', completionEvidence: { interviewConducted: true }, reason: 'Interview completed by expert' })
    });

    const endData = await endRes.json();
    console.log(`End Session HTTP Response [${endRes.status}]:`, endData.message || endData);
    assert.strictEqual(endRes.status, 200, 'End session API must return HTTP 200');
    assert.strictEqual(endData.success, true);
    assert.strictEqual(endData.data.status, 'completed');

    // Wait for real-time socket event delivery
    for (let i = 0; i < 20; i++) {
      if (receivedSyncPayload) break;
      await new Promise(r => setTimeout(r, 100));
    }

    assert(receivedSyncPayload, 'Candidate must receive SESSION_UPDATED socket event');
    const syncLatencyMs = eventReceivedTimestamp - triggerTime;
    console.log(`⚡ Real-Time Socket Event Delivery Latency: ${syncLatencyMs} ms`);

    // Verify MongoDB status
    const sessionAfter = await Session.findOne({ sessionId });
    assert.strictEqual(sessionAfter.status, 'completed', 'MongoDB session status must be completed');
    assert(sessionAfter.actualEndTime, 'actualEndTime must be stored');
    console.log('✅ Criteria Verified: MongoDB status is completed and candidate received SESSION_UPDATED in real time.');

    // -------------------------------------------------------------
    // TEST 2.4: Candidate views completed session details
    // -------------------------------------------------------------
    console.log('\n--- Test 2.4: Candidate retrieves completed session details ---');
    const candGetRes = await fetch(`${API_BASE}/sessions/${sessionId}`, {
      headers: { 'Authorization': `Bearer ${candidateToken}` }
    });
    const candGetData = await candGetRes.json();
    assert.strictEqual(candGetRes.status, 200);
    assert.strictEqual(candGetData.status, 'completed');
    console.log('✅ Criteria Verified: Candidate fetches completed session details cleanly.');

    // -------------------------------------------------------------
    // TEST 2.5: Socket disconnect and reconnect fallback test
    // -------------------------------------------------------------
    console.log('\n--- Test 2.5: Socket disconnect and reconnect fallback ---');
    candidateSocket.disconnect();
    await new Promise(r => setTimeout(r, 200));
    assert.strictEqual(candidateSocket.connected, false, 'Candidate socket should be disconnected');

    // Reconnect
    candidateSocket.connect();
    await new Promise(r => setTimeout(r, 500));
    assert.strictEqual(candidateSocket.connected, true, 'Candidate socket should be reconnected successfully');
    console.log('✅ Criteria Verified: Socket disconnection and reconnection fallback behaves correctly.');

    // =============================================================
    // TEST 3: CERTIFICATE COUNT JOURNEY
    // =============================================================
    console.log('\n================================================================');
    console.log('   TEST 3: COMPLETE CERTIFICATE COUNT JOURNEY');
    console.log('================================================================');

    // 1. Initial count check
    const initialEligible = await getEligibleCompletedSessions(candidateUser._id);
    console.log(`Initial eligible completed sessions count: ${initialEligible.length}`);

    // 2. Expert submits review feedback for the completed session
    console.log('\n--- Submitting Expert Review for the completed session ---');
    const reviewRes = await fetch(`${API_BASE}/sessions/${sessionId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${expertToken}`
      },
      body: JSON.stringify({
        reviewerRole: 'expert',
        overallRating: 5,
        technicalRating: 5,
        communicationRating: 4,
        problemSolvingRating: 5,
        designRating: 4,
        behavioralRating: 5,
        feedback: 'Exceptional system architecture and problem solving approach.',
        hiringDecision: 'Strong Hire'
      })
    });

    const reviewData = await reviewRes.json();
    console.log(`Review submission HTTP [${reviewRes.status}]:`, reviewData.message);
    assert([200, 201].includes(reviewRes.status), 'Review submission must return HTTP 200 or 201');

    // 3. Verify ReviewDetails document persisted in MongoDB
    const persistedReview = await ReviewDetails.findOne({ sessionId, reviewerRole: 'expert' });
    assert(persistedReview, 'ReviewDetails document must exist in MongoDB');
    assert.strictEqual(persistedReview.overallRating, 4.6, 'Rating should match computed average');
    console.log('✅ Criteria Verified: Feedback document is persisted with ratings and feedback.');

    // 4. Candidate submits feedback for expert as well
    const candReviewRes = await fetch(`${API_BASE}/sessions/${sessionId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${candidateToken}`
      },
      body: JSON.stringify({
        reviewerRole: 'candidate',
        overallRating: 5,
        feedback: 'Very helpful and thorough mock interview.'
      })
    });
    const candReviewData = await candReviewRes.json();
    assert([200, 201].includes(candReviewRes.status), 'Candidate review must return HTTP 200 or 201');

    // 5. Verify certificate preview API recalculation
    console.log('\n--- Fetching Certificate Preview API (MongoDB recalculation) ---');
    const certPrevRes = await fetch(`${API_BASE}/certifications/preview`, {
      headers: { 'Authorization': `Bearer ${candidateToken}` }
    });
    const certPrevData = await certPrevRes.json();
    console.log('Certificate Preview Status:', certPrevData.success);
    assert.strictEqual(certPrevRes.status, 200);
    assert.strictEqual(certPrevData.success, true);

    const eligibleAfter = await getEligibleCompletedSessions(candidateUser._id);
    console.log(`Eligible sessions count after evaluation: ${eligibleAfter.length}`);
    assert.strictEqual(eligibleAfter.length, initialEligible.length + 1, 'Eligible count must increase by exactly 1');
    assert.strictEqual(eligibleAfter[0].sessionId, sessionId);
    console.log('✅ Criteria Verified: Certificate count dynamically recalculated from MongoDB.');

    // 6. Exclusions: cancelled and absent sessions
    console.log('\n--- Verifying Ineligible Sessions Are Excluded ---');
    // Add cancelled session
    const cancelledSession = await Session.create({
      sessionId: `SESSION_CANC_${testSuffix}`,
      candidateId: candidateUser._id,
      expertId: expertUser._id,
      startTime: new Date(now.getTime() - 40 * 60 * 1000),
      endTime: new Date(now.getTime() - 10 * 60 * 1000),
      slotLockKey: `${expertUser._id}_canc_${testSuffix}`,
      status: 'cancelled',
      categoryId: testCat._id,
      categoryNameSnapshot: testCat.name
    });

    // Add absent session
    const noShowSession = await Session.create({
      sessionId: `SESSION_NOSHOW_${testSuffix}`,
      candidateId: candidateUser._id,
      expertId: expertUser._id,
      startTime: new Date(now.getTime() - 50 * 60 * 1000),
      endTime: new Date(now.getTime() - 20 * 60 * 1000),
      slotLockKey: `${expertUser._id}_noshow_${testSuffix}`,
      status: 'CANDIDATE_NO_SHOW',
      attendanceStatus: 'no-show',
      categoryId: testCat._id,
      categoryNameSnapshot: testCat.name
    });

    const eligibleWithIneligible = await getEligibleCompletedSessions(candidateUser._id);
    assert.strictEqual(eligibleWithIneligible.length, 1, 'Only the 1 completed and evaluated session should be eligible');
    const hasCancelled = eligibleWithIneligible.some(s => s.sessionId === cancelledSession.sessionId);
    const hasNoShow = eligibleWithIneligible.some(s => s.sessionId === noShowSession.sessionId);
    assert.strictEqual(hasCancelled, false, 'Cancelled session must not be eligible');
    assert.strictEqual(hasNoShow, false, 'Absent session must not be eligible');
    console.log('✅ Criteria Verified: Cancelled and Absent sessions are strictly excluded from certificate count.');

    console.log('\n🎉 ALL CRITERIA FOR TEST 2 & TEST 3 PASSED WITH 100% SUCCESS!');
  } finally {
    if (candidateSocket) candidateSocket.disconnect();
    if (expertSocket) expertSocket.disconnect();

    console.log('\n--- Cleaning up Tests 2 & 3 data ---');
    await Session.deleteMany({ expertId: expertUser._id });
    await ReviewDetails.deleteMany({ candidateId: candidateUser._id });
    await User.deleteMany({ _id: { $in: [candidateUser._id, expertUser._id] } });
    console.log('Cleanup complete.');
    await mongoose.disconnect();
  }
}

run().catch(err => {
  console.error('Test 2 & 3 Error:', err);
  process.exit(1);
});
