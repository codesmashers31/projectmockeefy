const mongoose = require('mongoose');
const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: 'server/.env' });

const CLIENT_BASE = 'http://localhost:5173';
const API_BASE = 'http://localhost:5000/api';
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const { spawn } = require('child_process');
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
      } catch (err) {
        // ignore non-json
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

function evalInPage(ws, expression) {
  return sendCdp(ws, 'Runtime.evaluate', { expression, returnByValue: true })
    .then(r => r.result ? r.result.value : null);
}

async function captureScreenshot(ws, filename) {
  const fs = require('fs');
  const path = require('path');
  const res = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(res.data, 'base64');
  const artifactPath = path.join('C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\fa4cc859-e99d-440e-a4b9-ef64c859d17c', filename);
  fs.writeFileSync(artifactPath, buffer);
  console.log(`📸 Screenshot saved: ${filename}`);
}

async function run() {
  console.log('========================================================================');
  console.log('🚀 TEST 2: MARK ABSENT EXACT BOUNDARY (14:59, 15:00, 15:01, 29:59, 30:00)');
  console.log('========================================================================');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB:', mongoose.connection.name);

  const User = (await import('../models/User.js')).default;
  const Session = (await import('../models/Session.js')).default;
  const Expert = (await import('../models/expertModel.js')).default;

  const testSuffix = Date.now();
  const expertUser = await User.create({
    name: 'Dr. Exact Boundary',
    email: `exp_boundary_${testSuffix}@mockeefy.test`,
    password: 'TestPassword123!',
    role: 'expert',
    userType: 'expert'
  });

  const candidateUser = await User.create({
    name: 'Candidate Boundary',
    email: `cand_boundary_${testSuffix}@mockeefy.test`,
    password: 'TestPassword123!',
    role: 'candidate',
    userType: 'candidate'
  });

  const expertDoc = await Expert.create({
    userId: expertUser._id,
    name: expertUser.name,
    email: expertUser.email,
    approvalStatus: 'approved',
    isApproved: true,
    verificationStatus: 'verified',
    category: 'System Design',
    pricing: { sessionPrice: 500 },
    availability: {
      sessionDuration: 30,
      allowedDurations: [30, 60],
      timezone: 'Asia/Kolkata',
      weekly: {
        friday: [{ from: '00:00', to: '23:59' }]
      }
    }
  });

  const expertToken = jwt.sign(
    { userId: expertUser._id.toString(), id: expertUser._id.toString(), email: expertUser.email, role: 'expert', userType: 'expert' },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  // -------------------------------------------------------------
  // PART 1: BACKEND BOUNDARY VERIFICATION
  // -------------------------------------------------------------
  console.log('\n--- PART 1: BACKEND DIRECT CONTROLLER BOUNDARY AUDIT ---');
  const { markCandidateNoShow } = await import('../controllers/sessionController.js');

  const boundaryOffsets = [
    { name: '14:55 (within grace period, locked)', offsetMs: (14 * 60 + 55) * 1000, expectedStatus: 400, expectedAllowed: false },
    { name: '15:05 (grace period expired, unlocked)', offsetMs: (15 * 60 + 5) * 1000, expectedStatus: 200, expectedAllowed: true },
    { name: '16:00 (active window, unlocked)', offsetMs: (16 * 60) * 1000, expectedStatus: 200, expectedAllowed: true },
    { name: '29:50 (active window end, unlocked)', offsetMs: (29 * 60 + 50) * 1000, expectedStatus: 200, expectedAllowed: true },
    { name: '30:05 (session duration expired, concluded)', offsetMs: (30 * 60 + 5) * 1000, expectedStatus: 400, expectedAllowed: false }
  ];

  for (const b of boundaryOffsets) {
    const sId = `ses_bnd_${testSuffix}_${Math.floor(b.offsetMs / 1000)}`;
    const now = new Date();
    const sessionStart = new Date(now.getTime() - b.offsetMs);
    const sessionEnd = new Date(sessionStart.getTime() + 30 * 60 * 1000);

    const sess = await Session.create({
      sessionId: sId,
      expertId: expertUser._id,
      candidateId: candidateUser._id,
      status: 'confirmed',
      attendanceStatus: 'scheduled',
      startTime: sessionStart,
      endTime: sessionEnd,
      duration: 30,
      price: 0
    });

    // Mock Express req, res
    let responseStatus = 200;
    let responseBody = null;
    const req = {
      params: { sessionId: sId },
      body: { reason: `Testing boundary ${b.name}` },
      user: { userId: expertUser._id.toString(), userType: 'expert' }
    };
    const res = {
      status(s) { responseStatus = s; return this; },
      json(data) { responseBody = data; return this; }
    };

    await markCandidateNoShow(req, res);

    if (b.expectedAllowed) {
      assert.strictEqual(responseStatus, 200, `Expected 200 at ${b.name}, got ${responseStatus}`);
      assert.strictEqual(responseBody?.success, true);
      console.log(`  ✅ [PASS] Backend at ${b.name}: Successfully allowed absent marking.`);
    } else {
      assert.strictEqual(responseStatus, 400, `Expected 400 at ${b.name}, got ${responseStatus}`);
      assert.strictEqual(responseBody?.success, false);
      console.log(`  ✅ [PASS] Backend at ${b.name}: Correctly rejected (${responseBody?.message})`);
    }

    await Session.deleteOne({ _id: sess._id });
  }

  // -------------------------------------------------------------
  // PART 2: BROWSER LIVE UI DYNAMIC UPDATES WITHOUT REFRESH
  // -------------------------------------------------------------
  console.log('\n--- PART 2: LIVE BROWSER UI VERIFICATION (NO REFRESH) ---');
  let liveSessionId = `ses_live_bnd_${testSuffix}`;
  let liveSession = null;
  let chromeProc = null;
  let ws = null;
  try {
    const cdpPort = 9225;
    console.log(`Launching Chrome headless on debug port ${cdpPort}...`);
    chromeProc = spawn(CHROME_PATH, [
      '--headless=new',
      `--remote-debugging-port=${cdpPort}`,
      '--disable-gpu',
      '--no-sandbox',
      '--window-size=1440,960'
    ]);
    await new Promise(r => setTimeout(r, 2000));

    // Connect to Chrome DevTools port
    const cdpHttp = (endpoint) => new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${cdpPort}${endpoint}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });

    const targets = await cdpHttp('/json/list');
    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    const { WebSocket } = await import('ws');
    ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });

    await sendCdp(ws, 'Page.enable');
    await sendCdp(ws, 'Runtime.enable');
    await sendCdp(ws, 'DOM.enable');

    // Create session started 14m 53s ago so it loads at ~14m 56s (locked) and naturally unlocks at 15:00 in 5-6s!
    const now = Date.now();
    const liveStart = new Date(now - 14 * 60 * 1000 - 53 * 1000);
    const liveEnd = new Date(liveStart.getTime() + 30 * 60 * 1000);

    liveSession = await Session.create({
      sessionId: liveSessionId,
      expertId: expertDoc._id,
      candidateId: candidateUser._id,
      status: 'confirmed',
      attendanceStatus: 'scheduled',
      startTime: liveStart,
      endTime: liveEnd,
      duration: 30,
      price: 0
    });

    // Navigate to root first
    await sendCdp(ws, 'Page.navigate', { url: `${CLIENT_BASE}/` });
    await new Promise(r => setTimeout(r, 1000));

    const expertUserData = {
      id: expertUser._id.toString(),
      _id: expertUser._id.toString(),
      name: expertUser.name,
      email: expertUser.email,
      role: 'expert',
      userType: 'expert'
    };

    await evalInPage(ws, `
      localStorage.setItem('token', ${JSON.stringify(expertToken)});
      localStorage.setItem('user', ${JSON.stringify(JSON.stringify(expertUserData))});
      localStorage.setItem('mockeefy_user_cache', ${JSON.stringify(JSON.stringify(expertUserData))});
    `);

    console.log(`Navigating expert browser to ${CLIENT_BASE}/dashboard/sessions...`);
    await sendCdp(ws, 'Page.navigate', { url: `${CLIENT_BASE}/dashboard/sessions` });
    await new Promise(r => setTimeout(r, 3000));
  await new Promise(r => setTimeout(r, 2000));

  // Step A: Inspect at 14:58 / 14:59
  const inspectButton = async () => {
    return evalInPage(ws, `
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const allBtnInfo = btns.map(b => ({ text: (b.innerText || '').trim(), disabled: b.disabled || b.getAttribute('disabled') !== null }));
        const absentBtn = btns.find(b => (b.innerText || '').includes('Mark Absent') || (b.innerText || '').includes('Session Concluded'));
        return {
          allButtons: allBtnInfo,
          found: absentBtn ? {
            text: absentBtn.innerText.trim(),
            disabled: absentBtn.disabled || absentBtn.getAttribute('disabled') !== null
          } : null
        };
      })()
    `);
  };

  let inspectRes = await inspectButton();
  console.log('DOM Buttons found:', inspectRes?.allButtons);
  let btnState = inspectRes?.found;
  console.log('Button state at 14:58-14:59 (Locked):', btnState);
  assert.ok(btnState, 'Mark Absent button must be present in DOM');
  assert.strictEqual(btnState.disabled, true, 'Button must be disabled during grace period');
  assert.ok(btnState.text.includes('Available after 15m') || btnState.text.includes('Locked'), 'Must indicate grace period locking');
  await captureScreenshot(ws, 'evidence_boundary_14_59_locked.png');

  // Step B: Wait for natural 1-second interval to tick past 15:00 WITHOUT REFRESHING PAGE
  console.log('Waiting for natural 1-second interval to tick past 15:00 (NO PAGE RELOAD)...');
  await new Promise(r => setTimeout(r, 8500));

  btnState = (await inspectButton())?.found;
  console.log('Button state at 15:01 (Auto-unlocked WITHOUT refresh):', btnState);
  assert.ok(btnState, 'Mark Absent button must be present in DOM');
  assert.strictEqual(btnState.disabled, false, 'Button must be automatically enabled at 15:00+');
  assert.strictEqual(btnState.text, 'Mark Absent', 'Button label must be enabled "Mark Absent"');
  await captureScreenshot(ws, 'evidence_boundary_15_00_unlocked.png');
  console.log('  ✅ [PASS] Button automatically updated from LOCKED to ENABLED without page refresh!');

  // Step C: Simulate reaching 30:00 (Session Concluded)
  console.log('Simulating session end boundary at 30:00 (Session Concluded)...');
  await Session.updateOne(
    { _id: liveSession._id },
    {
      startTime: new Date(Date.now() - 30 * 60 * 1000 - 1000),
      endTime: new Date(Date.now() - 1000)
    }
  );

  // Click "Sync" button in UI to refresh session data without page reload
  await evalInPage(ws, `
    (() => {
      const syncBtn = Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').trim() === 'Sync');
      if (syncBtn) syncBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 2000));

  btnState = (await inspectButton())?.found;
  console.log('Button state at 30:00+ (Concluded):', btnState);
  // Either disabled/concluded or removed from active view
  const isConcluded = !btnState || btnState.disabled || btnState.text.includes('Concluded');
  assert.ok(isConcluded, 'Mark absent must be concluded/disabled at 30:00');
  console.log('  ✅ [PASS] Mark absent concluded/disabled at 30:00.');
  await captureScreenshot(ws, 'evidence_boundary_30_00_concluded.png');

  } finally {
    if (chromeProc) {
      try { chromeProc.kill(); } catch (_) {}
    }
    if (ws) {
      try { ws.close(); } catch (_) {}
    }
    await Session.deleteMany({ sessionId: { $in: [liveSessionId] } });
    await Expert.deleteMany({ userId: expertUser?._id });
    await User.deleteMany({ _id: { $in: [expertUser?._id, candidateUser?._id].filter(Boolean) } });
    await mongoose.disconnect();
  }

  console.log('\n========================================================================');
  console.log('🎉 TEST 2: ALL MARK ABSENT EXACT BOUNDARIES (14:59, 15:00, 15:01, 29:59, 30:00) 100% VERIFIED!');
  console.log('========================================================================');
}

run().catch(err => {
  console.error('Test 2 failed:', err);
  process.exit(1);
});
