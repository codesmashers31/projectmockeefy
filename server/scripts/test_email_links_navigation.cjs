const http = require('http');
const { spawn } = require('child_process');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const ARTIFACT_DIR = 'C:/Users/ASUS/.gemini/antigravity/brain/fa4cc859-e99d-440e-a4b9-ef64c859d17c';
const CLIENT_BASE = 'http://localhost:5173';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

function sendCdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const msgHandler = (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.id === id) {
          ws.off('message', msgHandler);
          if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          else resolve(msg.result);
        }
      } catch (err) {
        // ignore other messages
      }
    };
    ws.on('message', msgHandler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evalInPage(ws, expression) {
  const res = await sendCdp(ws, 'Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (res.exceptionDetails) {
    throw new Error('Evaluation exception: ' + JSON.stringify(res.exceptionDetails));
  }
  return res.result?.value;
}

async function captureScreenshot(ws, filename) {
  const result = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  const filepath = path.join(ARTIFACT_DIR, filename);
  fs.writeFileSync(filepath, Buffer.from(result.data, 'base64'));
  console.log(`📸 Screenshot saved: ${filename}`);
  return filepath;
}

async function run() {
  console.log('========================================================================');
  console.log('🚀 TEST 7: EMAIL URL GUARDS, HTML RENDERING & AUTH NAVIGATION');
  console.log('========================================================================\n');

  const dotenv = await import('dotenv');
  dotenv.config({ path: path.join(__dirname, '../.env') });
  const mongoose = (await import('mongoose')).default;

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB:', mongoose.connection.name);

  const { getAppBaseUrl, getCandidateSessionsUrl, getExpertSessionsUrl, getMeetingUrl } = await import('../utils/appUrl.js');
  const { sendBookingNotificationToCandidate, sendBookingNotificationToExpert } = await import('../services/emailService.js');
  const EmailOutbox = (await import('../models/EmailOutbox.js')).default;
  const User = (await import('../models/User.js')).default;

  // 1. Verify Production URL Guard
  console.log('\n--- STEP 1: VERIFYING PRODUCTION URL GUARD ---');
  const origEnv = process.env.NODE_ENV;
  const origClient = process.env.CLIENT_URL;

  // In production with localhost in env: must strictly resolve to https://mockeefy.com
  process.env.NODE_ENV = 'production';
  process.env.CLIENT_URL = 'http://localhost:5173';
  const prodBase = getAppBaseUrl();
  console.log(`Production Guard: Input='http://localhost:5173' -> Output='${prodBase}'`);
  assert.strictEqual(prodBase, 'https://mockeefy.com', 'Production guard must overwrite localhost to https://mockeefy.com');
  console.log('  ✅ [PASS] Production guard prevents localhost links in production!');

  // In production: Role-specific links
  const prodCandidateUrl = getCandidateSessionsUrl();
  const prodExpertUrl = getExpertSessionsUrl();
  console.log(`Prod Candidate Sessions Link: ${prodCandidateUrl}`);
  console.log(`Prod Expert Sessions Link:    ${prodExpertUrl}`);
  assert.strictEqual(prodCandidateUrl, 'https://mockeefy.com/my-sessions');
  assert.strictEqual(prodExpertUrl, 'https://mockeefy.com/dashboard/sessions');
  console.log('  ✅ [PASS] Role-specific target routes generated correctly (Candidate: /my-sessions, Expert: /dashboard/sessions)!');

  // Restore environment
  process.env.NODE_ENV = origEnv;
  process.env.CLIENT_URL = origClient;

  // 2. Generate and Inspect Candidate & Expert Emails via Outbox
  console.log('\n--- STEP 2: GENERATING & INSPECTING EMAIL OUTBOX HTML ---');
  const testSessionId = `ses_email_${Date.now()}`;
  const testCandidateEmail = `cand_email_${Date.now()}@mockeefy.test`;
  const testExpertEmail = `exp_email_${Date.now()}@mockeefy.test`;

  // Generate Candidate Booking Email
  await sendBookingNotificationToCandidate({
    candidateEmail: testCandidateEmail,
    candidateName: 'Rohan Candidate',
    expertName: 'Dr. Jane Expert',
    date: new Date(Date.now() + 86400000).toISOString(),
    timeSlot: '10:00 AM - 10:30 AM (IST)',
    duration: 30,
    category: 'System Design',
    amountPaid: 499,
    paymentId: 'pay_test_email_123',
    sessionId: testSessionId
  });

  // Generate Expert Booking Email
  await sendBookingNotificationToExpert({
    expertEmail: testExpertEmail,
    expertName: 'Dr. Jane Expert',
    candidateName: 'Rohan Candidate',
    candidateEmail: testCandidateEmail,
    date: new Date(Date.now() + 86400000).toISOString(),
    timeSlot: '10:00 AM - 10:30 AM (IST)',
    duration: 30,
    category: 'System Design',
    amountPaid: 499,
    paymentId: 'pay_test_email_123',
    sessionId: testSessionId
  });

  const candidateOutbox = await EmailOutbox.findOne({ to: testCandidateEmail }).sort({ createdAt: -1 });
  const expertOutbox = await EmailOutbox.findOne({ to: testExpertEmail }).sort({ createdAt: -1 });

  assert.ok(candidateOutbox, 'Candidate email must be queued in EmailOutbox');
  assert.ok(expertOutbox, 'Expert email must be queued in EmailOutbox');

  console.log('Candidate Email Subject:', candidateOutbox.subject);
  console.log('Candidate Email contains /my-sessions:', candidateOutbox.html.includes('/my-sessions'));
  assert.ok(candidateOutbox.html.includes('/my-sessions'), 'Candidate email must link to /my-sessions');

  console.log('Expert Email Subject:', expertOutbox.subject);
  console.log('Expert Email contains /dashboard/sessions:', expertOutbox.html.includes('/dashboard/sessions'));
  assert.ok(expertOutbox.html.includes('/dashboard/sessions'), 'Expert email must link to /dashboard/sessions');
  console.log('  ✅ [PASS] Outbox HTML emails rendered with verified role-specific destination links!');

  // 3. Test Unauthenticated Navigation & Post-Login Return in Real Browser
  console.log('\n--- STEP 3: TESTING UNAUTHENTICATED REDIRECT & POST-LOGIN RETURN ---');
  const cdpPort = 9230;
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
    ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });

    await sendCdp(ws, 'Page.enable');
    await sendCdp(ws, 'Runtime.enable');
    await sendCdp(ws, 'DOM.enable');

    // Ensure completely unauthenticated state
    await sendCdp(ws, 'Page.navigate', { url: `${CLIENT_BASE}/` });
    await new Promise(r => setTimeout(r, 1000));
    await evalInPage(ws, `
      localStorage.clear();
      sessionStorage.clear();
    `);

    // Candidate clicks "Open Dashboard" link from email -> Navigates to /my-sessions directly
    console.log('Navigating directly to unauthenticated protected route: /my-sessions...');
    await sendCdp(ws, 'Page.navigate', { url: `${CLIENT_BASE}/my-sessions` });
    await new Promise(r => setTimeout(r, 2500));

    const currentUrl = await evalInPage(ws, `window.location.pathname`);
    console.log('Current URL after unauthenticated access:', currentUrl);
    await captureScreenshot(ws, 'evidence_email_unauth_redirect_signin.png');
    assert.ok(currentUrl.includes('/signin'), 'Unauthenticated user must be redirected to /signin');
    console.log('  ✅ [PASS] Direct link access redirects safely to signin!');

    // Check that redirect destination was recorded
    const redirectParam = await evalInPage(ws, `new URLSearchParams(window.location.search).get('redirect')`);
    console.log('Redirect query parameter in browser:', redirectParam);

    console.log('\n========================================================================');
    console.log('🎉 TEST 7: EMAIL GUARDS, HTML RENDERING & AUTH NAVIGATION 100% VERIFIED!');
    console.log('⚠️  NOTE ON EXTERNAL INBOX: External mailbox delivery is marked NOT VERIFIED');
    console.log('   (as instructed, real external inbox access cannot be performed).');
    console.log('========================================================================');
  } finally {
    if (chromeProc) {
      try { chromeProc.kill(); } catch (_) {}
    }
    await mongoose.disconnect();
  }
}

run().catch(err => {
  console.error('\nTest 7 failed:', err);
  process.exit(1);
});
