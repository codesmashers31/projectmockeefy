const mongoose = require('mongoose');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const API_BASE = 'http://localhost:5000/api';

async function run() {
  console.log('=== VERIFYING ATTENDANCE INTEGRITY, COMPLETION PROOF & ATOMICTY ===');
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const Session = (await import('../models/Session.js')).default;
  const User = (await import('../models/User.js')).default;
  const Expert = (await import('../models/expertModel.js')).default;

  // Find real candidate and expert
  const candidate = await User.findOne({ userType: 'candidate' });
  const expertUser = await User.findOne({ userType: 'expert' });
  const expertDoc = await Expert.findOne({ userId: expertUser._id });

  if (!candidate || !expertUser || !expertDoc) {
    throw new Error('Test users not found');
  }

  const candToken = jwt.sign({ userId: candidate._id, userType: 'candidate', email: candidate.email }, JWT_SECRET, { expiresIn: '1h' });
  const expertToken = jwt.sign({ userId: expertUser._id, userType: 'expert', email: expertUser.email }, JWT_SECRET, { expiresIn: '1h' });

  const results = [];

  // TEST 1: candidateJoinedAt preserved across reconnects / refreshes
  console.log('\n--- Test 1: candidateJoinedAt Preserved on Reconnect ---');
  const now = new Date();
  const testSession1 = await Session.create({
    sessionId: 'TEST-ATT-RECON-' + Date.now(),
    candidateId: candidate._id,
    expertId: expertDoc._id,
    startTime: new Date(now.getTime() - 20 * 60 * 1000), // started 20 mins ago
    endTime: new Date(now.getTime() + 40 * 60 * 1000),
    status: 'confirmed',
    price: 500,
    attendanceStatus: 'scheduled',
    candidateJoinedAt: null
  });

  // First join
  const joinRes1 = await axios.post(`${API_BASE}/sessions/${testSession1.sessionId}/join`, {}, {
    headers: { Authorization: `Bearer ${candToken}` }
  });
  const afterFirstJoin = await Session.findOne({ sessionId: testSession1.sessionId });
  const firstJoinTime = afterFirstJoin.candidateJoinedAt;
  console.log('First join recorded at:', firstJoinTime?.toISOString(), 'status:', afterFirstJoin.candidateConnectionStatus);

  // Wait 1 second and simulate reconnect
  await new Promise(r => setTimeout(r, 1000));
  const joinRes2 = await axios.post(`${API_BASE}/sessions/${testSession1.sessionId}/join`, {}, {
    headers: { Authorization: `Bearer ${candToken}` }
  });
  const afterSecondJoin = await Session.findOne({ sessionId: testSession1.sessionId });
  const secondJoinTime = afterSecondJoin.candidateJoinedAt;
  console.log('Second join timestamp:', secondJoinTime?.toISOString(), 'status:', afterSecondJoin.candidateConnectionStatus);

  const t1Passed = firstJoinTime && secondJoinTime && (firstJoinTime.getTime() === secondJoinTime.getTime()) && afterSecondJoin.candidateConnectionStatus === 'connected';
  results.push({ name: 'Preserve candidateJoinedAt on Reconnect', pass: t1Passed });
  console.log('Result Test 1:', t1Passed ? 'PASS' : 'FAIL');

  // TEST 2: Candidate leave recording (candidateLeftAt & candidateConnectionStatus = 'left')
  console.log('\n--- Test 2: Candidate Leave Recording ---');
  const leaveRes = await axios.post(`${API_BASE}/sessions/${testSession1.sessionId}/leave`, {}, {
    headers: { Authorization: `Bearer ${candToken}` }
  });
  const afterLeave = await Session.findOne({ sessionId: testSession1.sessionId });
  console.log('candidateLeftAt:', afterLeave.candidateLeftAt?.toISOString(), 'candidateConnectionStatus:', afterLeave.candidateConnectionStatus);
  const t2Passed = afterLeave.candidateLeftAt && afterLeave.candidateConnectionStatus === 'left';
  results.push({ name: 'Candidate Leave Recorded', pass: t2Passed });
  console.log('Result Test 2:', t2Passed ? 'PASS' : 'FAIL');

  // TEST 3: ATTENDED_COMPLETED rejected if candidate never joined
  console.log('\n--- Test 3: ATTENDED_COMPLETED Rejected If Candidate Never Joined ---');
  const testSessionNoJoin = await Session.create({
    sessionId: 'TEST-ATT-NOJOIN-' + Date.now(),
    candidateId: candidate._id,
    expertId: expertDoc._id,
    startTime: new Date(now.getTime() - 20 * 60 * 1000),
    endTime: new Date(now.getTime() + 40 * 60 * 1000),
    status: 'confirmed',
    price: 500,
    attendanceStatus: 'scheduled',
    candidateJoinedAt: null
  });

  let t3Passed = false;
  try {
    await axios.post(`${API_BASE}/sessions/${testSessionNoJoin.sessionId}/complete`, {
      attendanceOutcome: 'ATTENDED_COMPLETED',
      completionEvidence: { interviewConducted: true, summary: 'Full interview conducted' }
    }, {
      headers: { Authorization: `Bearer ${expertToken}` }
    });
  } catch (err) {
    console.log('Expected error on complete without join:', err.response?.status, err.response?.data?.message);
    t3Passed = err.response?.status === 400 && err.response?.data?.message?.includes('Candidate has not joined');
  }
  results.push({ name: 'Reject ATTENDED_COMPLETED if candidate never joined', pass: t3Passed });
  console.log('Result Test 3:', t3Passed ? 'PASS' : 'FAIL');

  // TEST 4: ATTENDED_COMPLETED rejected if candidate left early (< 15 mins presence)
  console.log('\n--- Test 4: ATTENDED_COMPLETED Rejected for Premature Departure (< 15 mins) ---');
  const testSessionEarlyLeave = await Session.create({
    sessionId: 'TEST-ATT-EARLY-' + Date.now(),
    candidateId: candidate._id,
    expertId: expertDoc._id,
    startTime: new Date(now.getTime() - 20 * 60 * 1000),
    endTime: new Date(now.getTime() + 40 * 60 * 1000),
    status: 'confirmed',
    price: 500,
    attendanceStatus: 'attended',
    candidateJoinedAt: new Date(now.getTime() - 20 * 60 * 1000),
    candidateLeftAt: new Date(now.getTime() - 14 * 60 * 1000), // presence = 6 minutes (< 15m)
    candidateConnectionStatus: 'left'
  });

  let t4Passed = false;
  try {
    await axios.post(`${API_BASE}/sessions/${testSessionEarlyLeave.sessionId}/complete`, {
      attendanceOutcome: 'ATTENDED_COMPLETED',
      completionEvidence: { interviewConducted: true, summary: 'Full interview conducted' }
    }, {
      headers: { Authorization: `Bearer ${expertToken}` }
    });
  } catch (err) {
    console.log('Expected error on premature departure:', err.response?.status, err.response?.data?.message);
    t4Passed = err.response?.status === 400 && err.response?.data?.message?.includes('below the 15-minute interview threshold');
  }
  results.push({ name: 'Reject ATTENDED_COMPLETED for presence < 15 mins', pass: t4Passed });
  console.log('Result Test 4:', t4Passed ? 'PASS' : 'FAIL');

  // TEST 5: ATTENDED_INCOMPLETE accepted for premature departure
  console.log('\n--- Test 5: ATTENDED_INCOMPLETE Accepted for Early Leave ---');
  let t5Passed = false;
  try {
    const res5 = await axios.post(`${API_BASE}/sessions/${testSessionEarlyLeave.sessionId}/complete`, {
      attendanceOutcome: 'ATTENDED_INCOMPLETE',
      earlyEndReason: 'Candidate disconnected after 6 minutes'
    }, {
      headers: { Authorization: `Bearer ${expertToken}` }
    });
    console.log('Success on ATTENDED_INCOMPLETE:', res5.data?.success, res5.data?.data?.attendanceOutcome);
    t5Passed = res5.data?.success === true && res5.data?.data?.attendanceOutcome === 'ATTENDED_INCOMPLETE';
  } catch (err) {
    console.log('Unexpected error on ATTENDED_INCOMPLETE:', err.response?.data || err.message);
  }
  results.push({ name: 'Accept ATTENDED_INCOMPLETE for premature departure', pass: t5Passed });
  console.log('Result Test 5:', t5Passed ? 'PASS' : 'FAIL');

  // TEST 6: ATTENDED_COMPLETED rejected if completionEvidence is missing or interviewConducted = false
  console.log('\n--- Test 6: ATTENDED_COMPLETED Rejected If completionEvidence Missing ---');
  const testSessionNoEvidence = await Session.create({
    sessionId: 'TEST-ATT-NOEVID-' + Date.now(),
    candidateId: candidate._id,
    expertId: expertDoc._id,
    startTime: new Date(now.getTime() - 25 * 60 * 1000),
    endTime: new Date(now.getTime() + 35 * 60 * 1000),
    status: 'confirmed',
    price: 500,
    attendanceStatus: 'attended',
    candidateJoinedAt: new Date(now.getTime() - 25 * 60 * 1000),
    candidateConnectionStatus: 'connected'
  });

  let t6Passed = false;
  try {
    await axios.post(`${API_BASE}/sessions/${testSessionNoEvidence.sessionId}/complete`, {
      attendanceOutcome: 'ATTENDED_COMPLETED'
      // completionEvidence omitted
    }, {
      headers: { Authorization: `Bearer ${expertToken}` }
    });
  } catch (err) {
    console.log('Expected error on missing evidence:', err.response?.status, err.response?.data?.message);
    t6Passed = err.response?.status === 400 && err.response?.data?.message?.includes('Proof of interview completion is required');
  }
  results.push({ name: 'Reject ATTENDED_COMPLETED without completion evidence', pass: t6Passed });
  console.log('Result Test 6:', t6Passed ? 'PASS' : 'FAIL');

  // TEST 7: ATTENDED_COMPLETED accepted with >= 15m presence + completionEvidence
  console.log('\n--- Test 7: ATTENDED_COMPLETED Accepted with Full Proof ---');
  let t7Passed = false;
  try {
    const res7 = await axios.post(`${API_BASE}/sessions/${testSessionNoEvidence.sessionId}/complete`, {
      attendanceOutcome: 'ATTENDED_COMPLETED',
      completionEvidence: {
        interviewConducted: true,
        summary: 'Full technical mock interview completed including algorithms and system design'
      }
    }, {
      headers: { Authorization: `Bearer ${expertToken}` }
    });
    console.log('Success on full completion:', res7.data?.success, res7.data?.data?.attendanceOutcome, res7.data?.data?.completionEvidence);
    const saved = await Session.findOne({ sessionId: testSessionNoEvidence.sessionId });
    t7Passed = res7.data?.success === true &&
      saved.attendanceOutcome === 'ATTENDED_COMPLETED' &&
      saved.completionEvidence?.verified === true &&
      saved.completionEvidence?.interviewConducted === true &&
      saved.completionEvidence?.durationMinutes >= 15;
  } catch (err) {
    console.log('Unexpected error on full completion:', err.response?.data || err.message);
  }
  results.push({ name: 'Accept ATTENDED_COMPLETED with >= 15m presence & evidence', pass: t7Passed });
  console.log('Result Test 7:', t7Passed ? 'PASS' : 'FAIL');

  // TEST 8: Atomic Finalization & Idempotency
  console.log('\n--- Test 8: Atomic Finalization Idempotency ---');
  let t8Passed = false;
  try {
    // Calling completeSession a SECOND time on the already completed session
    const res8 = await axios.post(`${API_BASE}/sessions/${testSessionNoEvidence.sessionId}/complete`, {
      attendanceOutcome: 'ATTENDED_COMPLETED',
      completionEvidence: { interviewConducted: true, summary: 'Duplicate request' }
    }, {
      headers: { Authorization: `Bearer ${expertToken}` }
    });
    console.log('Second call result message:', res8.data?.message, 'status:', res8.data?.data?.status);
    t8Passed = res8.data?.success === true && res8.data?.message === 'Session already finalized';
  } catch (err) {
    console.log('Unexpected error on duplicate completion:', err.response?.data || err.message);
  }
  results.push({ name: 'Atomic idempotency on duplicate finalization', pass: t8Passed });
  console.log('Result Test 8:', t8Passed ? 'PASS' : 'FAIL');

  // Clean up test sessions
  await Session.deleteMany({
    sessionId: { $in: [
      testSession1.sessionId,
      testSessionNoJoin.sessionId,
      testSessionEarlyLeave.sessionId,
      testSessionNoEvidence.sessionId
    ]}
  });

  console.log('\n=== SUMMARY RESULTS ===');
  let allPass = true;
  for (const r of results) {
    console.log(`[${r.pass ? 'PASS' : 'FAIL'}] ${r.name}`);
    if (!r.pass) allPass = false;
  }
  console.log('\nOVERALL ATTENDANCE INTEGRITY RESULT:', allPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
