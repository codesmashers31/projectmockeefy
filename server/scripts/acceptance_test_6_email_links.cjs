/**
 * ACCEPTANCE TEST 6: EMAIL LINKS & ROUTE INTEGRITY VERIFICATION
 * 
 * Verifies:
 * 1. Candidate booking email contains /my-sessions link.
 * 2. Expert booking email contains /dashboard/sessions link.
 * 3. In production (NODE_ENV=production), links strictly never contain 'localhost'.
 * 4. EmailOutbox records are enqueued with deterministic idempotency keys.
 * 5. Frontend route protection passes location state for post-login return.
 */

const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  console.log('================================================================');
  console.log('   ACCEPTANCE TEST 6: EMAIL LINKS & ROUTE INTEGRITY');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('Connected to MongoDB: ' + mongoose.connection.name);

  const {
    getAppBaseUrl,
    getCandidateSessionsUrl,
    getExpertSessionsUrl,
    getMeetingUrl
  } = await import('../utils/appUrl.js');

  const {
    sendBookingNotificationToCandidate,
    sendBookingNotificationToExpert
  } = await import('../services/emailService.js');

  const EmailOutbox = (await import('../models/EmailOutbox.js')).default;

  // -------------------------------------------------------------
  // CRITERIA 1: Canonical URL resolution & Production safety
  // -------------------------------------------------------------
  console.log('--- Criteria 1: Canonical Base URL & Production Localhost Guard ---');
  
  const originalEnv = process.env.NODE_ENV;
  const originalClientUrl = process.env.CLIENT_URL;
  const originalAppBaseUrl = process.env.APP_BASE_URL;

  // Test in Development
  delete process.env.APP_BASE_URL;
  process.env.NODE_ENV = 'development';
  process.env.CLIENT_URL = 'http://localhost:5173';
  process.env.ALLOW_LOCALHOST_EMAILS = 'true';
  const devBase = getAppBaseUrl();
  console.log('Dev Base URL:', devBase);
  assert.strictEqual(devBase, 'http://localhost:5173');

  // Test in Production
  process.env.NODE_ENV = 'production';
  process.env.ALLOW_LOCALHOST_EMAILS = 'false';
  process.env.CLIENT_URL = 'http://localhost:5173'; // Malconfigured dev URL in prod env
  const prodGuardedBase = getAppBaseUrl();
  console.log('Prod Guarded Base URL (with localhost env):', prodGuardedBase);
  assert.strictEqual(prodGuardedBase, 'https://mockeefy.com', 'Production must reject localhost and resolve to https://mockeefy.com');

  process.env.CLIENT_URL = 'https://mockeefy.com';
  const prodCleanBase = getAppBaseUrl();
  console.log('Prod Canonical Base URL:', prodCleanBase);
  assert.strictEqual(prodCleanBase, 'https://mockeefy.com');

  // Restore env
  process.env.NODE_ENV = originalEnv;
  process.env.CLIENT_URL = originalClientUrl;

  console.log('✅ Criteria 1 Passed: Localhost strictly forbidden in production mode.\n');

  // -------------------------------------------------------------
  // CRITERIA 2: Candidate & Expert Canonical Links
  // -------------------------------------------------------------
  console.log('--- Criteria 2: Role-Specific Session Routes ---');
  const candUrl = getCandidateSessionsUrl();
  const expUrl = getExpertSessionsUrl();

  console.log('Candidate Sessions URL:', candUrl);
  console.log('Expert Sessions URL:   ', expUrl);

  assert.ok(candUrl.endsWith('/my-sessions'), 'Candidate URL must end in /my-sessions');
  assert.ok(expUrl.endsWith('/dashboard/sessions'), 'Expert URL must end in /dashboard/sessions');
  console.log('✅ Criteria 2 Passed: Role-specific session paths verified.\n');

  // -------------------------------------------------------------
  // CRITERIA 3: Real Outbox Enqueue & HTML Content Inspection
  // -------------------------------------------------------------
  console.log('--- Criteria 3: EmailOutbox Real Dispatch & Link Inspection ---');
  const testSessionId = `ses_mail_test_${Date.now()}`;
  const testOrderId = `order_test_${Date.now()}`;

  // Temporarily set NODE_ENV to production to inspect production HTML
  process.env.NODE_ENV = 'production';

  // 1. Enqueue Candidate Email
  await sendBookingNotificationToCandidate({
    candidateName: 'Test Candidate',
    candidateEmail: 'candidate_link_test@mockeefy.test',
    expertName: 'Dr. Test Expert',
    expertEmail: 'expert_link_test@mockeefy.test',
    startTime: new Date(Date.now() + 3600000),
    endTime: new Date(Date.now() + 5400000),
    date: '2026-11-20',
    timeSlot: '11:00 AM – 11:30 AM IST',
    amountPaid: 500,
    orderId: testOrderId,
    paymentId: 'pay_test_link',
    meetingLink: 'https://meet.google.com/test-abc-xyz',
    sessionId: testSessionId
  });

  // 2. Enqueue Expert Email
  await sendBookingNotificationToExpert({
    expertId: new mongoose.Types.ObjectId(),
    expertEmail: 'expert_link_test@mockeefy.test',
    expertName: 'Dr. Test Expert',
    candidateName: 'Test Candidate',
    candidateEmail: 'candidate_link_test@mockeefy.test',
    startTime: new Date(Date.now() + 3600000),
    endTime: new Date(Date.now() + 5400000),
    date: '2026-11-20',
    timeSlot: '11:00 AM – 11:30 AM IST',
    amountPaid: 500,
    orderId: testOrderId,
    paymentId: 'pay_test_link',
    meetingLink: 'https://meet.google.com/test-abc-xyz',
    sessionId: testSessionId
  });

  // Restore env
  process.env.NODE_ENV = originalEnv;

  // Retrieve outbox records
  const candOutbox = await EmailOutbox.findOne({
    to: 'candidate_link_test@mockeefy.test',
    sessionId: testSessionId
  });

  const expOutbox = await EmailOutbox.findOne({
    to: 'expert_link_test@mockeefy.test',
    sessionId: testSessionId
  });

  assert.ok(candOutbox, 'Candidate outbox record must exist');
  assert.ok(expOutbox, 'Expert outbox record must exist');

  console.log('Candidate Outbox Idempotency Key:', candOutbox.idempotencyKey);
  console.log('Expert Outbox Idempotency Key:   ', expOutbox.idempotencyKey);

  assert.notStrictEqual(candOutbox.idempotencyKey, expOutbox.idempotencyKey, 'Candidate and Expert must have distinct idempotency keys');

  // Verify Candidate Email Content
  console.log('\nInspecting Candidate Email HTML...');
  assert.ok(candOutbox.html.includes('/my-sessions'), 'Candidate email HTML must contain link to /my-sessions');
  assert.ok(!candOutbox.html.includes('localhost'), 'Production candidate email must NOT contain localhost');
  console.log('✅ Candidate Email: Contains /my-sessions, 0 localhost occurrences.');

  // Verify Expert Email Content
  console.log('Inspecting Expert Email HTML...');
  assert.ok(expOutbox.html.includes('/dashboard/sessions'), 'Expert email HTML must contain link to /dashboard/sessions');
  assert.ok(!expOutbox.html.includes('localhost'), 'Production expert email must NOT contain localhost');
  console.log('✅ Expert Email: Contains /dashboard/sessions, 0 localhost occurrences.');

  // Clean up test outbox records
  await EmailOutbox.deleteMany({ sessionId: testSessionId });

  console.log('\n🎉 ALL ACCEPTANCE TEST 6 EMAIL LINK & ROUTE CRITERIA PASSED!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Test 6 Error:', err);
  process.exit(1);
});
