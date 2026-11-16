const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { WebSocket } = require('ws');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

async function reproduce() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const Session = (await import('../models/Session.js')).default;
  const User = (await import('../models/User.js')).default;
  const Expert = (await import('../models/expertModel.js')).default;
  const Category = (await import('../models/Category.js')).default;

  const expertUser = await User.findOne({ userType: 'expert' });
  const expertProfile = await Expert.findOne({ userId: expertUser._id });
  const candidateUser = await User.findOne({ userType: 'candidate' });
  const cat = await Category.findOne({});

  const expToken = jwt.sign(
    { userId: expertUser._id, userType: 'expert', email: expertUser.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const testSession = await Session.create({
    sessionId: 'REPRO-' + Date.now(),
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    categoryId: cat._id,
    startTime: new Date(Date.now() - 20 * 60 * 1000),
    endTime: new Date(Date.now() + 40 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'attended',
    candidateJoinedAt: new Date(Date.now() - 19 * 60 * 1000)
  });

  const port = 9337;
  const userDataDir = path.join(__dirname, '../tmp/chrome_repro_' + Date.now());
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--window-size=1280,900'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  function getWs() {
    return new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/json`, res => {
        let b = '';
        res.on('data', d => b += d);
        res.on('end', () => resolve(JSON.parse(b)[0].webSocketDebuggerUrl));
      }).on('error', reject);
    });
  }

  const wsUrl = await getWs();
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.once('open', r));

  const errors = [];
  ws.on('message', data => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.method === 'Runtime.exceptionThrown') {
        errors.push(msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text);
      }
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map(a => a.value || a.description).join(' ');
        if (text.includes('Error') || text.includes('hasCandidateJoined')) {
          errors.push(text);
        }
      }
    } catch (_) {}
  });

  function sendCdp(method, params = {}) {
    return new Promise((resolve) => {
      const id = Math.floor(Math.random() * 100000);
      const onMsg = (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.id === id) {
          ws.removeListener('message', onMsg);
          resolve(msg.result);
        }
      };
      ws.on('message', onMsg);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await sendCdp('Runtime.enable');
  await sendCdp('Page.enable');

  // Signin page to set localStorage
  await sendCdp('Page.navigate', { url: 'http://localhost:5173/signin' });
  await new Promise(r => setTimeout(r, 1500));

  await sendCdp('Runtime.evaluate', {
    expression: `
      localStorage.setItem('token', '${expToken}');
      localStorage.setItem('user', JSON.stringify({
        id: '${expertUser._id}',
        _id: '${expertUser._id}',
        userId: '${expertUser._id}',
        name: '${expertUser.name}',
        email: '${expertUser.email}',
        userType: 'expert',
        role: 'expert'
      }));
    `
  });

  // Navigate to live meeting
  await sendCdp('Page.navigate', { url: `http://localhost:5173/live-meeting/${testSession.sessionId}?role=expert` });
  await new Promise(r => setTimeout(r, 3000));

  // Select radio and click End Session with Selected Outcome button
  console.log('Clicking End Session with Selected Outcome button...');
  await sendCdp('Runtime.evaluate', {
    expression: `
      const r = document.querySelector('input[value="ATTENDED_COMPLETED"]');
      if (r) r.click();
      const btns = Array.from(document.querySelectorAll('button'));
      const endBtn = btns.find(b => b.textContent.includes('End Session with Selected Outcome'));
      if (endBtn) endBtn.click();
    `
  });
  await new Promise(r => setTimeout(r, 2000));

  const pageText = await sendCdp('Runtime.evaluate', {
    expression: 'document.body.innerText',
    returnByValue: true
  });

  const bodyText = pageText.result?.value || '';
  console.log('\n--- BROWSER REPRODUCTION RESULTS ---');
  console.log('Page has "Something went wrong"?', bodyText.includes('Something went wrong'));
  console.log('Page has "hasCandidateJoined is not defined"?', bodyText.includes('hasCandidateJoined') || errors.some(e => String(e).includes('hasCandidateJoined')));
  console.log('Captured Console/Runtime Errors:', errors);

  ws.close();
  chromeProc.kill();
  try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (_) {}
  await Session.deleteOne({ _id: testSession._id });
  await mongoose.disconnect();
}

reproduce().catch(err => {
  console.error('Repro script error:', err);
  process.exit(1);
});
