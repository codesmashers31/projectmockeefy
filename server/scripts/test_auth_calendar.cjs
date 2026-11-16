const WebSocket = require('../node_modules/ws');
const http = require('http');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { spawn } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

async function testAuthInBrowser(targetTimeIso) {
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

  const cdpPort = 9463;
  const userDataDir = path.join(__dirname, '../tmp/chrome-avail-auth');

  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const d = await new Promise(r => http.get(`http://127.0.0.1:${cdpPort}/json/list`, res => {
    let buf = ''; res.on('data', c => buf += c); res.on('end', () => r(JSON.parse(buf)));
  }));

  const tab = d[0];
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
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

  // Script evaluated before navigation to ensure token & clock are applied
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      window.localStorage.setItem("token", "${candidateToken}");
      window.localStorage.setItem("user", '${JSON.stringify(authUserObj)}');
      window.localStorage.setItem("mockeefy_user_cache", '${JSON.stringify(authUserObj)}');

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
  console.log(`Navigating to book-session with clock = ${targetTimeIso}...`);
  await send('Page.navigate', { url: `http://localhost:5173/book-session?expertId=${expertId}` });

  await new Promise(r => setTimeout(r, 6000));

  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const text = document.body.innerText;
      const pills = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(t => t.includes('Nov') || t.includes('Today') || t.includes('Fri'));
      const slots = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(t => t.includes('PM') || t.includes('AM'));
      const activeDateHeading = document.querySelector('h2, h3, h4')?.innerText || '';
      return {
        title: document.title,
        url: window.location.href,
        hasNoSlotsBanner: text.includes('No interview slots available today'),
        hasFri827: text.includes('8:27 PM'),
        datePills: Array.from(new Set(pills)),
        slots: Array.from(new Set(slots))
      };
    })()`,
    returnByValue: true
  });

  console.log('Result:', JSON.stringify(res.result?.value, null, 2));

  // Save evidence screenshot
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  const shotPath = path.join('C:/Users/ASUS/.gemini/antigravity/brain/fa4cc859-e99d-440e-a4b9-ef64c859d17c', 'evidence_candidate_calendar_verified_830pm.png');
  fs.writeFileSync(shotPath, Buffer.from(screenshot.data, 'base64'));
  console.log(`Saved screenshot to ${shotPath}`);

  ws.close();
  chromeProc.kill();
  await mongoose.disconnect();
}

// Test with candidate browsing at 8:30 PM IST (before cutoff 8:47 PM)
testAuthInBrowser('2026-11-13T15:00:00.000Z').catch(console.error);
