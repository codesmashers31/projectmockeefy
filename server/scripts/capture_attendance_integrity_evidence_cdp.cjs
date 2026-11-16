const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { WebSocket } = require('ws');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\fa4cc859-e99d-440e-a4b9-ef64c859d17c";
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

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
  return res.result?.value;
}

async function waitMs(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function captureScreenshot(ws, filename) {
  const res = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(res.data, 'base64');
  const filePath = path.join(ARTIFACT_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  console.log(`📸 Screenshot saved: ${filename} (${buffer.length} bytes)`);
  return filePath;
}

async function getWsUrl(port) {
  for (let i = 0; i < 20; i++) {
    try {
      const list = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/json`, res => {
          let body = '';
          res.on('data', d => body += d);
          res.on('end', () => resolve(JSON.parse(body)));
        }).on('error', reject);
      });
      if (list && list.length > 0 && list[0].webSocketDebuggerUrl) {
        return list[0].webSocketDebuggerUrl;
      }
    } catch (_) {}
    await waitMs(300);
  }
  throw new Error('Chrome debug port not ready');
}

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);

  const { default: Session } = await import('../models/Session.js');
  const { default: User } = await import('../models/User.js');
  const { default: Expert } = await import('../models/expertModel.js');
  const { default: Review } = await import('../models/reviewModel.js');
  const { default: Category } = await import('../models/Category.js');

  const expertUser = await User.findOne({ userType: 'expert' });
  const expertProfile = await Expert.findOne({ userId: expertUser._id });
  const candidateUser = await User.findOne({ userType: 'candidate' });
  const activeCategory = await Category.findOne({});

  const candToken = jwt.sign(
    { userId: candidateUser._id, userType: 'candidate', email: candidateUser.email },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
  const expToken = jwt.sign(
    { userId: expertUser._id, userType: 'expert', email: expertUser.email },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  const now = new Date();

  // Create temporary sessions for evidence
  const liveSessionId = `test_live_proof_${Date.now()}`;
  const liveSession = await Session.create({
    sessionId: liveSessionId,
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    categoryId: activeCategory?._id,
    startTime: new Date(now.getTime() - 20 * 60 * 1000), // started 20 mins ago (unlocked > 15m)
    endTime: new Date(now.getTime() + 40 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'attended',
    candidateJoinedAt: new Date(now.getTime() - 19 * 60 * 1000),
    candidateConnectionStatus: 'connected'
  });

  const certSessionId = `test_cert_proof_${Date.now()}`;
  const certSession = await Session.create({
    sessionId: certSessionId,
    candidateId: candidateUser._id,
    expertId: expertProfile._id,
    categoryId: activeCategory?._id,
    startTime: new Date(now.getTime() - 3600000),
    endTime: new Date(now.getTime() - 1800000),
    status: 'completed',
    attendanceStatus: 'attended',
    attendanceOutcome: 'ATTENDED_COMPLETED',
    candidateJoinedAt: new Date(now.getTime() - 3600000),
    completionEvidence: {
      verified: true,
      verifiedAt: now,
      durationMinutes: 45,
      candidateJoinedConfirmed: true,
      interviewConducted: true,
      summary: 'Full technical interview conducted'
    }
  });

  const certReview = await Review.create({
    sessionId: certSession.sessionId,
    candidateId: candidateUser._id,
    expertId: expertUser._id,
    overallRating: 5,
    technicalRating: 5,
    communicationRating: 5,
    feedback: 'Outstanding technical performance and system design understanding.',
    reviewerRole: 'expert',
    createdAt: now
  });

  // Launch Chrome
  const port = 9334;
  const userDataDir = path.join(__dirname, '../tmp/chrome_cdp_' + Date.now());
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1280,900'
  ]);

  try {
    const wsUrl = await getWsUrl(port);
    const ws = new WebSocket(wsUrl);
    await new Promise(r => ws.once('open', r));

    await sendCdp(ws, 'Page.enable');
    await sendCdp(ws, 'Runtime.enable');
    await sendCdp(ws, 'Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    // --- SCREENSHOT 1: Partial Availability API Error & Retry UI ---
    console.log('\n--- 1. Capturing Availability Error & Retry Banner ---');
    await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:5173/signin' });
    await waitMs(2000);

    // Set Candidate auth in localStorage with failing candidate session request
    await evalInPage(ws, `
      localStorage.setItem('token', '${candToken}');
      localStorage.setItem('user', JSON.stringify({
        id: 'invalid_cand_fail_${Date.now()}',
        _id: 'invalid_cand_fail_${Date.now()}',
        userId: 'invalid_cand_fail_${Date.now()}',
        name: '${candidateUser.name}',
        email: '${candidateUser.email}',
        userType: 'candidate'
      }));
    `);

    await sendCdp(ws, 'Page.navigate', { url: `http://localhost:5173/book-session?expertId=${expertProfile._id}` });
    await waitMs(4000);

    await captureScreenshot(ws, 'evidence_availability_api_error_retry.png');

    // --- SCREENSHOT 2: Expert LiveMeeting Completion Proof Modal ---
    console.log('\n--- 2. Capturing LiveMeeting Completion Proof Modal ---');
    await evalInPage(ws, `
      localStorage.setItem('token', '${expToken}');
      localStorage.setItem('user', JSON.stringify({
        id: '${expertUser._id}',
        _id: '${expertUser._id}',
        userId: '${expertUser._id}',
        name: '${expertUser.name}',
        email: '${expertUser.email}',
        userType: 'expert',
        role: 'expert'
      }));
    `);

    await sendCdp(ws, 'Page.navigate', { url: `http://localhost:5173/live-meeting/${liveSession.sessionId}?role=expert` });
    await waitMs(4000);

    // Select ATTENDED_COMPLETED option on the card
    await evalInPage(ws, `
      const radio = document.querySelector('input[value="ATTENDED_COMPLETED"]');
      if (radio) radio.click();
    `);
    await waitMs(500);

    // Click End Session button in meeting room to open in-app modal
    await evalInPage(ws, `
      const btns = Array.from(document.querySelectorAll('button'));
      const endBtn = btns.find(b => b.textContent.includes('End Session with Selected Outcome') || b.textContent.includes('Conclude & End Interview') || b.textContent.includes('End meeting'));
      if (endBtn) endBtn.click();
    `);
    await waitMs(1500);

    await captureScreenshot(ws, 'evidence_completion_proof_modal.png');

    // --- SCREENSHOT 3: Certificate Progress Verified ---
    console.log('\n--- 3. Capturing Certificate Dashboard Progress ---');
    await evalInPage(ws, `
      localStorage.setItem('token', '${candToken}');
      localStorage.setItem('user', JSON.stringify({
        id: '${candidateUser._id}',
        _id: '${candidateUser._id}',
        userId: '${candidateUser._id}',
        name: '${candidateUser.name}',
        email: '${candidateUser.email}',
        userType: 'candidate'
      }));
    `);

    await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:5173/certificates' });
    await waitMs(4000);

    await captureScreenshot(ws, 'evidence_certificate_progress_verified.png');

    ws.close();
  } finally {
    chromeProc.kill();
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (_) {}
    await Session.deleteOne({ _id: liveSession._id });
    await Session.deleteOne({ _id: certSession._id });
    await Review.deleteOne({ _id: certReview._id });
    await mongoose.disconnect();
  }

  console.log('\n=== ALL 3 CDP SCREENSHOTS CAPTURED SUCCESSFULLY ===');
}

run().catch(err => {
  console.error('Fatal error during screenshot capture:', err);
  process.exit(1);
});
