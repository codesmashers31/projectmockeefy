const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const mongoose = require(path.resolve(__dirname, '../server/node_modules/mongoose'));
const jwt = require(path.resolve(__dirname, '../server/node_modules/jsonwebtoken'));
const { WebSocket } = require(path.resolve(__dirname, '../server/node_modules/ws'));
require(path.resolve(__dirname, '../server/node_modules/dotenv')).config({ path: path.resolve(__dirname, '../server/.env') });

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9228;
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

async function runPerfA11y() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const candidate = await db.collection('users').findOne({ email: 'testuser15112026@gmail.com' });
  const candToken = candidate ? jwt.sign({ userId: candidate._id, role: 'candidate', email: candidate.email }, process.env.JWT_SECRET || 'your_jwt_secret_key_here') : null;
  const candUser = { _id: candidate?._id, id: candidate?._id, userType: 'candidate', email: candidate?.email };

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,800',
    'about:blank'
  ]);

  await sleep(1500);
  const wsUrl = await getWsUrl();
  const cdp = new CdpClient(wsUrl);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Performance.enable');

  const targets = [
    { path: '/', name: 'Home Landing Page', role: 'public' },
    { path: '/find-mentor', name: 'Browse Mentors', role: 'public' },
    { path: '/pricing', name: 'Subscription Plans', role: 'public' },
    { path: '/my-sessions', name: 'Candidate Sessions Dashboard', role: 'candidate' }
  ];

  const perfResults = [];
  const a11yResults = [];

  for (const t of targets) {
    if (t.role === 'candidate') {
      await cdp.send('Page.navigate', { url: BASE_URL + '/terms' });
      await sleep(500);
      await cdp.send('Runtime.evaluate', {
        expression: `
          localStorage.setItem('token', '${candToken}');
          localStorage.setItem('user', JSON.stringify(${JSON.stringify(candUser)}));
        `
      });
    }

    const startNav = Date.now();
    await cdp.send('Page.navigate', { url: BASE_URL + t.path });
    await sleep(1500);

    const navTiming = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const timing = performance.getEntriesByType('navigation')[0] || performance.timing;
          const ttfb = timing.responseStart ? (timing.responseStart - (timing.requestStart || timing.navigationStart || 0)) : 0;
          const domLoaded = timing.domContentLoadedEventEnd ? (timing.domContentLoadedEventEnd - (timing.responseStart || 0)) : 0;
          const totalLoad = timing.loadEventEnd ? (timing.loadEventEnd - (timing.navigationStart || 0)) : (Date.now() - ${startNav});
          
          // Paint timing
          const paints = performance.getEntriesByType('paint');
          const fcpEntry = paints.find(p => p.name === 'first-contentful-paint');
          const fcp = fcpEntry ? fcpEntry.startTime : null;
          
          return {
            ttfb: Math.round(ttfb),
            domContentLoaded: Math.round(domLoaded),
            totalLoad: Math.round(totalLoad),
            fcp: fcp ? Math.round(fcp) : 'N/A'
          };
        })()
      `,
      returnByValue: true
    });

    const cdpMetrics = await cdp.send('Performance.getMetrics');
    const metricsMap = {};
    (cdpMetrics.metrics || []).forEach(m => { metricsMap[m.name] = m.value; });

    const timingVal = navTiming.result?.value || {};
    perfResults.push({
      page: t.name,
      path: t.path,
      ttfbMs: timingVal.ttfb,
      fcpMs: timingVal.fcp,
      domContentLoadedMs: timingVal.domContentLoaded,
      totalLoadMs: timingVal.totalLoad,
      jsHeapUsedMb: metricsMap.JSHeapUsedSize ? Math.round(metricsMap.JSHeapUsedSize / (1024 * 1024) * 100) / 100 : 'N/A',
      layoutCount: metricsMap.LayoutCount || 0,
      recalcStyleCount: metricsMap.RecalcStyleCount || 0
    });

    // Accessibility Evaluation
    const a11yEval = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const imgs = Array.from(document.querySelectorAll('img'));
          const imgsMissingAlt = imgs.filter(i => !i.hasAttribute('alt') || i.getAttribute('alt').trim() === '').length;
          
          const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
          const inputsMissingLabels = inputs.filter(i => {
            const id = i.id;
            const hasLabel = id && document.querySelector('label[for="' + id + '"]');
            const hasAria = i.getAttribute('aria-label') || i.getAttribute('aria-labelledby');
            const hasPlaceholder = i.getAttribute('placeholder');
            return !hasLabel && !hasAria && !hasPlaceholder;
          }).length;
          
          const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
            tag: h.tagName.toLowerCase(),
            text: h.innerText.slice(0, 30)
          }));
          
          const buttons = Array.from(document.querySelectorAll('button'));
          const buttonsMissingText = buttons.filter(b => !b.innerText.trim() && !b.getAttribute('aria-label')).length;

          return {
            totalImages: imgs.length,
            imagesMissingAlt: imgsMissingAlt,
            totalInputs: inputs.length,
            inputsMissingLabels: inputsMissingLabels,
            headingsCount: headings.length,
            buttonsCount: buttons.length,
            buttonsMissingAccessibleName: buttonsMissingText
          };
        })()
      `,
      returnByValue: true
    });

    a11yResults.push({
      page: t.name,
      path: t.path,
      metrics: a11yEval.result?.value || {}
    });

    console.log(`Measured ${t.name}: TTFB=${timingVal.ttfb}ms, Load=${timingVal.totalLoad}ms, JSHeap=${perfResults[perfResults.length-1].jsHeapUsedMb}MB`);
  }

  cdp.close();
  try { chromeProc.kill(); } catch (_) {}
  await mongoose.disconnect();

  fs.writeFileSync('scratch/live_perf_measurements.json', JSON.stringify(perfResults, null, 2));
  fs.writeFileSync('scratch/live_a11y_measurements.json', JSON.stringify(a11yResults, null, 2));
  console.log('Performance and Accessibility tests recorded successfully!');
}

runPerfA11y().catch(console.error);
