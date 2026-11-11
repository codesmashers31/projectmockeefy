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

  const port = 9228;
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,960'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  const versionRes = await fetch(`http://127.0.0.1:${port}/json/version`);
  const versionData = await versionRes.json();
  const wsUrl = versionData.webSocketDebuggerUrl;
  console.log('Connecting to Chrome CDP at:', wsUrl);

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

  // Create page target
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
      localStorage.setItem('user', ${JSON.stringify(JSON.stringify(userData))});
      window.location.reload();
    `
  });
  await new Promise(r => setTimeout(r, 3500));

  // 1. Capture Main Certificates page
  console.log('\n--- 1. Capturing Certificates page ---');
  const mainSnap = await pageSend('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_certificates_page_main.png'), Buffer.from(mainSnap.result.data, 'base64'));
  console.log('Saved evidence_certificates_page_main.png');

  // 2. Open Preview modal
  console.log('\n--- 2. Opening Preview Modal ---');
  await pageSend('Runtime.evaluate', {
    expression: `
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const previewBtn = btns.find(b => b.textContent && b.textContent.includes('Preview Next'));
        if (previewBtn) previewBtn.click();
      })()
    `
  });
  await new Promise(r => setTimeout(r, 1500));

  // Set domain to default ("")
  await pageSend('Runtime.evaluate', {
    expression: `
      (() => {
        const sel = document.getElementById('preview-domain-select');
        if (sel) {
          sel.value = "";
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `
  });
  await new Promise(r => setTimeout(r, 1000));

  const snapDefault = await pageSend('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_preview_default_modal.png'), Buffer.from(snapDefault.result.data, 'base64'));
  console.log('Saved evidence_preview_default_modal.png');

  // Date area crop on preview modal
  const cropDataDefault = await pageSend('Runtime.evaluate', {
    expression: `
      (() => {
        const plaque = document.getElementById('issue-date-plaque');
        if (!plaque) return null;
        const rect = plaque.getBoundingClientRect();
        return { x: rect.x - 30, y: rect.y - 15, width: rect.width + 60, height: rect.height + 30 };
      })()
    `,
    returnByValue: true
  });
  if (cropDataDefault.result?.value) {
    const box = cropDataDefault.result.value;
    const clipSnap = await pageSend('Page.captureScreenshot', {
      format: 'png',
      clip: { x: Math.max(0, box.x), y: Math.max(0, box.y), width: box.width, height: box.height, scale: 1 }
    });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_preview_date_plaque_crop.png'), Buffer.from(clipSnap.result.data, 'base64'));
    console.log('Saved evidence_preview_date_plaque_crop.png');
  }

  // 3. Select "Web Development" in Domain Dropdown
  console.log('\n--- 3. Testing Dynamic Domain: Web Development ---');
  await pageSend('Runtime.evaluate', {
    expression: `
      (() => {
        const sel = document.getElementById('preview-domain-select');
        if (sel) {
          sel.value = "Web Development";
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `
  });
  await new Promise(r => setTimeout(r, 1000));

  const snapWebDev = await pageSend('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_preview_web_dev_modal.png'), Buffer.from(snapWebDev.result.data, 'base64'));
  console.log('Saved evidence_preview_web_dev_modal.png');

  // 4. Select "Cybersecurity" in Domain Dropdown
  console.log('\n--- 4. Testing Dynamic Domain: Cybersecurity ---');
  await pageSend('Runtime.evaluate', {
    expression: `
      (() => {
        const sel = document.getElementById('preview-domain-select');
        if (sel) {
          sel.value = "Cybersecurity";
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `
  });
  await new Promise(r => setTimeout(r, 1000));

  const snapCyber = await pageSend('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_preview_cybersecurity_modal.png'), Buffer.from(snapCyber.result.data, 'base64'));
  console.log('Saved evidence_preview_cybersecurity_modal.png');

  // 5. Context menu test
  console.log('\n--- 5. Testing Context Menu Prevention ---');
  const contextTest = await pageSend('Runtime.evaluate', {
    expression: `
      (() => {
        const cert = document.getElementById('mockeefy-official-certificate');
        if (!cert) return { found: false };
        const evt = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
        const dispatched = cert.dispatchEvent(evt);
        return {
          found: true,
          defaultPrevented: evt.defaultPrevented,
          dispatched
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Context menu event test:', contextTest.result?.value);

  // 6. Close preview modal and view Joel's official issued certificate
  console.log('\n--- 6. Viewing Joel Official Issued Certificate ---');
  await pageSend('Runtime.evaluate', {
    expression: `
      (() => {
        const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Close Preview'));
        if (closeBtn) closeBtn.click();
      })()
    `
  });
  await new Promise(r => setTimeout(r, 1000));

  await pageSend('Runtime.evaluate', {
    expression: `
      (() => {
        const earnedSection = document.getElementById('my-earned-certificates-section');
        if (earnedSection) {
          const card = earnedSection.querySelector('[title*="Click to view"]');
          if (card) card.click();
        }
      })()
    `
  });
  await new Promise(r => setTimeout(r, 1500));

  const snapIssued = await pageSend('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_issued_cert_modal_joel.png'), Buffer.from(snapIssued.result.data, 'base64'));
  console.log('Saved evidence_issued_cert_modal_joel.png');

  ws.close();
  pageWs.close();
  chromeProc.kill();
  console.log('\nAll captures completed successfully.');
  process.exit(0);
}

main().catch(err => {
  console.error('Error running verification:', err);
  process.exit(1);
});
