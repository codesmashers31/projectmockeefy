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

async function verifyStep4CandidateCalendar() {
  console.log('=== VERIFYING CANDIDATE CALENDAR AFTER CANCELLATION ===\n');

  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const User = (await import('../models/User.js')).default;
  const Expert = (await import('../models/expertModel.js')).default;

  const expertId = '6ae2e7cf2ad1edd333f2aded';
  const expert = await Expert.findById(expertId).lean();
  console.log('Expert Saved Friday Schedule:', JSON.stringify(expert.availability?.weekly?.fri));

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

  const cdpPort = 9489;
  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    `--remote-debugging-port=${cdpPort}`,
    '--user-data-dir=' + path.join(__dirname, '../tmp/chrome-step4-test'),
    '--headless=new',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const tabs = await new Promise(r => http.get(`http://127.0.0.1:${cdpPort}/json/list`, res => {
    let d = ''; res.on('data', c => d += c); res.on('end', () => r(JSON.parse(d)));
  }));

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
  await new Promise(r => setTimeout(r, 4500));

  // 1. Inspect visible date buttons in the date strip
  const dateStripEval = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const dateButtons = btns.map(b => b.innerText.replace(/\\n/g, ' ')).filter(t => t.includes('NOV'));
      const hasFri20Nov = dateButtons.some(t => t.includes('20') && t.includes('FRI'));
      return { dateButtons, hasFri20Nov };
    })()`,
    returnByValue: true
  });
  console.log('Date strip buttons on initial load:', dateStripEval.result?.value);
  if (!dateStripEval.result?.value?.hasFri20Nov) {
    throw new Error('Friday Nov 20 is still missing from the date selector!');
  }
  console.log('✅ [PASS] Friday, November 20 is present in the date selector!');

  // Capture screenshot showing Friday 20 Nov in the date selector
  const shot1 = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_candidate_calendar_fri20_restored.png'), Buffer.from(shot1.data, 'base64'));
  console.log('Saved evidence_candidate_calendar_fri20_restored.png');

  // 2. Click Friday, November 20
  console.log('\nClicking FRI 20 NOV button...');
  const clickFri = await sendCdp(ws, 'Runtime.evaluate', {
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
  console.log('Friday clicked:', clickFri.result?.value);
  await new Promise(r => setTimeout(r, 1500));

  // 3. Confirm 09:30 PM - 10:00 PM appears in timing slots
  const slotEval = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const slots = btns.filter(b => b.innerText.includes("AM") || b.innerText.includes("PM")).map(b => b.innerText.replace(/\\n/g, ' '));
      const has0930Slot = slots.some(s => s.includes("09:30 PM") || s.includes("9:30 PM"));
      return { slots, has0930Slot };
    })()`,
    returnByValue: true
  });
  console.log('Rendered timing slots for Friday Nov 20:', slotEval.result?.value);
  if (!slotEval.result?.value?.has0930Slot) {
    throw new Error('Slot 09:30 PM - 10:00 PM did not appear after clicking Friday Nov 20!');
  }
  console.log('✅ [PASS] Slot 09:30 PM - 10:00 PM is rendered and visible.');

  // 4. Select the slot
  console.log('\nSelecting 09:30 PM - 10:00 PM slot...');
  const clickSlot = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const slotBtn = btns.find(b => b.innerText.includes("09:30 PM") || b.innerText.includes("9:30 PM"));
      if (slotBtn) {
        slotBtn.click();
        return true;
      }
      return false;
    })()`,
    returnByValue: true
  });
  console.log('Slot clicked:', clickSlot.result?.value);
  await new Promise(r => setTimeout(r, 1500));

  // 5. Verify the Booking Summary details
  const summaryEval = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const text = document.body.innerText;
      return {
        hasMentorJoel: text.includes("Joel") || text.includes("Zoho"),
        hasNov20: text.includes("Nov 20, 2026") || text.includes("20 Nov") || text.includes("Nov 20"),
        hasTime: text.includes("09:30 PM - 10:00 PM") || text.includes("9:30 PM - 10:00 PM"),
        hasDuration: text.includes("30 mins") || text.includes("30 Min"),
        snippet: text.substring(text.indexOf("BOOKING SUMMARY"), text.indexOf("BOOKING SUMMARY") + 250).replace(/\\n/g, ' ')
      };
    })()`,
    returnByValue: true
  });
  console.log('Booking Summary Details:', summaryEval.result?.value);
  if (!summaryEval.result?.value?.hasNov20 || !summaryEval.result?.value?.hasTime || !summaryEval.result?.value?.hasDuration) {
    throw new Error('Booking Summary failed verification!');
  }
  console.log('✅ [PASS] Booking summary shows Friday, November 20, 09:30 PM - 10:00 PM, 30 minutes.');

  // Capture final screenshot showing slot selected and booking summary verified
  const shot2 = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_candidate_calendar_fri20_summary.png'), Buffer.from(shot2.data, 'base64'));
  console.log('Saved evidence_candidate_calendar_fri20_summary.png');

  chromeProc.kill();
  await mongoose.disconnect();
  console.log('\n=== ALL STEP 4 CHECKS COMPLETED SUCCESSFULLY! ===');
  process.exit(0);
}

verifyStep4CandidateCalendar().catch(err => {
  console.error('STEP 4 FAILED:', err);
  process.exit(1);
});
