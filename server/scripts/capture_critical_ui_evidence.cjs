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
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const MONGO_URI = process.env.MONGO_URI;

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

  const expertUser = await User.findOne({ userType: 'expert' });
  const expertProfile = await Expert.findOne({ userId: expertUser._id });
  const candidateUser = await User.findOne({ userType: 'candidate' });

  const now = new Date();

  // 1. Create a session started 2 minutes ago (< 15 min lock)
  const lockedSessionId = `test_ui_lock_${Date.now()}`;
  await Session.create({
    sessionId: lockedSessionId,
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    startTime: new Date(now.getTime() - 2 * 60 * 1000), // 2 mins ago -> 13 mins left
    endTime: new Date(now.getTime() + 28 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'attended',
    candidateJoinedAt: new Date(now.getTime() - 1 * 60 * 1000),
    expertJoinedAt: new Date(now.getTime() - 2 * 60 * 1000),
    price: 499
  });

  // 2. Create a session started 16 minutes ago (> 15 min unlocked)
  const unlockedSessionId = `test_ui_unlock_${Date.now()}`;
  await Session.create({
    sessionId: unlockedSessionId,
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    startTime: new Date(now.getTime() - 16 * 60 * 1000), // 16 mins ago -> unlocked
    endTime: new Date(now.getTime() + 14 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'attended',
    candidateJoinedAt: new Date(now.getTime() - 15 * 60 * 1000),
    expertJoinedAt: new Date(now.getTime() - 16 * 60 * 1000),
    price: 499
  });

  const expertToken = jwt.sign({ userId: expertUser._id, userType: 'expert', role: 'expert' }, JWT_SECRET, { expiresIn: '2h' });

  console.log('Launching headless Chrome...');
  const debugPort = 9224;
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${debugPort}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,900'
  ]);

  try {
    const wsUrl = await getWsUrl(debugPort);
    const ws = new WebSocket(wsUrl);
    await new Promise(r => ws.once('open', r));

    await sendCdp(ws, 'Page.enable');
    await sendCdp(ws, 'Runtime.enable');

    // Set expert credentials in localStorage
    await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:5173/signin' });
    await waitMs(2000);

    await evalInPage(ws, `
      localStorage.setItem('token', '${expertToken}');
      localStorage.setItem('user', JSON.stringify({
        _id: '${expertUser._id}',
        userId: '${expertUser._id}',
        name: '${expertUser.name || "Test Expert"}',
        email: '${expertUser.email}',
        userType: 'expert',
        role: 'expert'
      }));
    `);

    // Evidence 1: Live Meeting with attendance panel LOCKED (00:00 - 14:59 countdown)
    console.log(`Navigating to Live Meeting (Locked Session: ${lockedSessionId})...`);
    await sendCdp(ws, 'Page.navigate', { url: `http://localhost:5173/live-meeting/${lockedSessionId}?role=expert` });
    await waitMs(3500);

    await captureScreenshot(ws, 'evidence_attendance_panel_locked_1459.png');

    // Evidence 2: Live Meeting with attendance panel UNLOCKED (15:00 mark)
    console.log(`Navigating to Live Meeting (Unlocked Session: ${unlockedSessionId})...`);
    await sendCdp(ws, 'Page.navigate', { url: `http://localhost:5173/live-meeting/${unlockedSessionId}?role=expert` });
    await waitMs(3500);

    // Select ATTENDED_COMPLETED option on the card
    await evalInPage(ws, `
      const radio = document.querySelector('input[value="ATTENDED_COMPLETED"]');
      if (radio) { radio.click(); }
    `);
    await waitMs(500);

    await captureScreenshot(ws, 'evidence_attendance_panel_unlocked_1500.png');

    // Evidence 3: Open in-app confirmation modal ("End Interview Session?")
    console.log('Opening End Interview in-app confirmation modal...');
    await evalInPage(ws, `
      const endBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('End meeting') || b.textContent.includes('End Session with Selected Outcome') || b.textContent.includes('Conclude & End Interview'));
      if (endBtn) endBtn.click();
    `);
    await waitMs(1000);

    await captureScreenshot(ws, 'evidence_end_interview_confirmation_modal.png');

    // Evidence 4: Booking Calendar smooth transition and stable slot list (no zero-slot dates)
    console.log('Navigating to Candidate Booking Page...');
    await sendCdp(ws, 'Page.navigate', { url: `http://localhost:5173/book-session?expertId=${expertProfile._id}` });
    await waitMs(3000);

    await captureScreenshot(ws, 'evidence_booking_calendar_smooth_stable.png');

    ws.close();
  } finally {
    chromeProc.kill();
    // Clean up temporary sessions
    await Session.deleteMany({ sessionId: { $in: [lockedSessionId, unlockedSessionId] } });
    await mongoose.disconnect();
    console.log('Browser capture finished and cleaned up.');
  }
}

run().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
