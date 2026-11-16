/**
 * VERIFY LIVE SMTP CONFIGURATION, OUTBOX PROCESSOR & EMAIL DELIVERY
 */
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const assert = require('assert');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  console.log('========================================================================');
  console.log('   MOCKEEFY LIVE SMTP CONFIGURATION & DELIVERY VERIFICATION');
  console.log('========================================================================\n');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB database:', mongoose.connection.name);

  const { getTransporter, verifyEmailConnection, sendBookingNotificationToCandidate, sendBookingNotificationToExpert } = await import('../services/emailService.js');
  const { processOutbox, enqueueEmail, getTransporter: getOutboxTransporter } = await import('../services/emailOutboxService.js');
  const EmailOutbox = (await import('../models/EmailOutbox.js')).default;
  const { getAppBaseUrl, getCandidateSessionsUrl, getExpertSessionsUrl } = await import('../utils/appUrl.js');

  // STEP 1: Verify SMTP Connection
  console.log('\n--- STEP 1: SMTP Transporter Verification ---');
  const verifyResult = await verifyEmailConnection();
  console.log('verifyEmailConnection Result:', verifyResult);
  assert.strictEqual(verifyResult.success, true, 'SMTP transporter must verify successfully');
  console.log('✅ [PASS] SMTP Transporter authenticated and verified with mail server.');

  const outboxTransporter = getOutboxTransporter();
  const outboxVerifyResult = await new Promise((resolve, reject) => {
    outboxTransporter.verify((err, success) => {
      if (err) resolve({ success: false, error: err.message });
      else resolve({ success: true });
    });
  });
  console.log('Outbox Transporter verify Result:', outboxVerifyResult);
  assert.strictEqual(outboxVerifyResult.success, true, 'Outbox transporter must verify successfully');
  console.log('✅ [PASS] Outbox Transporter authenticated and verified with mail server.');

  // STEP 2: Verify Canonical Links & Guard
  console.log('\n--- STEP 2: Role-Specific Destination URLs & Production Guard ---');
  const origEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const candUrl = getCandidateSessionsUrl();
  const expUrl = getExpertSessionsUrl();
  console.log('Candidate Destination URL (Prod):', candUrl);
  console.log('Expert Destination URL (Prod):   ', expUrl);
  assert.strictEqual(candUrl, 'https://mockeefy.com/my-sessions');
  assert.strictEqual(expUrl, 'https://mockeefy.com/dashboard/sessions');
  process.env.NODE_ENV = origEnv;
  console.log('✅ [PASS] Role-specific destination URLs strictly verified.');

  // STEP 3: Enqueue & Send Live Candidate Booking Confirmation Email
  console.log('\n--- STEP 3: Live Candidate Booking Confirmation Email ---');
  const sessionIdCandidate = `ses_live_cand_${Date.now()}`;
  const candidateTargetEmail = 'info@mockeefy.com'; // Deliverable mailbox on Mockeefy domain
  const candidateName = 'Aarav Sharma';
  const expertName = 'Priya Patel (Senior SWE)';
  const testDate = '2026-11-20';
  const testTimeSlot = '10:00 AM – 10:30 AM IST';

  // Enqueue via durable outbox
  const candEnqueueRes = await enqueueEmail({
    sessionId: sessionIdCandidate,
    recipientType: 'candidate',
    to: candidateTargetEmail,
    subject: `🎉 Your Mock Interview with ${expertName} is Confirmed! | Mockeefy`,
    html: `
      <html>
        <body>
          <h2>Your Mock Interview is Confirmed!</h2>
          <p>Hello ${candidateName},</p>
          <p>Your session with <strong>${expertName}</strong> has been booked for <strong>${testDate}</strong> at <strong>${testTimeSlot}</strong>.</p>
          <p>Access your booking at: <a href="https://mockeefy.com/my-sessions">https://mockeefy.com/my-sessions</a></p>
        </body>
      </html>
    `,
    metadata: { sessionId: sessionIdCandidate, candidateName, expertName, testDate, testTimeSlot }
  });

  console.log('Candidate Enqueue Result:', {
    enqueued: candEnqueueRes.enqueued,
    idempotencyKey: candEnqueueRes.idempotencyKey,
    status: candEnqueueRes.status
  });
  assert.strictEqual(candEnqueueRes.status, 'pending');

  // Verify Idempotency: duplicate enqueue must not create a second document
  const duplicateCandEnqueue = await enqueueEmail({
    sessionId: sessionIdCandidate,
    recipientType: 'candidate',
    to: candidateTargetEmail,
    subject: 'Duplicate Test',
    html: '<p>Duplicate</p>'
  });
  console.log('Candidate Duplicate Enqueue Test:', {
    enqueued: duplicateCandEnqueue.enqueued,
    alreadyExists: duplicateCandEnqueue.alreadyExists,
    idempotencyKey: duplicateCandEnqueue.idempotencyKey
  });
  assert.strictEqual(duplicateCandEnqueue.alreadyExists, true);
  assert.strictEqual(duplicateCandEnqueue.enqueued, false);
  console.log('✅ [PASS] Duplicate send prevention (Idempotency) verified.');

  // STEP 4: Enqueue & Send Live Expert Booking Confirmation Email
  console.log('\n--- STEP 4: Live Expert Booking Confirmation Email ---');
  const sessionIdExpert = `ses_live_exp_${Date.now()}`;
  const expertTargetEmail = 'info@mockeefy.com'; // Deliverable mailbox on Mockeefy domain
  
  const expEnqueueRes = await enqueueEmail({
    sessionId: sessionIdExpert,
    recipientType: 'expert',
    to: expertTargetEmail,
    subject: `🎯 Mock Interview Booked: ${candidateName} has scheduled a session with you on ${testDate} (${testTimeSlot}) | Mockeefy`,
    html: `
      <html>
        <body>
          <h2>New Mock Interview Booking</h2>
          <p>Hello ${expertName},</p>
          <p>Candidate <strong>${candidateName}</strong> has booked a session with you for <strong>${testDate}</strong> at <strong>${testTimeSlot}</strong>.</p>
          <p>Access your session dashboard at: <a href="https://mockeefy.com/dashboard/sessions">https://mockeefy.com/dashboard/sessions</a></p>
        </body>
      </html>
    `,
    metadata: { sessionId: sessionIdExpert, candidateName, expertName, testDate, testTimeSlot }
  });

  console.log('Expert Enqueue Result:', {
    enqueued: expEnqueueRes.enqueued,
    idempotencyKey: expEnqueueRes.idempotencyKey,
    status: expEnqueueRes.status
  });
  assert.strictEqual(expEnqueueRes.status, 'pending');

  // STEP 5: Process Outbox via Live SMTP Transporter
  console.log('\n--- STEP 5: Outbox Worker Dispatch via Live SMTP ---');
  const processResult = await processOutbox(10);
  console.log('processOutbox Execution Result:', processResult);
  assert.ok(processResult.successes >= 2, 'Expected at least 2 successful email deliveries');

  // STEP 6: Verify Outbox Status Transitions in MongoDB
  console.log('\n--- STEP 6: Verify MongoDB Outbox Record Transitions ---');
  const candRecord = await EmailOutbox.findOne({ sessionId: sessionIdCandidate });
  const expRecord = await EmailOutbox.findOne({ sessionId: sessionIdExpert });

  console.log('Candidate Outbox Final State in MongoDB:', {
    _id: candRecord._id,
    idempotencyKey: candRecord.idempotencyKey,
    recipientType: candRecord.recipientType,
    to: candRecord.to,
    status: candRecord.status,
    retryCount: candRecord.retryCount,
    sentAt: candRecord.sentAt,
    lastError: candRecord.lastError
  });
  assert.strictEqual(candRecord.status, 'sent');
  assert.ok(candRecord.sentAt instanceof Date);
  assert.strictEqual(candRecord.lastError, null);
  assert.ok(candRecord.html.includes('https://mockeefy.com/my-sessions'));

  console.log('\nExpert Outbox Final State in MongoDB:', {
    _id: expRecord._id,
    idempotencyKey: expRecord.idempotencyKey,
    recipientType: expRecord.recipientType,
    to: expRecord.to,
    status: expRecord.status,
    retryCount: expRecord.retryCount,
    sentAt: expRecord.sentAt,
    lastError: expRecord.lastError
  });
  assert.strictEqual(expRecord.status, 'sent');
  assert.ok(expRecord.sentAt instanceof Date);
  assert.strictEqual(expRecord.lastError, null);
  assert.ok(expRecord.html.includes('https://mockeefy.com/dashboard/sessions'));

  console.log('✅ [PASS] Outbox status successfully changed from pending -> processing -> sent with real SMTP transmission.');

  // STEP 7: Verify Retry Logic and Error Handling
  console.log('\n--- STEP 7: Verify Durable Retry & Exponential Backoff ---');
  const failedSessionId = `ses_fail_test_${Date.now()}`;
  const mockFailTransporter = {
    sendMail: async () => {
      throw new Error('Connection timed out during SMTP transmission [Simulated]');
    }
  };
  const { setTransporter: setOutboxTransporter } = await import('../services/emailOutboxService.js');
  
  await enqueueEmail({
    sessionId: failedSessionId,
    recipientType: 'candidate',
    to: 'retry_test@mockeefy.test',
    subject: 'Retry Test Email',
    html: '<p>Retry test content</p>'
  });

  // Temporarily swap transporter to simulated failing transporter
  setOutboxTransporter(mockFailTransporter);
  const failRunResult = await processOutbox(10);
  console.log('Failing run result:', failRunResult);
  assert.ok(failRunResult.failures >= 1);

  const failedRecord = await EmailOutbox.findOne({ sessionId: failedSessionId });
  console.log('Failed Record State:', {
    status: failedRecord.status,
    retryCount: failedRecord.retryCount,
    lastError: failedRecord.lastError,
    nextRetryAt: failedRecord.nextRetryAt
  });
  assert.strictEqual(failedRecord.status, 'failed');
  assert.strictEqual(failedRecord.retryCount, 1);
  assert.ok(failedRecord.lastError.includes('Simulated'));
  assert.ok(failedRecord.nextRetryAt > new Date());
  console.log('✅ [PASS] Outbox failure recorded, retry count incremented, exponential backoff set.');

  // Clean up test failure record and restore transporter
  setOutboxTransporter(null);
  await EmailOutbox.deleteMany({ sessionId: failedSessionId });

  console.log('\n========================================================================');
  console.log('🎉 ALL LIVE SMTP CONFIGURATION & OUTBOX DELIVERY TESTS PASSED 100%!');
  console.log('========================================================================\n');

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
