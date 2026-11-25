const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const mongoose = require(path.resolve(__dirname, '../server/node_modules/mongoose'));
const jwt = require(path.resolve(__dirname, '../server/node_modules/jsonwebtoken'));
const { WebSocket } = require(path.resolve(__dirname, '../server/node_modules/ws'));
require(path.resolve(__dirname, '../server/node_modules/dotenv')).config({ path: path.resolve(__dirname, '../server/.env') });

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9229;
const BASE_URL = "http://127.0.0.1:4173";

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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
      const pageTarget = list.find(t => t.type === 'page');
      if (pageTarget && pageTarget.webSocketDebuggerUrl) {
        return pageTarget.webSocketDebuggerUrl;
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

async function runAll10Viewports() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const candidate = await db.collection('users').findOne({ email: 'testuser15112026@gmail.com' });
  const candToken = candidate ? jwt.sign({ userId: candidate._id, role: 'candidate', email: candidate.email }, process.env.JWT_SECRET || 'your_jwt_secret_key_here') : null;
  const candUser = { _id: candidate?._id, id: candidate?._id, userType: 'candidate', role: 'candidate', email: candidate?.email };

  const expert = await db.collection('users').findOne({ email: 'testexpert15112026@gmail.com' });
  const expertToken = expert ? jwt.sign({ userId: expert._id, role: 'expert', email: expert.email }, process.env.JWT_SECRET || 'your_jwt_secret_key_here') : null;
  const expertUser = { _id: expert?._id, id: expert?._id, userType: 'expert', role: 'expert', profile_status: 'approved', email: expert?.email };

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    'about:blank'
  ]);

  await sleep(1500);
  const wsUrl = await getWsUrl();
  const cdp = new CdpClient(wsUrl);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  const widths = [320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920];
  const pages = [
    { path: '/', name: 'Home Landing', role: 'public' },
    { path: '/find-mentor', name: 'Find Mentor', role: 'public' },
    { path: '/pricing', name: 'Subscription Pricing', role: 'public' },
    { path: '/terms', name: 'Terms of Service', role: 'public' },
    { path: '/signin', name: 'Sign In Form', role: 'public' },
    { path: '/my-sessions', name: 'Candidate Sessions', role: 'candidate' },
    { path: '/dashboard/availability', name: 'Expert Availability Grid', role: 'expert' }
  ];

  const results = [];

  for (const w of widths) {
    const h = w <= 430 ? 844 : (w <= 1024 ? 1024 : 1080);
    const isMobile = w <= 768;
    console.log(`\nEvaluating Viewport Width: ${w}px (Height: ${h}px, Mobile: ${isMobile})`);

    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: w,
      height: h,
      deviceScaleFactor: 2,
      mobile: isMobile
    });

    for (const p of pages) {
      let token = null;
      let user = null;
      if (p.role === 'candidate') { token = candToken; user = candUser; }
      else if (p.role === 'expert') { token = expertToken; user = expertUser; }

      await cdp.send('Page.navigate', { url: BASE_URL + p.path });
      await sleep(600);

      if (token) {
        await cdp.send('Runtime.evaluate', {
          expression: `
            localStorage.setItem('token', '${token}');
            localStorage.setItem('user', JSON.stringify(${JSON.stringify(user)}));
          `
        });
        await cdp.send('Page.navigate', { url: BASE_URL + p.path });
        await sleep(600);
      }

      const evalResult = await cdp.send('Runtime.evaluate', {
        expression: `
          (() => {
            const doc = document.documentElement;
            const scrollW = doc.scrollWidth;
            const innerW = window.innerWidth;
            const hasHScroll = scrollW > innerW + 1; // 1px threshold for subpixel rounding
            const bodyLen = document.body ? document.body.innerText.length : 0;
            return {
              scrollWidth: scrollW,
              innerWidth: innerW,
              hasHorizontalOverflow: hasHScroll,
              bodyTextLength: bodyLen
            };
          })()
        `,
        returnByValue: true
      });

      const res = evalResult.result?.value || {};
      const status = res.hasHorizontalOverflow ? 'FAIL (OVERFLOW)' : 'PASS';
      console.log(`  [${w}px] ${p.name.padEnd(25)} -> ScrollWidth: ${res.scrollWidth}, InnerWidth: ${res.innerWidth} [${status}]`);

      results.push({
        viewportWidth: w,
        viewportHeight: h,
        pageName: p.name,
        path: p.path,
        role: p.role,
        scrollWidth: res.scrollWidth,
        innerWidth: res.innerWidth,
        hasHorizontalOverflow: res.hasHorizontalOverflow,
        bodyTextLength: res.bodyTextLength,
        status
      });
    }
  }

  cdp.close();
  try { chromeProc.kill(); } catch (_) {}
  await mongoose.disconnect();

  fs.writeFileSync('scratch/all_10_viewports_results.json', JSON.stringify(results, null, 2));
  console.log(`\nCompleted 10 viewports testing across 7 pages (${results.length} total evaluations)!`);
}

runAll10Viewports().catch(console.error);
