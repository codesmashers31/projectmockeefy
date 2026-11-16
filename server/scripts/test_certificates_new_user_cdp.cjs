const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const jwt = require('jsonwebtoken');
const http = require('http');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\fa4cc859-e99d-440e-a4b9-ef64c859d17c";
const JWT_SECRET = process.env.JWT_SECRET || "code@1234";

function sendCdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const msg = JSON.stringify({ id, method, params });
    const handler = (data) => {
      const resp = JSON.parse(data.toString());
      if (resp.id === id) {
        ws.off('message', handler);
        if (resp.error) reject(resp.error);
        else resolve(resp.result);
      }
    };
    ws.on('message', handler);
    ws.send(msg);
  });
}

async function runTest() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const User = mongoose.models.User || (await import('../models/User.js')).default;
  const jamie = await User.findOne({ email: 'jamietheresa.26csa@licet.ac.in' });
  const darwin = await User.findOne({ email: 'darwininfantmichael@gmail.com' });

  const port = 9296;
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

    // 1. TEST JAMIE (New User, 0 Qualifying Sessions)
    const jamieToken = jwt.sign(
      { email: jamie.email, userType: 'candidate', name: jamie.name, userId: jamie._id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    const jamieUserData = {
      id: jamie._id.toString(),
      _id: jamie._id.toString(),
      userId: jamie._id.toString(),
      email: jamie.email,
      userType: 'candidate',
      role: 'candidate',
      name: jamie.name,
    };

    await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:5173/' });
    await new Promise(r => setTimeout(r, 1000));

    await sendCdp(ws, 'Runtime.evaluate', {
      expression: `
        localStorage.clear();
        localStorage.setItem('token', ${JSON.stringify(jamieToken)});
        localStorage.setItem('user', ${JSON.stringify(JSON.stringify(jamieUserData))});
        localStorage.setItem('role', 'candidate');
      `
    });

    console.log('Navigating Jamie to http://localhost:5173/certificates ...');
    await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:5173/certificates' });
    await new Promise(r => setTimeout(r, 3500));

    const jamieShot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_jamie_new_user_certificates_banner.png'), Buffer.from(jamieShot.data, 'base64'));
    console.log('Captured evidence_jamie_new_user_certificates_banner.png');

    // Click preview thumbnail to test view-only preview modal
    await sendCdp(ws, 'Runtime.evaluate', {
      expression: `
        const thumb = document.querySelector('section[aria-label="Certificate Progress Banner"] div.group');
        if (thumb) thumb.click();
      `
    });
    await new Promise(r => setTimeout(r, 1500));

    const jamieModalShot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_jamie_new_user_preview_modal.png'), Buffer.from(jamieModalShot.data, 'base64'));
    console.log('Captured evidence_jamie_new_user_preview_modal.png');

    // 2. TEST DARWIN (Existing User with IT Sessions)
    const darwinToken = jwt.sign(
      { email: darwin.email, userType: 'candidate', name: darwin.name, userId: darwin._id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    const darwinUserData = {
      id: darwin._id.toString(),
      _id: darwin._id.toString(),
      userId: darwin._id.toString(),
      email: darwin.email,
      userType: 'candidate',
      role: 'candidate',
      name: darwin.name,
    };

    await sendCdp(ws, 'Runtime.evaluate', {
      expression: `
        localStorage.clear();
        localStorage.setItem('token', ${JSON.stringify(darwinToken)});
        localStorage.setItem('user', ${JSON.stringify(JSON.stringify(darwinUserData))});
        localStorage.setItem('role', 'candidate');
      `
    });

    console.log('Navigating Darwin to http://localhost:5173/certificates ...');
    await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:5173/certificates' });
    await new Promise(r => setTimeout(r, 3500));

    const darwinShot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_darwin_existing_user_certificates_page.png'), Buffer.from(darwinShot.data, 'base64'));
    console.log('Captured evidence_darwin_existing_user_certificates_page.png');

    ws.close();
  } finally {
    chromeProc.kill('SIGKILL');
    await mongoose.disconnect();
    console.log('Test completed.');
  }
}

runTest().catch(console.error);
