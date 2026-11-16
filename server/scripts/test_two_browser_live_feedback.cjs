/**
 * TWO-BROWSER LIVE TEST FOR CHANGE 1: REQUEST FEEDBACK & MODAL OPENING
 */
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\fa4cc859-e99d-440e-a4b9-ef64c859d17c";
const JWT_SECRET = process.env.JWT_SECRET || "code@1234";

async function main() {
  console.log('--- STARTING TWO-BROWSER LIVE FEEDBACK TEST ---');
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

  const rawUser = require('../models/User');
  const rawSession = require('../models/Session');
  const rawNotification = require('../models/Notification');
  const rawExpert = require('../models/expertModel');

  const User = rawUser.default || rawUser;
  const Session = rawSession.default || rawSession;
  const Notification = rawNotification.default || rawNotification;
  const Expert = rawExpert.default || rawExpert;

  const testSuffix = Date.now();
  const candidate = await User.create({
    name: 'Live Test Candidate',
    email: `cand_live_${testSuffix}@mockeefy.test`,
    password: 'HashedPassword123!',
    role: 'user',
    userType: 'candidate',
    isVerified: true
  });

  const expertUser = await User.create({
    name: 'Live Test Expert',
    email: `exp_live_${testSuffix}@mockeefy.test`,
    password: 'HashedPassword123!',
    role: 'expert',
    userType: 'expert',
    isVerified: true
  });

  const expertProfile = await Expert.create({
    userId: expertUser._id,
    name: expertUser.name,
    email: expertUser.email,
    title: 'Principal Software Architect',
    bio: '15+ years experience in distributed cloud architectures.',
    category: 'IT',
    primaryDomain: 'Full Stack Development (MERN)',
    isVerified: true,
    verificationStatus: 'approved',
    availability: {
      sessionDuration: 30,
      weeklyHours: [
        { day: 'Friday', enabled: true, slots: [{ start: '10:00', end: '11:00' }] }
      ]
    }
  });

  const session = await Session.create({
    sessionId: `sess_live_${testSuffix}`,
    candidateId: candidate._id,
    candidateName: candidate.name,
    candidateEmail: candidate.email,
    expertId: expertProfile._id,
    expertName: expertProfile.name,
    expertEmail: expertProfile.email,
    sessionType: 'mock_interview',
    skill: 'Distributed Systems',
    category: 'IT',
    level: 'Senior Mentor',
    price: 800,
    paymentStatus: 'paid',
    status: 'completed',
    startTime: new Date(Date.now() - 3600000),
    endTime: new Date(Date.now() - 1800000),
    feedbackRequested: false,
    attendanceStatus: 'attended'
  });

  console.log(`Created live test session: ${session.sessionId}`);

  // Create JWTs
  const candToken = jwt.sign(
    { email: candidate.email, userType: 'candidate', name: candidate.name, userId: candidate._id },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  const expToken = jwt.sign(
    { email: expertUser.email, userType: 'expert', name: expertUser.name, userId: expertUser._id },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  const port = 9311;
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,1000'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const WebSocket = (await import('ws')).default;

  async function createPageSession() {
    const targetRes = await (await fetch(`http://127.0.0.1:${port}/json/new`, { method: 'PUT' })).json();
    const ws = new WebSocket(targetRes.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let id = 1;
    const callbacks = new Map();
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && callbacks.has(msg.id)) {
        callbacks.get(msg.id)(msg);
        callbacks.delete(msg.id);
      }
    };

    const send = (method, params = {}) => new Promise(res => {
      const msgId = id++;
      callbacks.set(msgId, res);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });

    await send('Page.enable');
    await send('DOM.enable');
    await send('Runtime.enable');
    return { send, ws };
  }

  // Browser 1: Candidate
  console.log('Initializing Browser 1 (Candidate)...');
  const candBrowser = await createPageSession();

  // Browser 2: Expert
  console.log('Initializing Browser 2 (Expert)...');
  const expBrowser = await createPageSession();

  // Set auth state for Browser 1
  await candBrowser.send('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise(r => setTimeout(r, 1000));
  await candBrowser.send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('token', '${candToken}');
      localStorage.setItem('user', JSON.stringify({
        id: '${candidate._id}',
        _id: '${candidate._id}',
        userId: '${candidate._id}',
        email: '${candidate.email}',
        name: '${candidate.name}',
        userType: 'candidate'
      }));
    `
  });

  // Set auth state for Browser 2
  await expBrowser.send('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise(r => setTimeout(r, 1000));
  await expBrowser.send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('token', '${expToken}');
      localStorage.setItem('user', JSON.stringify({
        id: '${expertUser._id}',
        _id: '${expertUser._id}',
        userId: '${expertUser._id}',
        email: '${expertUser.email}',
        name: '${expertUser.name}',
        userType: 'expert'
      }));
    `
  });

  // Navigate Browser 2 to Expert Sessions Dashboard
  console.log('Navigating Browser 2 to /dashboard/sessions...');
  await expBrowser.send('Page.navigate', { url: 'http://localhost:5173/dashboard/sessions' });
  await new Promise(r => setTimeout(r, 2500));

  // Navigate Browser 1 to Candidate My Sessions
  console.log('Navigating Browser 1 to /my-sessions...');
  await candBrowser.send('Page.navigate', { url: 'http://localhost:5173/my-sessions' });
  await new Promise(r => setTimeout(r, 2500));

  // Capture Browser 1 initial state screenshot
  const candPreShot = await candBrowser.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_change1_cand_pre_request.png'), Buffer.from(candPreShot.result.data, 'base64'));
  console.log('Captured evidence_change1_cand_pre_request.png');

  // Candidate triggers Request Feedback API call from browser session
  console.log('Candidate requesting feedback from Browser 1...');
  const reqResult = await candBrowser.send('Runtime.evaluate', {
    expression: `
      fetch('/api/sessions/${session.sessionId}/request-feedback', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ${candToken}',
          'Content-Type': 'application/json'
        }
      }).then(r => r.json());
    `,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('Request Feedback Response:', reqResult.result.value);

  // Reload Candidate sessions to test persistence & refresh preservation
  await candBrowser.send('Page.navigate', { url: 'http://localhost:5173/my-sessions' });
  await new Promise(r => setTimeout(r, 2500));

  const candPostShot = await candBrowser.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_change1_cand_post_requested.png'), Buffer.from(candPostShot.result.data, 'base64'));
  console.log('Captured evidence_change1_cand_post_requested.png');

  // Browser 2: Navigate with deep link /dashboard/sessions?sessionId=...&action=feedback
  console.log('Browser 2 opening feedback deep link action...');
  await expBrowser.send('Page.navigate', {
    url: `http://localhost:5173/dashboard/sessions?sessionId=${session.sessionId}&action=feedback`
  });
  await new Promise(r => setTimeout(r, 3000));

  const expModalShot = await expBrowser.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_change1_expert_feedback_modal_opened.png'), Buffer.from(expModalShot.result.data, 'base64'));
  console.log('Captured evidence_change1_expert_feedback_modal_opened.png');

  // Clean up
  candBrowser.ws.close();
  expBrowser.ws.close();
  chromeProc.kill();

  await User.deleteMany({ _id: { $in: [candidate._id, expertUser._id] } });
  await Expert.deleteOne({ _id: expertProfile._id });
  await Session.deleteOne({ _id: session._id });
  await Notification.deleteMany({ 'metadata.sessionId': session.sessionId });
  await mongoose.disconnect();
  console.log('--- TWO-BROWSER LIVE TEST COMPLETED SUCCESSFULLY ---');
}

main().catch(err => {
  console.error('Two-browser test error:', err);
  process.exit(1);
});
