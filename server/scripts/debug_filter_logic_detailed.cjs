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

async function debugFilterLogicDetailed() {
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

  const cdpPort = 9509;
  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    `--remote-debugging-port=${cdpPort}`,
    '--user-data-dir=' + path.join(__dirname, '../tmp/chrome-debug-filter-det'),
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

  const pageLog = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(async () => {
      const prof = await fetch('/api/expert/public/profile/6ae2e7cf2ad1edd333f2aded').then(r => r.json());
      const sess = await fetch('/api/sessions/expert/6ae2e7cf2ad1edd333f2aded').then(r => r.json());
      const candSess = await fetch('/api/sessions/candidate/6af326acf549d9aa26049ba4', {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      }).then(r => r.json());

      const allBooked = [...sess, ...candSess];

      const getKolkataDateString = (date) => {
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return '';
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Kolkata', year: 'numeric', month: 'numeric', day: 'numeric'
        }).formatToParts(d);
        const map = {}; for (const p of parts) map[p.type] = p.value;
        return map.year + '-' + map.month.padStart(2, '0') + '-' + map.day.padStart(2, '0');
      };

      const kolkataDateStr = '2026-11-13';
      const maxPerDay = Number(prof.profile.availability?.maxPerDay);

      const dayBookings = allBooked.filter((session) => {
        const status = (session.status || '').toLowerCase();
        if (status === 'cancelled') return false;
        const sStart = new Date(session.startTime);
        if (isNaN(sStart.getTime())) return false;
        return getKolkataDateString(sStart) === kolkataDateStr;
      });

      return {
        maxPerDay,
        dayBookingsCount: dayBookings.length,
        dayBookingsTriggeredMaxPerDay: dayBookings.length >= maxPerDay,
        uniqueSessionIds: Array.from(new Set(dayBookings.map(s => s.sessionId || s._id))),
        dayBookingsSample: dayBookings.map(s => ({ id: s.sessionId || s._id, start: s.startTime, status: s.status }))
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('Result:', JSON.stringify(pageLog.result?.value, null, 2));

  chromeProc.kill();
  await mongoose.disconnect();
  process.exit(0);
}

debugFilterLogicDetailed();
