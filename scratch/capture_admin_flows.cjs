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

  const adminUser = await db.collection('users').findOne({ userType: 'admin' }) || 
    await db.collection('users').findOne({ role: 'admin' }) || 
    { _id: new mongoose.Types.ObjectId(), name: 'Admin User', email: 'admin@mockeefy.com', userType: 'admin', role: 'admin' };

  const adminToken = jwt.sign(
    { userId: adminUser._id, role: 'admin', userType: 'admin', email: adminUser.email },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  const debugPort = 9447;
  const userDataDir = path.join(__dirname, '../server/tmp/chrome_admin_' + Date.now());
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

    // Set token & mockeefy_user_cache with userType: 'admin'
    await evalInPage(ws, `
      const admUser = {
        _id: '${adminUser._id}',
        id: '${adminUser._id}',
        name: '${adminUser.name}',
        email: '${adminUser.email}',
        role: 'admin',
        userType: 'admin'
      };
      localStorage.setItem('token', '${adminToken}');
      localStorage.setItem('mockeefy_user_cache', JSON.stringify(admUser));
      localStorage.setItem('user', JSON.stringify(admUser));
    `);

    const adminPages = [
      { path: '/admin', file: 'admin-flows/flow_admin_overview.png' },
      { path: '/admin/sessions', file: 'admin-flows/flow_admin_sessions.png' },
      { path: '/admin/categories', file: 'admin-flows/flow_admin_categories.png' },
      { path: '/admin/pricing', file: 'admin-flows/flow_admin_pricing_matrix.png' },
      { path: '/admin/payouts', file: 'admin-flows/flow_admin_payout_queue.png' }
    ];

    for (const ap of adminPages) {
      await sendCdp(ws, 'Page.navigate', { url: `${BASE_URL}${ap.path}` });
      await waitMs(2000);
      const title = await evalInPage(ws, 'document.title');
      const bodyLen = await evalInPage(ws, 'document.body.innerText.length');
      console.log(`Admin Page ${ap.path} -> Title: "${title}", Length: ${bodyLen}`);
      await captureScreenshot(ws, ap.file);
    }

    ws.close();
  } finally {
    chromeProc.kill();
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (_) {}
    await mongoose.disconnect();
  }
}

run().catch(console.error);
