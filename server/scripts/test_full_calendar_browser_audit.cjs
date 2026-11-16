const WebSocket = require('../node_modules/ws');
const http = require('http');
const path = require('path');
const fs = require('fs');
const jwt = require('../node_modules/jsonwebtoken');
const mongoose = require('../node_modules/mongoose');
const { spawn } = require('child_process');
require('../node_modules/dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const ARTIFACT_DIR = 'C:/Users/ASUS/.gemini/antigravity/brain/fa4cc859-e99d-440e-a4b9-ef64c859d17c';
const CLIENT_BASE = 'http://localhost:5173';

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

async function runFullCalendarBrowserAudit() {
  console.log('=== STARTING MANDATORY FINAL BROWSER AUDIT ===\n');

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

  const cdpPort = 9488;
  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    `--remote-debugging-port=${cdpPort}`,
    '--user-data-dir=' + path.join(__dirname, '../tmp/chrome-full-audit'),
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

  console.log('Navigating to Candidate booking page...');
  await sendCdp(ws, 'Page.navigate', { url: `${CLIENT_BASE}/book-session?expertId=${expertId}` });
  await new Promise(r => setTimeout(r, 5000));

  // 1. Inspect all rendered date buttons
  const dateStripEval = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const dateButtons = btns.map(b => b.innerText.replace(/\\n/g, ' ')).filter(t => t.includes('NOV'));
      return {
        dateButtons,
        hasSat14: dateButtons.some(t => t.includes('14') && t.includes('SAT')),
        hasTue17: dateButtons.some(t => t.includes('17') && t.includes('TUE')),
        hasWed18: dateButtons.some(t => t.includes('18') && t.includes('WED')),
        hasThu19: dateButtons.some(t => t.includes('19') && t.includes('THU')),
        hasFri20: dateButtons.some(t => t.includes('20') && t.includes('FRI')),
        hasSat21: dateButtons.some(t => t.includes('21') && t.includes('SAT'))
      };
    })()`,
    returnByValue: true
  });
  console.log('--- DATE STRIP AUDIT RESULT ---');
  console.log(JSON.stringify(dateStripEval.result?.value, null, 2));

  // Capture Full Date Strip Screenshot
  const shotDateStrip = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_full_calendar_date_strip.png'), Buffer.from(shotDateStrip.data, 'base64'));
  console.log('Saved evidence_full_calendar_date_strip.png');

  // 2. Click Saturday, November 14
  console.log('\n--- CLICKING SATURDAY 14 NOV ---');
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const sat14Btn = btns.find(b => b.innerText.includes("14") && b.innerText.includes("SAT"));
      if (sat14Btn) sat14Btn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  const sat14Slots = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      return btns.filter(b => b.innerText.includes("AM") || b.innerText.includes("PM")).map(b => b.innerText.replace(/\\n/g, ' '));
    })()`,
    returnByValue: true
  });
  console.log('Saturday 14 Nov rendered slots:', sat14Slots.result?.value);
  const shotSat14 = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_sat14_slot_verified.png'), Buffer.from(shotSat14.data, 'base64'));
  console.log('Saved evidence_sat14_slot_verified.png');

  // 3. Click Wednesday, November 18
  console.log('\n--- CLICKING WEDNESDAY 18 NOV ---');
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const wed18Btn = btns.find(b => b.innerText.includes("18") && b.innerText.includes("WED"));
      if (wed18Btn) wed18Btn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  const wed18Slots = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      return btns.filter(b => b.innerText.includes("AM") || b.innerText.includes("PM")).map(b => b.innerText.replace(/\\n/g, ' '));
    })()`,
    returnByValue: true
  });
  console.log('Wednesday 18 Nov rendered slots:', wed18Slots.result?.value);
  const shotWed18 = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_wed18_slot_verified.png'), Buffer.from(shotWed18.data, 'base64'));
  console.log('Saved evidence_wed18_slot_verified.png');

  // 4. Click Friday, November 20
  console.log('\n--- CLICKING FRIDAY 20 NOV ---');
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const fri20Btn = btns.find(b => b.innerText.includes("20") && b.innerText.includes("FRI"));
      if (fri20Btn) fri20Btn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  const fri20Slots = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      return btns.filter(b => b.innerText.includes("AM") || b.innerText.includes("PM")).map(b => b.innerText.replace(/\\n/g, ' '));
    })()`,
    returnByValue: true
  });
  console.log('Friday 20 Nov rendered slots:', fri20Slots.result?.value);
  const shotFri20 = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_fri20_slot_verified.png'), Buffer.from(shotFri20.data, 'base64'));
  console.log('Saved evidence_fri20_slot_verified.png');

  // 5. Click Saturday, November 21
  console.log('\n--- CLICKING SATURDAY 21 NOV ---');
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const sat21Btn = btns.find(b => b.innerText.includes("21") && b.innerText.includes("SAT"));
      if (sat21Btn) sat21Btn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  const sat21Slots = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      return btns.filter(b => b.innerText.includes("AM") || b.innerText.includes("PM")).map(b => b.innerText.replace(/\\n/g, ' '));
    })()`,
    returnByValue: true
  });
  console.log('Saturday 21 Nov rendered slots:', sat21Slots.result?.value);

  chromeProc.kill();
  await mongoose.disconnect();
  console.log('\n=== MANDATORY BROWSER AUDIT FINISHED ===');
  process.exit(0);
}

runFullCalendarBrowserAudit().catch(err => {
  console.error('AUDIT FAILED:', err);
  process.exit(1);
});
