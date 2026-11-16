const WebSocket = require('../node_modules/ws');
const http = require('http');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { spawn } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

async function run(clockIso) {
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

  const cdpPort = 9485;
  const p = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--remote-debugging-port=' + cdpPort,
    '--user-data-dir=' + path.join(__dirname, '../tmp/chrome-85'),
    '--headless=new',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const tabs = await new Promise(r => http.get('http://127.0.0.1:' + cdpPort + '/json/list', res => {
    let d = ''; res.on('data', c => d += c); res.on('end', () => r(JSON.parse(d)));
  }));
  const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  let id = 1;
  function call(method, params = {}) {
    return new Promise(r => {
      const cur = id++;
      const h = m => {
        const parsed = JSON.parse(m.toString());
        if (parsed.id === cur) {
          ws.off('message', h);
          r(parsed.result);
        }
      };
      ws.on('message', h);
      ws.send(JSON.stringify({ id: cur, method, params }));
    });
  }

  await call('Page.enable');
  await call('Runtime.enable');

  await call('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      localStorage.setItem("token", "${candidateToken}");
      localStorage.setItem("user", JSON.stringify(${JSON.stringify(authUserObj)}));
      localStorage.setItem("mockeefy_user_cache", JSON.stringify(${JSON.stringify(authUserObj)}));

      const targetTime = new Date("${clockIso}").getTime();
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
  await call('Page.navigate', { url: 'http://localhost:5173/book-session?expertId=' + expertId });
  await new Promise(r => setTimeout(r, 5000));

  const res = await call('Runtime.evaluate', {
    expression: `(() => {
      const text = document.body.innerText;
      const pills = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(t => t.includes('Nov') || t.includes('Today') || t.includes('Fri'));
      const slots = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(t => t.includes('PM') || t.includes('AM'));
      return {
        simulatedClock: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
        hasNoSlotsBanner: text.includes('No interview slots available today'),
        pills: Array.from(new Set(pills)),
        slots: Array.from(new Set(slots))
      };
    })()`,
    returnByValue: true
  });
  console.log('Result for clock', clockIso, ':', JSON.stringify(res.result?.value, null, 2));

  p.kill();
  await mongoose.disconnect();
  process.exit(0);
}

// 8:30 PM IST on Nov 13, 2026 = 2026-11-13T15:00:00.000Z
run('2026-11-13T15:00:00.000Z').catch(console.error);
