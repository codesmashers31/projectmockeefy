const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const http = require('http');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'code@1234';
const MONGO_URI = process.env.MONGO_URI;
const BASE_URL = 'http://127.0.0.1:5000';

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('================================================================');
  console.log('  MOCKEEFY — FOUR TARGETED IMPROVEMENTS VERIFICATION SUITE');
  console.log('================================================================');

  await mongoose.connect(MONGO_URI);
  console.log('[DB] Connected to MongoDB');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Session = mongoose.model('Session', new mongoose.Schema({}, { strict: false }));
  const Expert = mongoose.model('ExpertDetails', new mongoose.Schema({}, { strict: false }));
  const Review = mongoose.model('ReviewDetails', new mongoose.Schema({}, { strict: false }), 'reviews');
  const Notification = mongoose.model('Notification', new mongoose.Schema({}, { strict: false }));
  const WalletTransaction = mongoose.model('WalletTransaction', new mongoose.Schema({}, { strict: false }));

  let passes = 0;
  let failures = 0;

  function assert(condition, desc) {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passes++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failures++;
    }
  }

  // --- Setup Test Users ---
  const candidateId = new mongoose.Types.ObjectId();
  const expertUserId = new mongoose.Types.ObjectId();
  const expertProfileId = new mongoose.Types.ObjectId();

  await User.create([
    {
      _id: candidateId,
      name: 'Test Candidate',
      email: `candidate_test_${Date.now()}@mockeefy.test`,
      userType: 'candidate',
      isVerified: true
    },
    {
      _id: expertUserId,
      name: 'Test Expert',
      email: `expert_test_${Date.now()}@mockeefy.test`,
      userType: 'expert',
      isVerified: true
    }
  ]);

  await Expert.create({
    _id: expertProfileId,
    userId: expertUserId,
    personalInformation: { userName: 'Test Expert', email: 'expert@test.com' },
    professionalDetails: { title: 'Senior Software Engineer' },
    availability: {
      weeklySchedule: {
        monday: [{ startTime: '10:00', endTime: '12:00' }],
        tuesday: [{ startTime: '14:00', endTime: '16:00' }]
      },
      sessionDuration: 30
    }
  });

  const candidateToken = jwt.sign(
    { userId: candidateId.toString(), userType: 'candidate', email: 'candidate@mockeefy.test' },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  const expertToken = jwt.sign(
    { userId: expertUserId.toString(), userType: 'expert', email: 'expert@mockeefy.test' },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  console.log('\n--- TEST GROUP 1: CHANGE 3 — CASH REFUND REQUEST REMOVAL ---');
  // Submitting POST /api/wallet/cash-refund must be rejected with 400 Bad Request
  const refundReq = await makeRequest('POST', '/api/wallet/cash-refund', {
    paymentId: 'pay_test_dummy_123',
    amount: 500,
    reason: 'Candidate self-service cash refund'
  }, candidateToken);

  assert(refundReq.status === 400, `POST /api/wallet/cash-refund returns HTTP 400 (received ${refundReq.status})`);
  assert(refundReq.data && refundReq.data.success === false, 'Response has success === false');
  assert(
    refundReq.data && /disabled|strictly reserved for interview bookings/i.test(refundReq.data.message),
    `Response message explicitly explains funds are strictly reserved for interview bookings: "${refundReq.data?.message}"`
  );

  console.log('\n--- TEST GROUP 2: CHANGE 4 — REQUEST FEEDBACK & 12H REMINDER SYSTEM ---');
  const testSessionId = `MOCK-FB-${Date.now()}`;
  const now = new Date();

  const testSession = await Session.create({
    sessionId: testSessionId,
    candidateId,
    expertId: expertProfileId,
    status: 'completed',
    startTime: new Date(now.getTime() - 3600 * 1000 * 2), // 2 hours ago
    endTime: new Date(now.getTime() - 3600 * 1000 * 1),
    feedbackRequested: false,
    feedbackRequestCount: 0
  });

  // Step 2.1: First feedback request immediately post-session
  console.log('Step 2.1: Candidate sends first feedback request immediately post-session');
  const fb1 = await makeRequest('POST', `/api/sessions/${testSessionId}/request-feedback`, {}, candidateToken);
  assert(fb1.status === 200, `First request succeeds with HTTP 200 (received ${fb1.status})`);
  assert(fb1.data && fb1.data.session?.feedbackRequestCount === 1, 'Updated session feedbackRequestCount === 1');
  assert(fb1.data && fb1.data.session?.feedbackRequested === true, 'Updated session feedbackRequested === true');

  // Verify persistent notification for expert
  const notif1 = await Notification.findOne({ userId: expertUserId, type: 'feedback_request', 'metadata.sessionId': testSessionId });
  assert(Boolean(notif1), 'Persistent notification created for Expert with type "feedback_request"');
  assert(notif1?.title === 'Feedback Requested', `Notification title is "Feedback Requested" (received "${notif1?.title}")`);

  // Step 2.2: Immediate second request within 12 hours MUST be rejected
  console.log('Step 2.2: Candidate attempts immediate second request (< 12 hours)');
  const fb2Early = await makeRequest('POST', `/api/sessions/${testSessionId}/request-feedback`, {}, candidateToken);
  assert(fb2Early.status === 400, `Early reminder attempt rejected with HTTP 400 (received ${fb2Early.status})`);
  assert(
    fb2Early.data && /another reminder in \d+h \d+m/i.test(fb2Early.data.message),
    `Rejection message contains remaining countdown: "${fb2Early.data?.message}"`
  );

  // Step 2.3: Fast forward to 12 hours after the first request
  console.log('Step 2.3: Fast-forward 12 hours since first request (simulate 12-hour boundary)');
  const twelveHoursAgo = new Date(Date.now() - 12 * 3600 * 1000 - 1000); // 12 hours and 1 second ago
  await Session.updateOne(
    { sessionId: testSessionId },
    { $set: { lastFeedbackRequestedAt: twelveHoursAgo } }
  );

  // Step 2.4: Second feedback request (reminder) at 12 hours
  console.log('Step 2.4: Candidate sends second feedback request (reminder) after 12 hours');
  const fb2 = await makeRequest('POST', `/api/sessions/${testSessionId}/request-feedback`, {}, candidateToken);
  assert(fb2.status === 200, `Second request (reminder) succeeds with HTTP 200 (received ${fb2.status})`);
  assert(fb2.data && fb2.data.session?.feedbackRequestCount === 2, 'Updated session feedbackRequestCount === 2');
  assert(/reminder/i.test(fb2.data?.message), `Response indicates reminder sent: "${fb2.data?.message}"`);

  // Verify reminder notification for expert
  const notif2 = await Notification.findOne({ userId: expertUserId, type: 'feedback_reminder', 'metadata.sessionId': testSessionId });
  assert(Boolean(notif2), 'Persistent reminder notification created for Expert with type "feedback_reminder"');
  assert(notif2?.title === 'Feedback Reminder', `Notification title is "Feedback Reminder" (received "${notif2?.title}")`);

  // Step 2.5: Third request within 24 hours MUST be rejected (max 2 per 24 hours)
  console.log('Step 2.5: Candidate attempts third request within 24 hours (max 2 rule)');
  const fb3Excess = await makeRequest('POST', `/api/sessions/${testSessionId}/request-feedback`, {}, candidateToken);
  assert(fb3Excess.status === 400, `Third request rejected with HTTP 400 (received ${fb3Excess.status})`);
  assert(
    fb3Excess.data && /Maximum of 2 feedback requests allowed per 24 hours/i.test(fb3Excess.data.message),
    `Rejection message indicates 24-hour limit: "${fb3Excess.data?.message}"`
  );

  // Step 2.6: Expert submits review -> subsequent requests must be blocked
  console.log('Step 2.6: Expert submits review -> feedback requests permanently blocked');
  await Review.create({
    sessionId: testSessionId,
    reviewerRole: 'expert',
    overallRating: 5,
    strengths: ['Great coding skills'],
    areasForImprovement: ['Practice system design']
  });

  const fbAfterReview = await makeRequest('POST', `/api/sessions/${testSessionId}/request-feedback`, {}, candidateToken);
  assert(fbAfterReview.status === 400, `Request after expert review rejected with HTTP 400 (received ${fbAfterReview.status})`);
  assert(
    fbAfterReview.data && /already submitted feedback/i.test(fbAfterReview.data.message),
    `Rejection message confirms feedback already submitted: "${fbAfterReview.data?.message}"`
  );

  console.log('\n--- TEST GROUP 3: CHANGE 1 & CHANGE 2 — STATIC/CLIENT CODE AUDIT ---');
  // Check CandidateWalletPage.tsx for:
  // 1) 3 summary cards (Available Balance, Total Credited, Total Spent)
  // 2) Absence of "Cash Refunded" card
  // 3) grid-cols-1 md:grid-cols-3
  // 4) Absence of Request Cash Refund button / modal
  const walletPageContent = fs.readFileSync(path.resolve(__dirname, '../../client/src/pages/CandidateWalletPage.tsx'), 'utf8');
  assert(!walletPageContent.includes('Cash Refunded'), 'CandidateWalletPage does NOT contain "Cash Refunded" card');
  assert(walletPageContent.includes('grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6'), 'CandidateWalletPage uses 3-column grid "grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6"');
  assert(!walletPageContent.includes('Request Cash Refund'), 'CandidateWalletPage does NOT contain "Request Cash Refund" button');
  assert(!walletPageContent.includes('Request External Cash Refund'), 'CandidateWalletPage does NOT contain cash refund modal');
  assert(walletPageContent.includes('<th className="py-3 px-5 text-right">Status</th>'), 'Transactions table uses Status header instead of Actions');

  // Check BookSessionPage.tsx and BookingModal.tsx for:
  // 1) Zero-slot date filtering: slots.some(s => s.available === true)
  // 2) Today special handling: "No interview slots available today."
  // 3) Button: View slots for [date]
  // 4) activeDate strictly from dates array
  const bookPageContent = fs.readFileSync(path.resolve(__dirname, '../../client/src/components/BookSessionPage.tsx'), 'utf8');
  assert(bookPageContent.includes('return slots.some(s => s.available === true);'), 'BookSessionPage filters dates by slots.some(s => s.available === true)');
  assert(!bookPageContent.includes('if (dateStr === todayDateStr) return true;'), 'BookSessionPage does NOT unconditionally force Today into dates array');
  assert(bookPageContent.includes('No interview slots available today.'), 'BookSessionPage contains clear message "No interview slots available today."');
  assert(bookPageContent.includes('View slots for'), 'BookSessionPage contains action button "View slots for"');

  const bookModalContent = fs.readFileSync(path.resolve(__dirname, '../../client/src/components/BookingModal.tsx'), 'utf8');
  assert(bookModalContent.includes('return slots.some(s => s.available === true);'), 'BookingModal filters dates by slots.some(s => s.available === true)');
  assert(bookModalContent.includes('No interview slots available today.'), 'BookingModal contains clear message "No interview slots available today."');
  assert(bookModalContent.includes('View slots for'), 'BookingModal contains action button "View slots for"');

  // Check MySessions.tsx for:
  // 1) Countdown reminder label
  // 2) Send Reminder button at 12 hours
  // 3) View Feedback transition
  const mySessionsContent = fs.readFileSync(path.resolve(__dirname, '../../client/src/components/MySessions.tsx'), 'utf8');
  assert(mySessionsContent.includes('Reminder in {timeStr}'), 'MySessions displays countdown timer for pending reminder');
  assert(mySessionsContent.includes('Send Reminder'), 'MySessions includes enabled "Send Reminder" button at 12h boundary');
  assert(mySessionsContent.includes('View Feedback'), 'MySessions transitions to "View Feedback" when review exists');

  // Cleanup test docs
  await User.deleteMany({ _id: { $in: [candidateId, expertUserId] } });
  await Expert.deleteOne({ _id: expertProfileId });
  await Session.deleteOne({ sessionId: testSessionId });
  await Review.deleteOne({ sessionId: testSessionId });
  await Notification.deleteMany({ 'metadata.sessionId': testSessionId });

  await mongoose.disconnect();

  console.log('\n================================================================');
  console.log(`  VERIFICATION RESULTS: ${passes} PASSED, ${failures} FAILED`);
  console.log('================================================================');

  if (failures > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run().catch(err => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
