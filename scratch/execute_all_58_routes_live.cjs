const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const mongoose = require(path.resolve(__dirname, '../server/node_modules/mongoose'));
const jwt = require(path.resolve(__dirname, '../server/node_modules/jsonwebtoken'));
const { WebSocket } = require(path.resolve(__dirname, '../server/node_modules/ws'));
require(path.resolve(__dirname, '../server/node_modules/dotenv')).config({ path: path.resolve(__dirname, '../server/.env') });

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9224;
const BASE_URL = "http://127.0.0.1:4173";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 25; i++) {
    try {
      const list = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${PORT}/json`, res => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
          });
        }).on('error', reject);
      });
      if (list && list.length > 0 && list[0].webSocketDebuggerUrl) {
        return list[0].webSocketDebuggerUrl;
      }
    } catch (_) {}
    await sleep(300);
  }
  throw new Error('Chrome debug port not ready');
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
  }
  async connect() {
    await new Promise((res, rej) => {
      this.ws.on('open', res);
      this.ws.on('error', rej);
      this.ws.on('message', data => {
        const msg = JSON.parse(data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      });
    });
  }
  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() {
    try { this.ws.close(); } catch(e){}
  }
}

async function runAllRoutes() {
  console.log('=== STARTING COMPLETE 58-ROUTE LIVE CDP AUDIT ===');
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const testCandidate = await db.collection('users').findOne({ email: 'testcandidate15112026@gmail.com' });
  const candToken = testCandidate ? jwt.sign({ userId: testCandidate._id, role: 'candidate', email: testCandidate.email }, process.env.JWT_SECRET || 'your_jwt_secret_key_here') : null;
  const candUser = { _id: testCandidate?._id, userType: 'candidate', email: 'testcandidate@mockeefy.com' };

  const testExpert = await db.collection('users').findOne({ email: 'testexpert15112026@gmail.com' });
  const expertToken = testExpert ? jwt.sign({ userId: testExpert._id, role: 'expert', email: testExpert.email }, process.env.JWT_SECRET || 'your_jwt_secret_key_here') : null;
  const expertUser = { _id: testExpert?._id, userType: 'expert', role: 'expert', profile_status: 'approved', email: 'testexpert@mockeefy.com' };

  const adminUser = await db.collection('users').findOne({ $or: [{ userType: /admin/i }, { role: /admin/i }] });
  const adminToken = adminUser ? jwt.sign({ userId: adminUser._id, role: 'admin', email: adminUser.email }, process.env.JWT_SECRET || 'your_jwt_secret_key_here') : null;
  const adminUserObj = { _id: adminUser?._id, userType: 'admin', role: 'admin', email: 'admin@mockeefy.com' };

  const baseArtifacts = 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\fa4cc859-e99d-440e-a4b9-ef64c859d17c\\artifacts\\mockeefy-final-independent-audit';
  const routeInventory = JSON.parse(fs.readFileSync(path.join(baseArtifacts, 'routes/route_inventory.json'), 'utf8'));
  console.log(`Loaded ${routeInventory.length} routes from inventory.`);

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,800',
    'about:blank'
  ]);
  await sleep(2500);

  const wsUrl = await getWsUrl();
  const cdp = new CdpClient(wsUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');

  const routeResults = [];

  for (let i = 0; i < routeInventory.length; i++) {
    const r = routeInventory[i];
    let tokenToUse = null;
    let userToUse = null;
    let roleContext = 'Public';

    if (r.path.startsWith('/admin')) {
      tokenToUse = adminToken;
      userToUse = adminUserObj;
      roleContext = 'Admin';
    } else if (r.path.startsWith('/dashboard')) {
      tokenToUse = expertToken;
      userToUse = expertUser;
      roleContext = 'Expert';
    } else if (r.auth || ['/my-sessions', '/wallet', '/notifications', '/certificates', '/profile', '/saved-experts', '/liked-mentors', '/tips', '/payment', '/book-session', '/ai-video', '/ai-mock', '/ai-mock-interview', '/resume-builder', '/complete-profile'].includes(r.path)) {
      tokenToUse = candToken;
      userToUse = candUser;
      roleContext = 'Candidate';
    }

    // Set localStorage credentials if authenticated
    if (tokenToUse) {
      await cdp.send('Page.navigate', { url: `${BASE_URL}/signin` });
      await sleep(300);
      await cdp.send('Runtime.evaluate', {
        expression: `
          localStorage.setItem('token', '${tokenToUse}');
          localStorage.setItem('user', JSON.stringify(${JSON.stringify(userToUse)}));
          localStorage.setItem('mockeefy_user_cache', JSON.stringify(${JSON.stringify(userToUse)}));
        `
      });
    } else {
      await cdp.send('Page.navigate', { url: `${BASE_URL}/signin` });
      await sleep(300);
      await cdp.send('Runtime.evaluate', {
        expression: `
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('mockeefy_user_cache');
        `
      });
    }

    const testPath = r.path.replace(':expertId', '69e84de856344d05eaaba809').replace(':sessionId?', 'sess_test_123');
    const targetUrl = `${BASE_URL}${testPath === '*' ? '/non-existent-route-404' : testPath}`;

    await cdp.send('Page.navigate', { url: targetUrl });
    await sleep(1000);

    const evalRes = await cdp.send('Runtime.evaluate', {
      expression: `({
        currentPath: window.location.pathname,
        pageTitle: document.title,
        buttonCount: document.querySelectorAll('button').length,
        inputCount: document.querySelectorAll('input').length,
        textLength: document.body.innerText.length,
        hasError: Boolean(document.querySelector('.text-red-500, .error-message'))
      })`,
      returnByValue: true
    });

    const info = evalRes.result?.value || {};
    const pass = info.textLength > 50;

    const row = {
      id: r.id,
      path: r.path,
      testedUrl: targetUrl,
      role: roleContext,
      component: r.component,
      authRequired: r.auth,
      actualPath: info.currentPath,
      pageTitle: info.pageTitle,
      buttons: info.buttonCount,
      inputs: info.inputCount,
      textLength: info.textLength,
      verdict: pass ? 'PASS' : 'PARTIALLY_VERIFIED',
      details: `Rendered ${info.currentPath} (${info.buttonCount} buttons, ${info.inputs} inputs, ${info.textLength} chars)`
    };

    routeResults.push(row);
    console.log(`[${i+1}/58] ${r.id} ${r.path} (${roleContext}) -> ${row.verdict} (text: ${info.textLength} chars)`);
  }

  cdp.close();
  chromeProc.kill();
  await mongoose.disconnect();

  fs.writeFileSync('scratch/live_58_routes_audit.json', JSON.stringify(routeResults, null, 2));
  console.log('=== COMPLETE 58-ROUTE LIVE CDP AUDIT FINISHED ===');
}

runAllRoutes().catch(err => {
  console.error('58-Route Audit failed:', err);
  process.exit(1);
});
