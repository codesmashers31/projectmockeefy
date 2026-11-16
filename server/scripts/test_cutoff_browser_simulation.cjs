const WebSocket = require('../node_modules/ws');
const http = require('http');
const path = require('path');
const fs = require('fs');
const jwt = require('../node_modules/jsonwebtoken');
const mongoose = require('../node_modules/mongoose');
const { spawn } = require('child_process');
require('../node_modules/dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'code@1234';
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

async function runBrowserClockTest() {
  console.log('=== STARTING BROWSER CLOCK SIMULATION TESTS ===\n');

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

  const cdpPort = 9522;
  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    `--remote-debugging-port=${cdpPort}`,
    '--user-data-dir=' + path.join(__dirname, '../tmp/chrome-test-clock-sim'),
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

  // Test 1: Simulating 10:39 PM IST (2026-11-13T17:09:00.000Z)
  console.log('--- TEST 1: SIMULATING 10:39 PM IST IN BROWSER ---');
  await sendCdp(ws, 'Page.addScriptToEvaluateOnNewDocument', {
    source: `
      localStorage.setItem("token", "${candidateToken}");
      localStorage.setItem("user", JSON.stringify(${JSON.stringify(candidateAuthObj)}));
      localStorage.setItem("mockeefy_user_cache", JSON.stringify(${JSON.stringify(candidateAuthObj)}));
      
      const fixedTime = new Date("2026-11-13T17:09:00.000Z").getTime();
      const OrigDate = Date;
      class MockDate extends OrigDate {
        constructor(...args) {
          if (args.length === 0) super(fixedTime);
          else super(...args);
        }
        static now() { return fixedTime; }
      }
      window.Date = MockDate;
    `
  });

  await sendCdp(ws, 'Page.navigate', { url: `${CLIENT_BASE}/book-session?expertId=${expertId}` });
  await new Promise(r => setTimeout(r, 5000));

  // Click TODAY 13 NOV
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const todayBtn = btns.find(b => b.innerText && b.innerText.includes("13") && (b.innerText.includes("TODAY") || b.innerText.includes("FRI")));
      if (todayBtn) todayBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  const slotsAt1039 = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      return btns.filter(b => b.innerText && (b.innerText.includes("AM") || b.innerText.includes("PM")) && b.innerText.includes("-")).map(b => b.innerText.replace(/\\n/g, ' '));
    })()`,
    returnByValue: true
  });
  console.log('Slots rendered at 10:39 PM IST:', slotsAt1039.result?.value);
  const shot1039 = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_cutoff_rule_at_1039pm.png'), Buffer.from(shot1039.data, 'base64'));
  console.log('Saved evidence_cutoff_rule_at_1039pm.png');

  chromeProc.kill();

  // Test 2: Simulating 10:50 PM IST in a fresh browser session
  console.log('\n--- TEST 2: SIMULATING 10:50 PM IST IN BROWSER ---');
  const cdpPort2 = 9523;
  const chromeProc2 = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    `--remote-debugging-port=${cdpPort2}`,
    '--user-data-dir=' + path.join(__dirname, '../tmp/chrome-test-clock-sim-2'),
    '--headless=new',
    'about:blank'
  ]);

  let tabs2 = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      tabs2 = await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${cdpPort2}/json/list`, res => {
          let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
        });
        req.on('error', reject);
      });
      if (tabs2 && tabs2.length > 0) break;
    } catch (_) {}
  }

  const ws2 = new WebSocket(tabs2[0].webSocketDebuggerUrl);
  await new Promise(r => ws2.on('open', r));

  await sendCdp(ws2, 'Page.enable');
  await sendCdp(ws2, 'Runtime.enable');

  await sendCdp(ws2, 'Page.addScriptToEvaluateOnNewDocument', {
    source: `
      localStorage.setItem("token", "${candidateToken}");
      localStorage.setItem("user", JSON.stringify(${JSON.stringify(candidateAuthObj)}));
      localStorage.setItem("mockeefy_user_cache", JSON.stringify(${JSON.stringify(candidateAuthObj)}));
      
      const fixedTime = new Date("2026-11-13T17:20:00.000Z").getTime();
      const OrigDate = Date;
      class MockDate extends OrigDate {
        constructor(...args) {
          if (args.length === 0) super(fixedTime);
          else super(...args);
        }
        static now() { return fixedTime; }
      }
      window.Date = MockDate;
    `
  });

  await sendCdp(ws2, 'Page.navigate', { url: `${CLIENT_BASE}/book-session?expertId=${expertId}` });
  await new Promise(r => setTimeout(r, 5000));

  await sendCdp(ws2, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const todayBtn = btns.find(b => b.innerText && b.innerText.includes("13") && (b.innerText.includes("TODAY") || b.innerText.includes("FRI")));
      if (todayBtn) todayBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  const slotsAt1050 = await sendCdp(ws2, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      return btns.filter(b => b.innerText && (b.innerText.includes("AM") || b.innerText.includes("PM")) && b.innerText.includes("-")).map(b => b.innerText.replace(/\\n/g, ' '));
    })()`,
    returnByValue: true
  });
  console.log('Slots rendered at 10:50 PM IST:', slotsAt1050.result?.value);
  const shot1050 = await sendCdp(ws2, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_cutoff_rule_at_1050pm.png'), Buffer.from(shot1050.data, 'base64'));
  console.log('Saved evidence_cutoff_rule_at_1050pm.png');

  chromeProc2.kill();
  await mongoose.disconnect();
  console.log('\n=== BROWSER CLOCK SIMULATION TESTS COMPLETE ===');
  process.exit(0);
}

runBrowserClockTest().catch(e => {
  console.error(e);
  process.exit(1);
});
