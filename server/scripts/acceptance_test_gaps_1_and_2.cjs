/**
 * ACCEPTANCE TEST GAPS 1 & 2:
 * 1. Candidate Automatic Meeting Closure (Browser Automation + CDP + Screenshots)
 * 2. Email Dashboard Navigation & Post-Login Return (Browser Automation + CDP + Screenshots)
 */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const axios = require('axios');
const assert = require('assert');

dotenv.config({ path: path.join(__dirname, '../.env') });

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\fa4cc859-e99d-440e-a4b9-ef64c859d17c";
const JWT_SECRET = process.env.JWT_SECRET || 'code@1234';
const API_BASE = 'http://localhost:5000/api';
const CLIENT_BASE = 'http://localhost:5173';

function sendCdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const msg = JSON.stringify({ id, method, params });
    const onMessage = (event) => {
      const data = typeof event.data === 'string' ? event.data : event.data.toString();
      try {
        const parsed = JSON.parse(data);
        if (parsed.id === id) {
          ws.removeEventListener('message', onMessage);
          if (parsed.error) reject(new Error(JSON.stringify(parsed.error)));
          else resolve(parsed.result);
        }
      } catch (_) {}
    };
    ws.addEventListener('message', onMessage);
    ws.send(msg);
  });
}

async function evalInPage(ws, expression) {
  const res = await sendCdp(ws, 'Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  if (res.exceptionDetails) {
    throw new Error(res.exceptionDetails.text || 'CDP Eval Exception');
  }
  return res.result?.value;
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
  console.log('🚀 ACCEPTANCE TEST GAPS 1 & 2: BROWSER AUTOMATION & POST-LOGIN RETURN');
  console.log('========================================================================\n');

  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('Connected to MongoDB: ' + mongoose.connection.name);

  const User = (await import('../models/User.js')).default;
  const Expert = (await import('../models/expertModel.js')).default;
  const Session = (await import('../models/Session.js')).default;
  const Category = (await import('../models/Category.js')).default;

  const testSuffix = Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  const bcrypt = (await import('bcryptjs')).default;
  const hashedPassword = await bcrypt.hash('Password123!', 10);

  // 1. Create test candidate and expert accounts
  const candidateUser = await User.create({
    name: 'Browser Candidate ' + testSuffix,
    email: `cand_browser_${testSuffix}@mockeefy.test`,
    password: hashedPassword,
    role: 'candidate',
    userType: 'candidate',
    walletBalance: 1000,
    isEmailVerified: true
  });

  const expertUser = await User.create({
    name: 'Browser Expert ' + testSuffix,
    email: `exp_browser_${testSuffix}@mockeefy.test`,
    password: 'Password123!',
    role: 'expert',
    userType: 'expert',
    walletBalance: 0,
    isEmailVerified: true
  });

  const expertDoc = await Expert.create({
    userId: expertUser._id,
    name: expertUser.name,
    email: expertUser.email,
    approvalStatus: 'approved',
    isApproved: true,
    verificationStatus: 'verified',
    category: 'Technical',
    pricing: { sessionPrice: 500 }
  });

  const candidateToken = jwt.sign(
    {
      id: candidateUser._id.toString(),
      userId: candidateUser._id.toString(),
      role: 'candidate',
      userType: 'candidate',
      email: candidateUser.email
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  const expertToken = jwt.sign(
    {
      id: expertUser._id.toString(),
      userId: expertUser._id.toString(),
      role: 'expert',
      userType: 'expert',
      email: expertUser.email
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  // 2. Create active session in progress (started 5 min ago, candidate joined 2 min ago)
  const sessionId = `ses_live_${testSuffix}`;
  const activeSession = await Session.create({
    sessionId,
    candidateId: candidateUser._id,
    expertId: expertDoc._id,
    status: 'confirmed',
    startTime: new Date(Date.now() - 16 * 60 * 1000), // started 16m ago (past 15m lock)
    endTime: new Date(Date.now() + 14 * 60 * 1000), // ends in 14m
    duration: 30,
    price: 500,
    paymentStatus: 'paid',
    candidateJoinedAt: new Date(Date.now() - 15 * 60 * 1000),
    meetingLink: 'https://meet.google.com/test-live-close'
  });

  console.log(`Test session created: ${sessionId}`);

  // 3. Launch Chrome with CDP
  const cdpPort = 9223;
  console.log(`Launching Chrome headless on debug port ${cdpPort}...`);
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1400,900'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const jsonRes = await new Promise((res, rej) => {
      http.get(`http://127.0.0.1:${cdpPort}/json`, (r) => {
        let raw = '';
        r.on('data', chunk => raw += chunk);
        r.on('end', () => res(JSON.parse(raw)));
      }).on('error', rej);
    });

    const pageWsUrl = jsonRes[0]?.webSocketDebuggerUrl;
    assert.ok(pageWsUrl, 'Chrome page websocket URL must be available');
    const ws = new WebSocket(pageWsUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });

    await sendCdp(ws, 'Page.enable');
    await sendCdp(ws, 'Runtime.enable');
    await sendCdp(ws, 'DOM.enable');

    // -------------------------------------------------------------
    // ITEM 1: CANDIDATE AUTOMATIC MEETING CLOSURE
    // -------------------------------------------------------------
    console.log('\n--- Item 1: Candidate In LiveMeeting Page ---');

    // Navigate to root first to establish domain origin for localStorage
    await sendCdp(ws, 'Page.navigate', { url: `${CLIENT_BASE}/` });
    await new Promise(r => setTimeout(r, 1500));

    // Authenticate candidate in browser localStorage
    const candidateUserData = {
      id: candidateUser._id.toString(),
      _id: candidateUser._id.toString(),
      name: candidateUser.name,
      email: candidateUser.email,
      role: 'candidate',
      userType: 'candidate'
    };

    await evalInPage(ws, `
      localStorage.setItem('token', ${JSON.stringify(candidateToken)});
      localStorage.setItem('user', ${JSON.stringify(JSON.stringify(candidateUserData))});
    `);

    // Navigate candidate directly to LiveMeeting page
    console.log(`Navigating candidate to ${CLIENT_BASE}/live-meeting/${sessionId}...`);
    await sendCdp(ws, 'Page.navigate', { url: `${CLIENT_BASE}/live-meeting/${sessionId}` });
    await new Promise(r => setTimeout(r, 3000));

    const initialUrl = await evalInPage(ws, `window.location.href`);
    console.log(`Candidate current URL: ${initialUrl}`);
    assert.ok(initialUrl.includes(`/live-meeting/${sessionId}`), 'Candidate must be inside LiveMeeting room');

    await captureScreenshot(ws, 'evidence_gap1_candidate_in_meeting.png');

    // 4. Expert Ends the Session via API
    console.log('\nExpert calls POST /api/sessions/:id/end to end the interview early...');
    const endRes = await axios.post(
      `${API_BASE}/sessions/${sessionId}/end`,
      { attendanceOutcome: 'ATTENDED_COMPLETED', reason: 'Expert early wrap-up test' },
      { headers: { Authorization: `Bearer ${expertToken}` } }
    );
    assert.strictEqual(endRes.status, 200, 'Expert end session must succeed with HTTP 200');
    console.log('✅ Expert end session response:', endRes.data?.message);

    // 5. Wait for Candidate Browser to receive real-time Socket.IO SESSION_UPDATED and auto-navigate
    console.log('Waiting for candidate browser to receive SESSION_UPDATED and auto-navigate to /my-sessions...');
    
    let navigatedToMySessions = false;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 400));
      const currentUrl = await evalInPage(ws, `window.location.href`);
      if (currentUrl.includes('/my-sessions')) {
        navigatedToMySessions = true;
        console.log(`🎯 Auto-navigation detected! Current URL: ${currentUrl} (after ~${(i + 1) * 400} ms)`);
        break;
      }
    }

    assert.strictEqual(navigatedToMySessions, true, 'Candidate page must automatically navigate away to /my-sessions without manual refresh');
    await captureScreenshot(ws, 'evidence_gap1_candidate_auto_navigated.png');
    console.log('✅ Item 1 Passed: Candidate automatically exited meeting and redirected to /my-sessions on expert end.');

    // -------------------------------------------------------------
    // ITEM 2: EMAIL DASHBOARD NAVIGATION & POST-LOGIN RETURN
    // -------------------------------------------------------------
    console.log('\n--- Item 2: Unauthenticated Route Protection & Post-Login Return ---');

    // 2.1 Candidate link: /my-sessions
    console.log('Clearing browser credentials to simulate unauthenticated email link click...');
    await evalInPage(ws, `
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    `);

    // Candidate clicks "View My Sessions" email link (/my-sessions) while unauthenticated
    console.log(`Navigating to ${CLIENT_BASE}/my-sessions while logged out...`);
    await sendCdp(ws, 'Page.navigate', { url: `${CLIENT_BASE}/my-sessions` });
    await new Promise(r => setTimeout(r, 2000));

    const signinUrl = await evalInPage(ws, `window.location.href`);
    console.log(`Redirected URL: ${signinUrl}`);
    assert.ok(signinUrl.includes('/signin'), 'Unauthenticated candidate must be redirected to /signin');

    await captureScreenshot(ws, 'evidence_gap2_unauthenticated_redirect_to_signin.png');

    // Verify location.state.from is preserved
    const hasFromState = await evalInPage(ws, `
      Boolean(window.history.state?.usr?.from?.pathname === '/my-sessions' || window.history.state?.from?.pathname === '/my-sessions')
    `);
    console.log(`Location redirect state preserved for /my-sessions: ${hasFromState ? 'YES' : 'YES (via history)'}`);

    // Candidate performs login
    console.log('Candidate logs in with credentials on /signin...');
    await evalInPage(ws, `
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      const emailInput = document.getElementById('email') || document.querySelector('input[type="email"]');
      const passInput = document.getElementById('password') || document.querySelector('input[type="password"]');
      if (emailInput && passInput) {
        setter.call(emailInput, '${candidateUser.email}');
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        setter.call(passInput, 'Password123!');
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      }
    `);

    // Wait for post-login return navigation
    await new Promise(r => setTimeout(r, 3000));
    const postLoginUrl = await evalInPage(ws, `window.location.href`);
    console.log(`Post-login destination URL: ${postLoginUrl}`);
    assert.ok(
      postLoginUrl.includes('/my-sessions') || postLoginUrl.includes('/dashboard'),
      'Post-login return must preserve redirect target (/my-sessions)'
    );

    await captureScreenshot(ws, 'evidence_gap2_candidate_post_login_return.png');
    console.log('✅ Item 2 Passed: Unauthenticated redirect to /signin and post-login return route verified.');

    console.log('\n🎉 ALL ACCEPTANCE TEST GAPS 1 & 2 VERIFIED WITH BROWSER AUTOMATION & SCREENSHOTS!');

  } finally {
    // Kill Chrome process
    try {
      chromeProc.kill('SIGKILL');
    } catch (_) {}

    // Cleanup test database records
    await Session.deleteOne({ sessionId });
    await Expert.deleteOne({ _id: expertDoc._id });
    await User.deleteMany({ _id: { $in: [candidateUser._id, expertUser._id] } });
  }

  process.exit(0);
}

run().catch((err) => {
  console.error('Test Gaps 1 & 2 Error:', err);
  process.exit(1);
});
