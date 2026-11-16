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
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const User = mongoose.models.User || (await import('../models/User.js')).default;
  const darwin = await User.findById('6ad1fd8b146a0a4e7ca163aa');

  const token = jwt.sign(
    {
      email: darwin.email,
      userType: darwin.userType,
      name: darwin.name,
      userId: darwin._id
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  const userData = {
    id: darwin._id.toString(),
    _id: darwin._id.toString(),
    userId: darwin._id.toString(),
    email: darwin.email,
    userType: darwin.userType || 'candidate',
    role: darwin.userType || 'candidate',
    name: darwin.name,
    isPremium: false
  };

  const port = 9279;
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

  const targetRes = await send('Target.createTarget', { url: 'about:blank' });
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

  // Navigate to root to set origin localStorage
  await pageSend('Page.navigate', { url: 'http://localhost:5173' });
  await new Promise(r => setTimeout(r, 2000));

  // Inject Darwin authentication
  console.log("Injecting Darwin authentication into localStorage...");
  await pageSend('Runtime.evaluate', {
    expression: `
      localStorage.setItem('token', ${JSON.stringify(token)});
      localStorage.setItem('mockeefy_user_cache', ${JSON.stringify(JSON.stringify(userData))});
      localStorage.setItem('user', ${JSON.stringify(JSON.stringify(userData))});
      localStorage.setItem('userType', 'candidate');
    `
  });

  // 1. Certificates Page - Open dropdown and verify ONLY IT is present
  console.log("Navigating to http://localhost:5173/certificates ...");
  await pageSend('Page.navigate', { url: 'http://localhost:5173/certificates' });
  await new Promise(r => setTimeout(r, 4500));

  console.log("Opening dropdown on Certificates page...");
  await pageSend('Runtime.evaluate', {
    expression: `
      const btn = document.querySelector('button[aria-haspopup="listbox"]');
      if (btn) btn.click();
    `
  });
  await new Promise(r => setTimeout(r, 800));

  let shot = await pageSend('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 30, y: 15, width: 1380, height: 480, scale: 1 }
  });
  const certDropdownPath = path.join(ARTIFACT_DIR, 'evidence_darwin_corrected_dropdown_it_only.png');
  fs.writeFileSync(certDropdownPath, Buffer.from(shot.result.data, 'base64'));
  console.log('Saved:', certDropdownPath);

  // 2. Full Certificates Page overview for Darwin
  shot = await pageSend('Page.captureScreenshot', { format: 'png' });
  const certOverviewPath = path.join(ARTIFACT_DIR, 'evidence_darwin_certificates_page_clean.png');
  fs.writeFileSync(certOverviewPath, Buffer.from(shot.result.data, 'base64'));
  console.log('Saved:', certOverviewPath);

  // 3. Navigate to My Sessions
  console.log("Navigating to http://localhost:5173/my-sessions ...");
  await pageSend('Page.navigate', { url: 'http://localhost:5173/my-sessions' });
  await new Promise(r => setTimeout(r, 4000));

  // Scroll down to the bottom pagination footer
  console.log("Scrolling down to bottom pagination controls...");
  await pageSend('Runtime.evaluate', {
    expression: `window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });`
  });
  await new Promise(r => setTimeout(r, 800));

  const scrollBefore = await pageSend('Runtime.evaluate', { expression: `window.scrollY` });
  console.log("Scroll position at bottom of page 1:", scrollBefore.result?.result?.value);

  shot = await pageSend('Page.captureScreenshot', { format: 'png' });
  const p1BottomPath = path.join(ARTIFACT_DIR, 'evidence_mysessions_p1_bottom.png');
  fs.writeFileSync(p1BottomPath, Buffer.from(shot.result.data, 'base64'));
  console.log('Saved:', p1BottomPath);

  // Click Next button
  console.log("Clicking Next pagination button...");
  const clickNextRes = await pageSend('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const nextBtn = btns.find(b => b.textContent.trim() === 'Next' && !b.disabled);
      if (nextBtn) {
        nextBtn.click();
        return "CLICKED_NEXT";
      }
      return "NEXT_NOT_FOUND";
    })()`
  });
  console.log("Next click result:", clickNextRes.result?.result?.value);

  // Wait for React to render page 2 and smooth scroll to top
  await new Promise(r => setTimeout(r, 1200));

  const scrollAfterNext = await pageSend('Runtime.evaluate', { expression: `window.scrollY` });
  console.log("Scroll position after Next click (Page 2):", scrollAfterNext.result?.result?.value);

  shot = await pageSend('Page.captureScreenshot', { format: 'png' });
  const p2TopPath = path.join(ARTIFACT_DIR, 'evidence_mysessions_p2_top_after_next.png');
  fs.writeFileSync(p2TopPath, Buffer.from(shot.result.data, 'base64'));
  console.log('Saved:', p2TopPath);

  // Click Prev button to verify Previous pagination resets scroll to top
  console.log("Scrolling to bottom of Page 2...");
  await pageSend('Runtime.evaluate', {
    expression: `window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });`
  });
  await new Promise(r => setTimeout(r, 800));

  console.log("Clicking Prev button...");
  await pageSend('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const prevBtn = btns.find(b => b.textContent.trim() === 'Prev' && !b.disabled);
      if (prevBtn) {
        prevBtn.click();
        return "CLICKED_PREV";
      }
      return "PREV_NOT_FOUND";
    })()`
  });
  await new Promise(r => setTimeout(r, 1200));

  const scrollAfterPrev = await pageSend('Runtime.evaluate', { expression: `window.scrollY` });
  console.log("Scroll position after Prev click (Page 1):", scrollAfterPrev.result?.result?.value);

  shot = await pageSend('Page.captureScreenshot', { format: 'png' });
  const p1TopPath = path.join(ARTIFACT_DIR, 'evidence_mysessions_p1_top_after_prev.png');
  fs.writeFileSync(p1TopPath, Buffer.from(shot.result.data, 'base64'));
  console.log('Saved:', p1TopPath);

  pageWs.close();
  ws.close();
  chromeProc.kill();
  await mongoose.disconnect();
  console.log("Integrity and pagination verification finished successfully!");
}

main().catch(err => {
  console.error("Capture error:", err);
  process.exit(1);
});
