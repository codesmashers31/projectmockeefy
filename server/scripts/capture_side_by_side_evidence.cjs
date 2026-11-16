const http = require('http');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { spawn } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

async function captureSideBySideEvidence() {
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

  const expertId = '6ae2e7cf2ad1edd333f2aded';

  // Helper to run headless chrome and capture screenshot for a given simulated clock
  async function runClockTest(port, clockIso, screenshotName) {
    const userDataDir = path.join(__dirname, `../tmp/chrome-test-${port}`);
    const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--window-size=1280,900',
      'about:blank'
    ]);

    await new Promise(r => setTimeout(r, 2000));

    const tabs = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/json/list`, res => {
        let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });

    const targetTab = tabs[0];
    const WebSocket = (await import('../node_modules/ws/index.js')).default;
    const ws = new WebSocket(targetTab.webSocketDebuggerUrl);
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

    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        window.localStorage.setItem("token", "${candidateToken}");
        window.localStorage.setItem("user", '${JSON.stringify(authUserObj)}');
        window.localStorage.setItem("mockeefy_user_cache", '${JSON.stringify(authUserObj)}');

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

    await send('Page.navigate', { url: `http://localhost:5173/book-session?expertId=${expertId}` });
    await new Promise(r => setTimeout(r, 5000));

    const evalRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const text = document.body.innerText;
        const banner = document.querySelector('.bg-amber-50, .bg-amber-50\\\\/90')?.innerText || '';
        const pills = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(t => t.includes('Nov') || t.includes('Today') || t.includes('Fri'));
        const slots = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(t => t.includes('PM') || t.includes('AM'));
        return {
          title: document.title,
          url: window.location.href,
          hasNoSlotsText: text.includes('No interview slots available today'),
          hasFri827: text.includes('8:27 PM'),
          pills: Array.from(new Set(pills)),
          slots: Array.from(new Set(slots))
        };
      })()`,
      returnByValue: true
    });

    console.log(`[Clock: ${clockIso}] DOM Result:`, evalRes.result?.value);

    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    const shotPath = path.join('C:/Users/ASUS/.gemini/antigravity/brain/fa4cc859-e99d-440e-a4b9-ef64c859d17c', screenshotName);
    fs.writeFileSync(shotPath, Buffer.from(screenshot.data, 'base64'));
    console.log(`Screenshot saved to ${shotPath}`);

    ws.close();
    chromeProc.kill();
    return evalRes.result?.value;
  }

  // 1. Clock at 8:30 PM IST (before cutoff 8:47 PM) -> Friday Nov 13 with 8:27 PM - 8:57 PM MUST appear!
  console.log('\n--- CAPTURING STATE BEFORE CUTOFF (8:30 PM IST) ---');
  const resBefore = await runClockTest(9471, '2026-11-13T15:00:00.000Z', 'evidence_candidate_calendar_active_slot_830pm.png');

  // 2. Clock at 8:50 PM IST (after cutoff 8:47 PM) -> Cutoff expired; Friday Nov 13 hidden, banner skips to Tuesday Nov 17
  console.log('\n--- CAPTURING STATE AFTER CUTOFF (8:50 PM IST) ---');
  const resAfter = await runClockTest(9472, '2026-11-13T15:20:00.000Z', 'evidence_candidate_calendar_cutoff_expired_850pm.png');

  await mongoose.disconnect();
  return { resBefore, resAfter };
}

captureSideBySideEvidence().catch(console.error);
