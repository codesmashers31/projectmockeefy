const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function debugBookSession() {
  await mongoose.connect(process.env.MONGO_URI);
  const User = (await import('../models/User.js')).default;
  const Expert = (await import('../models/expertModel.js')).default;
  
  const cand = await User.findOne({ userType: 'candidate' }).lean();
  const exp = await Expert.findOne({ status: 'Active' }).lean();
  console.log('Cand:', cand?._id, cand?.name, 'Exp:', exp?._id, exp?.name);

  const token = jwt.sign(
    { userId: cand._id.toString(), id: cand._id.toString(), email: cand.email, role: 'candidate', userType: 'candidate' },
    process.env.JWT_SECRET || 'code@1234',
    { expiresIn: '2h' }
  );

  const cdpPort = 9231;
  const chromeProc = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=' + cdpPort,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,960'
  ]);
  await new Promise(r => setTimeout(r, 2000));
  
  const jsonRes = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:' + cdpPort + '/json', r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
  
  const ws = new WebSocket(jsonRes[0].webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  
  function sendCdp(method, params = {}) {
    return new Promise((res, rej) => {
      const id = Math.floor(Math.random() * 100000);
      const h = data => {
        const m = JSON.parse(data.toString());
        if (m.id === id) {
          ws.off('message', h);
          if (m.error) rej(m.error);
          else res(m.result);
        }
      };
      ws.on('message', h);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  // 1. Navigate to /
  await sendCdp('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise(r => setTimeout(r, 1500));

  // 2. Set localStorage
  const uData = {
    id: cand._id.toString(),
    _id: cand._id.toString(),
    userId: cand._id.toString(),
    name: cand.name,
    email: cand.email,
    userType: 'candidate',
    role: 'candidate'
  };
  await sendCdp('Runtime.evaluate', {
    expression: `
      localStorage.setItem('token', ${JSON.stringify(token)});
      localStorage.setItem('user', ${JSON.stringify(JSON.stringify(uData))});
      localStorage.setItem('mockeefy_user_cache', ${JSON.stringify(JSON.stringify(uData))});
    `
  });

  // 3. Navigate to book-session
  console.log('Navigating to book-session...');
  await sendCdp('Page.navigate', { url: 'http://localhost:5173/book-session?expertId=' + exp._id.toString() });
  await new Promise(r => setTimeout(r, 4000));

  const urlRes = await sendCdp('Runtime.evaluate', { expression: 'window.location.href', returnByValue: true });
  console.log('Current URL:', urlRes.result?.value);

  const textRes = await sendCdp('Runtime.evaluate', { expression: 'document.body.innerText', returnByValue: true });
  console.log('DOM length:', textRes.result?.value?.length);
  console.log('DOM sample:\n', textRes.result?.value?.slice(0, 1000));
  
  chromeProc.kill();
  process.exit(0);
}
debugBookSession();
