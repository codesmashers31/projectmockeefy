const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const mongoose = require(path.resolve(__dirname, '../server/node_modules/mongoose'));
const jwt = require(path.resolve(__dirname, '../server/node_modules/jsonwebtoken'));
const { WebSocket } = require(path.resolve(__dirname, '../server/node_modules/ws'));
require(path.resolve(__dirname, '../server/node_modules/dotenv')).config({ path: path.resolve(__dirname, '../server/.env') });

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_EVIDENCE_DIR = path.resolve("C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\fa4cc859-e99d-440e-a4b9-ef64c859d17c\\artifacts\\mockeefy-live-audit");
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const MONGO_URI = process.env.MONGO_URI;
const BASE_URL = 'http://127.0.0.1:4173';

function sendCdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const msg = JSON.stringify({ id, method, params });
    const onMessage = (event) => {
      const data = typeof event.data === 'string' ? event.data : event.data.toString();
      try {
        const parsed = JSON.parse(data);
        if (parsed.id === id) {
          ws.removeEventListener('message', onMessage);
          if (parsed.error) reject(new Error(JSON.stringify(parsed.error)));
          else resolve(parsed.result);
        }
      } catch (_) {}
    };
    ws.addEventListener('message', onMessage);
    ws.send(msg);
  });
}

async function evalInPage(ws, expression) {
  const res = await sendCdp(ws, 'Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  return res.result?.value;
}

async function waitMs(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function captureScreenshot(ws, relativePath) {
  const res = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(res.data, 'base64');
  const fullPath = path.join(BASE_EVIDENCE_DIR, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, buffer);
  console.log(`📸 Saved screenshot: ${relativePath} (${buffer.length} bytes)`);
  return fullPath;
}

async function getWsUrl(port) {
  for (let i = 0; i < 25; i++) {
    try {
      const list = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/json`, res => {
          let body = '';
          res.on('data', d => body += d);
          res.on('end', () => resolve(JSON.parse(body)));
        }).on('error', reject);
      });
      if (list && list.length > 0 && list[0].webSocketDebuggerUrl) {
        return list[0].webSocketDebuggerUrl;
      }
    } catch (_) {}
    await waitMs(300);
  }
  throw new Error('Chrome debug port not ready');
}

async function run() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const expertUser = await db.collection('users').findOne({ userType: 'expert' });
  const expToken = jwt.sign(
    { userId: expertUser._id, role: 'expert', userType: 'expert', email: expertUser.email },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  const debugPort = 9446;
  const userDataDir = path.join(__dirname, '../server/tmp/chrome_expert_' + Date.now());
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1280,900'
  ]);

  try {
    const wsUrl = await getWsUrl(debugPort);
    const ws = new WebSocket(wsUrl);
    await new Promise(r => ws.once('open', r));

    await sendCdp(ws, 'Page.enable');
    await sendCdp(ws, 'Runtime.enable');

    await sendCdp(ws, 'Page.navigate', { url: `${BASE_URL}/signin` });
    await waitMs(1500);

    // Set token, mockeefy_user_cache, and profile_status
    await evalInPage(ws, `
      const expUser = {
        _id: '${expertUser._id}',
        id: '${expertUser._id}',
        name: '${expertUser.name}',
        email: '${expertUser.email}',
        role: 'expert',
        userType: 'expert'
      };
      localStorage.setItem('token', '${expToken}');
      localStorage.setItem('mockeefy_user_cache', JSON.stringify(expUser));
      localStorage.setItem('profile_status', 'approved');
    `);

    const expertPages = [
      { path: '/dashboard', file: 'expert-flows/flow_expert_dashboard_overview.png' },
      { path: '/dashboard/sessions', file: 'expert-flows/flow_expert_sessions.png' },
      { path: '/dashboard/availability', file: 'expert-flows/flow_expert_availability_matrix.png' },
      { path: '/dashboard/withdraw', file: 'expert-flows/flow_expert_withdrawal_panel.png' },
      { path: '/dashboard/skills', file: 'expert-flows/flow_expert_skills.png' }
    ];

    for (const ep of expertPages) {
      await sendCdp(ws, 'Page.navigate', { url: `${BASE_URL}${ep.path}` });
      await waitMs(2000);
      const title = await evalInPage(ws, 'document.title');
      const bodyLen = await evalInPage(ws, 'document.body.innerText.length');
      console.log(`Expert Page ${ep.path} -> Title: "${title}", Length: ${bodyLen}`);
      await captureScreenshot(ws, ep.file);
    }

    ws.close();
  } finally {
    chromeProc.kill();
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (_) {}
    await mongoose.disconnect();
  }
}

run().catch(console.error);
