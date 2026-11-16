const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const ARTIFACTS_DIR = 'C:/Users/ASUS/.gemini/antigravity/brain/fa4cc859-e99d-440e-a4b9-ef64c859d17c';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mockeefy?replicaSet=rs0';
const JWT_SECRET = process.env.JWT_SECRET || 'code@1234';

function sendCdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 10000000);
    const handler = (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.id === id) {
          ws.off('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      } catch (e) {
        // ignore
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evalExpression(ws, expr) {
  const res = await sendCdp(ws, 'Runtime.evaluate', {
    expression: expr,
    returnByValue: true,
    awaitPromise: true,
  });
  return res.result ? res.result.value : undefined;
}

async function takeScreenshot(ws, filename) {
  const res = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  const outPath = path.join(ARTIFACTS_DIR, filename);
  fs.writeFileSync(outPath, Buffer.from(res.data, 'base64'));
  console.log(`📸 Screenshot saved: ${filename}`);
}

async function run() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGO_URI);

  const User = (await import('../models/User.js')).default;
  const Expert = (await import('../models/expertModel.js')).default;
  const Session = (await import('../models/Session.js')).default;

  const expertUser = await User.findOne({ userType: 'expert' });
  const candidateUser = await User.findOne({ userType: 'candidate' });
  const expertProfile = await Expert.findOne({ userId: expertUser._id });

  const cdpPort = 9288;
  console.log(`Launching Chrome headless on debug port ${cdpPort}...`);
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,1000'
  ]);
  await new Promise(r => setTimeout(r, 2000));

  const cdpHttp = (endpoint) => new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${cdpPort}${endpoint}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const targets = await cdpHttp('/json');
  const pageTarget = targets.find(t => t.type === 'page');
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  await sendCdp(ws, 'Page.enable');
  await sendCdp(ws, 'Runtime.enable');
  await sendCdp(ws, 'DOM.enable');

  try {
    const expertToken = jwt.sign(
      { userId: expertUser._id, role: 'expert', userType: 'expert', email: expertUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    const candToken = jwt.sign(
      { userId: candidateUser._id, role: 'candidate', userType: 'candidate', email: candidateUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Setup 14:59 session
    const now = new Date();
    const start1459 = new Date(now.getTime() - 14 * 60 * 1000 - 40 * 1000); // 14m 40s ago
    const end1459 = new Date(start1459.getTime() + 30 * 60 * 1000);

    const testSess = await Session.create({
      sessionId: `sess_audit_cdp_${Date.now()}`,
      candidateId: candidateUser._id,
      expertId: expertProfile._id,
      startTime: start1459,
      endTime: end1459,
      status: 'confirmed',
      price: 500,
      attendanceStatus: 'scheduled',
      candidateDetails: { name: candidateUser.name || 'Candidate Demo', email: candidateUser.email },
      expertDetails: { name: expertUser.name || 'Expert Demo', email: expertUser.email }
    });

    // 1. Visit Signin and set expert auth
    await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:5173/signin' });
    await new Promise(r => setTimeout(r, 2000));

    await evalExpression(ws, `
      localStorage.setItem('token', '${expertToken}');
      localStorage.setItem('auth_token', '${expertToken}');
      localStorage.setItem('user', JSON.stringify({
        _id: '${expertUser._id}',
        userId: '${expertUser._id}',
        id: '${expertUser._id}',
        name: '${expertUser.name || "Dr. Expert"}',
        email: '${expertUser.email}',
        userType: 'expert',
        role: 'expert'
      }));
    `);

    // 2. Navigate to /dashboard/sessions (Scenario: Mark Absent locked at 14:59)
    await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:5173/dashboard/sessions' });
    await new Promise(r => setTimeout(r, 3000));
    await takeScreenshot(ws, 'evidence_mark_absent_locked_1459.png');

    // 3. Fast forward session to 15:00+ (16m ago)
    testSess.startTime = new Date(now.getTime() - 16 * 60 * 1000);
    testSess.endTime = new Date(testSess.startTime.getTime() + 30 * 60 * 1000);
    await testSess.save();

    await sendCdp(ws, 'Page.reload');
    await new Promise(r => setTimeout(r, 3000));
    await takeScreenshot(ws, 'evidence_mark_absent_unlocked_1500.png');

    // 4. Live meeting room attendance & controls
    await sendCdp(ws, 'Page.navigate', { url: `http://localhost:5173/live-meeting?meetingId=${testSess.sessionId}` });
    await new Promise(r => setTimeout(r, 3000));
    await takeScreenshot(ws, 'evidence_live_meeting_attendance_actions.png');

    // 5. Candidate Book Session
    await evalExpression(ws, `
      localStorage.setItem('token', '${candToken}');
      localStorage.setItem('auth_token', '${candToken}');
      localStorage.setItem('user', JSON.stringify({
        _id: '${candidateUser._id}',
        userId: '${candidateUser._id}',
        id: '${candidateUser._id}',
        name: '${candidateUser.name || "Candidate"}',
        email: '${candidateUser.email}',
        userType: 'candidate',
        role: 'candidate',
        walletBalance: 700
      }));
    `);

    await sendCdp(ws, 'Page.navigate', { url: `http://localhost:5173/book-session?expertId=${expertProfile._id}` });
    await new Promise(r => setTimeout(r, 3000));
    await takeScreenshot(ws, 'evidence_booking_modal_smooth_transition.png');

    // Clean up
    await Session.deleteOne({ _id: testSess._id });
    console.log('All visual screenshots captured successfully!');
  } finally {
    try { ws.close(); } catch (_) {}
    try { chromeProc.kill('SIGKILL'); } catch (_) {}
    await mongoose.disconnect();
  }
}

run().catch(e => {
  console.error('CDP error:', e);
  process.exit(1);
});
