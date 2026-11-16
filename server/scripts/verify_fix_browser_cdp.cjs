const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { WebSocket } = require('ws');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const ARTIFACT_DIR = "C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\fa4cc859-e99d-440e-a4b9-ef64c859d17c";

async function verifyFix() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const Session = (await import('../models/Session.js')).default;
  const User = (await import('../models/User.js')).default;
  const Expert = (await import('../models/expertModel.js')).default;
  const Category = (await import('../models/Category.js')).default;

  const expertUser = await User.findOne({ userType: 'expert' });
  const expertProfile = await Expert.findOne({ userId: expertUser._id });
  const candidateUser = await User.findOne({ userType: 'candidate' });
  const cat = await Category.findOne({});

  const expToken = jwt.sign(
    { userId: expertUser._id, userType: 'expert', email: expertUser.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const candToken = jwt.sign(
    { userId: candidateUser._id, userType: 'candidate', email: candidateUser.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const testSession = await Session.create({
    sessionId: 'VERIFY-FIX-' + Date.now(),
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    categoryId: cat._id,
    startTime: new Date(Date.now() - 20 * 60 * 1000),
    endTime: new Date(Date.now() + 40 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'attended',
    candidateJoinedAt: new Date(Date.now() - 19 * 60 * 1000),
    candidateConnectionStatus: 'connected'
  });

  const port = 9338;
  const userDataDir = path.join(__dirname, '../tmp/chrome_verify_' + Date.now());
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--window-size=1280,900'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  function getWs() {
    return new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/json`, res => {
        let b = '';
        res.on('data', d => b += d);
        res.on('end', () => resolve(JSON.parse(b)[0].webSocketDebuggerUrl));
      }).on('error', reject);
    });
  }

  const wsUrl = await getWs();
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.once('open', r));

  const consoleLogs = [];
  const errors = [];
  ws.on('message', data => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.method === 'Runtime.exceptionThrown') {
        const desc = msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text;
        errors.push(desc);
      }
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map(a => a.value || a.description).join(' ');
        consoleLogs.push(`[${msg.params.type}] ${text}`);
        if (text.includes('Error') || text.includes('hasCandidateJoined')) {
          errors.push(text);
        }
      }
    } catch (_) {}
  });

  function sendCdp(method, params = {}) {
    return new Promise((resolve) => {
      const id = Math.floor(Math.random() * 100000);
      const onMsg = (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.id === id) {
          ws.removeListener('message', onMsg);
          resolve(msg.result);
        }
      };
      ws.on('message', onMsg);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await sendCdp('Runtime.enable');
  await sendCdp('Page.enable');

  console.log('--- TEST 1: EXPERT VIEW AND MODAL TEST ---');
  // Signin page to set localStorage
  await sendCdp('Page.navigate', { url: 'http://localhost:5173/signin' });
  await new Promise(r => setTimeout(r, 1500));

  await sendCdp('Runtime.evaluate', {
    expression: `
      localStorage.setItem('token', '${expToken}');
      localStorage.setItem('user', JSON.stringify({
        id: '${expertUser._id}',
        _id: '${expertUser._id}',
        userId: '${expertUser._id}',
        name: '${expertUser.name}',
        email: '${expertUser.email}',
        userType: 'expert',
        role: 'expert'
      }));
    `
  });

  // Navigate to live meeting as expert
  await sendCdp('Page.navigate', { url: `http://localhost:5173/live-meeting/${testSession.sessionId}?role=expert` });
  await new Promise(r => setTimeout(r, 3000));

  // Verify page rendered cleanly
  let evalRes = await sendCdp('Runtime.evaluate', {
    expression: 'document.body.innerText',
    returnByValue: true
  });
  let bodyText = evalRes.result?.value || '';

  const expertPageLoaded = bodyText.includes('End Session with Selected Outcome');
  const hasSomethingWrongInitial = bodyText.includes('Something went wrong');

  console.log('Expert LiveMeeting loaded cleanly?', expertPageLoaded);
  console.log('Has "Something went wrong" on initial load?', hasSomethingWrongInitial);

  // Select ATTENDED_COMPLETED and click End Session button
  console.log('Selecting ATTENDED_COMPLETED and clicking "End Session with Selected Outcome"...');
  await sendCdp('Runtime.evaluate', {
    expression: `
      const r = document.querySelector('input[value="ATTENDED_COMPLETED"]');
      if (r) r.click();
      const btns = Array.from(document.querySelectorAll('button'));
      const endBtn = btns.find(b => b.textContent.includes('End Session with Selected Outcome'));
      if (endBtn) endBtn.click();
    `
  });
  await new Promise(r => setTimeout(r, 2000));

  evalRes = await sendCdp('Runtime.evaluate', {
    expression: 'document.body.innerText',
    returnByValue: true
  });
  bodyText = evalRes.result?.value || '';

  const hasModalTitle = bodyText.includes('End Interview Session?');
  const hasModalOptions = bodyText.includes('Attended & Completed Successfully');
  const hasSomethingWrongModal = bodyText.includes('Something went wrong');
  const hasReferenceError = errors.some(e => String(e).includes('hasCandidateJoined'));

  console.log('Modal opened with "End Interview Session?" title?', hasModalTitle);
  console.log('Modal contains "Attended & Completed Successfully"?', hasModalOptions);
  console.log('Has "Something went wrong" after clicking End Session?', hasSomethingWrongModal);
  console.log('Has ReferenceError for hasCandidateJoined?', hasReferenceError);

  // Capture screenshot of the modal
  const screenshotRes = await sendCdp('Page.captureScreenshot', { format: 'png' });
  const shotPath = path.join(ARTIFACT_DIR, 'evidence_has_candidate_joined_fixed_modal.png');
  fs.writeFileSync(shotPath, Buffer.from(screenshotRes.data, 'base64'));
  console.log('Saved screenshot to:', shotPath);

  console.log('\n--- TEST 2: CANDIDATE VIEW ---');
  // Sign in as Candidate
  await sendCdp('Runtime.evaluate', {
    expression: `
      localStorage.setItem('token', '${candToken}');
      localStorage.setItem('user', JSON.stringify({
        id: '${candidateUser._id}',
        _id: '${candidateUser._id}',
        userId: '${candidateUser._id}',
        name: '${candidateUser.name}',
        email: '${candidateUser.email}',
        userType: 'candidate',
        role: 'candidate'
      }));
    `
  });

  // Navigate to live meeting as Candidate
  await sendCdp('Page.navigate', { url: `http://localhost:5173/live-meeting/${testSession.sessionId}?role=candidate` });
  await new Promise(r => setTimeout(r, 3000));

  evalRes = await sendCdp('Runtime.evaluate', {
    expression: 'document.body.innerText',
    returnByValue: true
  });
  bodyText = evalRes.result?.value || '';

  const candPageLoaded = bodyText.includes('Google Meet Interview Room') && bodyText.includes('Join Google Meet Interview');
  const candSomethingWrong = bodyText.includes('Something went wrong');
  console.log('Candidate LiveMeeting loaded cleanly?', candPageLoaded);
  console.log('Candidate view has "Something went wrong"?', candSomethingWrong);

  const candShotRes = await sendCdp('Page.captureScreenshot', { format: 'png' });
  const candShotPath = path.join(ARTIFACT_DIR, 'evidence_has_candidate_joined_candidate_view.png');
  fs.writeFileSync(candShotPath, Buffer.from(candShotRes.data, 'base64'));
  console.log('Saved candidate view screenshot to:', candShotPath);

  console.log('\n--- SUMMARY OF RUNTIME ERRORS ---');
  console.log('Total errors captured:', errors.length);
  if (errors.length > 0) {
    console.log('Errors:', errors);
  } else {
    console.log('ZERO runtime exceptions or errors caught during entire session!');
  }

  ws.close();
  chromeProc.kill();
  try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (_) {}
  await Session.deleteOne({ _id: testSession._id });
  await mongoose.disconnect();
}

verifyFix().catch(err => {
  console.error('Verification script failed:', err);
  process.exit(1);
});
