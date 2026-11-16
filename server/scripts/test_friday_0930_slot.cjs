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

async function testFriday0930() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const User = (await import('../models/User.js')).default;
  const candidateUser = await User.findById('6af326acf549d9aa26049ba4');
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

  const cdpPort = 9491;
  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    `--remote-debugging-port=${cdpPort}`,
    '--user-data-dir=' + path.join(__dirname, '../tmp/chrome-fri-test'),
    '--headless=new',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const tabs = await new Promise(r => http.get(`http://127.0.0.1:${cdpPort}/json/list`, res => {
    let d = ''; res.on('data', c => d += c); res.on('end', () => r(JSON.parse(d)));
  }));

  const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  const consoleLogs = [];
  ws.on('message', data => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.method === 'Runtime.consoleAPICalled') {
        consoleLogs.push({ type: msg.params.type, args: msg.params.args?.map(a => a.value) });
      }
    } catch (_) {}
  });

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
  await new Promise(r => setTimeout(r, 4500));

  // Inspect state before selecting Friday
  const beforeEval = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const text = document.body.innerText;
      const btns = Array.from(document.querySelectorAll("button"));
      return {
        url: window.location.href,
        selectedDateElement: document.querySelector("[class*='bg-gradient-to-r from-blue-600'], [class*='bg-blue-600']")?.innerText?.replace(/\\n/g, ' ') || "None",
        visibleButtons: btns.map(b => b.innerText.replace(/\\n/g, ' ')).filter(t => t.includes('NOV') || t.includes('AM') || t.includes('PM')),
        fullTextSnippet: text.substring(0, 800).replace(/\\n/g, ' ')
      };
    })()`,
    returnByValue: true
  });
  console.log('--- BEFORE SELECTING FRIDAY ---');
  console.log(JSON.stringify(beforeEval.result?.value, null, 2));

  // Capture Screenshot Before Selecting Friday
  const shotBefore = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_before_selecting_friday.png'), Buffer.from(shotBefore.data, 'base64'));
  console.log('Saved evidence_before_selecting_friday.png');

  // Explicitly click FRI 20 NOV
  console.log('\n--- CLICKING FRI 20 NOV ---');
  const clickFriResult = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const fri20Btn = btns.find(b => b.innerText.includes("20") && b.innerText.includes("FRI"));
      if (fri20Btn) {
        fri20Btn.click();
        return { clicked: true, text: fri20Btn.innerText.replace(/\\n/g, ' ') };
      }
      return { clicked: false, allBtns: btns.map(b => b.innerText.replace(/\\n/g, ' ')) };
    })()`,
    returnByValue: true
  });
  console.log('Click Friday Result:', clickFriResult.result?.value);
  await new Promise(r => setTimeout(r, 2000));

  // Inspect state after selecting Friday
  const afterEval = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const text = document.body.innerText;
      const btns = Array.from(document.querySelectorAll("button"));
      const timeSlots = btns.filter(b => b.innerText.includes("AM") || b.innerText.includes("PM")).map(b => b.innerText.replace(/\\n/g, ' '));
      const has0930Slot = btns.some(b => b.innerText.includes("09:30 PM") || b.innerText.includes("9:30 PM") || b.innerText.includes("21:30"));
      const has0827Slot = btns.some(b => b.innerText.includes("08:27 PM") || b.innerText.includes("8:27 PM") || b.innerText.includes("20:27"));
      return {
        selectedDateButton: btns.find(b => b.innerText.includes("20") && b.innerText.includes("FRI"))?.className,
        renderedTimeSlots: timeSlots,
        has0930Slot,
        has0827Slot,
        bodyContains0930: text.includes("09:30 PM") || text.includes("9:30 PM"),
        bodyContains0827: text.includes("08:27 PM") || text.includes("8:27 PM"),
        noSlotsMessage: text.includes("No interview slots available") || text.includes("No slots")
      };
    })()`,
    returnByValue: true
  });
  console.log('\n--- AFTER SELECTING FRIDAY ---');
  console.log(JSON.stringify(afterEval.result?.value, null, 2));

  // Capture Screenshot After Selecting Friday
  const shotAfter = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_after_selecting_friday.png'), Buffer.from(shotAfter.data, 'base64'));
  console.log('Saved evidence_after_selecting_friday.png');

  console.log('\n--- BROWSER CONSOLE LOGS ---');
  console.log(consoleLogs.filter(l => l.type === 'error' || l.args?.some(a => String(a).toLowerCase().includes('error'))));

  chromeProc.kill();
  await mongoose.disconnect();
}

testFriday0930().catch(console.error);
