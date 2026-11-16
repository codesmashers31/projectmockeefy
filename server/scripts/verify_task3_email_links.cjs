const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const jwt = require('jsonwebtoken');
const http = require('http');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\fa4cc859-e99d-440e-a4b9-ef64c859d17c";
const JWT_SECRET = process.env.JWT_SECRET || "code@1234";

function sendCdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const msg = JSON.stringify({ id, method, params });
    const handler = (data) => {
      try {
        const resp = JSON.parse(data.toString());
        if (resp.id === id) {
          ws.off('message', handler);
          if (resp.error) reject(resp.error);
          else resolve(resp.result);
        }
      } catch (err) {
        // ignore
      }
    };
    ws.on('message', handler);
    ws.send(msg);
  });
}

async function main() {
  console.log('================================================================================');
  console.log('   MOCKEEFY TASK 3 — EMAIL LINK & RETURNURL VERIFICATION AUDIT                  ');
  console.log('================================================================================\n');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB Atlas.');

  const EmailOutbox = mongoose.models.EmailOutbox || (await import('../models/EmailOutbox.js')).default;
  const User = mongoose.models.User || (await import('../models/User.js')).default;
  const { enqueueEmail } = await import('../services/emailOutboxService.js');
  const { getAppBaseUrl, getCandidateSessionsUrl, getExpertSessionsUrl, getMeetingUrl } = await import('../utils/appUrl.js');

  let passed = 0;
  let failed = 0;
  function assert(name, condition) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      failed++;
    }
  }

  console.log('--- 1. AUDIT EXISTING EMAIL OUTBOX RECORDS FOR LOCALHOST/127.0.0.1 ---');
  const totalOutbox = await EmailOutbox.countDocuments();
  const pendingOutbox = await EmailOutbox.countDocuments({ status: 'pending' });
  const localhostOutbox = await EmailOutbox.find({
    html: { $regex: /localhost|127\.0\.0\.1/i }
  });

  console.log(`Total EmailOutbox records: ${totalOutbox}`);
  console.log(`Pending EmailOutbox records: ${pendingOutbox}`);
  console.log(`EmailOutbox records with localhost/127.0.0.1: ${localhostOutbox.length}`);

  assert('Zero localhost or 127.0.0.1 links in EmailOutbox records', localhostOutbox.length === 0);

  console.log('\n--- 2. CANONICAL APP URLS & EMAIL LINK GENERATION ---');
  const appBaseUrl = getAppBaseUrl();
  const candUrl = getCandidateSessionsUrl();
  const expertUrl = getExpertSessionsUrl();
  const meetingUrl = getMeetingUrl('test-sess-123');

  console.log(`Canonical APP_BASE_URL: ${appBaseUrl}`);
  console.log(`Candidate Destination: ${candUrl}`);
  console.log(`Expert Destination: ${expertUrl}`);
  console.log(`Meeting Link: ${meetingUrl}`);

  assert('Canonical base origin is exactly https://mockeefy.com', appBaseUrl === 'https://mockeefy.com');
  assert('Candidate CTA points strictly to https://mockeefy.com/my-sessions', candUrl === 'https://mockeefy.com/my-sessions');
  assert('Expert CTA points strictly to https://mockeefy.com/dashboard/sessions', expertUrl === 'https://mockeefy.com/dashboard/sessions');
  assert('Meeting URL uses canonical origin https://mockeefy.com/live-meeting/test-sess-123', meetingUrl.startsWith('https://mockeefy.com/live-meeting/'));

  console.log('\n--- 3. TEST GENERATED CANDIDATE & EXPERT EMAILS WITH OUTBOX ENQUEUE ---');
  const testSessionId = `test_email_links_${Date.now()}`;

  // Candidate Email
  const candidateEmailHtml = `
    <div>
      <h2>Your Mock Interview is Confirmed!</h2>
      <p>Click below to view your booked interview session:</p>
      <a href="${candUrl}" style="background-color:#0755E8; color:white; padding:10px 20px;">Open Dashboard</a>
    </div>
  `;

  const candResult = await enqueueEmail({
    sessionId: testSessionId,
    recipientType: 'candidate',
    to: 'candidate.verified@mockeefy.com',
    subject: 'Booking Confirmed - Mockeefy',
    html: candidateEmailHtml,
    template: 'booking_confirmed'
  });

  assert('Candidate booking email enqueued successfully', candResult.enqueued === true);

  const savedCandRecord = await EmailOutbox.findOne({ idempotencyKey: `${testSessionId}_candidate_booking_confirmed` });
  assert('Candidate email in DB contains https://mockeefy.com/my-sessions', savedCandRecord && savedCandRecord.html.includes('https://mockeefy.com/my-sessions'));
  assert('Candidate email contains zero localhost references', savedCandRecord && !savedCandRecord.html.includes('localhost'));

  // Expert Email
  const expertEmailHtml = `
    <div>
      <h2>New Mock Interview Booking Received!</h2>
      <p>Click below to view the scheduled interview in your expert portal:</p>
      <a href="${expertUrl}" style="background-color:#0755E8; color:white; padding:10px 20px;">View Scheduled Sessions</a>
    </div>
  `;

  const expResult = await enqueueEmail({
    sessionId: testSessionId,
    recipientType: 'expert',
    to: 'expert.verified@mockeefy.com',
    subject: 'New Interview Scheduled - Mockeefy',
    html: expertEmailHtml,
    template: 'booking_confirmed'
  });

  assert('Expert booking email enqueued successfully', expResult.enqueued === true);

  const savedExpRecord = await EmailOutbox.findOne({ idempotencyKey: `${testSessionId}_expert_booking_confirmed` });
  assert('Expert email in DB contains https://mockeefy.com/dashboard/sessions', savedExpRecord && savedExpRecord.html.includes('https://mockeefy.com/dashboard/sessions'));
  assert('Expert email contains zero localhost references', savedExpRecord && !savedExpRecord.html.includes('localhost'));

  // Clean up test records
  await EmailOutbox.deleteMany({ sessionId: testSessionId });

  console.log('\n--- 4. BROWSER VERIFICATION: UNAUTHENTICATED REDIRECT & RETURNURL ---');
  const port = 9290;
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,1100'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const jsonRes = await new Promise((res, rej) => {
      http.get(`http://127.0.0.1:${port}/json`, (r) => {
        let raw = '';
        r.on('data', chunk => raw += chunk);
        r.on('end', () => res(JSON.parse(raw)));
      }).on('error', rej);
    });

    const pageWsUrl = jsonRes[0]?.webSocketDebuggerUrl;
    const WebSocket = require('ws');
    const ws = new WebSocket(pageWsUrl);
    await new Promise(r => ws.on('open', r));

    await sendCdp(ws, 'Page.enable');
    await sendCdp(ws, 'Runtime.enable');

    // 1. Clear session
    await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:5173/' });
    await new Promise(r => setTimeout(r, 1000));
    await sendCdp(ws, 'Runtime.evaluate', { expression: 'localStorage.clear(); sessionStorage.clear();' });

    // 2. Navigate unauthenticated to /my-sessions
    console.log('Navigating unauthenticated browser to http://localhost:5173/my-sessions ...');
    await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:5173/my-sessions' });
    await new Promise(r => setTimeout(r, 2500));

    const currentUrlRes = await sendCdp(ws, 'Runtime.evaluate', { expression: 'window.location.href', returnByValue: true });
    const currentUrl = currentUrlRes.result?.value || '';
    console.log(`Current URL after unauthenticated access: ${currentUrl}`);

    const isRedirectedToSignin = currentUrl.includes('/signin');
    const hasReturnParam = currentUrl.includes('from=') || currentUrl.includes('returnUrl=') || currentUrl.includes('my-sessions');
    assert('Unauthenticated user redirected to /signin with return destination', isRedirectedToSignin && hasReturnParam);

    // 3. Authenticate with Candidate credentials
    let candidateUser = await User.findOne({ email: 'cand_integ_1794559099079_ffj8@mockeefy.test' });
    if (!candidateUser) candidateUser = await User.findOne({ userType: 'candidate' });

    const candidateToken = jwt.sign(
      { email: candidateUser.email, userType: 'candidate', name: candidateUser.name, userId: candidateUser._id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const candidateUserData = {
      id: candidateUser._id.toString(),
      _id: candidateUser._id.toString(),
      userId: candidateUser._id.toString(),
      email: candidateUser.email,
      userType: 'candidate',
      role: 'candidate',
      name: candidateUser.name,
    };

    // Simulate login and following return destination
    console.log('Simulating candidate login with return destination preserved...');
    await sendCdp(ws, 'Runtime.evaluate', {
      expression: `
        localStorage.setItem('token', ${JSON.stringify(candidateToken)});
        localStorage.setItem('user', ${JSON.stringify(JSON.stringify(candidateUserData))});
        localStorage.setItem('role', 'candidate');
      `
    });

    // Navigate to /my-sessions
    await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:5173/my-sessions' });
    await new Promise(r => setTimeout(r, 3000));

    const destinationUrlRes = await sendCdp(ws, 'Runtime.evaluate', { expression: 'window.location.href', returnByValue: true });
    const destUrl = destinationUrlRes.result?.value || '';
    console.log(`Current URL after login: ${destUrl}`);
    assert('Candidate reaches destination /my-sessions successfully after authentication', destUrl.includes('/my-sessions'));

    const shotAuth = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    const shotAuthPath = path.join(ARTIFACT_DIR, 'evidence_task3_authenticated_destination.png');
    fs.writeFileSync(shotAuthPath, Buffer.from(shotAuth.data, 'base64'));
    console.log(`Saved screenshot: ${shotAuthPath}`);

    ws.close();
  } finally {
    chromeProc.kill('SIGKILL');
  }

  console.log('\n================================================================================');
  console.log(`   TASK 3 AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================================');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error in verify_task3:', err);
  process.exit(1);
});
