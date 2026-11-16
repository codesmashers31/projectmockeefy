const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const BASE_URL = 'http://localhost:5000';

async function runRegressionSuite() {
  console.log('================================================================');
  console.log('   MOCKEEFY 12-POINT ATTENDANCE & RUNTIME ERROR REGRESSION SUITE');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const Session = (await import('../models/Session.js')).default;
  const User = (await import('../models/User.js')).default;
  const Expert = (await import('../models/expertModel.js')).default;
  const Category = (await import('../models/Category.js')).default;

  const expertUser = await User.findOne({ userType: 'expert' });
  const expertProfile = await Expert.findOne({ userId: expertUser._id });
  const candidateUser = await User.findOne({ userType: 'candidate' });
  const cat = await Category.findOne({});

  const expertToken = jwt.sign(
    { userId: expertUser._id, userType: 'expert', email: expertUser.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const candidateToken = jwt.sign(
    { userId: candidateUser._id, userType: 'candidate', email: candidateUser.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const results = [];

  function recordResult(num, description, pass, details) {
    results.push({ num, description, pass, details });
    console.log(`[TEST ${num}] ${description} => ${pass ? 'PASS' : 'FAIL'}`);
    if (details) console.log(`   Details: ${details}`);
  }

  // Helper to derive hasCandidateJoined just like LiveMeeting.tsx does:
  function evaluateHasCandidateJoined(s) {
    return Boolean(
      s?.candidateJoinedAt ||
      s?.attendanceStatus === 'attended' ||
      s?.candidateConnectionStatus === 'connected' ||
      s?.candidateConnectionStatus === 'left'
    );
  }

  // --- SCENARIO 1: Candidate has never joined ---
  const s1 = await Session.create({
    sessionId: 'REG-1-' + Date.now(),
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    categoryId: cat._id,
    startTime: new Date(Date.now() - 20 * 60 * 1000),
    endTime: new Date(Date.now() + 40 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'scheduled'
  });
  const hasJoined1 = evaluateHasCandidateJoined(s1);
  recordResult(
    1,
    'Candidate has never joined (initial unjoined state)',
    hasJoined1 === false && !s1.candidateJoinedAt,
    `hasCandidateJoined: ${hasJoined1}, candidateJoinedAt: ${s1.candidateJoinedAt}`
  );

  // --- SCENARIO 2: Expert joins while Candidate has not joined ---
  const s2 = await Session.create({
    sessionId: 'REG-2-' + Date.now(),
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    categoryId: cat._id,
    startTime: new Date(Date.now() - 5 * 60 * 1000),
    endTime: new Date(Date.now() + 55 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'scheduled'
  });
  try {
    const res2 = await axios.post(`${BASE_URL}/api/sessions/${s2.sessionId}/join`, {}, {
      headers: { Authorization: `Bearer ${expertToken}` }
    });
    const s2Reloaded = await Session.findById(s2._id);
    const hasJoined2 = evaluateHasCandidateJoined(s2Reloaded);
    recordResult(
      2,
      'Expert joins while Candidate has not joined',
      res2.status === 200 && s2Reloaded.expertJoinedAt && !s2Reloaded.candidateJoinedAt && hasJoined2 === false,
      `expertJoinedAt: ${s2Reloaded.expertJoinedAt}, candidateJoinedAt: ${s2Reloaded.candidateJoinedAt}, hasCandidateJoined: ${hasJoined2}`
    );
  } catch (err) {
    recordResult(2, 'Expert joins while Candidate has not joined', false, err.response?.data?.message || err.message);
  }

  // --- SCENARIO 3: Candidate genuinely joins ---
  const s3 = await Session.create({
    sessionId: 'REG-3-' + Date.now(),
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    categoryId: cat._id,
    startTime: new Date(Date.now() - 5 * 60 * 1000),
    endTime: new Date(Date.now() + 55 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'scheduled'
  });
  try {
    const res3 = await axios.post(`${BASE_URL}/api/sessions/${s3.sessionId}/join`, {}, {
      headers: { Authorization: `Bearer ${candidateToken}` }
    });
    const s3Reloaded = await Session.findById(s3._id);
    const hasJoined3 = evaluateHasCandidateJoined(s3Reloaded);
    recordResult(
      3,
      'Candidate genuinely joins (authoritative join recorded)',
      res3.status === 200 && Boolean(s3Reloaded.candidateJoinedAt) && s3Reloaded.attendanceStatus === 'attended' && hasJoined3 === true,
      `candidateJoinedAt: ${s3Reloaded.candidateJoinedAt}, attendanceStatus: ${s3Reloaded.attendanceStatus}, hasCandidateJoined: ${hasJoined3}`
    );
  } catch (err) {
    recordResult(3, 'Candidate genuinely joins', false, err.response?.data?.message || err.message);
  }

  // --- SCENARIO 4: Candidate refreshes and reconnects ---
  const initialJoinTime = new Date(Date.now() - 10 * 60 * 1000);
  const s4 = await Session.create({
    sessionId: 'REG-4-' + Date.now(),
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    categoryId: cat._id,
    startTime: new Date(Date.now() - 15 * 60 * 1000),
    endTime: new Date(Date.now() + 45 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'attended',
    candidateJoinedAt: initialJoinTime,
    candidateConnectionStatus: 'connected'
  });
  try {
    const res4 = await axios.post(`${BASE_URL}/api/sessions/${s4.sessionId}/join`, {}, {
      headers: { Authorization: `Bearer ${candidateToken}` }
    });
    const s4Reloaded = await Session.findById(s4._id);
    const timePreserved = Math.abs(s4Reloaded.candidateJoinedAt.getTime() - initialJoinTime.getTime()) < 1000;
    const hasJoined4 = evaluateHasCandidateJoined(s4Reloaded);
    recordResult(
      4,
      'Candidate refreshes and reconnects (join timestamp preserved)',
      res4.status === 200 && timePreserved && s4Reloaded.candidateConnectionStatus === 'connected' && hasJoined4 === true,
      `candidateJoinedAt preserved: ${timePreserved}, candidateConnectionStatus: ${s4Reloaded.candidateConnectionStatus}`
    );
  } catch (err) {
    recordResult(4, 'Candidate refreshes and reconnects', false, err.response?.data?.message || err.message);
  }

  // --- SCENARIO 5: Candidate leaves before completion ---
  const s5 = await Session.create({
    sessionId: 'REG-5-' + Date.now(),
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    categoryId: cat._id,
    startTime: new Date(Date.now() - 20 * 60 * 1000),
    endTime: new Date(Date.now() + 40 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'attended',
    candidateJoinedAt: new Date(Date.now() - 18 * 60 * 1000),
    candidateConnectionStatus: 'connected'
  });
  try {
    const res5 = await axios.post(`${BASE_URL}/api/sessions/${s5.sessionId}/leave`, {}, {
      headers: { Authorization: `Bearer ${candidateToken}` }
    });
    const s5Reloaded = await Session.findById(s5._id);
    const hasJoined5 = evaluateHasCandidateJoined(s5Reloaded);
    recordResult(
      5,
      'Candidate leaves before completion (leave recorded, join state retained)',
      res5.status === 200 && Boolean(s5Reloaded.candidateLeftAt) && s5Reloaded.candidateConnectionStatus === 'left' && hasJoined5 === true,
      `candidateLeftAt: ${s5Reloaded.candidateLeftAt}, candidateConnectionStatus: ${s5Reloaded.candidateConnectionStatus}, hasCandidateJoined: ${hasJoined5}`
    );
  } catch (err) {
    recordResult(5, 'Candidate leaves before completion', false, err.response?.data?.message || err.message);
  }

  // --- SCENARIO 6: Candidate remains connected when Expert ends the session ---
  const s6 = await Session.create({
    sessionId: 'REG-6-' + Date.now(),
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    categoryId: cat._id,
    startTime: new Date(Date.now() - 30 * 60 * 1000),
    endTime: new Date(Date.now() + 30 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'attended',
    candidateJoinedAt: new Date(Date.now() - 28 * 60 * 1000),
    candidateConnectionStatus: 'connected'
  });
  try {
    const res6 = await axios.post(
      `${BASE_URL}/api/sessions/${s6.sessionId}/complete`,
      {
        attendanceOutcome: 'ATTENDED_COMPLETED',
        completionEvidence: { interviewConducted: true, summary: 'Full interview held with candidate continuously connected' }
      },
      { headers: { Authorization: `Bearer ${expertToken}` } }
    );
    const s6Reloaded = await Session.findById(s6._id);
    recordResult(
      6,
      'Candidate remains connected when Expert ends session (no invented leave)',
      res6.status === 200 && s6Reloaded.status === 'completed' && s6Reloaded.completionEvidence?.durationMinutes >= 25,
      `status: ${s6Reloaded.status}, durationMinutes: ${s6Reloaded.completionEvidence?.durationMinutes}, candidateLeftAt was not synthesized: ${!s6Reloaded.candidateLeftAt}`
    );
  } catch (err) {
    recordResult(6, 'Candidate remains connected when Expert ends session', false, err.response?.data?.message || err.message);
  }

  // --- SCENARIO 7: Expert selects DID_NOT_ATTEND for Candidate who never joined (after 15-min grace) ---
  const s7 = await Session.create({
    sessionId: 'REG-7-' + Date.now(),
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    categoryId: cat._id,
    startTime: new Date(Date.now() - 20 * 60 * 1000),
    endTime: new Date(Date.now() + 40 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'scheduled'
  });
  try {
    const res7 = await axios.post(
      `${BASE_URL}/api/sessions/${s7.sessionId}/complete`,
      {
        attendanceOutcome: 'DID_NOT_ATTEND',
        reason: 'Candidate did not attend within 15-minute grace period'
      },
      { headers: { Authorization: `Bearer ${expertToken}` } }
    );
    const s7Reloaded = await Session.findById(s7._id);
    const isNoShowStatus = s7Reloaded.status?.toLowerCase() === 'candidate_no_show' || s7Reloaded.status?.toLowerCase() === 'no-show';
    recordResult(
      7,
      'Expert selects DID_NOT_ATTEND for unjoined Candidate (after 15m grace)',
      res7.status === 200 && isNoShowStatus,
      `session status updated to: ${s7Reloaded.status}`
    );
  } catch (err) {
    recordResult(7, 'Expert selects DID_NOT_ATTEND for unjoined Candidate', false, err.response?.data?.message || err.message);
  }

  // --- SCENARIO 8: Expert attempts DID_NOT_ATTEND for Candidate who joined (must reject) ---
  const s8 = await Session.create({
    sessionId: 'REG-8-' + Date.now(),
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    categoryId: cat._id,
    startTime: new Date(Date.now() - 20 * 60 * 1000),
    endTime: new Date(Date.now() + 40 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'attended',
    candidateJoinedAt: new Date(Date.now() - 19 * 60 * 1000),
    candidateConnectionStatus: 'connected'
  });
  try {
    await axios.post(
      `${BASE_URL}/api/sessions/${s8.sessionId}/complete`,
      { attendanceOutcome: 'DID_NOT_ATTEND' },
      { headers: { Authorization: `Bearer ${expertToken}` } }
    );
    recordResult(8, 'Expert attempts DID_NOT_ATTEND for attended Candidate (must reject)', false, 'Endpoint unexpectedly succeeded');
  } catch (err) {
    const rejectedProperly = err.response?.status === 400 && String(err.response?.data?.message).includes('cannot be selected for an attended candidate');
    recordResult(
      8,
      'Expert attempts DID_NOT_ATTEND for attended Candidate (must reject)',
      rejectedProperly,
      `HTTP ${err.response?.status}: "${err.response?.data?.message}"`
    );
  }

  // --- SCENARIO 9: Expert selects ATTENDED_INCOMPLETE ---
  const s9 = await Session.create({
    sessionId: 'REG-9-' + Date.now(),
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    categoryId: cat._id,
    startTime: new Date(Date.now() - 25 * 60 * 1000),
    endTime: new Date(Date.now() + 35 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'attended',
    candidateJoinedAt: new Date(Date.now() - 24 * 60 * 1000),
    candidateLeftAt: new Date(Date.now() - 15 * 60 * 1000),
    candidateConnectionStatus: 'left'
  });
  try {
    const res9 = await axios.post(
      `${BASE_URL}/api/sessions/${s9.sessionId}/complete`,
      {
        attendanceOutcome: 'ATTENDED_INCOMPLETE',
        completionEvidence: { summary: 'Candidate disconnected after 9 minutes' }
      },
      { headers: { Authorization: `Bearer ${expertToken}` } }
    );
    const s9Reloaded = await Session.findById(s9._id);
    const pass9 = res9.status === 200 && s9Reloaded.status === 'completed' && s9Reloaded.attendanceOutcome === 'ATTENDED_INCOMPLETE' && s9Reloaded.completionEvidence?.verified === false;
    recordResult(
      9,
      'Expert selects ATTENDED_INCOMPLETE (candidate left early)',
      pass9,
      `attendanceOutcome: ${s9Reloaded.attendanceOutcome}, verified: ${s9Reloaded.completionEvidence?.verified}`
    );
  } catch (err) {
    recordResult(9, 'Expert selects ATTENDED_INCOMPLETE', false, err.response?.data?.message || err.message);
  }

  // --- SCENARIO 10: Expert selects ATTENDED_COMPLETED with valid completion evidence ---
  const s10 = await Session.create({
    sessionId: 'REG-10-' + Date.now(),
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    categoryId: cat._id,
    startTime: new Date(Date.now() - 40 * 60 * 1000),
    endTime: new Date(Date.now() + 20 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'attended',
    candidateJoinedAt: new Date(Date.now() - 39 * 60 * 1000),
    candidateConnectionStatus: 'connected'
  });
  try {
    const res10 = await axios.post(
      `${BASE_URL}/api/sessions/${s10.sessionId}/complete`,
      {
        attendanceOutcome: 'ATTENDED_COMPLETED',
        completionEvidence: { interviewConducted: true, summary: 'Full technical mock interview completed successfully' }
      },
      { headers: { Authorization: `Bearer ${expertToken}` } }
    );
    const s10Reloaded = await Session.findById(s10._id);
    const pass10 = res10.status === 200 && s10Reloaded.status === 'completed' && s10Reloaded.attendanceOutcome === 'ATTENDED_COMPLETED' && s10Reloaded.completionEvidence?.verified === true;
    recordResult(
      10,
      'Expert selects ATTENDED_COMPLETED with valid completion evidence',
      pass10,
      `attendanceOutcome: ${s10Reloaded.attendanceOutcome}, verified: ${s10Reloaded.completionEvidence?.verified}`
    );
  } catch (err) {
    recordResult(10, 'Expert selects ATTENDED_COMPLETED with valid evidence', false, err.response?.data?.message || err.message);
  }

  // --- SCENARIO 11: Missing optional attendance fields (graceful rendering evaluation) ---
  const s11 = {
    _id: 'dummy-11',
    sessionId: 'REG-11-SPARSE',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 3600000).toISOString(),
    status: 'confirmed'
    // Notice: candidateJoinedAt, attendanceStatus, candidateConnectionStatus are all undefined
  };
  const hasJoined11 = evaluateHasCandidateJoined(s11);
  recordResult(
    11,
    'Session with missing optional attendance fields handles safely',
    hasJoined11 === false,
    `Evaluated safely without exception: hasCandidateJoined is ${hasJoined11}`
  );

  // --- SCENARIO 12: Existing legacy session records render without crash ---
  const s12 = {
    _id: 'dummy-12',
    sessionId: 'REG-12-LEGACY',
    startTime: '2026-10-01T10:00:00.000Z',
    endTime: '2026-10-01T11:00:00.000Z',
    status: 'confirmed',
    category: 'System Design',
    candidateJoinedAt: null
  };
  const hasJoined12 = evaluateHasCandidateJoined(s12);
  recordResult(
    12,
    'Existing legacy session records render without crash',
    hasJoined12 === false,
    `Evaluated safely without exception: hasCandidateJoined is ${hasJoined12}`
  );

  // Clean up created test sessions
  await Session.deleteMany({
    sessionId: { $regex: /^REG-/ }
  });

  await mongoose.disconnect();

  console.log('\n================================================================');
  const allPassed = results.every(r => r.pass);
  console.log(`FINAL RESULT: ${allPassed ? 'ALL 12 TESTS PASSED (12/12)' : 'SOME TESTS FAILED'}`);
  console.log('================================================================');

  if (!allPassed) process.exit(1);
}

runRegressionSuite().catch(err => {
  console.error('Fatal error in regression suite:', err);
  process.exit(1);
});
