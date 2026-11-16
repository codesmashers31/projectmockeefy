const WebSocket = require('../node_modules/ws');
const http = require('http');
const path = require('path');
const jwt = require('../node_modules/jsonwebtoken');
const mongoose = require('../node_modules/mongoose');
const { spawn } = require('child_process');
require('../node_modules/dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'code@1234';

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

async function inspectCandidateState() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const User = (await import('../models/User.js')).default;
  const candidateUser = await User.findById('6af326acf549d9aa26049ba4').lean();
  const expertId = '6ae2e7cf2ad1edd333f2aded';

  const candidateToken = jwt.sign(
    { userId: candidateUser._id.toString(), id: candidateUser._id.toString(), userType: 'candidate', email: candidateUser.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const candidateAuthObj = {
    _id: candidateUser._id.toString(),
    id: candidateUser._id.toString(),
    userId: candidateUser._id.toString(),
    email: candidateUser.email,
    name: candidateUser.name,
    userType: 'candidate'
  };

  const cdpPort = 9507;
  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    `--remote-debugging-port=${cdpPort}`,
    '--user-data-dir=' + path.join(__dirname, '../tmp/chrome-inspect-candidate'),
    '--headless=new',
    'about:blank'
  ]);

  let tabs = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      tabs = await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${cdpPort}/json/list`, res => {
          let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
        });
        req.on('error', reject);
      });
      if (tabs && tabs.length > 0) break;
    } catch (_) {}
  }

  const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  await sendCdp(ws, 'Page.enable');
  await sendCdp(ws, 'Runtime.enable');

  await sendCdp(ws, 'Page.addScriptToEvaluateOnNewDocument', {
    source: `
      localStorage.setItem("token", "${candidateToken}");
      localStorage.setItem("user", JSON.stringify(${JSON.stringify(candidateAuthObj)}));
      localStorage.setItem("mockeefy_user_cache", JSON.stringify(${JSON.stringify(candidateAuthObj)}));
    `
  });

  await sendCdp(ws, 'Page.navigate', { url: `http://localhost:5173/book-session?expertId=${expertId}` });
  await new Promise(r => setTimeout(r, 5000));

  // Inspect what the page actually fetched for /api/sessions/candidate/6af326acf549d9aa26049ba4
  const inspectResult = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(async () => {
      const token = localStorage.getItem("token");
      const candRes = await fetch('/api/sessions/candidate/6af326acf549d9aa26049ba4', {
        headers: { Authorization: 'Bearer ' + token }
      }).then(r => r.json());

      const expRes = await fetch('/api/sessions/expert/6ae2e7cf2ad1edd333f2aded').then(r => r.json());

      return {
        candResStatus: candRes,
        expResCount: expRes.length,
        expRes: expRes
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('--- FETCH RESULTS WITH AUTH IN BROWSER ---');
  console.log('Candidate sessions count:', inspectResult.result?.value?.candResStatus?.length);
  console.log('Candidate sessions:', JSON.stringify(inspectResult.result?.value?.candResStatus, null, 2));

  chromeProc.kill();
  await mongoose.disconnect();
  process.exit(0);
}

inspectCandidateState();
