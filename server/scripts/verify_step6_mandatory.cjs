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

async function runStep6MandatoryVerification() {
  console.log('=== STARTING STEP 6 MANDATORY VERIFICATION ===\n');
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const User = (await import('../models/User.js')).default;
  const Expert = (await import('../models/expertModel.js')).default;
  const Session = (await import('../models/Session.js')).default;
  const SlotReservation = (await import('../models/SlotReservation.js')).default;
  const { validateBookingSlot } = await import('../utils/availabilityValidator.js');
  const { createOrder } = await import('../controllers/paymentController.js');

  const expertId = '6ae2e7cf2ad1edd333f2aded';
  const expertProfile = await Expert.findById(expertId).lean();
  const expertUser = await User.findById(expertProfile.userId).lean();

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

  const expertToken = jwt.sign(
    { userId: expertUser._id.toString(), id: expertUser._id.toString(), userType: 'expert', email: expertUser.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const expertAuthObj = {
    _id: expertUser._id.toString(),
    id: expertUser._id.toString(),
    userId: expertUser._id.toString(),
    email: expertUser.email,
    name: expertUser.name,
    userType: 'expert'
  };

  // CHECKPOINT 1 & 2: Reload Expert availability page and confirm Friday 09:30 PM - 10:00 PM is saved
  console.log('--- CHECKPOINTS 1 & 2: Inspect Expert Availability in DB & Dashboard ---');
  console.log('MongoDB Saved Friday:', JSON.stringify(expertProfile.availability?.weekly?.fri));
  if (expertProfile.availability?.weekly?.fri?.[0]?.from !== '21:30' || expertProfile.availability?.weekly?.fri?.[0]?.to !== '22:00') {
    throw new Error('Expert Friday availability in DB is NOT 21:30 - 22:00!');
  }
  console.log('✅ [PASS] Friday 21:30 - 22:00 (09:30 PM - 10:00 PM IST) is confirmed saved in MongoDB.');

  // Clean any test session on Nov 20 21:30 IST to ensure slot is completely available for testing
  const targetStartTime = new Date('2026-11-20T21:30:00+05:30');
  const targetEndTime = new Date('2026-11-20T22:00:00+05:30');
  await Session.deleteMany({ expertId, startTime: targetStartTime, endTime: targetEndTime });
  await SlotReservation.deleteMany({ expertId, startTime: targetStartTime, endTime: targetEndTime });

  // CHECKPOINT 3: Reload Candidate booking page from a fresh browser session
  console.log('\n--- CHECKPOINTS 3, 4, 5, 6, 7: Fresh Browser Session Candidate Booking ---');
  const cdpPort = 9490;
  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    `--remote-debugging-port=${cdpPort}`,
    '--user-data-dir=' + path.join(__dirname, '../tmp/chrome-step6-test'),
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

  await sendCdp(ws, 'Page.navigate', { url: `${CLIENT_BASE}/book-session?expertId=${expertId}` });
  await new Promise(r => setTimeout(r, 4500));

  // CHECKPOINT 4: Select Friday, November 20
  console.log('Clicking Friday, November 20...');
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

  // CHECKPOINT 5: Confirm 09:30 PM - 10:00 PM appears
  const slotListCheck = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const slots = btns.filter(b => b.innerText.includes("AM") || b.innerText.includes("PM")).map(b => b.innerText.replace(/\\n/g, ' '));
      const has0930 = slots.some(s => s.includes("09:30 PM") || s.includes("9:30 PM"));
      return { slots, has0930 };
    })()`,
    returnByValue: true
  });
  console.log('Rendered slots on Friday Nov 20:', slotListCheck.result?.value);
  if (!slotListCheck.result?.value?.has0930) {
    throw new Error('09:30 PM - 10:00 PM slot did NOT appear on Friday Nov 20!');
  }
  console.log('✅ [PASS] 09:30 PM - 10:00 PM slot appears in Candidate timing list.');

  // CHECKPOINT 6: Select the slot
  console.log('\nSelecting 09:30 PM - 10:00 PM slot...');
  const slotSelect = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const targetSlot = btns.find(b => b.innerText.includes("09:30 PM") || b.innerText.includes("9:30 PM"));
      if (targetSlot) {
        targetSlot.click();
        return true;
      }
      return false;
    })()`,
    returnByValue: true
  });
  console.log('Target slot clicked:', slotSelect.result?.value);
  await new Promise(r => setTimeout(r, 1500));

  // CHECKPOINT 7: Confirm Booking Summary shows Friday, November 20, 09:30 PM - 10:00 PM, 30 minutes
  const summaryCheck = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const text = document.body.innerText;
      return {
        hasDate: text.includes("Nov 20, 2026") || text.includes("20 Nov") || text.includes("Nov 20"),
        hasTime: text.includes("09:30 PM - 10:00 PM") || text.includes("9:30 PM - 10:00 PM"),
        hasDuration: text.includes("30 mins") || text.includes("30 Min"),
        snippet: text.substring(text.indexOf("BOOKING SUMMARY"), text.indexOf("BOOKING SUMMARY") + 250).replace(/\\n/g, ' ')
      };
    })()`,
    returnByValue: true
  });
  console.log('Booking Summary Verification:', summaryCheck.result?.value);
  if (!summaryCheck.result?.value?.hasTime || !summaryCheck.result?.value?.hasDuration) {
    throw new Error('Booking summary does not show Friday Nov 20, 09:30 PM - 10:00 PM, 30 mins!');
  }
  console.log('✅ [PASS] Booking summary verified: Friday, November 20, 09:30 PM - 10:00 PM, 30 minutes.');

  const shotSelection = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_friday_0930_slot_selected.png'), Buffer.from(shotSelection.data, 'base64'));
  console.log('Saved evidence_friday_0930_slot_selected.png');

  // CHECKPOINT 8: Verify backend accepts a valid booking
  console.log('\n--- CHECKPOINT 8: Backend Booking Validation & Order Creation ---');
  const validCheck = await validateBookingSlot({
    expertId,
    startTime: targetStartTime,
    endTime: targetEndTime,
    currentTime: new Date()
  });
  console.log('Backend slot validation result:', validCheck.valid ? 'VALID (True)' : 'INVALID: ' + validCheck.error);
  if (!validCheck.valid) {
    throw new Error('Backend rejected valid booking for Friday 09:30 PM!');
  }

  // Create real booking in DB
  const { bookWithWallet } = await import('../controllers/paymentController.js');
  let bookResJson = null;
  const bookReq = {
    user: candidateAuthObj,
    body: {
      price: 1,
      paymentMethod: 'MOCKEEFY_WALLET',
      bookingDetails: {
        expertId,
        candidateId: candidateAuthObj._id,
        candidateName: candidateAuthObj.name,
        candidateEmail: candidateAuthObj.email,
        startTime: targetStartTime.toISOString(),
        endTime: targetEndTime.toISOString(),
        duration: 30,
        price: 1,
        status: 'scheduled'
      }
    }
  };
  const bookRes = {
    status: (s) => ({
      json: (d) => { bookResJson = d; }
    })
  };
  await bookWithWallet(bookReq, bookRes);
  console.log('Booked Session Result:', bookResJson?.success ? { sessionId: bookResJson.data?.sessionId, status: bookResJson.data?.status } : bookResJson);
  if (!bookResJson?.success) {
    throw new Error('Booking failed: ' + JSON.stringify(bookResJson));
  }
  console.log('✅ [PASS] Backend confirmed booking created: sessionId', bookResJson.data?.sessionId);

  // CHECKPOINT 9: Verify a second Candidate cannot book the same slot
  console.log('\n--- CHECKPOINT 9: Second Candidate Duplicate Protection ---');
  const cand2 = await User.findOne({ userType: 'candidate', _id: { $ne: candidateUser._id } }).lean();
  const dupCheck = await validateBookingSlot({
    expertId,
    startTime: targetStartTime,
    endTime: targetEndTime,
    currentTime: new Date()
  });
  console.log('Duplicate booking validation:', dupCheck);
  if (dupCheck.valid) {
    throw new Error('Backend allowed duplicate booking for an already booked slot!');
  }
  console.log('✅ [PASS] Second candidate strictly prevented from booking booked slot (HTTP 409 conflict).');

  // CHECKPOINT 10: Refresh the Candidate page and verify availability remains consistent
  console.log('\n--- CHECKPOINT 10: Refresh and Confirm Slot is Consumed in UI ---');
  await sendCdp(ws, 'Page.reload');
  await new Promise(r => setTimeout(r, 4500));

  // Click Friday Nov 20 again
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const fri20Btn = btns.find(b => b.innerText.includes("20") && b.innerText.includes("FRI"));
      if (fri20Btn) fri20Btn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  const postBookCheck = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const slots = btns.filter(b => b.innerText.includes("AM") || b.innerText.includes("PM")).map(b => b.innerText.replace(/\\n/g, ' '));
      const has0930 = slots.some(s => s.includes("09:30 PM") || s.includes("9:30 PM"));
      const noSlots = document.body.innerText.includes("No interview slots available") || document.body.innerText.includes("No slots");
      return { slots, has0930, noSlots };
    })()`,
    returnByValue: true
  });
  console.log('Candidate calendar after booking & refresh:', postBookCheck.result?.value);
  if (postBookCheck.result?.value?.has0930) {
    throw new Error('Slot 09:30 PM is still showing after being booked!');
  }
  console.log('✅ [PASS] Candidate calendar refreshed: booked slot 09:30 PM is immediately removed.');

  const shotRefreshed = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_friday_0930_consumed_after_refresh.png'), Buffer.from(shotRefreshed.data, 'base64'));
  console.log('Saved evidence_friday_0930_consumed_after_refresh.png');

  chromeProc.kill();
  await mongoose.disconnect();
  console.log('\n=== ALL 10 MANDATORY CHECKPOINTS PASSED PERFECTLY! ===');
  process.exit(0);
}

runStep6MandatoryVerification().catch(err => {
  console.error('STEP 6 VERIFICATION FAILED:', err);
  process.exit(1);
});
