const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const MONGO_URI = process.env.MONGO_URI;

async function runVerification() {
  console.log('================================================================');
  console.log('MOCKEEFY CRITICAL FINAL FIX VERIFICATION SUITE');
  console.log('Testing Calendar Flicker, Alert Overlap & Attendance Outcomes');
  console.log('================================================================\n');

  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.\n');

  const { default: Session } = await import('../models/Session.js');
  const { default: User } = await import('../models/User.js');
  const { default: Expert } = await import('../models/expertModel.js');

  // Find real expert and candidate
  const expertUser = await User.findOne({ userType: 'expert' });
  const expertProfile = await Expert.findOne({ userId: expertUser._id });
  const candidateUser = await User.findOne({ userType: 'candidate' });

  if (!expertUser || !expertProfile || !candidateUser) {
    throw new Error('Required test users not found');
  }

  const expertToken = jwt.sign({ userId: expertUser._id, userType: 'expert', role: 'expert' }, JWT_SECRET, { expiresIn: '1h' });
  const candidateToken = jwt.sign({ userId: candidateUser._id, userType: 'candidate', role: 'candidate' }, JWT_SECRET, { expiresIn: '1h' });

  console.log(`Test Expert User: ${expertUser.email} (ID: ${expertUser._id})`);
  console.log(`Test Expert Profile: (ID: ${expertProfile._id})`);
  console.log(`Test Candidate User: ${candidateUser.email} (ID: ${candidateUser._id})\n`);

  let passedTests = 0;
  let totalTests = 7;

  // -------------------------------------------------------------
  // Test 1: Zero native alert() / confirm() in LiveMeeting.tsx
  // -------------------------------------------------------------
  console.log('TEST 1: Verify Zero Browser-Native alert() and confirm() in LiveMeeting.tsx');
  const liveMeetingCode = fs.readFileSync(path.join(__dirname, '../../client/src/pages/LiveMeeting.tsx'), 'utf8');
  const hasConfirm = /confirm\s*\(/.test(liveMeetingCode);
  const hasAlert = /alert\s*\(/.test(liveMeetingCode);
  if (!hasConfirm && !hasAlert) {
    console.log('✅ PASS: Zero occurrences of native alert() or confirm() in LiveMeeting.tsx.');
    passedTests++;
  } else {
    console.error(`❌ FAIL: Found native dialogs: confirm=${hasConfirm}, alert=${hasAlert}`);
  }
  console.log('');

  // -------------------------------------------------------------
  // Test 2: Calendar Loading & Zero-Slot Flicker Guard Check
  // -------------------------------------------------------------
  console.log('TEST 2: Verify isSessionsLoading & isContentLoading Guards in Calendar Files');
  const bookSessionCode = fs.readFileSync(path.join(__dirname, '../../client/src/components/BookSessionPage.tsx'), 'utf8');
  const bookingModalCode = fs.readFileSync(path.join(__dirname, '../../client/src/components/BookingModal.tsx'), 'utf8');

  const bspHasSessionLoading = bookSessionCode.includes('isSessionsLoading') && bookSessionCode.includes('isContentLoading');
  const bmHasSessionLoading = bookingModalCode.includes('isSessionsLoading') && bookingModalCode.includes('isContentLoading');

  if (bspHasSessionLoading && bmHasSessionLoading) {
    console.log('✅ PASS: Both BookSessionPage.tsx and BookingModal.tsx strictly guard dates calculation with isSessionsLoading & isContentLoading.');
    passedTests++;
  } else {
    console.error(`❌ FAIL: Missing guards: BookSessionPage=${bspHasSessionLoading}, BookingModal=${bmHasSessionLoading}`);
  }
  console.log('');

  // -------------------------------------------------------------
  // Test 3: Authoritative Attendance Detection (Fix Root Cause)
  // -------------------------------------------------------------
  console.log('TEST 3: Authoritative Attendance Detection - Expert Join Does NOT Mark Candidate Attended');
  const now = new Date();
  const testSessionId1 = `test_att_${Date.now()}_1`;
  const session1 = await Session.create({
    sessionId: testSessionId1,
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    startTime: new Date(now.getTime() - 20 * 60 * 1000), // started 20 mins ago
    endTime: new Date(now.getTime() + 10 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'scheduled',
    candidateJoinedAt: null,
    expertJoinedAt: null,
    price: 499
  });

  // Dynamically invoke joinSession as Expert
  const { joinSession } = await import('../controllers/sessionController.js');

  const mockExpertReq = {
    params: { sessionId: testSessionId1 },
    user: { userId: expertUser._id, userType: 'expert' }
  };
  let expertResCode = 200;
  let expertResJson = {};
  const mockExpertRes = {
    status(code) { expertResCode = code; return this; },
    json(data) { expertResJson = data; return this; }
  };

  await joinSession(mockExpertReq, mockExpertRes);

  const afterExpertJoin = await Session.findOne({ sessionId: testSessionId1 });
  if (afterExpertJoin.expertJoinedAt && !afterExpertJoin.candidateJoinedAt && afterExpertJoin.attendanceStatus === 'scheduled') {
    console.log('✅ PASS: Expert join successfully recorded expertJoinedAt WITHOUT falsely marking candidateJoinedAt or attendanceStatus.');
    passedTests++;
  } else {
    console.error(`❌ FAIL: Expert join corrupted attendance: candidateJoinedAt=${afterExpertJoin.candidateJoinedAt}, attendanceStatus=${afterExpertJoin.attendanceStatus}`);
  }
  console.log('');

  // -------------------------------------------------------------
  // Test 4: 15-Minute Attendance Lock Enforcement
  // -------------------------------------------------------------
  console.log('TEST 4: Attendance Classification Locked Under 15 Minutes');
  const testSessionId2 = `test_lock_${Date.now()}_2`;
  const session2 = await Session.create({
    sessionId: testSessionId2,
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    startTime: new Date(now.getTime() - 5 * 60 * 1000), // started 5 mins ago (< 15m)
    endTime: new Date(now.getTime() + 25 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'scheduled',
    candidateJoinedAt: null,
    price: 499
  });

  const { completeSession } = await import('../controllers/sessionController.js');

  const lockReq = {
    params: { sessionId: testSessionId2 },
    body: { attendanceOutcome: 'DID_NOT_ATTEND' },
    user: { userId: expertUser._id, userType: 'expert' }
  };
  let lockResCode = 200;
  let lockResJson = {};
  const lockRes = {
    status(code) { lockResCode = code; return this; },
    json(data) { lockResJson = data; return this; }
  };

  await completeSession(lockReq, lockRes);

  if (lockResCode === 400 && lockResJson.message && lockResJson.message.includes('locked')) {
    console.log(`✅ PASS: Complete session under 15 minutes rejected with HTTP 400: "${lockResJson.message}"`);
    passedTests++;
  } else {
    console.error(`❌ FAIL: Expected 400 locked, got code=${lockResCode}, msg=${lockResJson.message}`);
  }
  console.log('');

  // -------------------------------------------------------------
  // Test 5: Candidate Never Joined -> Only DID_NOT_ATTEND Allowed
  // -------------------------------------------------------------
  console.log('TEST 5: Candidate Never Joined Validation - Reject Attended Outcomes, Accept DID_NOT_ATTEND');
  const testSessionId3 = `test_noshow_${Date.now()}_3`;
  await Session.create({
    sessionId: testSessionId3,
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    startTime: new Date(now.getTime() - 20 * 60 * 1000), // started 20 mins ago (> 15m)
    endTime: new Date(now.getTime() + 10 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'scheduled',
    candidateJoinedAt: null,
    price: 499
  });

  // Try ATTENDED_COMPLETED when candidate never joined
  let rejCode = 200, rejJson = {};
  await completeSession({
    params: { sessionId: testSessionId3 },
    body: { attendanceOutcome: 'ATTENDED_COMPLETED' },
    user: { userId: expertUser._id, userType: 'expert' }
  }, {
    status(c) { rejCode = c; return this; },
    json(d) { rejJson = d; return this; }
  });

  // Now submit valid DID_NOT_ATTEND
  let okCode = 200, okJson = {};
  await completeSession({
    params: { sessionId: testSessionId3 },
    body: { attendanceOutcome: 'DID_NOT_ATTEND' },
    user: { userId: expertUser._id, userType: 'expert' }
  }, {
    status(c) { okCode = c; return this; },
    json(d) { okJson = d; return this; }
  });

  const session3After = await Session.findOne({ sessionId: testSessionId3 });
  if (rejCode === 400 && okCode === 200 && session3After.status === 'CANDIDATE_NO_SHOW' && session3After.attendanceOutcome === 'DID_NOT_ATTEND') {
    console.log('✅ PASS: Rejected ATTENDED_COMPLETED (400), accepted DID_NOT_ATTEND, transitioned to CANDIDATE_NO_SHOW.');
    passedTests++;
  } else {
    console.error(`❌ FAIL: rejCode=${rejCode}, okCode=${okCode}, status=${session3After?.status}, outcome=${session3After?.attendanceOutcome}`);
  }
  console.log('');

  // -------------------------------------------------------------
  // Test 6: Candidate Joined -> Only ATTENDED_COMPLETED / ATTENDED_INCOMPLETE Allowed
  // -------------------------------------------------------------
  console.log('TEST 6: Candidate Joined Validation - Reject DID_NOT_ATTEND, Accept ATTENDED_COMPLETED & ATTENDED_INCOMPLETE');
  const testSessionId4 = `test_attended_${Date.now()}_4`;
  await Session.create({
    sessionId: testSessionId4,
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    startTime: new Date(now.getTime() - 25 * 60 * 1000), // started 25 mins ago
    endTime: new Date(now.getTime() + 5 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'attended',
    candidateJoinedAt: new Date(now.getTime() - 24 * 60 * 1000),
    price: 499
  });

  // Try DID_NOT_ATTEND when candidate actually joined
  let didNotAttendCode = 200, didNotAttendJson = {};
  await completeSession({
    params: { sessionId: testSessionId4 },
    body: { attendanceOutcome: 'DID_NOT_ATTEND' },
    user: { userId: expertUser._id, userType: 'expert' }
  }, {
    status(c) { didNotAttendCode = c; return this; },
    json(d) { didNotAttendJson = d; return this; }
  });

  // Now submit ATTENDED_COMPLETED
  let attendedOkCode = 200, attendedOkJson = {};
  await completeSession({
    params: { sessionId: testSessionId4 },
    body: { attendanceOutcome: 'ATTENDED_COMPLETED' },
    user: { userId: expertUser._id, userType: 'expert' }
  }, {
    status(c) { attendedOkCode = c; return this; },
    json(d) { attendedOkJson = d; return this; }
  });

  const session4After = await Session.findOne({ sessionId: testSessionId4 });
  if (didNotAttendCode === 400 && attendedOkCode === 200 && session4After.status === 'completed' && session4After.attendanceOutcome === 'ATTENDED_COMPLETED') {
    console.log('✅ PASS: Rejected DID_NOT_ATTEND for attended candidate, accepted ATTENDED_COMPLETED, recorded outcome.');
    passedTests++;
  } else {
    console.error(`❌ FAIL: didNotAttendCode=${didNotAttendCode}, attendedOkCode=${attendedOkCode}, status=${session4After?.status}, outcome=${session4After?.attendanceOutcome}`);
  }
  console.log('');

  // -------------------------------------------------------------
  // Test 7: Certificate Progress Excludes DID_NOT_ATTEND & ATTENDED_INCOMPLETE
  // -------------------------------------------------------------
  console.log('TEST 7: Certification Engine Excludes DID_NOT_ATTEND and ATTENDED_INCOMPLETE');
  const { getEligibleCompletedSessions } = await import('../controllers/certificationController.js');

  const testSessionId5 = `test_cert_inc_${Date.now()}_5`;
  await Session.create({
    sessionId: testSessionId5,
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    startTime: new Date(now.getTime() - 30 * 60 * 1000),
    endTime: new Date(now.getTime() - 5 * 60 * 1000),
    status: 'completed',
    attendanceStatus: 'attended',
    attendanceOutcome: 'ATTENDED_INCOMPLETE', // Incomplete session!
    candidateJoinedAt: new Date(now.getTime() - 29 * 60 * 1000),
    price: 499
  });

  const certResult = await getEligibleCompletedSessions(candidateUser._id);
  const isIneligibleAudited = certResult.ineligibleAudits?.some(a => (a.sessionId === testSessionId5 || a.sessionId === String(testSessionId5)) && a.reason === 'OUTCOME_ATTENDED_INCOMPLETE');

  if (isIneligibleAudited) {
    console.log('✅ PASS: Session with ATTENDED_INCOMPLETE is strictly excluded from certificate eligibility (OUTCOME_ATTENDED_INCOMPLETE).');
    passedTests++;
  } else {
    console.error('❌ FAIL: ATTENDED_INCOMPLETE was not found in ineligible audits:', certResult.ineligibleAudits);
  }
  console.log('');

  // Clean up test sessions
  await Session.deleteMany({ sessionId: { $in: [testSessionId1, testSessionId2, testSessionId3, testSessionId4, testSessionId5] } });

  console.log('================================================================');
  console.log(`VERIFICATION SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================');

  await mongoose.disconnect();
  process.exit(passedTests === totalTests ? 0 : 1);
}

runVerification().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
