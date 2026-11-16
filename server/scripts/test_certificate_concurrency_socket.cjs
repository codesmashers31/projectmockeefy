const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const BASE_URL = 'http://localhost:5000';

async function runIntegrityCheck() {
  console.log('========================================================================');
  console.log('   MOCKEEFY CERTIFICATE ELIGIBILITY & CONFLICTING CONCURRENCY SUITE');
  console.log('========================================================================\n');

  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const Session = (await import('../models/Session.js')).default;
  const User = (await import('../models/User.js')).default;
  const Expert = (await import('../models/expertModel.js')).default;
  const Category = (await import('../models/Category.js')).default;
  const Review = (await import('../models/reviewModel.js')).default;
  const Notification = (await import('../models/Notification.js')).default;
  const EmailOutbox = (await import('../models/EmailOutbox.js')).default;
  const PaymentRecord = (await import('../models/PaymentRecord.js')).default;

  const expertUser = await User.findOne({ userType: 'expert' });
  const expertProfile = await Expert.findOne({ userId: expertUser._id });
  const candidateUser = await User.findOne({ userType: 'candidate' });
  let itCategory = await Category.findOne({ status: 'Active' });
  if (!itCategory) {
    itCategory = await Category.findOne({});
  }

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

  // Clean old test records
  await Session.deleteMany({ sessionId: { $regex: /^(CERT-PENDING|INELIGIBLE-TEST|CONFLICT-)/ } });
  await Review.deleteMany({ sessionId: { $regex: /^(CERT-PENDING|INELIGIBLE-TEST|CONFLICT-)/ } });
  await PaymentRecord.deleteMany({ paymentId: { $regex: /^PAY-CERT-/ } });

  const results = [];

  function record(num, name, pass, details) {
    results.push({ num, name, pass, details });
    console.log(`[TEST ${num}] ${name} => ${pass ? 'PASS' : 'FAIL'}`);
    if (details) console.log(`   ${details}`);
  }

  // ============================================================================
  // REQUIREMENT 1: CERTIFICATE ELIGIBILITY & FEEDBACK GATING
  // ============================================================================
  console.log('\n--- 1. CERTIFICATE ELIGIBILITY & FEEDBACK GATING ---');

  // Test 1.1: ATTENDED_COMPLETED with Pending Feedback
  const sPending = await Session.create({
    sessionId: 'CERT-PENDING-' + Date.now(),
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    categoryId: itCategory._id,
    category: itCategory.name,
    categoryNameSnapshot: itCategory.name,
    startTime: new Date(Date.now() - 30 * 60 * 1000),
    endTime: new Date(Date.now() + 30 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'attended',
    candidateJoinedAt: new Date(Date.now() - 29 * 60 * 1000),
    candidateConnectionStatus: 'connected',
    price: 1500
  });

  await PaymentRecord.create({
    paymentId: 'PAY-CERT-P-' + Date.now(),
    orderId: 'ORD-CERT-P-' + Date.now(),
    sessionId: sPending.sessionId,
    userId: candidateUser._id,
    expertId: expertProfile._id,
    amount: 1500,
    paymentType: 'booking',
    status: 'verified'
  });

  // End session with ATTENDED_COMPLETED
  await axios.post(
    `${BASE_URL}/api/sessions/${sPending.sessionId}/complete`,
    {
      attendanceOutcome: 'ATTENDED_COMPLETED',
      completionEvidence: { interviewConducted: true, summary: 'Session ended, feedback pending' }
    },
    { headers: { Authorization: `Bearer ${expertToken}` } }
  );

  const dbBeforeFeedback = await Session.findById(sPending._id);
  const certPreviewBefore = await axios.get(`${BASE_URL}/api/certifications/preview`, {
    headers: { Authorization: `Bearer ${candidateToken}` }
  });

  const previewDataBefore = certPreviewBefore.data?.data || {};
  const auditsBefore = previewDataBefore.ineligibleAudits || [];
  const eligibleBefore = previewDataBefore.eligibleSessionIds || [];

  const isAuditedAsMissingFeedback = auditsBefore.some(a =>
    (a.sessionId === sPending.sessionId || a.sessionId === String(sPending._id)) &&
    a.reason === 'MISSING_EVALUATION_FEEDBACK'
  );
  const isExcludedFromEligible = !eligibleBefore.some(id => id === sPending.sessionId || id === String(sPending._id));

  const test1_1Pass = (
    dbBeforeFeedback.status === 'completed' &&
    dbBeforeFeedback.attendanceOutcome === 'ATTENDED_COMPLETED' &&
    dbBeforeFeedback.certificateIssued === false && // MUST BE FALSE BEFORE FEEDBACK!
    dbBeforeFeedback.certificateId === null &&      // MUST BE NULL BEFORE FEEDBACK!
    dbBeforeFeedback.payoutStatus === 'pending_feedback' &&
    isAuditedAsMissingFeedback === true &&
    isExcludedFromEligible === true
  );

  record(
    '1.1',
    'ATTENDED_COMPLETED with pending feedback: certificateIssued=false, certId=null, ineligible (MISSING_EVALUATION_FEEDBACK)',
    test1_1Pass,
    `DB certificateIssued: ${dbBeforeFeedback.certificateIssued}, certId: ${dbBeforeFeedback.certificateId}, Audit Reason: MISSING_EVALUATION_FEEDBACK (${isAuditedAsMissingFeedback}), Excluded: ${isExcludedFromEligible}`
  );

  // Test 1.2: ATTENDED_COMPLETED with Qualifying Feedback Submitted
  console.log('\nSubmitting qualifying expert review for session...');
  const resReviewQual = await axios.post(
    `${BASE_URL}/api/sessions/${sPending.sessionId}/review`,
    {
      reviewerRole: 'expert',
      overallRating: 5,
      technicalRating: 5,
      communicationRating: 5,
      problemSolvingRating: 5,
      designRating: 5,
      behavioralRating: 5,
      hiringDecision: 'Hire',
      feedback: 'Outstanding technical mock interview performance.'
    },
    { headers: { Authorization: `Bearer ${expertToken}` } }
  );

  const dbAfterFeedback = await Session.findById(sPending._id);
  const certPreviewAfter = await axios.get(`${BASE_URL}/api/certifications/preview`, {
    headers: { Authorization: `Bearer ${candidateToken}` }
  });

  const previewDataAfter = certPreviewAfter.data?.data || {};
  const eligibleAfter = previewDataAfter.eligibleSessionIds || [];
  const isNowEligible = eligibleAfter.some(id => id === sPending.sessionId || id === String(sPending._id));

  const test1_2Pass = (
    resReviewQual.status === 201 &&
    dbAfterFeedback.payoutCredited === true &&
    dbAfterFeedback.payoutStatus === 'credited' &&
    isNowEligible === true
  );

  record(
    '1.2',
    'ATTENDED_COMPLETED with qualifying feedback: payout credited, session now eligible for certificate milestone',
    test1_2Pass,
    `Payout Credited: ${dbAfterFeedback.payoutCredited}, In Eligible List: ${isNowEligible}`
  );

  // Test 1.3: ATTENDED_INCOMPLETE (Non-qualifying attendance outcome)
  console.log('\nTesting non-qualifying attendance outcome (ATTENDED_INCOMPLETE)...');
  const sIneligible = await Session.create({
    sessionId: 'INELIGIBLE-TEST-' + Date.now(),
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    categoryId: itCategory._id,
    category: itCategory.name,
    categoryNameSnapshot: itCategory.name,
    startTime: new Date(Date.now() - 30 * 60 * 1000),
    endTime: new Date(Date.now() + 30 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'attended',
    candidateJoinedAt: new Date(Date.now() - 29 * 60 * 1000),
    candidateLeftAt: new Date(Date.now() - 20 * 60 * 1000),
    candidateConnectionStatus: 'left',
    price: 1500
  });

  await axios.post(
    `${BASE_URL}/api/sessions/${sIneligible.sessionId}/complete`,
    {
      attendanceOutcome: 'ATTENDED_INCOMPLETE',
      completionEvidence: { summary: 'Candidate disconnected early' }
    },
    { headers: { Authorization: `Bearer ${expertToken}` } }
  );

  const certPreviewIneligible = await axios.get(`${BASE_URL}/api/certifications/preview`, {
    headers: { Authorization: `Bearer ${candidateToken}` }
  });
  const auditsIneligible = certPreviewIneligible.data?.data?.ineligibleAudits || [];
  const isAuditedAsIncomplete = auditsIneligible.some(a =>
    (a.sessionId === sIneligible.sessionId || a.sessionId === String(sIneligible._id)) &&
    a.reason === 'OUTCOME_ATTENDED_INCOMPLETE'
  );

  record(
    '1.3',
    'ATTENDED_INCOMPLETE (non-qualifying outcome): Strictly audited as OUTCOME_ATTENDED_INCOMPLETE, zero certificate progress',
    isAuditedAsIncomplete,
    `Audit Reason OUTCOME_ATTENDED_INCOMPLETE found: ${isAuditedAsIncomplete}`
  );

  // Test 1.4: Duplicate Feedback Submission (Idempotency)
  console.log('\nSubmitting duplicate expert review for same session...');
  const resDupReview = await axios.post(
    `${BASE_URL}/api/sessions/${sPending.sessionId}/review`,
    {
      reviewerRole: 'expert',
      overallRating: 5,
      feedback: 'Duplicate attempt'
    },
    { headers: { Authorization: `Bearer ${expertToken}` } }
  );

  const reviewCount = await Review.countDocuments({ sessionId: sPending.sessionId, reviewerRole: 'expert' });
  const test1_4Pass = resDupReview.status === 200 && reviewCount === 1 && resDupReview.data?.walletCredit?.alreadyCredited === true;

  record(
    '1.4',
    'Duplicate feedback submission: Idempotently rejected, exactly 1 review in DB, zero duplicate payout',
    test1_4Pass,
    `HTTP Status: ${resDupReview.status}, Review Count in DB: ${reviewCount}, alreadyCredited: ${resDupReview.data?.walletCredit?.alreadyCredited}`
  );

  // Test 1.5: Repeated Certificate Eligibility Requests (Consistency)
  const req1 = await axios.get(`${BASE_URL}/api/certifications/preview`, { headers: { Authorization: `Bearer ${candidateToken}` } });
  const req2 = await axios.get(`${BASE_URL}/api/certifications/preview`, { headers: { Authorization: `Bearer ${candidateToken}` } });
  const req3 = await axios.get(`${BASE_URL}/api/certifications/status/${candidateUser._id}`, { headers: { Authorization: `Bearer ${candidateToken}` } });

  const test1_5Pass = (
    JSON.stringify(req1.data?.data?.eligibleSessionIds) === JSON.stringify(req2.data?.data?.eligibleSessionIds) &&
    req3.status === 200 &&
    req3.data?.success === true
  );

  record(
    '1.5',
    'Repeated certificate eligibility requests: Deterministic and identical response across repeated requests',
    test1_5Pass,
    `Preview 1 IDs: ${req1.data?.data?.eligibleSessionIds?.length}, Preview 2 IDs: ${req2.data?.data?.eligibleSessionIds?.length}, Status API HTTP: ${req3.status}`
  );

  // ============================================================================
  // REQUIREMENT 2: SOCKET.IO LISTENER CLEANUP
  // ============================================================================
  console.log('\n--- 2. SOCKET.IO LISTENER CLEANUP & REGISTRATION AUDIT ---');

  const socketContextPath = path.join(__dirname, '../../client/src/context/SocketContext.tsx');
  const liveMeetingPath = path.join(__dirname, '../../client/src/pages/LiveMeeting.tsx');
  const socketCtxCode = fs.readFileSync(socketContextPath, 'utf8');
  const lmCode = fs.readFileSync(liveMeetingPath, 'utf8');

  // Verify useSocketEvent has matching socket.on and socket.off with exact same listener reference
  const hasMatchingSocketOff = socketCtxCode.includes('socket.on(eventName, listener);') && socketCtxCode.includes('socket.off(eventName, listener);');

  // Verify useDataSync uses unsubscribe closure in useEffect return
  const hasDataSyncUnsubscribe = socketCtxCode.includes('const unsubscribe = subscribeDataSync') && socketCtxCode.includes('return unsubscribe;');

  // Verify subscribeDataSync correctly deletes callback from Set and Map
  const hasSetDelete = socketCtxCode.includes('set.delete(callback);') && socketCtxCode.includes('subscribersRef.current.delete(t);');

  // Verify LiveMeeting emits leave-session on cleanup
  const hasLeaveSessionCleanup = lmCode.includes("socket.emit('leave-session', meetingId);");

  const test2Pass = hasMatchingSocketOff && hasDataSyncUnsubscribe && hasSetDelete && hasLeaveSessionCleanup;

  record(
    '2.1',
    'Socket.IO Listener Lifecycle: Exact socket.off handler cleanup, useDataSync Set/Map unregistration, leave-session cleanup',
    test2Pass,
    `socket.off cleanup: ${hasMatchingSocketOff}, useDataSync unsubscribe: ${hasDataSyncUnsubscribe}, Set/Map deletion: ${hasSetDelete}, leave-session: ${hasLeaveSessionCleanup}`
  );

  // ============================================================================
  // REQUIREMENT 3: CONFLICTING CONCURRENT OUTCOME REQUESTS
  // ============================================================================
  console.log('\n--- 3. CONFLICTING CONCURRENT OUTCOME REQUESTS ---');

  // Test 3.1: Conflicting Pair 1: ATTENDED_COMPLETED vs DID_NOT_ATTEND (Candidate Attended)
  const sConflict1 = await Session.create({
    sessionId: 'CONFLICT-1-' + Date.now(),
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    categoryId: itCategory._id,
    startTime: new Date(Date.now() - 25 * 60 * 1000),
    endTime: new Date(Date.now() + 35 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'attended',
    candidateJoinedAt: new Date(Date.now() - 24 * 60 * 1000),
    candidateConnectionStatus: 'connected',
    price: 1500
  });

  const req1A = axios.post(
    `${BASE_URL}/api/sessions/${sConflict1.sessionId}/complete`,
    {
      attendanceOutcome: 'ATTENDED_COMPLETED',
      completionEvidence: { interviewConducted: true, summary: 'Full interview held' }
    },
    { headers: { Authorization: `Bearer ${expertToken}` } }
  );

  const req1B = axios.post(
    `${BASE_URL}/api/sessions/${sConflict1.sessionId}/complete`,
    {
      attendanceOutcome: 'DID_NOT_ATTEND',
      reason: 'Conflicting no-show request'
    },
    { headers: { Authorization: `Bearer ${expertToken}` } }
  );

  let resp1A = null, err1A = null;
  let resp1B = null, err1B = null;

  await Promise.all([
    req1A.then(r => resp1A = r).catch(e => err1A = e),
    req1B.then(r => resp1B = r).catch(e => err1B = e)
  ]);

  const finalSess1 = await Session.findById(sConflict1._id);
  const notifs1 = await Notification.find({ 'metadata.sessionId': sConflict1.sessionId });
  const emails1 = await EmailOutbox.find({ sessionId: sConflict1.sessionId });

  const test3_1Pass = (
    resp1A?.status === 200 &&
    (err1B?.response?.status === 400 || err1B?.response?.status === 409) &&
    finalSess1.status === 'completed' &&
    finalSess1.attendanceOutcome === 'ATTENDED_COMPLETED' &&
    notifs1.length === 1 &&
    emails1.length <= 1
  );

  record(
    '3.1',
    'Conflicting Requests (ATTENDED_COMPLETED vs DID_NOT_ATTEND): Winner committed, loser rejected with 400/409, 1 outcome in DB, 1 notification',
    test3_1Pass,
    `Req A Status: ${resp1A?.status}, Req B Status: ${err1B?.response?.status} ("${err1B?.response?.data?.message}"), DB Outcome: ${finalSess1.attendanceOutcome}, Notifs: ${notifs1.length}`
  );

  // Test 3.2: Conflicting Pair 2: ATTENDED_COMPLETED vs ATTENDED_INCOMPLETE (Race Condition)
  const sConflict2 = await Session.create({
    sessionId: 'CONFLICT-2-' + Date.now(),
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    categoryId: itCategory._id,
    startTime: new Date(Date.now() - 25 * 60 * 1000),
    endTime: new Date(Date.now() + 35 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'attended',
    candidateJoinedAt: new Date(Date.now() - 24 * 60 * 1000),
    candidateConnectionStatus: 'connected',
    price: 1500
  });

  const req2A = axios.post(
    `${BASE_URL}/api/sessions/${sConflict2.sessionId}/complete`,
    {
      attendanceOutcome: 'ATTENDED_COMPLETED',
      completionEvidence: { interviewConducted: true, summary: 'Full interview verified' }
    },
    { headers: { Authorization: `Bearer ${expertToken}` } }
  );

  const req2B = axios.post(
    `${BASE_URL}/api/sessions/${sConflict2.sessionId}/complete`,
    {
      attendanceOutcome: 'ATTENDED_INCOMPLETE',
      completionEvidence: { summary: 'Conflicting incomplete request' }
    },
    { headers: { Authorization: `Bearer ${expertToken}` } }
  );

  let resp2A = null, err2A = null;
  let resp2B = null, err2B = null;

  await Promise.all([
    req2A.then(r => resp2A = r).catch(e => err2A = e),
    req2B.then(r => resp2B = r).catch(e => err2B = e)
  ]);

  const finalSess2 = await Session.findById(sConflict2._id);
  const notifs2 = await Notification.find({ 'metadata.sessionId': sConflict2.sessionId });

  // One must win (200) and the conflicting loser must receive HTTP 409 Conflict
  const oneWon = (resp2A?.status === 200 && err2B?.response?.status === 409) || (resp2B?.status === 200 && err2A?.response?.status === 409);
  const test3_2Pass = (
    oneWon &&
    finalSess2.status === 'completed' &&
    ['ATTENDED_COMPLETED', 'ATTENDED_INCOMPLETE'].includes(finalSess2.attendanceOutcome) &&
    notifs2.length === 1
  );

  record(
    '3.2',
    'Conflicting Requests (ATTENDED_COMPLETED vs ATTENDED_INCOMPLETE): Atomic winner committed, conflicting loser receives HTTP 409 Conflict, exactly 1 notification',
    test3_2Pass,
    `Req A: ${resp2A ? resp2A.status : err2A?.response?.status}, Req B: ${resp2B ? resp2B.status : err2B?.response?.status} ("${err2A?.response?.data?.message || err2B?.response?.data?.message}"), DB Outcome: ${finalSess2.attendanceOutcome}, Notifs: ${notifs2.length}`
  );

  // Clean up test sessions
  await Session.deleteMany({ sessionId: { $regex: /^(CERT-PENDING|INELIGIBLE-TEST|CONFLICT-)/ } });
  await Review.deleteMany({ sessionId: { $regex: /^(CERT-PENDING|INELIGIBLE-TEST|CONFLICT-)/ } });
  await PaymentRecord.deleteMany({ paymentId: { $regex: /^PAY-CERT-/ } });

  await mongoose.disconnect();

  console.log('\n========================================================================');
  const allPassed = results.every(r => r.pass);
  console.log(`FINAL RESULT: ${allPassed ? 'ALL INTEGRITY TESTS PASSED (7/7)' : 'SOME TESTS FAILED'}`);
  console.log('========================================================================\n');

  if (!allPassed) process.exit(1);
}

runIntegrityCheck().catch(err => {
  console.error('Fatal error in integrity check:', err);
  process.exit(1);
});
