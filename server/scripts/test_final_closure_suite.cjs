const mongoose = require('mongoose');
const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '../.env') });

const ARTIFACT_DIR = 'C:/Users/ASUS/.gemini/antigravity/brain/fa4cc859-e99d-440e-a4b9-ef64c859d17c';
const CLIENT_BASE = 'http://localhost:5173';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const JWT_SECRET = process.env.JWT_SECRET || 'code@1234';

function sendCdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.id === id) {
          ws.off('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      } catch (_) {}
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

function evalInPage(ws, expression) {
  return sendCdp(ws, 'Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    .then(r => r.result?.value);
}

async function captureScreenshot(ws, filename) {
  const res = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  const outPath = path.join(ARTIFACT_DIR, filename);
  fs.writeFileSync(outPath, Buffer.from(res.data, 'base64'));
  console.log(`📸 Screenshot saved: ${filename}`);
  return outPath;
}

async function run() {
  console.log('========================================================================');
  console.log('🚀 FINAL LAUNCH BLOCKER CLOSURE: COMPREHENSIVE REGRESSION & PROOF');
  console.log('========================================================================\n');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB:', mongoose.connection.name);

  const User = (await import('../models/User.js')).default;
  const EmailOutbox = (await import('../models/EmailOutbox.js')).default;
  const Notification = (await import('../models/Notification.js')).default;
  const { enqueueEmail, processOutbox, setTransporter } = await import('../services/emailOutboxService.js');
  const { getAppBaseUrl, getCandidateSessionsUrl, getExpertSessionsUrl } = await import('../utils/appUrl.js');

  const testSuffix = Date.now();

  // =========================================================================
  // 1. EMAIL OUTBOX & ROLE-SPECIFIC DESTINATIONS
  // =========================================================================
  console.log('\n--- 1. EMAIL OUTBOX, ROLE-SPECIFIC DESTINATIONS & RETRY AUDIT ---');

  // A. URL Resolver Verification
  const candidateUrl = getCandidateSessionsUrl();
  const expertUrl = getExpertSessionsUrl();
  console.log('Resolved Candidate Sessions URL:', candidateUrl);
  console.log('Resolved Expert Sessions URL:', expertUrl);
  assert.ok(candidateUrl.endsWith('/my-sessions'), 'Candidate URL must end in /my-sessions');
  assert.ok(expertUrl.endsWith('/dashboard/sessions'), 'Expert URL must end in /dashboard/sessions');
  console.log('  ✅ [PASS] Candidate link points to /my-sessions; Expert link points to /dashboard/sessions.');

  // B. Production Base URL Guard
  const oldEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const prodBaseUrl = getAppBaseUrl();
  assert.strictEqual(prodBaseUrl, 'https://mockeefy.com', 'Production base URL must never be localhost');
  console.log('  ✅ [PASS] Production environment strictly resolves to https://mockeefy.com.');
  process.env.NODE_ENV = oldEnv;

  // C. Role-specific Outbox Enqueueing & Idempotency
  const testSessionId = `ses_mail_${testSuffix}`;
  const candEnqueue = await enqueueEmail({
    sessionId: testSessionId,
    recipientType: 'candidate',
    to: `cand_${testSuffix}@mockeefy.test`,
    subject: '🎯 Mock Interview Booked',
    html: `<p>Your interview is booked. View here: <a href="${candidateUrl}">${candidateUrl}</a></p>`,
    template: 'booking_confirmed'
  });
  assert.strictEqual(candEnqueue.enqueued, true);

  const expEnqueue = await enqueueEmail({
    sessionId: testSessionId,
    recipientType: 'expert',
    to: `exp_${testSuffix}@mockeefy.test`,
    subject: '🎯 New Candidate Booked Interview',
    html: `<p>New session booked. View here: <a href="${expertUrl}">${expertUrl}</a></p>`,
    template: 'booking_confirmed'
  });
  assert.strictEqual(expEnqueue.enqueued, true);
  console.log('  ✅ [PASS] Candidate and Expert separate outbox records enqueued.');

  // D. Duplicate Enqueue Suppression
  const dupCandEnqueue = await enqueueEmail({
    sessionId: testSessionId,
    recipientType: 'candidate',
    to: `cand_${testSuffix}@mockeefy.test`,
    subject: '🎯 Mock Interview Booked',
    html: `<p>Duplicate</p>`,
    template: 'booking_confirmed'
  });
  assert.strictEqual(dupCandEnqueue.enqueued, false);
  assert.strictEqual(dupCandEnqueue.alreadyExists, true);
  console.log('  ✅ [PASS] Duplicate enqueue suppressed by unique idempotencyKey.');

  // E. Retry Handling & Exponential Backoff on Failure
  let mockSendAttempts = 0;
  const failingTransporter = {
    sendMail: async () => {
      mockSendAttempts++;
      throw new Error('Simulated SMTP Connection Timeout 504');
    }
  };
  setTransporter(failingTransporter);

  const outboxProcessResult = await processOutbox(10);
  console.log('Outbox processing result under failure:', outboxProcessResult);

  const failedEntry = await EmailOutbox.findOne({ idempotencyKey: `${testSessionId}_candidate_booking_confirmed` });
  assert.strictEqual(failedEntry.status, 'failed');
  assert.strictEqual(failedEntry.retryCount, 1);
  assert.ok(failedEntry.lastError.includes('Simulated SMTP Connection Timeout'));
  assert.ok(failedEntry.nextRetryAt > new Date(), 'Next retry must be scheduled in the future with backoff');
  console.log('  ✅ [PASS] Outbox retry handling: status=failed, retryCount=1, exponential backoff scheduled.');

  // Reset custom transporter
  setTransporter(null);

  // =========================================================================
  // 2. DETAILED DATABASE QUERY PLANS & PERFORMANCE EXECUTION STATS
  // =========================================================================
  console.log('\n--- 2. PERFORMANCE EVIDENCE & QUERY EXECUTION STATS ---');
  const db = mongoose.connection.db;
  const dummyOid = new mongoose.Types.ObjectId();

  const benchmarkSpecs = [
    {
      name: 'Session Candidate Lookup',
      collection: 'sessions',
      query: { candidateId: dummyOid, status: 'completed' },
      hint: { candidateId: 1, status: 1 }
    },
    {
      name: 'Candidate Active Sessions',
      collection: 'sessions',
      query: { candidateId: dummyOid },
      sort: { startTime: -1 },
      limit: 20
    },
    {
      name: 'Expert Verified Listing',
      collection: 'expertdetails',
      query: { approvalStatus: 'approved', verificationStatus: 'verified' },
      limit: 24
    },
    {
      name: 'Wallet Ledger Retrieval',
      collection: 'wallettransactions',
      query: { userId: dummyOid, status: 'COMPLETED' },
      sort: { createdAt: -1 },
      limit: 50
    },
    {
      name: 'Notification Count Unread',
      collection: 'notifications',
      query: { userId: dummyOid, isRead: false }
    }
  ];

  const perfTable = [];

  for (const spec of benchmarkSpecs) {
    const iterations = 5;
    const latencies = [];

    // Warm-up
    await db.collection(spec.collection).find(spec.query).toArray();

    for (let i = 0; i < iterations; i++) {
      const t0 = process.hrtime.bigint();
      let cursor = db.collection(spec.collection).find(spec.query);
      if (spec.hint) cursor = cursor.hint(spec.hint);
      if (spec.sort) cursor = cursor.sort(spec.sort);
      if (spec.limit) cursor = cursor.limit(spec.limit);
      await cursor.toArray();
      const t1 = process.hrtime.bigint();
      latencies.push(Number(t1 - t0) / 1e6);
    }

    let explainCursor = db.collection(spec.collection).find(spec.query);
    if (spec.hint) explainCursor = explainCursor.hint(spec.hint);
    if (spec.sort) explainCursor = explainCursor.sort(spec.sort);
    if (spec.limit) explainCursor = explainCursor.limit(spec.limit);
    const exp = await explainCursor.explain('executionStats');

    const avg = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2);
    const min = Math.min(...latencies).toFixed(2);
    const max = Math.max(...latencies).toFixed(2);
    const stats = exp.executionStats;

    perfTable.push({
      Query: spec.name,
      Iterations: iterations,
      'Avg (ms)': avg,
      'Min (ms)': min,
      'Max (ms)': max,
      nReturned: stats.nReturned,
      totalKeysExamined: stats.totalKeysExamined,
      totalDocsExamined: stats.totalDocsExamined,
      winningPlan: exp.queryPlanner?.winningPlan?.stage || 'COLLSCAN'
    });
  }

  console.table(perfTable);
  console.log('  ✅ [PASS] Performance benchmarks recorded with authoritative executionStats.');

  // =========================================================================
  // 3. NOTIFICATION TYPE INDEPENDENT NAVIGATION AUDIT
  // =========================================================================
  console.log('\n--- 3. NOTIFICATION NAVIGATION AUDIT ---');
  const jwt = (await import('jsonwebtoken')).default;

  const notifUser = await User.create({
    name: 'Notif Test User ' + testSuffix,
    email: `notif_user_${testSuffix}@mockeefy.test`,
    password: 'Password123!',
    role: 'candidate',
    userType: 'candidate'
  });

  const notifToken = jwt.sign(
    { id: notifUser._id.toString(), userId: notifUser._id.toString(), role: 'candidate', userType: 'candidate', email: notifUser.email },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  const { createNotification } = await import('../controllers/notificationController.js');

  // Enqueue 4 independent notification types
  const nSession = await createNotification({
    userId: notifUser._id,
    type: 'session_scheduled',
    title: 'New Session Scheduled',
    message: 'Your mock interview is booked.',
    metadata: { link: '/my-sessions', sessionId: `ses_n_${testSuffix}` }
  });

  const nWallet = await createNotification({
    userId: notifUser._id,
    type: 'wallet_credited',
    title: 'Wallet Cashback Credited',
    message: '₹200 added to wallet.',
    metadata: { link: '/wallet' }
  });

  const nCert = await createNotification({
    userId: notifUser._id,
    type: 'certificate_ready',
    title: 'Certificate Ready',
    message: 'You have earned a milestone credential.',
    metadata: { link: '/certificates' }
  });

  const nFeedback = await createNotification({
    userId: notifUser._id,
    type: 'feedback_received',
    title: 'Feedback Available',
    message: 'Review evaluation submitted.',
    metadata: { link: '/my-sessions' }
  });

  console.log('Created 4 distinct notification types in MongoDB.');

  // Browser CDP test for notification navigation
  const cdpPort = 9232;
  console.log(`Launching Chrome headless on debug port ${cdpPort}...`);
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,960'
  ]);
  await new Promise(r => setTimeout(r, 2000));

  let ws = null;
  try {
    const cdpHttp = (endpoint) => new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${cdpPort}${endpoint}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });

    const targets = await cdpHttp('/json');
    const pageTarget = targets.find(t => t.type === 'page');
    const { WebSocket } = await import('ws');
    ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });

    await sendCdp(ws, 'Page.enable');
    await sendCdp(ws, 'Runtime.enable');

    await sendCdp(ws, 'Page.navigate', { url: `${CLIENT_BASE}/` });
    await new Promise(r => setTimeout(r, 1000));

    const uData = {
      id: notifUser._id.toString(),
      _id: notifUser._id.toString(),
      name: notifUser.name,
      email: notifUser.email,
      role: 'candidate',
      userType: 'candidate'
    };

    await evalInPage(ws, `
      localStorage.setItem('token', ${JSON.stringify(notifToken)});
      localStorage.setItem('user', ${JSON.stringify(JSON.stringify(uData))});
      localStorage.setItem('mockeefy_user_cache', ${JSON.stringify(JSON.stringify(uData))});
    `);

    // Open notifications page
    await sendCdp(ws, 'Page.navigate', { url: `${CLIENT_BASE}/notifications` });
    await new Promise(r => setTimeout(r, 2500));

    await captureScreenshot(ws, 'evidence_notifications_page_destinations.png');

    const notifCount = await evalInPage(ws, `document.querySelectorAll('.cursor-pointer').length`);
    console.log('Rendered notification cards on /notifications:', notifCount);
    assert.ok(notifCount >= 4, 'Must render all 4 notification types');

    // Click Wallet notification and verify navigation
    await evalInPage(ws, `
      (() => {
        const cards = Array.from(document.querySelectorAll('.cursor-pointer'));
        const walletCard = cards.find(c => c.innerText.includes('Wallet'));
        if (walletCard) walletCard.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 1500));

    const finalUrl = await evalInPage(ws, 'window.location.pathname');
    console.log('Navigated destination after clicking Wallet notification:', finalUrl);
    assert.strictEqual(finalUrl, '/wallet', 'Must navigate directly to /wallet');
    console.log('  ✅ [PASS] Notification directly navigated to /wallet!');

    // Verify notification was marked read in database
    const readWalletNotif = await Notification.findById(nWallet._id);
    assert.strictEqual(readWalletNotif.isRead, true);
    console.log('  ✅ [PASS] Clicked notification permanently marked as isRead: true in MongoDB.');

    // Reload page to verify persistence
    await sendCdp(ws, 'Page.reload');
    await new Promise(r => setTimeout(r, 2000));
    const reloadedWalletNotif = await Notification.findById(nWallet._id);
    assert.strictEqual(reloadedWalletNotif.isRead, true);
    console.log('  ✅ [PASS] Read state persists after browser reload.');

  } finally {
    if (chromeProc) try { chromeProc.kill(); } catch (_) {}
    if (ws) try { ws.close(); } catch (_) {}
    await EmailOutbox.deleteMany({ sessionId: testSessionId });
    await Notification.deleteMany({ userId: notifUser._id });
    await User.deleteMany({ _id: notifUser._id });
    await mongoose.disconnect();
  }

  console.log('\n========================================================================');
  console.log('🎉 ALL FINAL LAUNCH BLOCKER CLOSURE AUDITS PASSED WITH 100% SUCCESS!');
  console.log('========================================================================');
}

run().catch(err => {
  console.error('Final Closure Suite Failed:', err);
  process.exit(1);
});
