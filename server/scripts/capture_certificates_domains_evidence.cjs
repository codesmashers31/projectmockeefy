const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\fa4cc859-e99d-440e-a4b9-ef64c859d17c";

async function main() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const User = mongoose.models.User || (await import('../models/User.js')).default;
  const joel = await User.findById('6ad1fd8b146a0a4e7ca163aa');
  
  const JWT_SECRET = process.env.JWT_SECRET || "mockeefy_secret_key";
  const token = jwt.sign(
    {
      email: joel.email,
      userType: joel.userType,
      name: joel.name,
      userId: joel._id
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  const userData = {
    id: joel._id.toString(),
    _id: joel._id.toString(),
    userId: joel._id.toString(),
    email: joel.email,
    userType: joel.userType || 'candidate',
    role: joel.userType || 'candidate',
    name: joel.name,
    isPremium: false
  };

  const port = 9272;
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,1100'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const versionRes = await fetch(`http://127.0.0.1:${port}/json/version`);
  const versionData = await versionRes.json();
  const wsUrl = versionData.webSocketDebuggerUrl;

  const WebSocket = (await import('ws')).default;
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve) => ws.onopen = resolve);

  let idCounter = 1;
  const callbacks = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && callbacks.has(msg.id)) {
      callbacks.get(msg.id)(msg);
      callbacks.delete(msg.id);
    }
  };

  const send = (method, params = {}) => {
    return new Promise((resolve) => {
      const id = idCounter++;
      callbacks.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  const targetRes = await send('Target.createTarget', { url: 'http://localhost:5173/certificates' });
  const targetId = targetRes.result.targetId;
  const pageWsUrl = `ws://127.0.0.1:${port}/devtools/page/${targetId}`;

  const pageWs = new WebSocket(pageWsUrl);
  await new Promise((resolve) => pageWs.onopen = resolve);

  const pageCallbacks = new Map();
  pageWs.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pageCallbacks.has(msg.id)) {
      pageCallbacks.get(msg.id)(msg);
      pageCallbacks.delete(msg.id);
    }
  };

  const pageSend = (method, params = {}) => {
    return new Promise((resolve) => {
      const id = idCounter++;
      pageCallbacks.set(id, resolve);
      pageWs.send(JSON.stringify({ id, method, params }));
    });
  };

  await pageSend('Page.enable');
  await pageSend('DOM.enable');
  await pageSend('Runtime.enable');

  // Inject authentication into localStorage
  await pageSend('Runtime.evaluate', {
    expression: `
      localStorage.setItem('token', ${JSON.stringify(token)});
      localStorage.setItem('mockeefy_user_cache', ${JSON.stringify(JSON.stringify(userData))});
      localStorage.setItem('user', ${JSON.stringify(JSON.stringify(userData))});
      localStorage.setItem('userType', 'candidate');
    `
  });

  // 1. Certificates page with Joel (IT is active domain with 16 qualifying interviews, 4 issued certs)
  console.log("Navigating to http://localhost:5173/certificates ...");
  await pageSend('Page.navigate', { url: 'http://localhost:5173/certificates' });
  await new Promise(r => setTimeout(r, 4500));

  let shot = await pageSend('Page.captureScreenshot', { format: 'png' });
  const certPagePath = path.join(ARTIFACT_DIR, 'evidence_certificates_candidate_activity_domains.png');
  fs.writeFileSync(certPagePath, Buffer.from(shot.result.data, 'base64'));
  console.log('Saved:', certPagePath);

  // 2. Close-up of the domain selector & progress banner
  shot = await pageSend('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 30, y: 15, width: 1380, height: 420, scale: 1 }
  });
  const bannerCloseUpPath = path.join(ARTIFACT_DIR, 'evidence_domain_selector_banner_closeup.png');
  fs.writeFileSync(bannerCloseUpPath, Buffer.from(shot.result.data, 'base64'));
  console.log('Saved:', bannerCloseUpPath);

  // 3. Capture Zero Activity Candidate State
  // Create temporary zero-activity candidate
  let zeroUser = await User.findOne({ email: "zero_activity_ui_test@mockeefy.com" });
  if (!zeroUser) {
    zeroUser = await User.create({
      name: "Alex Zero Activity",
      email: "zero_activity_ui_test@mockeefy.com",
      userType: "candidate",
      password: "password123"
    });
  }
  const zeroToken = jwt.sign(
    { email: zeroUser.email, userType: zeroUser.userType, name: zeroUser.name, userId: zeroUser._id },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
  const zeroUserData = {
    id: zeroUser._id.toString(),
    _id: zeroUser._id.toString(),
    userId: zeroUser._id.toString(),
    email: zeroUser.email,
    userType: "candidate",
    role: "candidate",
    name: zeroUser.name,
    isPremium: false
  };

  await pageSend('Runtime.evaluate', {
    expression: `
      localStorage.setItem('token', ${JSON.stringify(zeroToken)});
      localStorage.setItem('mockeefy_user_cache', ${JSON.stringify(JSON.stringify(zeroUserData))});
      localStorage.setItem('user', ${JSON.stringify(JSON.stringify(zeroUserData))});
      localStorage.setItem('userType', 'candidate');
    `
  });

  await pageSend('Page.navigate', { url: 'http://localhost:5173/certificates' });
  await new Promise(r => setTimeout(r, 4000));

  shot = await pageSend('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 30, y: 15, width: 1380, height: 420, scale: 1 }
  });
  const emptyStatePath = path.join(ARTIFACT_DIR, 'evidence_certificates_zero_activity_empty_state.png');
  fs.writeFileSync(emptyStatePath, Buffer.from(shot.result.data, 'base64'));
  console.log('Saved:', emptyStatePath);

  // Clean up
  await User.deleteOne({ _id: zeroUser._id });

  pageWs.close();
  ws.close();
  chromeProc.kill();
  await mongoose.disconnect();
  console.log('CDP evidence capture complete!');
}

main().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
