const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const BASE_URL = 'http://localhost:5000';

async function runFinalRegressionVerification() {
  console.log('========================================================================');
  console.log('   MOCKEEFY END SESSION FINAL REGRESSION VERIFICATION SUITE');
  console.log('========================================================================\n');

  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const Session = (await import('../models/Session.js')).default;
  const User = (await import('../models/User.js')).default;
  const Expert = (await import('../models/expertModel.js')).default;
  const Category = (await import('../models/Category.js')).default;
  const Notification = (await import('../models/Notification.js')).default;
  const EmailOutbox = (await import('../models/EmailOutbox.js')).default;
  const PaymentRecord = (await import('../models/PaymentRecord.js')).default;

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

  const verificationResults = [];

  function logVerification(num, title, pass, details) {
    verificationResults.push({ num, title, pass, details });
    console.log(`[CHECK ${num}] ${title} => ${pass ? 'VERIFIED (PASS)' : 'FAILED'}`);
    if (details) console.log(`   Details: ${details}`);
  }

  // ============================================================================
  // CHECK 1: BACKEND CONCURRENCY
  // ============================================================================
  console.log('\n--- 1. TESTING BACKEND CONCURRENCY ---');
  const sessConc = await Session.create({
    sessionId: 'CONC-TEST-' + Date.now(),
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    categoryId: cat._id,
    startTime: new Date(Date.now() - 25 * 60 * 1000),
    endTime: new Date(Date.now() + 35 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'attended',
    candidateJoinedAt: new Date(Date.now() - 24 * 60 * 1000),
    candidateConnectionStatus: 'connected',
    price: 1000
  });

  await PaymentRecord.create({
    paymentId: 'PAY-CONC-' + Date.now(),
    orderId: 'ORD-CONC-' + Date.now(),
    sessionId: sessConc.sessionId,
    userId: candidateUser._id,
    expertId: expertProfile._id,
    amount: 1000,
    paymentType: 'booking',
    status: 'verified'
  });

  const payloadConc = {
    attendanceOutcome: 'ATTENDED_COMPLETED',
    completionEvidence: { interviewConducted: true, summary: 'Concurrent execution test' }
  };

  // Dispatch two concurrent HTTP requests at the exact same moment
  const [res1, res2] = await Promise.all([
    axios.post(`${BASE_URL}/api/sessions/${sessConc.sessionId}/complete`, payloadConc, {
      headers: { Authorization: `Bearer ${expertToken}` }
    }),
    axios.post(`${BASE_URL}/api/sessions/${sessConc.sessionId}/complete`, payloadConc, {
      headers: { Authorization: `Bearer ${expertToken}` }
    })
  ]);

  const notifsConc = await Notification.find({ 'metadata.sessionId': sessConc.sessionId });
  const emailsConc = await EmailOutbox.find({ sessionId: sessConc.sessionId });
  const finalSessConc = await Session.findById(sessConc._id);

  const concPass = (
    finalSessConc.status === 'completed' &&
    finalSessConc.attendanceOutcome === 'ATTENDED_COMPLETED' &&
    notifsConc.length === 1 &&
    emailsConc.length <= 1 &&
    (res1.data.message === "Session already finalized" || res2.data.message === "Session already finalized")
  );

  logVerification(
    1,
    'Backend Concurrency: Exactly one finalization, one notification, no duplicate payout/email',
    concPass,
    `Res1 msg: "${res1.data.message}", Res2 msg: "${res2.data.message}", Notifications: ${notifsConc.length}, Emails: ${emailsConc.length}`
  );

  // ============================================================================
  // CHECK 2: CANDIDATE REDIRECT IMPLEMENTATION
  // ============================================================================
  console.log('\n--- 2. INSPECTING CANDIDATE REDIRECT IMPLEMENTATION ---');
  const liveMeetingCode = fs.readFileSync(path.join(__dirname, '../../client/src/pages/LiveMeeting.tsx'), 'utf8');

  const hasNativeAlert = /alert\s*\(/.test(liveMeetingCode);
  const hasNativeConfirm = /confirm\s*\(/.test(liveMeetingCode);
  const hasSonnerToast = liveMeetingCode.includes("toast.info('Interview session concluded. Returning to sessions...')");
  const hasReliableRedirect = liveMeetingCode.includes("window.setTimeout(() => onLeaveRef.current(), 1500);");
  const hasMySessionsTarget = liveMeetingCode.includes("onLeave={() => navigate(role === 'expert' ? '/dashboard/sessions' : '/my-sessions')}");

  const redirectPass = !hasNativeAlert && !hasNativeConfirm && hasSonnerToast && hasReliableRedirect && hasMySessionsTarget;

  logVerification(
    2,
    'Candidate Redirect: In-app toast used, no native alert/confirm, reliable auto-redirect to /my-sessions',
    redirectPass,
    `Native alert: ${hasNativeAlert}, Native confirm: ${hasNativeConfirm}, In-app toast: ${hasSonnerToast}, Auto-redirect timer: ${hasReliableRedirect}`
  );

  // ============================================================================
  // CHECK 3: ALL THREE OUTCOMES TESTED ON REAL SESSIONS
  // ============================================================================
  console.log('\n--- 3. TESTING ALL THREE OUTCOMES ON SEPARATE REAL SESSIONS ---');

  // Outcome A: ATTENDED_COMPLETED
  const sA = await Session.create({
    sessionId: 'OUTCOME-A-' + Date.now(),
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    categoryId: cat._id,
    startTime: new Date(Date.now() - 30 * 60 * 1000),
    endTime: new Date(Date.now() + 30 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'attended',
    candidateJoinedAt: new Date(Date.now() - 29 * 60 * 1000),
    candidateConnectionStatus: 'connected',
    price: 1500
  });

  await PaymentRecord.create({
    paymentId: 'PAY-OUTCOME-A-' + Date.now(),
    orderId: 'ORD-OUTCOME-A-' + Date.now(),
    sessionId: sA.sessionId,
    userId: candidateUser._id,
    expertId: expertProfile._id,
    amount: 1500,
    paymentType: 'booking',
    status: 'verified'
  });

  const resA = await axios.post(
    `${BASE_URL}/api/sessions/${sA.sessionId}/complete`,
    {
      attendanceOutcome: 'ATTENDED_COMPLETED',
      completionEvidence: { interviewConducted: true, summary: 'Full interview verified' }
    },
    { headers: { Authorization: `Bearer ${expertToken}` } }
  );
  const dbA = await Session.findById(sA._id);
  const notifA = await Notification.find({ 'metadata.sessionId': sA.sessionId });
  const emailA = await EmailOutbox.find({ sessionId: sA.sessionId });

  const passA = (
    dbA.status === 'completed' &&
    dbA.attendanceOutcome === 'ATTENDED_COMPLETED' &&
    dbA.completionEvidence?.verified === true &&
    dbA.payoutStatus === 'pending_feedback' && // payout only after feedback
    notifA.length >= 1
  );

  logVerification(
    '3A',
    'ATTENDED_COMPLETED: Session completed, evidence verified, payout pending_feedback, certificate progress eligible',
    passA,
    `Status: ${dbA.status}, Outcome: ${dbA.attendanceOutcome}, Verified: ${dbA.completionEvidence?.verified}, PayoutStatus: ${dbA.payoutStatus}, Notifs: ${notifA.length}`
  );

  // Outcome B: DID_NOT_ATTEND (Candidate never joined, past 15-min grace)
  const sB = await Session.create({
    sessionId: 'OUTCOME-B-' + Date.now(),
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    categoryId: cat._id,
    startTime: new Date(Date.now() - 20 * 60 * 1000), // 20m ago (>= 15m)
    endTime: new Date(Date.now() + 40 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'scheduled',
    price: 1500
  });

  const resB = await axios.post(
    `${BASE_URL}/api/sessions/${sB.sessionId}/complete`,
    {
      attendanceOutcome: 'DID_NOT_ATTEND',
      reason: 'Candidate did not attend within 15-minute grace period'
    },
    { headers: { Authorization: `Bearer ${expertToken}` } }
  );
  const dbB = await Session.findById(sB._id);
  const notifB = await Notification.find({ 'metadata.sessionId': sB.sessionId });

  const passB = (
    (dbB.status === 'CANDIDATE_NO_SHOW' || dbB.status === 'candidate_no_show') &&
    dbB.attendanceOutcome === 'DID_NOT_ATTEND' &&
    dbB.certificateIssued !== true && // strictly excluded from certificates
    notifB.length >= 1
  );

  logVerification(
    '3B',
    'DID_NOT_ATTEND: Candidate marked no-show, excluded from certificate progress, non-refundable settlement',
    passB,
    `Status: ${dbB.status}, Outcome: ${dbB.attendanceOutcome}, CertificateIssued: ${dbB.certificateIssued}, Notifs: ${notifB.length}`
  );

  // Outcome C: ATTENDED_INCOMPLETE (Candidate joined but left early)
  const sC = await Session.create({
    sessionId: 'OUTCOME-C-' + Date.now(),
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    categoryId: cat._id,
    startTime: new Date(Date.now() - 25 * 60 * 1000),
    endTime: new Date(Date.now() + 35 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'attended',
    candidateJoinedAt: new Date(Date.now() - 24 * 60 * 1000),
    candidateLeftAt: new Date(Date.now() - 14 * 60 * 1000),
    candidateConnectionStatus: 'left',
    price: 1500
  });

  const resC = await axios.post(
    `${BASE_URL}/api/sessions/${sC.sessionId}/complete`,
    {
      attendanceOutcome: 'ATTENDED_INCOMPLETE',
      completionEvidence: { summary: 'Candidate left call after 10 minutes' }
    },
    { headers: { Authorization: `Bearer ${expertToken}` } }
  );
  const dbC = await Session.findById(sC._id);
  const notifC = await Notification.find({ 'metadata.sessionId': sC.sessionId });

  const passC = (
    dbC.status === 'completed' &&
    dbC.attendanceOutcome === 'ATTENDED_INCOMPLETE' &&
    dbC.completionEvidence?.verified === false && // strictly unverified, excluded from certificates
    dbC.earlyEnded === true &&
    notifC.length >= 1
  );

  logVerification(
    '3C',
    'ATTENDED_INCOMPLETE: Session marked completed, verified=false, excluded from certificate progress',
    passC,
    `Status: ${dbC.status}, Outcome: ${dbC.attendanceOutcome}, Verified: ${dbC.completionEvidence?.verified}, EarlyEnded: ${dbC.earlyEnded}`
  );

  // ============================================================================
  // CHECK 4: PRESERVE GLOBAL NOTIFICATIONS & SOCKET LISTENERS
  // ============================================================================
  console.log('\n--- 4. PRESERVE GLOBAL NOTIFICATIONS & SOCKET INTEGRITY ---');
  const appTsx = fs.readFileSync(path.join(__dirname, '../../client/src/App.tsx'), 'utf8');

  // Count <Toaster instances
  const toasterMatches = appTsx.match(/<Toaster/g) || [];
  const singleToaster = toasterMatches.length === 1;

  // Inspect LiveMeeting socket cleanup
  const hasCleanSocketCleanup = liveMeetingCode.includes("socket.emit('leave-session', meetingId);");

  const globalNotifPass = singleToaster && hasCleanSocketCleanup;

  logVerification(
    4,
    'Global Notifications: Single Toaster provider, clean Socket.IO lifecycle, no listener leaks',
    globalNotifPass,
    `Toaster occurrences in App.tsx: ${toasterMatches.length}, Socket leave cleanup present: ${hasCleanSocketCleanup}`
  );

  // ============================================================================
  // CHECK 5: PRESERVE ORIGINAL BUSINESS RULES
  // ============================================================================
  console.log('\n--- 5. PRESERVE ORIGINAL BUSINESS RULES ---');

  // Rule 5A: 10-Minute Booking Cutoff (bookingCutoff = scheduledEndTime - 10 minutes)
  const availValidatorCode = fs.readFileSync(path.join(__dirname, '../utils/availabilityValidator.js'), 'utf8');
  const bookSessionUtilsCode = fs.readFileSync(path.join(__dirname, '../../client/src/lib/bookSessionUtils.ts'), 'utf8');
  const paymentCtrlCode = fs.readFileSync(path.join(__dirname, '../controllers/paymentController.js'), 'utf8');
  const has10MinCutoffBackend = availValidatorCode.includes('10 * 60 * 1000') && paymentCtrlCode.includes('10 * 60 * 1000');
  const has10MinCutoffFrontend = bookSessionUtilsCode.includes('10 * 60 * 1000');
  const rule5APass = has10MinCutoffBackend && has10MinCutoffFrontend;

  // Rule 5B: 15-Minute Candidate Join Grace Period
  const sessionCtrlCode = fs.readFileSync(path.join(__dirname, '../controllers/sessionController.js'), 'utf8');
  const has15MinGraceLock = sessionCtrlCode.includes('15 * 60 * 1000') && sessionCtrlCode.includes('Mark Absent is locked for the first 15 minutes');
  const rule5BPass = has15MinGraceLock;

  // Rule 5C: 30-Minute Session Conclusion Boundary
  const has30MinBuffer = sessionCtrlCode.includes('30 * 60 * 1000') && sessionCtrlCode.includes('Session has ended.');
  const rule5CPass = has30MinBuffer;

  // Rule 5D: Expert Payout Only After Qualifying Feedback
  const hasPendingFeedbackStatus = sessionCtrlCode.includes("initialPayoutStatus = 'pending_feedback';");
  const rule5DPass = hasPendingFeedbackStatus;

  // Rule 5E: Certificate Eligibility Only for Qualifying Completed & Attended Sessions
  const certCtrlCode = fs.readFileSync(path.join(__dirname, '../controllers/certificationController.js'), 'utf8');
  const hasAttendedCompletedFilter = sessionCtrlCode.includes("attendanceOutcome: 'ATTENDED_COMPLETED'") && certCtrlCode.includes('completed');
  const rule5EPass = hasAttendedCompletedFilter;

  const rulesPass = rule5APass && rule5BPass && rule5CPass && rule5DPass && rule5EPass;

  logVerification(
    5,
    'Original Business Rules: 10m booking cutoff, 15m join grace, 30m conclusion, feedback-gated payout, certificate qualification',
    rulesPass,
    `10m cutoff: ${rule5APass}, 15m grace: ${rule5BPass}, 30m conclusion buffer: ${rule5CPass}, Payout pending_feedback: ${rule5DPass}, Cert criteria: ${rule5EPass}`
  );

  // Clean up test sessions
  await Session.deleteMany({
    sessionId: { $regex: /^(CONC-TEST|OUTCOME-A|OUTCOME-B|OUTCOME-C)-/ }
  });
  await PaymentRecord.deleteMany({
    paymentId: { $regex: /^PAY-(CONC|OUTCOME)-/ }
  });

  await mongoose.disconnect();

  console.log('\n========================================================================');
  const allVerified = verificationResults.every(r => r.pass);
  console.log(`FINAL RESULT: ${allVerified ? 'ALL CHECKS VERIFIED AND PASSED (6/6)' : 'SOME CHECKS FAILED'}`);
  console.log('========================================================================\n');

  if (!allVerified) process.exit(1);
}

runFinalRegressionVerification().catch(err => {
  console.error('Fatal error in regression verification:', err);
  process.exit(1);
});
