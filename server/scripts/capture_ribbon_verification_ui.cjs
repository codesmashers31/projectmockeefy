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

  const port = 9255;
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

  // Inject authentication into localStorage and navigate
  await pageSend('Runtime.evaluate', {
    expression: `
      localStorage.setItem('token', ${JSON.stringify(token)});
      localStorage.setItem('mockeefy_user_cache', ${JSON.stringify(JSON.stringify(userData))});
      localStorage.setItem('user', ${JSON.stringify(JSON.stringify(userData))});
      window.location.href = 'http://localhost:5173/certificates';
    `
  });

  await new Promise(r => setTimeout(r, 5000));

  const pageUrlRes = await pageSend('Runtime.evaluate', { expression: 'window.location.href', returnByValue: true });
  console.log('Current page URL:', pageUrlRes.result?.value);

  // 1. Capture neutral state
  console.log("Capturing 1: Neutral Banner State...");
  const neutralSnap = await pageSend('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_ribbon_neutral_banner.png'), Buffer.from(neutralSnap.result.data, 'base64'));

  // 2. Select "Agile & Project Management" in dropdown
  console.log("Capturing 2: Agile & Project Management Selected...");
  await pageSend('Runtime.evaluate', {
    expression: `(() => {
      const select = document.querySelector('select[aria-label="Select interview domain"]');
      if (select) {
        select.value = "Agile & Project Management";
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 2000));
  const agileSnap = await pageSend('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_ribbon_agile_selected_banner.png'), Buffer.from(agileSnap.result.data, 'base64'));

  // 3. Open Preview Modal for Agile & Project Management
  console.log("Capturing 3: Agile & Project Management Full Preview Modal...");
  await pageSend('Runtime.evaluate', {
    expression: `(() => {
      const thumb = document.querySelector('div[title="Click to preview certificate design"]');
      if (thumb) thumb.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 2000));
  const modalAgileSnap = await pageSend('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_preview_modal_agile.png'), Buffer.from(modalAgileSnap.result.data, 'base64'));

  // 4. Change Preview Modal Dropdown to "AI"
  console.log("Capturing 4: AI Full Preview Modal...");
  await pageSend('Runtime.evaluate', {
    expression: `(() => {
      const select = document.querySelector('#preview-domain-select');
      if (select) {
        select.value = "AI";
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));
  const modalAiSnap = await pageSend('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_preview_modal_ai.png'), Buffer.from(modalAiSnap.result.data, 'base64'));

  // 5. Change Preview Modal Dropdown to "IT"
  console.log("Capturing 5: IT Full Preview Modal...");
  await pageSend('Runtime.evaluate', {
    expression: `(() => {
      const select = document.querySelector('#preview-domain-select');
      if (select) {
        select.value = "IT";
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));
  const modalItSnap = await pageSend('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_preview_modal_it.png'), Buffer.from(modalItSnap.result.data, 'base64'));

  // 6. Close Preview Modal and Open Issued Certificate Modal
  console.log("Capturing 6: Official Issued Certificate Modal...");
  await pageSend('Runtime.evaluate', {
    expression: `(() => {
      const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Close Preview'));
      if (closeBtn) closeBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  await pageSend('Runtime.evaluate', {
    expression: `(() => {
      const viewBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('View Certificate'));
      if (viewBtn) viewBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 2000));
  const issuedModalSnap = await pageSend('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_issued_cert_modal_verified.png'), Buffer.from(issuedModalSnap.result.data, 'base64'));

  chromeProc.kill();
  await mongoose.disconnect();
  console.log("All captures completed successfully!");
  process.exit(0);
}

main().catch(err => {
  console.error("Main error:", err);
  process.exit(1);
});
