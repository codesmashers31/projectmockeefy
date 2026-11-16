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

async function main() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const User = mongoose.models.User || (await import('../models/User.js')).default;
  const joel = await User.findOne({ email: 'joel.26csa@licet.ac.in' });

  const token = jwt.sign(
    {
      email: joel.email,
      userType: 'expert',
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
    userType: 'expert',
    role: 'expert',
    name: joel.name,
    isPremium: false
  };

  const port = 9295;
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

    // Navigate to origin
    await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:5173/' });
    await new Promise(r => setTimeout(r, 1500));

    // Inject Auth state
    const injectAuthExpr = `
      localStorage.setItem('token', ${JSON.stringify(token)});
      localStorage.setItem('user', ${JSON.stringify(JSON.stringify(userData))});
      localStorage.setItem('role', 'expert');
    `;
    await sendCdp(ws, 'Runtime.evaluate', { expression: injectAuthExpr });

    // Navigate to /dashboard/profile
    console.log('Navigating to http://localhost:5173/dashboard/profile ...');
    await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:5173/dashboard/profile' });
    await new Promise(r => setTimeout(r, 3500));

    // Capture Full Overview Profile Page
    const snap1 = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    const p1 = path.join(ARTIFACT_DIR, 'evidence_expert_profile_100_overview.png');
    fs.writeFileSync(p1, Buffer.from(snap1.data, 'base64'));
    console.log('Captured evidence_expert_profile_100_overview.png');

    // Navigate to Verification tab
    console.log('Navigating to verification tab ...');
    await sendCdp(ws, 'Runtime.evaluate', {
      expression: `
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Verification'));
        if (btn) btn.click();
      `
    });
    await new Promise(r => setTimeout(r, 2500));

    const snap2 = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    const p2 = path.join(ARTIFACT_DIR, 'evidence_expert_verification_tab_green.png');
    fs.writeFileSync(p2, Buffer.from(snap2.data, 'base64'));
    console.log('Captured evidence_expert_verification_tab_green.png');

    ws.close();
  } finally {
    chromeProc.kill();
    await mongoose.disconnect();
  }
}

main().catch(console.error);
