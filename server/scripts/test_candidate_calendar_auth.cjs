const http = require('http');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { spawn } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

async function testWithCandidateAuth(targetTimeIso) {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const User = (await import('../models/User.js')).default;
  const candidateUser = await User.findOne({ userType: 'candidate' });

  const candidateToken = jwt.sign(
    { userId: candidateUser._id, userType: 'candidate', email: candidateUser.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const authUserObj = {
    _id: candidateUser._id.toString(),
    id: candidateUser._id.toString(),
    userId: candidateUser._id.toString(),
    email: candidateUser.email,
    name: candidateUser.name,
    userType: 'candidate'
  };

  const cdpPort = 9458;
  const userDataDir = path.join(__dirname, '../tmp/chrome-avail-cdp7');

  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--window-size=1280,900',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  function cdpGet(urlPath) {
    return new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${cdpPort}${urlPath}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });
  }

  const tabs = await cdpGet('/json/list');
  const targetTab = tabs.find(t => t.type === 'page') || tabs[0];
  const wsUrl = targetTab.webSocketDebuggerUrl;

  const WebSocket = (await import('../node_modules/ws/index.js')).default;
  const ws = new WebSocket(wsUrl);

  await new Promise(r => ws.on('open', r));

  let reqId = 1;
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = reqId++;
      const handler = (msg) => {
        const data = JSON.parse(msg.toString());
        if (data.id === id) {
          ws.off('message', handler);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');

  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      localStorage.setItem("token", "${candidateToken}");
      localStorage.setItem("user", '${JSON.stringify(authUserObj)}');
      localStorage.setItem("mockeefy_user_cache", '${JSON.stringify(authUserObj)}');

      const targetTime = new Date("${targetTimeIso}").getTime();
      const realNow = Date.now();
      const offset = targetTime - realNow;
      const RealDate = Date;
      function MockDate(...args) {
        if (args.length === 0) {
          return new RealDate(RealDate.now() + offset);
        }
        return new RealDate(...args);
      }
      MockDate.now = () => RealDate.now() + offset;
      MockDate.prototype = RealDate.prototype;
      MockDate.UTC = RealDate.UTC;
      MockDate.parse = RealDate.parse;
      window.Date = MockDate;
    `
  });

  const expertId = '6ae2e7cf2ad1edd333f2aded';
  console.log(`Navigating to http://localhost:5173/book-session?expertId=${expertId} as Candidate...`);
  await send('Page.navigate', { url: `http://localhost:5173/book-session?expertId=${expertId}` });

  await new Promise(r => setTimeout(r, 6000));

  const domCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const allText = document.body.innerText;
      const hasTodayPill = allText.includes('Today') || allText.includes('Nov 13');
      const has827Slot = allText.includes('8:27 PM');
      const hasAmberBanner = Boolean(document.querySelector('.bg-amber-50, .bg-amber-50\\/90'));
      const bannerText = document.querySelector('.bg-amber-50, .bg-amber-50\\/90')?.innerText || '';
      const slots = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(t => t.includes('PM') || t.includes('AM'));
      const pills = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(t => t.includes('Today') || t.includes('Nov') || t.includes('Fri'));
      return {
        hasTodayPill,
        has827Slot,
        hasAmberBanner,
        bannerText,
        pills: Array.from(new Set(pills)),
        slots: Array.from(new Set(slots))
      };
    })()`,
    returnByValue: true
  });

  console.log('Evaluated DOM Result:', JSON.stringify(domCheck?.result?.value, null, 2));

  // Save screenshot
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  const shotPath = path.join('C:/Users/ASUS/.gemini/antigravity/brain/fa4cc859-e99d-440e-a4b9-ef64c859d17c', 'evidence_candidate_calendar_verified_830pm.png');
  fs.writeFileSync(shotPath, Buffer.from(screenshot.data, 'base64'));
  console.log(`Saved screenshot to ${shotPath}`);

  ws.close();
  chromeProc.kill();
  await mongoose.disconnect();
}

testWithCandidateAuth('2026-11-13T15:00:00.000Z').catch(console.error);
