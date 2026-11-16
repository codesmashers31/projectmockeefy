const WebSocket = require('../node_modules/ws');
const http = require('http');
const path = require('path');
const fs = require('fs');
const jwt = require('../node_modules/jsonwebtoken');
const mongoose = require('../node_modules/mongoose');
const { spawn } = require('child_process');
require('../node_modules/dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const ARTIFACT_DIR = 'C:/Users/ASUS/.gemini/antigravity/brain/fa4cc859-e99d-440e-a4b9-ef64c859d17c';
const CLIENT_BASE = 'http://localhost:5173';

function sendCdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 10000000);
    const msgHandler = (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.id === id) {
          ws.off('message', msgHandler);
          if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          else resolve(msg.result);
        }
      } catch (err) {}
    };
    ws.on('message', msgHandler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function captureExpertDashboardSessions() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const User = (await import('../models/User.js')).default;
  const expertUser = await User.findOne({ email: 'joel.26csa@licet.ac.in' });

  const expertToken = jwt.sign(
    { userId: expertUser._id.toString(), id: expertUser._id.toString(), userType: 'expert', email: expertUser.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const expertAuthObj = {
    _id: expertUser._id.toString(),
    id: expertUser._id.toString(),
    userId: expertUser._id.toString(),
    email: expertUser.email,
    name: expertUser.name,
    userType: 'expert'
  };

  const cdpPort = 9494;
  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    `--remote-debugging-port=${cdpPort}`,
    '--user-data-dir=' + path.join(__dirname, '../tmp/chrome-expert-test'),
    '--headless=new',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const tabs = await new Promise(r => http.get(`http://127.0.0.1:${cdpPort}/json/list`, res => {
    let d = ''; res.on('data', c => d += c); res.on('end', () => r(JSON.parse(d)));
  }));

  const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  await sendCdp(ws, 'Page.enable');
  await sendCdp(ws, 'Runtime.enable');

  await sendCdp(ws, 'Page.addScriptToEvaluateOnNewDocument', {
    source: `
      localStorage.setItem("token", "${expertToken}");
      localStorage.setItem("user", JSON.stringify(${JSON.stringify(expertAuthObj)}));
      localStorage.setItem("mockeefy_user_cache", JSON.stringify(${JSON.stringify(expertAuthObj)}));
    `
  });

  await sendCdp(ws, 'Page.navigate', { url: `${CLIENT_BASE}/dashboard/sessions` });
  await new Promise(r => setTimeout(r, 5000));

  const pageEval = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const text = document.body.innerText;
      return {
        url: window.location.href,
        hasJoel: text.includes("Joel"),
        hasNov20: text.includes("Nov 20") || text.includes("20 Nov"),
        hasTime: text.includes("08:27") || text.includes("8:27"),
        hasConfirmed: text.includes("Confirmed") || text.includes("confirmed") || text.includes("Scheduled"),
        bodySnippet: text.substring(0, 1000).replace(/\\n/g, ' ')
      };
    })()`,
    returnByValue: true
  });
  console.log('Expert Dashboard Sessions Page Evaluation:', JSON.stringify(pageEval.result?.value, null, 2));

  const shot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  const shotPath = path.join(ARTIFACT_DIR, 'evidence_expert_session_screen.png');
  fs.writeFileSync(shotPath, Buffer.from(shot.data, 'base64'));
  console.log('Updated evidence_expert_session_screen.png');

  chromeProc.kill();
  await mongoose.disconnect();
}

captureExpertDashboardSessions().catch(console.error);
