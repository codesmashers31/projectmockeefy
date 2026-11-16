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

async function verifyLiveTodaySlots() {
  console.log('=== STARTING MANDATORY LIVE VERIFICATION FOR TODAY (NOV 13) ===\n');

  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const User = (await import('../models/User.js')).default;
  const Expert = (await import('../models/expertModel.js')).default;

  const expertId = '6ae2e7cf2ad1edd333f2aded';
  const expert = await Expert.findById(expertId).lean();
  console.log('Expert Saved Friday Schedule from MongoDB:', JSON.stringify(expert.availability?.weekly?.fri, null, 2));

  const candidateUser = await User.findById('6af326acf549d9aa26049ba4').lean();
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

  const cdpPort = 9520;
  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    `--remote-debugging-port=${cdpPort}`,
    '--user-data-dir=' + path.join(__dirname, '../tmp/chrome-live-today-verify'),
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

  // 1. Inspect Date Strip
  const dateStripInfo = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const dateButtons = btns.filter(b => b.innerText && b.innerText.includes("NOV")).map(b => b.innerText.replace(/\\n/g, ' '));
      return {
        dateButtons,
        hasToday13: dateButtons.some(t => t.includes('13')),
        bannerText: Array.from(document.querySelectorAll("*")).find(el => el.innerText && el.innerText.includes("No interview slots available today"))?.innerText || null
      };
    })()`,
    returnByValue: true
  });

  console.log('--- DATE STRIP AUDIT RESULT ---');
  console.log(JSON.stringify(dateStripInfo.result?.value, null, 2));

  // Screenshot showing Friday Nov 13 in date selector
  const shotDateStrip = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_live_today_nov13_date_strip.png'), Buffer.from(shotDateStrip.data, 'base64'));
  console.log('Saved evidence_live_today_nov13_date_strip.png');

  // 2. Click Friday Nov 13
  console.log('\n--- CLICKING TODAY (NOV 13) ---');
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const todayBtn = btns.find(b => b.innerText && b.innerText.includes("13") && (b.innerText.includes("TODAY") || b.innerText.includes("FRI")));
      if (todayBtn) todayBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  // 3. Inspect Rendered Slots for Nov 13
  const renderedSlotsInfo = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const timeSlots = btns.filter(b => b.innerText && (b.innerText.includes("AM") || b.innerText.includes("PM")) && b.innerText.includes("-")).map(b => b.innerText.replace(/\\n/g, ' '));
      return {
        timeSlots,
        has1030PM: timeSlots.some(t => t.includes('10:30 PM') && t.includes('11:00 PM')),
        has1100PM: timeSlots.some(t => t.includes('11:00 PM') && t.includes('11:30 PM')),
        hasExpired0930PM: timeSlots.some(t => t.includes('09:30 PM')),
        hasExpired1000PM: timeSlots.some(t => t.includes('10:00 PM'))
      };
    })()`,
    returnByValue: true
  });

  console.log('--- RENDERED SLOTS FOR NOV 13 ---');
  console.log(JSON.stringify(renderedSlotsInfo.result?.value, null, 2));

  // Screenshot showing remaining future slots
  const shotSlots = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_live_today_nov13_remaining_slots.png'), Buffer.from(shotSlots.data, 'base64'));
  console.log('Saved evidence_live_today_nov13_remaining_slots.png');

  // 4. Select 10:30 PM slot and inspect Booking Summary
  console.log('\n--- SELECTING 10:30 PM SLOT ---');
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const slot1030 = btns.find(b => b.innerText && b.innerText.includes("10:30 PM"));
      if (slot1030) slot1030.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  const summary1030 = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const text = document.body.innerText;
      return {
        summaryText: text.includes("Fri, Nov 13, 2026") && text.includes("10:30 PM - 11:00 PM"),
        matchedDate: text.includes("Nov 13, 2026"),
        matchedTime: text.includes("10:30 PM - 11:00 PM")
      };
    })()`,
    returnByValue: true
  });
  console.log('Summary check for 10:30 PM slot:', summary1030.result?.value);

  // 5. Select 11:00 PM slot and inspect Booking Summary
  console.log('\n--- SELECTING 11:00 PM SLOT ---');
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const slot1100 = btns.find(b => b.innerText && b.innerText.includes("11:00 PM"));
      if (slot1100) slot1100.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  const summary1100 = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const text = document.body.innerText;
      return {
        summaryText: text.includes("Fri, Nov 13, 2026") && text.includes("11:00 PM - 11:30 PM"),
        matchedDate: text.includes("Nov 13, 2026"),
        matchedTime: text.includes("11:00 PM - 11:30 PM")
      };
    })()`,
    returnByValue: true
  });
  console.log('Summary check for 11:00 PM slot:', summary1100.result?.value);

  // 6. Refresh page and verify stability
  console.log('\n--- REFRESHING PAGE TO VERIFY STABILITY ---');
  await sendCdp(ws, 'Page.reload');
  await new Promise(r => setTimeout(r, 4000));

  const refreshedDateStrip = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const dateButtons = btns.filter(b => b.innerText && b.innerText.includes("NOV")).map(b => b.innerText.replace(/\\n/g, ' '));
      return {
        dateButtons,
        hasToday13: dateButtons.some(t => t.includes('13'))
      };
    })()`,
    returnByValue: true
  });
  console.log('Refreshed Date Strip:', refreshedDateStrip.result?.value);

  chromeProc.kill();
  await mongoose.disconnect();
  console.log('\n=== MANDATORY VERIFICATION COMPLETE ===');
  process.exit(0);
}

verifyLiveTodaySlots().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
