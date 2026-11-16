const WebSocket = require('../node_modules/ws');
const http = require('http');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { spawn } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

async function runTest() {
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

  const cdpPort = 9495;
  const p = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--remote-debugging-port=' + cdpPort,
    '--user-data-dir=' + path.join(__dirname, '../tmp/chrome-95'),
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
    `
  });

  const expertId = '6ae2e7cf2ad1edd333f2aded';
  await call('Page.navigate', { url: 'http://localhost:5173/book-session?expertId=' + expertId });
  await new Promise(r => setTimeout(r, 5000));

  // Click on "FRI 20 NOV"
  const clickRes = await call('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const fri20Btn = btns.find(b => b.innerText.includes("20") && b.innerText.includes("FRI"));
      if (fri20Btn) {
        fri20Btn.click();
        return true;
      }
      return false;
    })()`,
    returnByValue: true
  });
  console.log('Clicked FRI 20 NOV button:', clickRes.result?.value);

  await new Promise(r => setTimeout(r, 1000));

  const slotRes = await call('Runtime.evaluate', {
    expression: `(() => {
      const slots = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(t => t.includes('PM') || t.includes('AM'));
      const fullText = document.body.innerText;
      const headingIdx = fullText.indexOf("Available Slots for");
      return {
        slots,
        headingSnippet: headingIdx !== -1 ? fullText.substring(headingIdx, headingIdx + 60) : "Heading not found"
      };
    })()`,
    returnByValue: true
  });
  console.log('Slots on Friday Nov 20:', JSON.stringify(slotRes.result?.value, null, 2));

  p.kill();
  await mongoose.disconnect();
  process.exit(0);
}
runTest().catch(console.error);
