const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\fa4cc859-e99d-440e-a4b9-ef64c859d17c";
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_mockeefy_secret_key';

function sendCdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 100000);
    const msg = JSON.stringify({ id, method, params });
    const handler = (data) => {
      const parsed = JSON.parse(data.toString());
      if (parsed.id === id) {
        ws.off('message', handler);
        if (parsed.error) reject(parsed.error);
        else resolve(parsed.result);
      }
    };
    ws.on('message', handler);
    ws.send(msg);
  });
}

async function runCapture() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const User = mongoose.models.User || (await import('../models/User.js')).default;
  const joel = await User.findOne({ email: 'jamietheresa.26csa@licet.ac.in' });

  if (!joel) {
    console.error('Candidate Joel not found');
    process.exit(1);
  }

  const port = 9318;
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,1100'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const jsonRes = await new Promise((res, rej) => {
      http.get(`http://127.0.0.1:${port}/json`, (r) => {
        let raw = '';
        r.on('data', chunk => raw += chunk);
        r.on('end', () => res(JSON.parse(raw)));
      }).on('error', rej);
    });

    const pageWsUrl = jsonRes[0]?.webSocketDebuggerUrl;
    const WebSocket = require('ws');
    const ws = new WebSocket(pageWsUrl);
    await new Promise(r => ws.on('open', r));

    await sendCdp(ws, 'Page.enable');
    await sendCdp(ws, 'Runtime.enable');

    const joelToken = jwt.sign(
      { email: joel.email, userType: 'candidate', name: joel.name, userId: joel._id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const joelUserData = {
      id: joel._id.toString(),
      _id: joel._id.toString(),
      userId: joel._id.toString(),
      email: joel.email,
      userType: 'candidate',
      role: 'candidate',
      name: joel.name,
    };

    // 1. Set localStorage & Navigate to Home / Header view
    await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:5173/' });
    await new Promise(r => setTimeout(r, 1500));

    await sendCdp(ws, 'Runtime.evaluate', {
      expression: `
        localStorage.clear();
        localStorage.setItem('token', ${JSON.stringify(joelToken)});
        localStorage.setItem('user', ${JSON.stringify(JSON.stringify(joelUserData))});
        localStorage.setItem('role', 'candidate');
      `
    });

    console.log('Navigating to http://localhost:5173/ to capture Wallet Nav link & badge...');
    await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:5173/' });
    await new Promise(r => setTimeout(r, 3000));

    const navShot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_candidate_wallet_nav.png'), Buffer.from(navShot.data, 'base64'));
    console.log('✅ Captured evidence_candidate_wallet_nav.png');

    // 2. Navigate to /wallet page
    console.log('Navigating to http://localhost:5173/wallet ...');
    await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:5173/wallet' });
    await new Promise(r => setTimeout(r, 3500));

    const walletShot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_candidate_wallet_page.png'), Buffer.from(walletShot.data, 'base64'));
    console.log('✅ Captured evidence_candidate_wallet_page.png');

    // 3. Open Cash Refund modal for visual evidence
    await sendCdp(ws, 'Runtime.evaluate', {
      expression: `
        const refundBtns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('Request Cash Refund'));
        if (refundBtns.length > 0) refundBtns[0].click();
      `
    });
    await new Promise(r => setTimeout(r, 1200));

    const refundModalShot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_candidate_cash_refund_modal.png'), Buffer.from(refundModalShot.data, 'base64'));
    console.log('✅ Captured evidence_candidate_cash_refund_modal.png');

    // 4. Navigate to /my-sessions
    console.log('Navigating to http://localhost:5173/my-sessions ...');
    await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:5173/my-sessions' });
    await new Promise(r => setTimeout(r, 3000));

    const sessionsShot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_candidate_my_sessions.png'), Buffer.from(sessionsShot.data, 'base64'));
    console.log('✅ Captured evidence_candidate_my_sessions.png');

    ws.close();
    chromeProc.kill();
    console.log('🎉 All evidence captured successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error during capture:', err);
    chromeProc.kill();
    process.exit(1);
  }
}

runCapture();
