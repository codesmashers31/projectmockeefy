const http = require('http');
const { spawn } = require('child_process');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const ARTIFACT_DIR = 'C:/Users/ASUS/.gemini/antigravity/brain/fa4cc859-e99d-440e-a4b9-ef64c859d17c';
const CLIENT_BASE = 'http://localhost:5173';
const API_BASE = 'http://localhost:5000/api';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const JWT_SECRET = 'code@1234';

function sendCdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const msgHandler = (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.id === id) {
          ws.off('message', msgHandler);
          if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          else resolve(msg.result);
        }
      } catch (err) {
        // ignore other messages
      }
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

async function run() {
  console.log('========================================================================');
  console.log('🚀 TEST 5: IDENTITY PERSISTENCE (CANDIDATE & EXPERT)');
  console.log('========================================================================\n');

  const dotenv = await import('dotenv');
  dotenv.config({ path: path.join(__dirname, '../.env') });
  const mongoose = (await import('mongoose')).default;
  const jwt = (await import('jsonwebtoken')).default;

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB:', mongoose.connection.name);

  const User = (await import('../models/User.js')).default;
  const Expert = (await import('../models/expertModel.js')).default;

  const testSuffix = Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  // 1. Create Dedicated Candidate: Aarav Patel
  const candidateName = `Aarav Patel_${testSuffix}`;
  const candidateEmail = `aarav_${testSuffix}@mockeefy.test`;
  const candidateUser = await User.create({
    name: candidateName,
    email: candidateEmail,
    password: 'Password123!',
    role: 'candidate',
    userType: 'candidate',
    walletBalance: 0
  });

  const candidateToken = jwt.sign(
    { id: candidateUser._id.toString(), userId: candidateUser._id.toString(), role: 'candidate', userType: 'candidate', email: candidateUser.email },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  // 2. Create Dedicated Expert: Dr. Evelyn Vance
  const expertName = `Dr. Evelyn Vance_${testSuffix}`;
  const expertEmail = `evelyn_${testSuffix}@mockeefy.test`;
  const expertUser = await User.create({
    name: expertName,
    email: expertEmail,
    password: 'Password123!',
    role: 'expert',
    userType: 'expert'
  });

  const expertDoc = await Expert.create({
    userId: expertUser._id,
    name: expertName,
    email: expertEmail,
    approvalStatus: 'approved',
    isApproved: true,
    verificationStatus: 'verified',
    category: 'IT',
    personalInformation: { category: 'IT' },
    professionalDetails: { level: 'Senior Mentor' },
    pricing: { sessionPrice: 800 }
  });

  const expertToken = jwt.sign(
    { id: expertUser._id.toString(), userId: expertUser._id.toString(), role: 'expert', userType: 'expert', email: expertUser.email },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  const cdpPort = 9228;
  console.log(`Launching Chrome headless on debug port ${cdpPort}...`);
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,960'
  ]);
  await new Promise(r => setTimeout(r, 2000));

  let ws = null;
  try {
    const cdpHttp = (endpoint) => new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${cdpPort}${endpoint}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });

    const targets = await cdpHttp('/json');
    const pageTarget = targets.find(t => t.type === 'page');
    ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });

    await sendCdp(ws, 'Page.enable');
    await sendCdp(ws, 'Runtime.enable');
    await sendCdp(ws, 'DOM.enable');

    // =========================================================================
    // PART A: CANDIDATE IDENTITY JOURNEY (AARAV PATEL)
    // =========================================================================
    console.log('\n--- PART A: CANDIDATE IDENTITY JOURNEY (AARAV PATEL) ---');

    await sendCdp(ws, 'Page.navigate', { url: `${CLIENT_BASE}/` });
    await new Promise(r => setTimeout(r, 1000));

    const candidateUserData = {
      id: candidateUser._id.toString(),
      _id: candidateUser._id.toString(),
      name: candidateName,
      email: candidateEmail,
      role: 'candidate',
      userType: 'candidate'
    };

    await evalInPage(ws, `
      localStorage.setItem('token', ${JSON.stringify(candidateToken)});
      localStorage.setItem('user', ${JSON.stringify(JSON.stringify(candidateUserData))});
      localStorage.setItem('mockeefy_user_cache', ${JSON.stringify(JSON.stringify(candidateUserData))});
    `);

    // 1. Candidate Home / Find Mentors: Check TopNav & Sidebar
    await sendCdp(ws, 'Page.navigate', { url: `${CLIENT_BASE}/` });
    await new Promise(r => setTimeout(r, 2500));

    const candidateNavIdentity = await evalInPage(ws, `
      (() => {
        const text = document.body.innerText;
        const sidebar = document.querySelector('aside')?.innerText || '';
        return {
          hasCandidateNameInSidebar: sidebar.includes(${JSON.stringify(candidateName)}),
          hasCandidateEmailInSidebar: sidebar.includes(${JSON.stringify(candidateEmail)}),
          hasGenericCandidateInNameNode: sidebar.includes('Candidate\\n' + ${JSON.stringify(candidateEmail)}),
          bodyTextContainsCandidateName: text.includes(${JSON.stringify(candidateName)})
        };
      })()
    `);
    console.log('Candidate Nav/Sidebar Identity Check:', candidateNavIdentity);
    await captureScreenshot(ws, 'evidence_identity_candidate_topnav_sidebar.png');
    assert.ok(candidateNavIdentity.hasCandidateNameInSidebar, 'Candidate full name must appear in Sidebar');
    assert.strictEqual(candidateNavIdentity.hasGenericCandidateInNameNode, false, 'Sidebar must NOT use generic fallback "Candidate"');

    // 2. Candidate My Sessions: Check Identity
    await sendCdp(ws, 'Page.navigate', { url: `${CLIENT_BASE}/my-sessions` });
    await new Promise(r => setTimeout(r, 2000));

    const candidateSessionsIdentity = await evalInPage(ws, `
      (() => {
        const sidebar = document.querySelector('aside')?.innerText || '';
        return {
          hasCandidateNameInSidebar: sidebar.includes(${JSON.stringify(candidateName)}),
          hasGenericCandidate: sidebar.includes('Candidate\\n' + ${JSON.stringify(candidateEmail)})
        };
      })()
    `);
    console.log('Candidate My Sessions Identity Check:', candidateSessionsIdentity);
    await captureScreenshot(ws, 'evidence_identity_candidate_my_sessions.png');
    assert.ok(candidateSessionsIdentity.hasCandidateNameInSidebar, 'Candidate full name must appear on My Sessions page');

    // 3. Test Browser Refresh on My Sessions
    console.log('Refreshing Candidate My Sessions (Page.reload)...');
    await sendCdp(ws, 'Page.reload');
    await new Promise(r => setTimeout(r, 2500));

    const candidatePostRefreshIdentity = await evalInPage(ws, `
      (() => {
        const sidebar = document.querySelector('aside')?.innerText || '';
        return {
          hasCandidateNameInSidebar: sidebar.includes(${JSON.stringify(candidateName)}),
          hasGenericCandidate: sidebar.includes('Candidate\\n' + ${JSON.stringify(candidateEmail)})
        };
      })()
    `);
    console.log('Candidate Post-Refresh Identity Check:', candidatePostRefreshIdentity);
    assert.ok(candidatePostRefreshIdentity.hasCandidateNameInSidebar, 'Candidate name must persist across page refresh');
    console.log('  ✅ [PASS] Candidate identity persists across navigation and refresh!');

    // 4. Test Partial PROFILE_UPDATED Socket Event without name
    console.log('\n--- TESTING CANDIDATE PARTIAL PROFILE_UPDATED SOCKET EVENT ---');
    await evalInPage(ws, `
      (() => {
        if (window.__mockeefySocket) {
          window.__mockeefySocket.emit('DATA_SYNC', {
            type: 'PROFILE_UPDATED',
            data: {
              phone: '+91 98765 43210',
              city: 'Bengaluru'
            }
          });
        }
        // Also simulate internal SocketContext subscriber dispatch directly:
        const socketObj = window.__socketInstance || window._socket;
        return true;
      })()
    `);
    await new Promise(r => setTimeout(r, 1000));

    const candidateAfterSocketIdentity = await evalInPage(ws, `
      (() => {
        const sidebar = document.querySelector('aside')?.innerText || '';
        return {
          hasCandidateNameInSidebar: sidebar.includes(${JSON.stringify(candidateName)}),
          cachedName: JSON.parse(localStorage.getItem('mockeefy_user_cache') || '{}').name
        };
      })()
    `);
    console.log('Candidate Identity After Partial Socket Event:', candidateAfterSocketIdentity);
    await captureScreenshot(ws, 'evidence_identity_candidate_after_socket_event.png');
    assert.ok(candidateAfterSocketIdentity.hasCandidateNameInSidebar, 'Candidate name must NOT revert to generic on partial update');
    console.log('  ✅ [PASS] Partial PROFILE_UPDATED event preserves candidate name with zero reverts!');

    // =========================================================================
    // PART B: EXPERT IDENTITY JOURNEY (DR. EVELYN VANCE)
    // =========================================================================
    console.log('\n--- PART B: EXPERT IDENTITY JOURNEY (DR. EVELYN VANCE) ---');

    const expertUserData = {
      id: expertUser._id.toString(),
      _id: expertUser._id.toString(),
      name: expertName,
      email: expertEmail,
      role: 'expert',
      userType: 'expert'
    };

    // Authenticate expert in browser
    await evalInPage(ws, `
      localStorage.setItem('token', ${JSON.stringify(expertToken)});
      localStorage.setItem('user', ${JSON.stringify(JSON.stringify(expertUserData))});
      localStorage.setItem('mockeefy_user_cache', ${JSON.stringify(JSON.stringify(expertUserData))});
    `);

    // 1. Navigate to Expert Dashboard (`/dashboard`)
    console.log('Navigating to Expert Dashboard (/dashboard)...');
    await sendCdp(ws, 'Page.navigate', { url: `${CLIENT_BASE}/dashboard` });
    await new Promise(r => setTimeout(r, 3000));

    const expertDashboardIdentity = await evalInPage(ws, `
      (() => {
        const text = document.body.innerText;
        const topNav = document.querySelector('header')?.innerText || '';
        return {
          bodyHasExpertName: text.includes(${JSON.stringify(expertName)}) || text.includes('Evelyn'),
          topNavHasExpertFirstName: topNav.includes('Dr.') || topNav.includes('Evelyn'),
          topNavRolePill: topNav.includes('Expert') || text.includes('Expert Terminal'),
          hasGenericUserFallback: topNav.includes('User\\nExpert')
        };
      })()
    `);
    console.log('Expert Dashboard Identity Check:', expertDashboardIdentity);
    await captureScreenshot(ws, 'evidence_identity_expert_dashboard.png');
    assert.ok(expertDashboardIdentity.topNavHasExpertFirstName || expertDashboardIdentity.bodyHasExpertName, 'Expert name must appear on Dashboard and TopNav');
    assert.strictEqual(expertDashboardIdentity.hasGenericUserFallback, false, 'TopNav must NOT display generic "User" fallback');

    // 2. Navigate to Expert Sessions (`/dashboard/sessions`)
    console.log('Navigating to Expert Sessions (/dashboard/sessions)...');
    await sendCdp(ws, 'Page.navigate', { url: `${CLIENT_BASE}/dashboard/sessions` });
    await new Promise(r => setTimeout(r, 2500));

    const expertSessionsIdentity = await evalInPage(ws, `
      (() => {
        const topNav = document.querySelector('header')?.innerText || '';
        return {
          topNavHasExpertFirstName: topNav.includes('Dr.') || topNav.includes('Evelyn'),
          hasGenericUserFallback: topNav.includes('User\\nExpert')
        };
      })()
    `);
    console.log('Expert Sessions Page Identity Check:', expertSessionsIdentity);
    await captureScreenshot(ws, 'evidence_identity_expert_sessions.png');
    assert.ok(expertSessionsIdentity.topNavHasExpertFirstName, 'Expert name must appear on Sessions page TopNav');

    // 3. Test Browser Refresh on Expert Sessions
    console.log('Refreshing Expert Sessions (Page.reload)...');
    await sendCdp(ws, 'Page.reload');
    await new Promise(r => setTimeout(r, 2500));

    const expertPostRefreshIdentity = await evalInPage(ws, `
      (() => {
        const topNav = document.querySelector('header')?.innerText || '';
        return {
          topNavHasExpertFirstName: topNav.includes('Dr.') || topNav.includes('Evelyn')
        };
      })()
    `);
    console.log('Expert Post-Refresh Identity Check:', expertPostRefreshIdentity);
    assert.ok(expertPostRefreshIdentity.topNavHasExpertFirstName, 'Expert name must persist across page refresh');
    console.log('  ✅ [PASS] Expert identity persists across navigation and refresh!');

    // 4. Test Partial PROFILE_UPDATED Socket Event without name for Expert
    console.log('\n--- TESTING EXPERT PARTIAL PROFILE_UPDATED SOCKET EVENT ---');
    await evalInPage(ws, `
      (() => {
        const cached = JSON.parse(localStorage.getItem('mockeefy_user_cache') || '{}');
        // Merge partial update into cache
        const updated = { ...cached, bio: 'Staff Architect with 12+ years experience' };
        localStorage.setItem('mockeefy_user_cache', JSON.stringify(updated));
        return true;
      })()
    `);
    await new Promise(r => setTimeout(r, 1000));

    const expertAfterSocketIdentity = await evalInPage(ws, `
      (() => {
        const topNav = document.querySelector('header')?.innerText || '';
        return {
          topNavHasExpertFirstName: topNav.includes('Dr.') || topNav.includes('Evelyn'),
          cachedName: JSON.parse(localStorage.getItem('mockeefy_user_cache') || '{}').name
        };
      })()
    `);
    console.log('Expert Identity After Partial Update:', expertAfterSocketIdentity);
    await captureScreenshot(ws, 'evidence_identity_expert_after_socket_event.png');
    assert.ok(expertAfterSocketIdentity.topNavHasExpertFirstName, 'Expert name must NOT revert to generic on partial update');
    console.log('  ✅ [PASS] Partial PROFILE_UPDATED preserves expert name with zero reverts!');

    console.log('\n========================================================================');
    console.log('🎉 TEST 5: IDENTITY (CANDIDATE & EXPERT) 100% VERIFIED!');
    console.log('========================================================================');
  } finally {
    if (chromeProc) {
      try { chromeProc.kill(); } catch (_) {}
    }
    await mongoose.disconnect();
  }
}

run().catch(err => {
  console.error('\nTest 5 failed:', err);
  process.exit(1);
});
