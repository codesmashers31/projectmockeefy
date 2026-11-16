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
  if (!joel) {
    console.error('Joel user not found');
    process.exit(1);
  }
  console.log('Found Joel:', joel.name, joel.email, joel._id);

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
    userType: joel.userType,
    name: joel.name
  };

  // Launch headless Chrome with remote debugging
  const port = 9224;
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,960'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  // Fetch debugging WebSocket URL
  const versionRes = await fetch(`http://127.0.0.1:${port}/json/version`);
  const versionData = await versionRes.json();
  const wsUrl = versionData.webSocketDebuggerUrl;
  console.log('Connecting to Chrome CDP at:', wsUrl);

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

  // Create new page target
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
  await pageSend('Runtime.enable');

  // Inject authentication into localStorage
  await pageSend('Runtime.evaluate', {
    expression: `
      localStorage.setItem('token', ${JSON.stringify(token)});
      localStorage.setItem('mockeefy_user_cache', ${JSON.stringify(JSON.stringify(userData))});
      location.reload();
    `
  });

  console.log('Injected token and reloaded page...');
  await new Promise(r => setTimeout(r, 4000));

  // 1. Capture Main Certificates Page showing Domain Progress Banner AND My Earned Certificates Section
  console.log('Capturing main page (Domain Progress + My Earned Certificates)...');
  const snap1 = await pageSend('Page.captureScreenshot', { format: 'png' });
  const snap1Path = path.join(ARTIFACT_DIR, 'evidence_domain_progress_card.png');
  fs.writeFileSync(snap1Path, Buffer.from(snap1.result.data, 'base64'));
  console.log('Captured screenshot 1: evidence_domain_progress_card.png');

  // 2. Open Preview Next modal
  console.log('Clicking Preview Next button...');
  await pageSend('Runtime.evaluate', {
    expression: `
      const btns = Array.from(document.querySelectorAll('button'));
      const previewBtn = btns.find(b => b.textContent && b.textContent.includes('Preview Next'));
      if (previewBtn) previewBtn.click();
    `
  });
  await new Promise(r => setTimeout(r, 1500));

  const snap2 = await pageSend('Page.captureScreenshot', { format: 'png' });
  const snap2Path = path.join(ARTIFACT_DIR, 'evidence_unissued_preview_modal.png');
  fs.writeFileSync(snap2Path, Buffer.from(snap2.result.data, 'base64'));
  console.log('Captured screenshot 2: evidence_unissued_preview_modal.png');

  // 3. Close preview modal
  console.log('Closing preview modal...');
  await pageSend('Runtime.evaluate', {
    expression: `
      const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Close'));
      if (closeBtn) closeBtn.click();
    `
  });
  await new Promise(r => setTimeout(r, 1000));

  // 4. Open Joel's issued certificate modal from My Earned Certificates
  console.log('Opening issued certificate modal via View button in My Earned Certificates...');
  await pageSend('Runtime.evaluate', {
    expression: `
      const viewBtn = document.querySelector('#earned-cert-card-MCFY-MST-A163AA-2026 button');
      if (viewBtn) {
        viewBtn.click();
      } else {
        const anyView = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.trim() === 'View');
        if (anyView) anyView.click();
      }
    `
  });
  await new Promise(r => setTimeout(r, 1500));

  const snap3 = await pageSend('Page.captureScreenshot', { format: 'png' });
  const snap3Path = path.join(ARTIFACT_DIR, 'evidence_issued_certificate_modal.png');
  fs.writeFileSync(snap3Path, Buffer.from(snap3.result.data, 'base64'));
  console.log('Captured screenshot 3: evidence_issued_certificate_modal.png');

  // 5. Test Deep Linking from My Sessions: Navigate directly to ?certId=MCFY-MST-A163AA-2026
  console.log('Testing deep linking to issued certificate...');
  await pageSend('Runtime.evaluate', {
    expression: `
      window.location.href = '/certificates?certId=MCFY-MST-A163AA-2026&sessionId=session-1793352076319-c1ohf3ez5';
    `
  });
  await new Promise(r => setTimeout(r, 3500));

  const snap4 = await pageSend('Page.captureScreenshot', { format: 'png' });
  const snap4Path = path.join(ARTIFACT_DIR, 'evidence_deep_linked_certificate_modal.png');
  fs.writeFileSync(snap4Path, Buffer.from(snap4.result.data, 'base64'));
  console.log('Captured screenshot 4: evidence_deep_linked_certificate_modal.png');

  // Clean up
  pageWs.close();
  ws.close();
  chromeProc.kill();
  await mongoose.disconnect();
  console.log('All verification screenshots captured successfully!');
}

main().catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});
