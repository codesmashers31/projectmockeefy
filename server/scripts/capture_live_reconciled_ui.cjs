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
    userType: joel.userType || 'candidate',
    role: joel.userType || 'candidate',
    name: joel.name,
    isPremium: false
  };

  const port = 9230;
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,1100'
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
      localStorage.setItem('mockeefy_user_cache', ${JSON.stringify(JSON.stringify(userData))});
      localStorage.setItem('user', ${JSON.stringify(JSON.stringify(userData))});
      window.location.href = 'http://localhost:5173/certificates';
    `
  });
  await new Promise(r => setTimeout(r, 4500));

  // 1. Capture Main Certificates Page Neutral State
  console.log('\n--- 1. Capturing Live Certificates Page (Neutral Initial State) ---');
  const snapNeutral = await pageSend('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_live_reconciled_neutral_banner.png'), Buffer.from(snapNeutral.result.data, 'base64'));
  console.log('Saved evidence_live_reconciled_neutral_banner.png');

  // 2. Select IT Domain
  console.log('\n--- 2. Selecting IT Domain in Progress Banner ---');
  await pageSend('Runtime.evaluate', {
    expression: `
      (() => {
        // Click the IT pill or select IT in dropdown
        const btns = Array.from(document.querySelectorAll('button'));
        const itBtn = btns.find(b => b.textContent && b.textContent.includes('IT'));
        if (itBtn) {
          itBtn.click();
        } else {
          const sel = document.querySelector('select[aria-label="Select interview domain"]');
          if (sel) {
            sel.value = 'IT';
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      })()
    `
  });
  await new Promise(r => setTimeout(r, 1500));

  const snapIt = await pageSend('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_live_reconciled_it_selected.png'), Buffer.from(snapIt.result.data, 'base64'));
  console.log('Saved evidence_live_reconciled_it_selected.png');

  // 3. Inspect text on the page to confirm absence of "Milestone 2 (Interviews 4–6)"
  const textInspection = await pageSend('Runtime.evaluate', {
    expression: `
      (() => {
        const bodyText = document.body.innerText;
        return {
          hasMilestoneRangeText: bodyText.includes('Interviews 4–6') || bodyText.includes('Interviews 1–3') || bodyText.includes('Interviews 7–9'),
          has0UnallocatedText: bodyText.includes('0 unallocated'),
          hasItThreeOfThree: bodyText.includes('You have completed 3 of 3 qualifying IT interviews') || bodyText.includes('3 of 3'),
          hasConfirmButton: Boolean(Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Confirm Name & Generate Certificate'))),
          activeCategoriesRendered: Array.from(document.querySelectorAll('select[aria-label="Select interview domain"] option')).map(o => o.textContent.trim())
        };
      })()
    `,
    returnByValue: true
  });
  console.log('\n--- Live Browser DOM Inspection Results ---');
  console.log(textInspection.result?.value);

  // 4. Scroll to My Earned Certificates section and capture
  await pageSend('Runtime.evaluate', {
    expression: `
      (() => {
        const h2s = Array.from(document.querySelectorAll('h2, h3'));
        const earnedHeading = h2s.find(h => h.textContent && h.textContent.includes('My Earned Certificates'));
        if (earnedHeading) {
          earnedHeading.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      })()
    `
  });
  await new Promise(r => setTimeout(r, 1000));

  const snapEarned = await pageSend('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_live_reconciled_earned_history.png'), Buffer.from(snapEarned.result.data, 'base64'));
  console.log('Saved evidence_live_reconciled_earned_history.png');

  pageWs.close();
  ws.close();
  chromeProc.kill();
  console.log('\nVerification captures completed successfully.');
  process.exit(0);
}

main().catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});
