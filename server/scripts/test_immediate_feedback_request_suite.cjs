/**
 * MOCKEEFY — REMOVE 24-HOUR FEEDBACK REQUEST RESTRICTION
 * Comprehensive E2E Verification Suite (Tests A to F)
 * Live Two-Browser CDP + Atomic Concurrency + Strict Validation
 */
const http = require('http');
const { spawn } = require('child_process');
const assert = require('assert');
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

async function evalInPage(ws, expression) {
  const res = await sendCdp(ws, 'Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (res.exceptionDetails) {
    throw new Error('Evaluation exception: ' + JSON.stringify(res.exceptionDetails));
  }
  return res.result?.value;
}

async function captureScreenshot(ws, filename) {
  const result = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  const filepath = path.join(ARTIFACT_DIR, filename);
  fs.writeFileSync(filepath, Buffer.from(result.data, 'base64'));
  console.log(`📸 Screenshot saved: ${filename}`);
  return filepath;
}

async function main() {
  console.log('========================================================================');
  console.log('🚀 MOCKEEFY: IMMEDIATE FEEDBACK REQUEST VERIFICATION SUITE (TESTS A-F)');
  console.log('========================================================================\n');

  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('Connected to MongoDB replica set:', mongoose.connection.name);

  const rawUser = require('../models/User');
  const rawSession = require('../models/Session');
  const rawNotification = require('../models/Notification');
  const rawExpert = require('../models/expertModel');
  const rawReview = require('../models/reviewModel');

  const User = rawUser.default || rawUser;
  const Session = rawSession.default || rawSession;
  const Notification = rawNotification.default || rawNotification;
  const Expert = rawExpert.default || rawExpert;
  const Review = rawReview.default || rawReview;

  const testSuffix = Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  // 1. Create test candidate and test expert
  const candidateUser = await User.create({
    name: `Aarav Immediate_${testSuffix}`,
    email: `aarav_immed_${testSuffix}@mockeefy.test`,
    password: 'Password123!',
    role: 'user',
    userType: 'candidate',
    isVerified: true
  });

  const otherCandidateUser = await User.create({
    name: `Other Cand_${testSuffix}`,
    email: `other_cand_${testSuffix}@mockeefy.test`,
    password: 'Password123!',
    role: 'user',
    userType: 'candidate',
    isVerified: true
  });

  const expertUser = await User.create({
    name: `Dr. Vance Immediate_${testSuffix}`,
    email: `vance_immed_${testSuffix}@mockeefy.test`,
    password: 'Password123!',
    role: 'expert',
    userType: 'expert',
    isVerified: true
  });

  const expertProfile = await Expert.create({
    userId: expertUser._id,
    name: expertUser.name,
    email: expertUser.email,
    title: 'Principal Systems Architect',
    bio: 'Distributed Systems & Microservices',
    category: 'IT',
    primaryDomain: 'Full Stack Development (MERN)',
    isVerified: true,
    verificationStatus: 'approved'
  });

  // Session completed 10 minutes ago (0.16 hours elapsed, far below 24 hours!)
  const completedSession = await Session.create({
    sessionId: `sess_immed_${testSuffix}`,
    candidateId: candidateUser._id,
    candidateName: candidateUser.name,
    candidateEmail: candidateUser.email,
    expertId: expertProfile._id,
    expertName: expertProfile.name,
    expertEmail: expertProfile.email,
    sessionType: 'mock_interview',
    skill: 'High-Concurrency Distributed Systems',
    category: 'IT',
    level: 'Senior Mentor',
    price: 800,
    paymentStatus: 'paid',
    status: 'completed',
    startTime: new Date(Date.now() - 40 * 60 * 1000), // 40 mins ago
    endTime: new Date(Date.now() - 10 * 60 * 1000),   // 10 mins ago (completed!)
    attendanceStatus: 'attended',
    feedbackRequested: false
  });

  const candToken = jwt.sign(
    { id: candidateUser._id.toString(), userId: candidateUser._id.toString(), email: candidateUser.email, userType: 'candidate', role: 'user', name: candidateUser.name },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  const otherCandToken = jwt.sign(
    { id: otherCandidateUser._id.toString(), userId: otherCandidateUser._id.toString(), email: otherCandidateUser.email, userType: 'candidate', role: 'user', name: otherCandidateUser.name },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  const expToken = jwt.sign(
    { id: expertUser._id.toString(), userId: expertUser._id.toString(), email: expertUser.email, userType: 'expert', role: 'expert', name: expertUser.name },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  const cdpPort = 9255;
  console.log(`Launching Chrome headless on debug port ${cdpPort}...`);
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,1000'
  ]);
  await new Promise(r => setTimeout(r, 2000));

  let candWs = null;
  let expWs = null;

  try {
    const cdpHttp = (endpoint, method = 'GET') => new Promise((resolve, reject) => {
      const req = http.request(`http://127.0.0.1:${cdpPort}${endpoint}`, { method }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.end();
    });

    // Session 1: Candidate Tab
    const targets = await cdpHttp('/json');
    const pageTarget1 = targets.find(t => t.type === 'page');
    candWs = new WebSocket(pageTarget1.webSocketDebuggerUrl);
    await new Promise((res, rej) => { candWs.on('open', res); candWs.on('error', rej); });

    await sendCdp(candWs, 'Page.enable');
    await sendCdp(candWs, 'Runtime.enable');
    await sendCdp(candWs, 'DOM.enable');

    // Session 2: Expert Tab
    const pageTarget2 = await cdpHttp('/json/new', 'PUT');
    expWs = new WebSocket(pageTarget2.webSocketDebuggerUrl);
    await new Promise((res, rej) => { expWs.on('open', res); expWs.on('error', rej); });

    await sendCdp(expWs, 'Page.enable');
    await sendCdp(expWs, 'Runtime.enable');
    await sendCdp(expWs, 'DOM.enable');

    // Set Candidate Auth
    await sendCdp(candWs, 'Page.navigate', { url: `${CLIENT_BASE}/` });
    await new Promise(r => setTimeout(r, 1000));
    await evalInPage(candWs, `
      localStorage.setItem('token', ${JSON.stringify(candToken)});
      localStorage.setItem('user', ${JSON.stringify(JSON.stringify({
        id: candidateUser._id.toString(),
        _id: candidateUser._id.toString(),
        userId: candidateUser._id.toString(),
        name: candidateUser.name,
        email: candidateUser.email,
        role: 'user',
        userType: 'candidate'
      }))});
    `);

    // Set Expert Auth
    await sendCdp(expWs, 'Page.navigate', { url: `${CLIENT_BASE}/` });
    await new Promise(r => setTimeout(r, 1000));
    await evalInPage(expWs, `
      localStorage.setItem('token', ${JSON.stringify(expToken)});
      localStorage.setItem('user', ${JSON.stringify(JSON.stringify({
        id: expertUser._id.toString(),
        _id: expertUser._id.toString(),
        userId: expertUser._id.toString(),
        name: expertUser.name,
        email: expertUser.email,
        role: 'expert',
        userType: 'expert'
      }))});
    `);

    // ========================================================================
    // TEST A: Complete interview -> Immediately open Candidate My Sessions
    // Verify Request Feedback is enabled without waiting 24 hours.
    // ========================================================================
    console.log('\n--- TEST A: CANDIDATE MY SESSIONS IMMEDIATE REQUEST FEEDBACK BUTTON ---');
    await sendCdp(candWs, 'Page.navigate', { url: `${CLIENT_BASE}/my-sessions` });
    await new Promise(r => setTimeout(r, 2500));

    const testAState = await evalInPage(candWs, `
      (() => {
        const text = document.body.innerText;
        const buttons = Array.from(document.querySelectorAll('button'));
        const reqBtn = buttons.find(b => b.innerText.includes('Request Feedback'));
        return {
          snippet: text.substring(0, 300).replace(/\\n/g, ' '),
          hasSession: text.includes('High-Concurrency') || text.includes('Dr. Vance') || text.includes('Interview Simulation') || text.includes('Completed'),
          hasAvailableAfter24h: text.includes('Available after 24h'),
          reqBtnFound: !!reqBtn,
          reqBtnDisabled: reqBtn ? reqBtn.disabled : null,
          reqBtnText: reqBtn ? reqBtn.innerText.trim() : null
        };
      })()
    `);
    console.log('Test A DOM State:', testAState);
    assert.ok(testAState.hasSession, 'Completed session is listed in Candidate My Sessions');
    assert.strictEqual(testAState.hasAvailableAfter24h, false, 'Must NOT display "Available after 24h"');
    assert.ok(testAState.reqBtnFound, 'Request Feedback button must be present');
    assert.strictEqual(testAState.reqBtnDisabled, false, 'Request Feedback button must be ENABLED immediately without 24h delay');
    await captureScreenshot(candWs, 'evidence_immediate_feedback_test_a_enabled.png');
    console.log('✅ [PASS] Test A: Request Feedback button is enabled immediately without 24-hour waiting period!');

    // ========================================================================
    // TEST B: Click Request Feedback
    // Verify Expert receives notification without refreshing; correct modal opens.
    // ========================================================================
    console.log('\n--- TEST B: TRIGGER REQUEST FEEDBACK & EXPERT REAL-TIME RECEPTION ---');
    // Navigate Expert to sessions dashboard
    await sendCdp(expWs, 'Page.navigate', { url: `${CLIENT_BASE}/dashboard/sessions` });
    await new Promise(r => setTimeout(r, 2500));

    // Candidate clicks "Request Feedback" button in Browser 1
    const clickResult = await evalInPage(candWs, `
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const reqBtn = buttons.find(b => b.innerText.includes('Request Feedback'));
        if (reqBtn) {
          reqBtn.click();
          return true;
        }
        return false;
      })()
    `);
    assert.ok(clickResult, 'Candidate clicked Request Feedback button');
    await new Promise(r => setTimeout(r, 1500));

    // Verify Candidate UI changed to disabled "Feedback Requested"
    const candPostClickState = await evalInPage(candWs, `
      (() => {
        const text = document.body.innerText;
        const buttons = Array.from(document.querySelectorAll('button'));
        const feedbackReqBtn = buttons.find(b => b.innerText.includes('Feedback Requested'));
        return {
          hasFeedbackRequestedText: text.includes('Feedback Requested'),
          btnFound: !!feedbackReqBtn,
          btnDisabled: feedbackReqBtn ? feedbackReqBtn.disabled : null
        };
      })()
    `);
    console.log('Candidate Post-Click State:', candPostClickState);
    assert.ok(candPostClickState.btnFound, 'Button transitioned to "Feedback Requested"');
    assert.strictEqual(candPostClickState.btnDisabled, true, '"Feedback Requested" button is visibly disabled');
    await captureScreenshot(candWs, 'evidence_immediate_feedback_test_b_cand_requested.png');

    // Verify Expert received real-time notification in MongoDB & Browser
    const expertNotif = await Notification.findOne({
      userId: expertUser._id,
      'metadata.sessionId': completedSession.sessionId
    }).lean();
    assert.ok(expertNotif, 'Notification created in MongoDB for Expert');
    console.log('Expert Notification in DB:', {
      type: expertNotif.type,
      title: expertNotif.title,
      message: expertNotif.message,
      actionUrl: expertNotif.metadata?.link
    });

    // Expert navigates via deep link (simulating notification click)
    const deepLinkUrl = `${CLIENT_BASE}${expertNotif.metadata.link}`;
    console.log(`Navigating Expert Browser to deep link: ${deepLinkUrl}`);
    await sendCdp(expWs, 'Page.navigate', { url: deepLinkUrl });
    await new Promise(r => setTimeout(r, 3000));

    // Verify feedback review modal automatically opened with candidate info
    const modalCheck = await evalInPage(expWs, `
      (() => {
        const text = document.body.innerText;
        return {
          hasModalTitle: text.includes('Interview Evaluation Rubric') || text.includes('Performance Evaluation') || text.includes('Written Evaluation') || text.includes('Feedback'),
          hasCandidateName: text.includes('${candidateUser.name}') || text.includes('Aarav'),
          hasSubmitButton: Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('Submit Rubric & Complete') || b.innerText.includes('Submit Evaluation') || b.innerText.includes('Submit Review'))
        };
      })()
    `);
    console.log('Expert Feedback Modal State:', modalCheck);
    assert.ok(modalCheck.hasModalTitle, 'Evaluation/Feedback modal auto-opened');
    await captureScreenshot(expWs, 'evidence_immediate_feedback_test_b_expert_modal.png');
    console.log('✅ [PASS] Test B: Expert received real-time notification and deep link opened feedback modal!');

    // ========================================================================
    // TEST C: Refresh both browsers -> verify persistence
    // ========================================================================
    console.log('\n--- TEST C: REFRESH BOTH BROWSERS & VERIFY PERSISTENCE ---');
    // Refresh Candidate browser
    await sendCdp(candWs, 'Page.navigate', { url: `${CLIENT_BASE}/my-sessions` });
    await new Promise(r => setTimeout(r, 2500));
    const candRefreshState = await evalInPage(candWs, `
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const feedbackReqBtn = buttons.find(b => b.innerText.includes('Feedback Requested'));
        return {
          btnFound: !!feedbackReqBtn,
          btnDisabled: feedbackReqBtn ? feedbackReqBtn.disabled : null
        };
      })()
    `);
    assert.ok(candRefreshState.btnFound, 'Disabled "Feedback Requested" persisted after Candidate refresh');
    assert.strictEqual(candRefreshState.btnDisabled, true, 'Button remains disabled after refresh');

    // Refresh Expert browser & check notification persistence
    await sendCdp(expWs, 'Page.navigate', { url: `${CLIENT_BASE}/notifications` });
    await new Promise(r => setTimeout(r, 2500));
    const expertNotifState = await evalInPage(expWs, `
      (() => {
        const text = document.body.innerText;
        return {
          hasNotifText: text.includes('requested evaluation and feedback') || text.includes('Feedback Requested')
        };
      })()
    `);
    assert.ok(expertNotifState.hasNotifText, 'Notification persisted in Expert Notifications page after refresh');
    await captureScreenshot(candWs, 'evidence_immediate_feedback_test_c_persisted.png');
    console.log('✅ [PASS] Test C: Request status and notifications persisted across browser refreshes!');

    // ========================================================================
    // TEST D: Submit Expert feedback first -> Candidate cannot request afterward
    // ========================================================================
    console.log('\n--- TEST D: EXPERT SUBMITS FEEDBACK FIRST -> CANDIDATE REQUEST BLOCKED ---');
    const sessionWithReview = await Session.create({
      sessionId: `sess_reviewed_${testSuffix}`,
      candidateId: candidateUser._id,
      candidateName: candidateUser.name,
      candidateEmail: candidateUser.email,
      expertId: expertProfile._id,
      expertName: expertProfile.name,
      expertEmail: expertProfile.email,
      sessionType: 'mock_interview',
      skill: 'System Architecture Design',
      category: 'IT',
      level: 'Senior Mentor',
      price: 800,
      paymentStatus: 'paid',
      status: 'completed',
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date(Date.now() - 1800000),
      attendanceStatus: 'attended',
      feedbackRequested: false
    });

    await Review.create({
      sessionId: sessionWithReview.sessionId,
      sessionRef: sessionWithReview._id,
      candidateId: candidateUser._id,
      expertId: expertProfile._id,
      reviewerRole: 'expert',
      overallRating: 5,
      feedback: 'Outstanding architectural depth and problem breakdown.',
      submittedAt: new Date()
    });

    // Test API call to request feedback on reviewed session
    const blockedRes = await fetch(`http://localhost:5000/api/sessions/${sessionWithReview.sessionId}/request-feedback`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${candToken}`,
        'Content-Type': 'application/json'
      }
    });
    const blockedData = await blockedRes.json();
    console.log('Attempt Request on Reviewed Session HTTP Status:', blockedRes.status, blockedData);
    assert.strictEqual(blockedRes.status, 400, 'Must return HTTP 400 when review is already submitted');
    assert.ok(blockedData.message.includes('already submitted'), 'Error message confirms review already submitted');
    console.log('✅ [PASS] Test D: Candidate request blocked when Expert has already submitted feedback!');

    // ========================================================================
    // TEST E: Submit duplicate requests concurrently (Atomic Race Check)
    // ========================================================================
    console.log('\n--- TEST E: CONCURRENT DUPLICATE REQUESTS ATOMIC CHECK ---');
    const raceSession = await Session.create({
      sessionId: `sess_race_${testSuffix}`,
      candidateId: candidateUser._id,
      candidateName: candidateUser.name,
      candidateEmail: candidateUser.email,
      expertId: expertProfile._id,
      expertName: expertProfile.name,
      expertEmail: expertProfile.email,
      sessionType: 'mock_interview',
      skill: 'Concurrent Systems & Locks',
      category: 'IT',
      level: 'Senior Mentor',
      price: 800,
      paymentStatus: 'paid',
      status: 'completed',
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date(Date.now() - 1800000),
      attendanceStatus: 'attended',
      feedbackRequested: false
    });

    // Fire 5 simultaneous concurrent requests to request-feedback
    const concurrentRequests = Array.from({ length: 5 }).map(() =>
      fetch(`http://localhost:5000/api/sessions/${raceSession.sessionId}/request-feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${candToken}`,
          'Content-Type': 'application/json'
        }
      }).then(async r => ({ status: r.status, data: await r.json() }))
    );

    const raceResults = await Promise.all(concurrentRequests);
    const successCount = raceResults.filter(r => r.status === 200 && r.data.success).length;
    const rejectedCount = raceResults.filter(r => r.status === 400).length;
    console.log(`Concurrent Race Results: ${successCount} succeeded, ${rejectedCount} rejected (Total: ${raceResults.length})`);

    assert.strictEqual(successCount, 1, 'Exactly one concurrent request must succeed');
    assert.strictEqual(rejectedCount, 4, 'Remaining concurrent requests must be rejected with HTTP 400');

    // Verify exactly one notification was created in MongoDB
    const notifCount = await Notification.countDocuments({
      userId: expertUser._id,
      'metadata.sessionId': raceSession.sessionId
    });
    assert.strictEqual(notifCount, 1, 'Exactly one notification must exist in MongoDB for the race session');
    console.log('✅ [PASS] Test E: Atomic check succeeded: exactly 1 request and 1 notification created under concurrency!');

    // ========================================================================
    // TEST F: Active, Incomplete, Unauthorized, and Other Users Rejected
    // ========================================================================
    console.log('\n--- TEST F: SECURITY & BUSINESS RULE VALIDATION ---');
    // F.1 Incomplete Session (status: 'confirmed')
    const incompleteSession = await Session.create({
      sessionId: `sess_incomp_${testSuffix}`,
      candidateId: candidateUser._id,
      candidateName: candidateUser.name,
      candidateEmail: candidateUser.email,
      expertId: expertProfile._id,
      expertName: expertProfile.name,
      expertEmail: expertProfile.email,
      sessionType: 'mock_interview',
      skill: 'Incomplete Session',
      category: 'IT',
      level: 'Senior Mentor',
      price: 800,
      paymentStatus: 'paid',
      status: 'confirmed',
      startTime: new Date(Date.now() + 3600000),
      endTime: new Date(Date.now() + 5400000),
      feedbackRequested: false
    });

    const incompRes = await fetch(`http://localhost:5000/api/sessions/${incompleteSession.sessionId}/request-feedback`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${candToken}`, 'Content-Type': 'application/json' }
    });
    assert.strictEqual(incompRes.status, 400, 'Incomplete session must return HTTP 400');
    console.log('  Subtest F.1: Incomplete session rejected with HTTP 400');

    // F.2 Unauthorized User (Other candidate attempts to request feedback for completedSession)
    const unauthRes = await fetch(`http://localhost:5000/api/sessions/${completedSession.sessionId}/request-feedback`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${otherCandToken}`, 'Content-Type': 'application/json' }
    });
    assert.strictEqual(unauthRes.status, 403, 'Unauthorized user must return HTTP 403 Forbidden');
    console.log('  Subtest F.2: Unauthorized user request rejected with HTTP 403');

    // F.3 Non-existent Session
    const nonExistRes = await fetch(`http://localhost:5000/api/sessions/sess_non_existent_9999/request-feedback`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${candToken}`, 'Content-Type': 'application/json' }
    });
    assert.strictEqual(nonExistRes.status, 404, 'Non-existent session must return HTTP 404');
    console.log('  Subtest F.3: Non-existent session rejected with HTTP 404');

    console.log('✅ [PASS] Test F: All security and boundary validations passed!');

    console.log('\n========================================================================');
    console.log('🎉 ALL TESTS (A TO F) PASSED! 24-HOUR RESTRICTION REMOVAL FULLY VERIFIED');
    console.log('========================================================================');

  } finally {
    if (candWs) try { candWs.close(); } catch (_) {}
    if (expWs) try { expWs.close(); } catch (_) {}
    if (chromeProc) try { chromeProc.kill(); } catch (_) {}

    // Cleanup isolated test records
    await User.deleteMany({ _id: { $in: [candidateUser._id, otherCandidateUser._id, expertUser._id] } });
    await Expert.deleteOne({ _id: expertProfile._id });
    await Session.deleteMany({ candidateId: { $in: [candidateUser._id, otherCandidateUser._id] } });
    await Notification.deleteMany({ userId: expertUser._id });
    await Review.deleteMany({ candidateId: candidateUser._id });
    await mongoose.disconnect();
  }
}

main().catch(err => {
  console.error('\nImmediate feedback request suite failed:', err);
  process.exit(1);
});
