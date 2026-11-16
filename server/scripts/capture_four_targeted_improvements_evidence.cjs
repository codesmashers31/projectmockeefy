const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const ARTIFACT_DIR = 'C:/Users/ASUS/.gemini/antigravity/brain/fa4cc859-e99d-440e-a4b9-ef64c859d17c';
const CLIENT_BASE = 'http://localhost:5173';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const JWT_SECRET = process.env.JWT_SECRET || 'code@1234';
const MONGO_URI = process.env.MONGO_URI;

function sendCdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const msg = JSON.stringify({ id, method, params });
    const handler = (data) => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.id === id) {
          ws.off('message', handler);
          if (parsed.error) reject(new Error(parsed.error.message));
          else resolve(parsed.result);
        }
      } catch (e) {}
    };
    ws.on('message', handler);
    ws.send(msg);
  });
}

async function evalInPage(ws, expression) {
  const res = await sendCdp(ws, 'Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (res.exceptionDetails) {
    throw new Error(res.exceptionDetails.text || JSON.stringify(res.exceptionDetails));
  }
  return res.result ? res.result.value : undefined;
}

async function saveScreenshot(ws, filename) {
  const res = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(res.data, 'base64');
  const targetPath = path.join(ARTIFACT_DIR, filename);
  fs.writeFileSync(targetPath, buffer);
  console.log(`[Evidence] Saved screenshot: ${targetPath}`);
}

async function run() {
  console.log('================================================================');
  console.log('  CAPTURE LIVE BROWSER EVIDENCE: FOUR TARGETED IMPROVEMENTS');
  console.log('================================================================');

  await mongoose.connect(MONGO_URI);
  console.log('[DB] Connected to MongoDB');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Expert = mongoose.model('ExpertDetails', new mongoose.Schema({}, { strict: false }));
  const Session = mongoose.model('Session', new mongoose.Schema({}, { strict: false }));
  const Review = mongoose.model('ReviewDetails', new mongoose.Schema({}, { strict: false }), 'reviews');
  const WalletTransaction = mongoose.model('WalletTransaction', new mongoose.Schema({}, { strict: false }));

  // Create test candidate and expert
  const candId = new mongoose.Types.ObjectId();
  const expUserId = new mongoose.Types.ObjectId();
  const expProfileId = new mongoose.Types.ObjectId();

  await User.create([
    {
      _id: candId,
      name: 'Priya Sharma',
      email: `priya_${Date.now()}@mockeefy.test`,
      userType: 'candidate',
      role: 'candidate',
      isVerified: true
    },
    {
      _id: expUserId,
      name: 'Arjun Mehta',
      email: `arjun_${Date.now()}@mockeefy.test`,
      userType: 'expert',
      role: 'expert',
      isVerified: true
    }
  ]);

  // Expert with schedule that has ZERO slots on Today (Thursday/any non-Saturday day),
  // but has available slots on upcoming Saturday/Monday
  // Let's determine today's day of week in Asia/Kolkata
  const now = new Date();
  const istDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const istDayName = days[new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getDay()];

  // Exclude today from schedule, pick a day 2 days ahead
  const targetDayIdx = (new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getDay() + 2) % 7;
  const targetDayName = days[targetDayIdx];

  const weeklySchedule = {};
  weeklySchedule[targetDayName] = [
    { startTime: '11:00', endTime: '12:00' },
    { startTime: '15:00', endTime: '16:00' }
  ];

  await Expert.create({
    _id: expProfileId,
    userId: expUserId,
    personalInformation: {
      userName: 'Arjun Mehta',
      email: 'arjun@mockeefy.test',
      category: 'IT'
    },
    professionalDetails: {
      title: 'Principal Systems Architect',
      company: 'Google',
      level: 'Principal Mentor',
      levels: ['Principal Mentor']
    },
    availability: {
      weeklySchedule,
      allowedDurations: [30],
      sessionDuration: 30
    },
    price: 500,
    metrics: { avgRating: 5.0, totalReviews: 14 }
  });

  // Credit candidate's wallet with ₹1,200 and add a transaction
  await WalletTransaction.create({
    userId: candId,
    type: 'CREDIT',
    amount: 1200,
    currency: 'INR',
    balanceAfter: 1200,
    status: 'COMPLETED',
    paymentId: 'pay_live_credit_test_001',
    orderId: 'order_live_001',
    description: 'Protected cutoff credit from automated booking safety',
    reason: 'CUTOFF_SAFETY_CREDIT',
    createdAt: new Date()
  });

  // Create 4 sessions for candidate demonstrating all feedback reminder states:
  const sessionImmediate = `SESS-IMM-${Date.now()}`;
  const session12hWait = `SESS-12W-${Date.now()}`;
  const sessionReadyReminder = `SESS-REM-${Date.now()}`;
  const sessionCompletedReview = `SESS-REV-${Date.now()}`;

  const twoHoursAgo = new Date(now.getTime() - 2 * 3600 * 1000);
  const threeHoursAgo = new Date(now.getTime() - 3 * 3600 * 1000);
  const fourteenHoursAgo = new Date(now.getTime() - 14 * 3600 * 1000);

  // 1. Completed, no feedback requested yet
  await Session.create({
    sessionId: sessionImmediate,
    candidateId: candId,
    expertId: expProfileId,
    status: 'completed',
    startTime: threeHoursAgo,
    endTime: twoHoursAgo,
    feedbackRequested: false,
    feedbackRequestCount: 0
  });

  // 2. Completed, requested 1 hour ago -> disabled countdown (<12h)
  await Session.create({
    sessionId: session12hWait,
    candidateId: candId,
    expertId: expProfileId,
    status: 'completed',
    startTime: threeHoursAgo,
    endTime: twoHoursAgo,
    feedbackRequested: true,
    feedbackRequestedAt: new Date(now.getTime() - 1 * 3600 * 1000),
    firstFeedbackRequestedAt: new Date(now.getTime() - 1 * 3600 * 1000),
    lastFeedbackRequestedAt: new Date(now.getTime() - 1 * 3600 * 1000),
    feedbackRequestCount: 1
  });

  // 3. Completed, requested 13 hours ago -> enabled "Send Reminder" button
  await Session.create({
    sessionId: sessionReadyReminder,
    candidateId: candId,
    expertId: expProfileId,
    status: 'completed',
    startTime: fourteenHoursAgo,
    endTime: new Date(fourteenHoursAgo.getTime() + 3600 * 1000),
    feedbackRequested: true,
    feedbackRequestedAt: fourteenHoursAgo,
    firstFeedbackRequestedAt: fourteenHoursAgo,
    lastFeedbackRequestedAt: fourteenHoursAgo,
    feedbackRequestCount: 1
  });

  // 4. Completed with expert review submitted -> "View Feedback"
  await Session.create({
    sessionId: sessionCompletedReview,
    candidateId: candId,
    expertId: expProfileId,
    status: 'completed',
    startTime: fourteenHoursAgo,
    endTime: new Date(fourteenHoursAgo.getTime() + 3600 * 1000),
    feedbackRequested: true,
    feedbackRequestedAt: fourteenHoursAgo,
    firstFeedbackRequestedAt: fourteenHoursAgo,
    lastFeedbackRequestedAt: fourteenHoursAgo,
    feedbackRequestCount: 1
  });

  await Review.create({
    sessionId: sessionCompletedReview,
    reviewerRole: 'expert',
    overallRating: 5,
    strengths: ['Exceptional algorithmic design and clean coding'],
    areasForImprovement: ['Refine distributed queue edge-case handling']
  });

  const candToken = jwt.sign(
    { userId: candId.toString(), userType: 'candidate', email: 'priya@mockeefy.test' },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  const cdpPort = 9288;
  console.log(`[Browser] Launching Chrome headless on debug port ${cdpPort}...`);
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,1000'
  ]);
  await new Promise(r => setTimeout(r, 2000));

  const cdpHttp = (endpoint) => new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${cdpPort}${endpoint}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const targets = await cdpHttp('/json');
  const pageTarget = targets.find(t => t.type === 'page');
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });

  await sendCdp(ws, 'Page.enable');
  await sendCdp(ws, 'Runtime.enable');
  await sendCdp(ws, 'DOM.enable');

  ws.on('message', (msg) => {
    try {
      const parsed = JSON.parse(msg);
      if (parsed.method === 'Runtime.consoleAPICalled') {
        const text = parsed.params.args.map(a => a.value || a.description).join(' ');
        if (parsed.params.type === 'error') console.error('  [Browser Console Error]:', text);
      }
      if (parsed.method === 'Runtime.exceptionThrown') {
        console.error('  [Browser Exception]:', parsed.params.exceptionDetails?.text || parsed.params.exceptionDetails?.exception?.description);
      }
    } catch (_) {}
  });

  // Setup Candidate Session in Browser
  await sendCdp(ws, 'Page.navigate', { url: `${CLIENT_BASE}/` });
  await new Promise(r => setTimeout(r, 1200));

  const candUserData = {
    id: candId.toString(),
    _id: candId.toString(),
    userId: candId.toString(),
    name: 'Priya Sharma',
    email: 'priya@mockeefy.test',
    role: 'candidate',
    userType: 'candidate'
  };

  await evalInPage(ws, `
    localStorage.setItem('token', ${JSON.stringify(candToken)});
    localStorage.setItem('user', ${JSON.stringify(JSON.stringify(candUserData))});
    localStorage.setItem('mockeefy_user_cache', ${JSON.stringify(JSON.stringify(candUserData))});
  `);

  console.log('\n--- 1. CAPTURING EVIDENCE: CANDIDATE WALLET PAGE (3-CARD LAYOUT) ---');
  await sendCdp(ws, 'Page.navigate', { url: `${CLIENT_BASE}/wallet` });
  
  let walletCardsText = '';
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    walletCardsText = await evalInPage(ws, `document.body.innerText`);
    if (walletCardsText.includes('Available Balance')) {
      console.log(`[Wallet Check] Page rendered after ${(i + 1) * 500}ms`);
      break;
    }
  }

  const walletUrl = await evalInPage(ws, `window.location.href`);
  console.log('[Wallet Page URL]', walletUrl);
  console.log('[Wallet Body snippet]:', walletCardsText.substring(0, 200).replace(/\n+/g, ' '));
  console.log('[Wallet Check] Has Available Balance:', walletCardsText.includes('Available Balance'));
  console.log('[Wallet Check] Has Total Credited:', walletCardsText.includes('Total Credited'));
  console.log('[Wallet Check] Has Total Spent:', walletCardsText.includes('Total Spent'));
  console.log('[Wallet Check] Has Cash Refunded (MUST BE FALSE):', walletCardsText.includes('Cash Refunded'));
  console.log('[Wallet Check] Has Request Cash Refund (MUST BE FALSE):', walletCardsText.includes('Request Cash Refund'));

  await saveScreenshot(ws, 'evidence_wallet_page_three_cards.png');

  console.log('\n--- 2. CAPTURING EVIDENCE: BOOKING ZERO-SLOT FILTERING & TODAY BANNER ---');
  await sendCdp(ws, 'Page.navigate', { url: `${CLIENT_BASE}/book-session?expertId=${expProfileId.toString()}` });
  
  let bookingPageText = '';
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    bookingPageText = await evalInPage(ws, `document.body.innerText`);
    if (bookingPageText.includes('No interview slots available today') && bookingPageText.includes('Next available date')) {
      console.log(`[Booking Check] Page rendered after ${(i + 1) * 500}ms`);
      break;
    }
  }

  // Check rendered booking page text
  console.log('[Booking Check] Has "No interview slots available today":', /No interview slots available today/i.test(bookingPageText));
  console.log('[Booking Check] Has "Next available date":', /Next available date/i.test(bookingPageText));
  console.log('[Booking Check] Has "View slots for" button:', /View slots for|Viewing slots for/i.test(bookingPageText));

  await saveScreenshot(ws, 'evidence_zero_slot_filtering_and_today_banner.png');

  console.log('\n--- 3. CAPTURING EVIDENCE: MY SESSIONS FEEDBACK REMINDER STATES ---');
  await sendCdp(ws, 'Page.navigate', { url: `${CLIENT_BASE}/my-sessions` });
  await new Promise(r => setTimeout(r, 2500));

  const sessionsPageText = await evalInPage(ws, `document.body.innerText`);
  console.log('[Sessions Check] Has "Request Feedback":', sessionsPageText.includes('Request Feedback'));
  console.log('[Sessions Check] Has "Reminder in":', /Reminder in/i.test(sessionsPageText));
  console.log('[Sessions Check] Has "Send Reminder":', sessionsPageText.includes('Send Reminder'));
  console.log('[Sessions Check] Has "View Feedback":', sessionsPageText.includes('View Feedback'));

  await saveScreenshot(ws, 'evidence_feedback_reminder_states.png');

  ws.close();
  chromeProc.kill();

  // Cleanup DB
  await User.deleteMany({ _id: { $in: [candId, expUserId] } });
  await Expert.deleteOne({ _id: expProfileId });
  await Session.deleteMany({ sessionId: { $in: [sessionImmediate, session12hWait, sessionReadyReminder, sessionCompletedReview] } });
  await Review.deleteOne({ sessionId: sessionCompletedReview });
  await WalletTransaction.deleteMany({ userId: candId });

  await mongoose.disconnect();
  console.log('\n[Complete] Browser evidence capture finished successfully.');
}

run().catch(err => {
  console.error('[Capture Error]', err);
  process.exit(1);
});
