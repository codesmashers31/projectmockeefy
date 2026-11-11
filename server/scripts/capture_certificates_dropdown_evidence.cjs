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

  const port = 9277;
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

  // Inject Joel auth
  await pageSend('Runtime.evaluate', {
    expression: `
      localStorage.setItem('token', ${JSON.stringify(token)});
      localStorage.setItem('mockeefy_user_cache', ${JSON.stringify(JSON.stringify(userData))});
      localStorage.setItem('user', ${JSON.stringify(JSON.stringify(userData))});
      localStorage.setItem('userType', 'candidate');
    `
  });

  // Navigate to /certificates
  console.log("Navigating to http://localhost:5173/certificates ...");
  await pageSend('Page.navigate', { url: 'http://localhost:5173/certificates' });
  await new Promise(r => setTimeout(r, 4500));

  // 1. Capture Banner with Closed Dropdown (IT 3/3 Ready)
  console.log("Capturing 1: Closed Dropdown Banner...");
  let shot = await pageSend('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 30, y: 15, width: 1380, height: 420, scale: 1 }
  });
  const closedBannerPath = path.join(ARTIFACT_DIR, 'evidence_dropdown_banner_closed.png');
  fs.writeFileSync(closedBannerPath, Buffer.from(shot.result.data, 'base64'));
  console.log('Saved:', closedBannerPath);

  // 2. Open the Dropdown
  console.log("Opening dropdown...");
  await pageSend('Runtime.evaluate', {
    expression: `
      const btn = document.querySelector('button[aria-haspopup="listbox"]');
      if (btn) btn.click();
    `
  });
  await new Promise(r => setTimeout(r, 800));

  console.log("Capturing 2: Open Dropdown showing all active domains...");
  shot = await pageSend('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 30, y: 15, width: 1380, height: 500, scale: 1 }
  });
  const openBannerPath = path.join(ARTIFACT_DIR, 'evidence_dropdown_banner_open.png');
  fs.writeFileSync(openBannerPath, Buffer.from(shot.result.data, 'base64'));
  console.log('Saved:', openBannerPath);

  // 3. Switch to Web Development
  console.log("Clicking Web Development...");
  await pageSend('Runtime.evaluate', {
    expression: `
      const options = Array.from(document.querySelectorAll('button[role="option"]'));
      const webDevOption = options.find(el => el.innerText.includes('Web Development'));
      if (webDevOption) webDevOption.click();
    `
  });
  await new Promise(r => setTimeout(r, 1200));

  console.log("Capturing 3: Switched to Web Development (2/3, Milestone 1)...");
  shot = await pageSend('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 30, y: 15, width: 1380, height: 420, scale: 1 }
  });
  const webDevBannerPath = path.join(ARTIFACT_DIR, 'evidence_dropdown_switched_webdev.png');
  fs.writeFileSync(webDevBannerPath, Buffer.from(shot.result.data, 'base64'));
  console.log('Saved:', webDevBannerPath);

  // 4. Open dropdown again and switch to Software Development
  console.log("Opening dropdown and clicking Software Development...");
  const resOpen2 = await pageSend('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('button[aria-haspopup="listbox"]');
      if (btn) {
        btn.click();
        return "Clicked btn to open";
      }
      return "No btn found";
    })()`
  });
  console.log("Reopen result:", JSON.stringify(resOpen2?.result));
  await new Promise(r => setTimeout(r, 1000));

  const resSoft = await pageSend('Runtime.evaluate', {
    expression: `(() => {
      const options = Array.from(document.querySelectorAll('button[role="option"]'));
      const softDevOption = options.find(el => (el.textContent || "").includes('Software Development'));
      if (softDevOption) {
        softDevOption.click();
        return "Clicked Soft Dev: " + softDevOption.textContent;
      }
      return "NotFound among " + options.length + " options: " + options.map(o => o.textContent).join("; ");
    })()`
  });
  console.log("Soft Dev Click result:", JSON.stringify(resSoft?.result));
  await new Promise(r => setTimeout(r, 1500));

  console.log("Capturing 4: Switched to Software Development (1/3, Milestone 1)...");
  shot = await pageSend('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 30, y: 15, width: 1380, height: 420, scale: 1 }
  });
  const softDevBannerPath = path.join(ARTIFACT_DIR, 'evidence_dropdown_switched_softdev.png');
  fs.writeFileSync(softDevBannerPath, Buffer.from(shot.result.data, 'base64'));
  console.log('Saved:', softDevBannerPath);

  // 5. Full Page view with Joel
  console.log("Capturing 5: Full Certificates Page Overview...");
  shot = await pageSend('Page.captureScreenshot', { format: 'png' });
  const fullPagePath = path.join(ARTIFACT_DIR, 'evidence_certificates_page_full_overview.png');
  fs.writeFileSync(fullPagePath, Buffer.from(shot.result.data, 'base64'));
  console.log('Saved:', fullPagePath);

  pageWs.close();
  ws.close();
  chromeProc.kill();
  await mongoose.disconnect();
  console.log('CDP evidence capture finished successfully!');
}

main().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
