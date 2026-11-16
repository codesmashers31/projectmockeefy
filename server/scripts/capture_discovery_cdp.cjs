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

  const port = 9268;
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

  const targetRes = await send('Target.createTarget', { url: 'http://localhost:5173/' });
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

  // 1. All Tracks
  console.log("Navigating to http://localhost:5173/ ...");
  await pageSend('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise(r => setTimeout(r, 4000));

  let shot = await pageSend('Page.captureScreenshot', { format: 'png' });
  const allTracksPath = path.join(ARTIFACT_DIR, 'evidence_discovery_all_tracks_59.png');
  fs.writeFileSync(allTracksPath, Buffer.from(shot.result.data, 'base64'));
  console.log('Saved:', allTracksPath);

  // 2. Select IT Category Filter
  console.log("Navigating to IT category filter (?category=IT)...");
  await pageSend('Page.navigate', { url: 'http://localhost:5173/?category=IT' });
  await new Promise(r => setTimeout(r, 3000));
  shot = await pageSend('Page.captureScreenshot', { format: 'png' });
  const itPath = path.join(ARTIFACT_DIR, 'evidence_discovery_category_it_16.png');
  fs.writeFileSync(itPath, Buffer.from(shot.result.data, 'base64'));
  console.log('Saved:', itPath);

  // 3. Select Web Development Category Filter
  console.log("Navigating to Web Development filter (?category=Web%20Development)...");
  await pageSend('Page.navigate', { url: 'http://localhost:5173/?category=Web%20Development' });
  await new Promise(r => setTimeout(r, 3000));
  shot = await pageSend('Page.captureScreenshot', { format: 'png' });
  const webPath = path.join(ARTIFACT_DIR, 'evidence_discovery_category_webdev_3.png');
  fs.writeFileSync(webPath, Buffer.from(shot.result.data, 'base64'));
  console.log('Saved:', webPath);

  // 4. Empty category fallback (?category=Test)
  console.log("Navigating to empty category (?category=Test)...");
  await pageSend('Page.navigate', { url: 'http://localhost:5173/?category=Test' });
  await new Promise(r => setTimeout(r, 3500));
  shot = await pageSend('Page.captureScreenshot', { format: 'png' });
  const fallbackPath = path.join(ARTIFACT_DIR, 'evidence_discovery_empty_category_fallback.png');
  fs.writeFileSync(fallbackPath, Buffer.from(shot.result.data, 'base64'));
  console.log('Saved:', fallbackPath);

  // 5. Close up card capture
  console.log("Capturing close-up view of first card on All Tracks...");
  await pageSend('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise(r => setTimeout(r, 3000));
  shot = await pageSend('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 30, y: 190, width: 700, height: 440, scale: 1 }
  });
  const cardPath = path.join(ARTIFACT_DIR, 'evidence_discovery_expert_card_closeup.png');
  fs.writeFileSync(cardPath, Buffer.from(shot.result.data, 'base64'));
  console.log('Saved:', cardPath);

  pageWs.close();
  ws.close();
  chromeProc.kill();
  await mongoose.disconnect();
  console.log('Capture complete!');
}

main().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
