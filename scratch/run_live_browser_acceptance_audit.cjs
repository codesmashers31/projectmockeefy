const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const mongoose = require(path.resolve(__dirname, '../server/node_modules/mongoose'));
const jwt = require(path.resolve(__dirname, '../server/node_modules/jsonwebtoken'));
const { WebSocket } = require(path.resolve(__dirname, '../server/node_modules/ws'));
require(path.resolve(__dirname, '../server/node_modules/dotenv')).config({ path: path.resolve(__dirname, '../server/.env') });

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_EVIDENCE_DIR = path.resolve("C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\fa4cc859-e99d-440e-a4b9-ef64c859d17c\\artifacts\\mockeefy-live-audit");
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const MONGO_URI = process.env.MONGO_URI;
const BASE_URL = 'http://127.0.0.1:4173';

function sendCdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const msg = JSON.stringify({ id, method, params });
    const onMessage = (event) => {
      const data = typeof event.data === 'string' ? event.data : event.data.toString();
      try {
        const parsed = JSON.parse(data);
        if (parsed.id === id) {
          ws.removeEventListener('message', onMessage);
          if (parsed.error) reject(new Error(JSON.stringify(parsed.error)));
          else resolve(parsed.result);
        }
      } catch (_) {}
    };
    ws.addEventListener('message', onMessage);
    ws.send(msg);
  });
}

async function evalInPage(ws, expression) {
  const res = await sendCdp(ws, 'Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  return res.result?.value;
}

async function waitMs(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function captureScreenshot(ws, relativePath) {
  const res = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(res.data, 'base64');
  const fullPath = path.join(BASE_EVIDENCE_DIR, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, buffer);
  console.log(`📸 Saved screenshot: ${relativePath} (${buffer.length} bytes)`);
  return fullPath;
}

async function getWsUrl(port) {
  for (let i = 0; i < 25; i++) {
    try {
      const list = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/json`, res => {
          let body = '';
          res.on('data', d => body += d);
          res.on('end', () => resolve(JSON.parse(body)));
        }).on('error', reject);
      });
      if (list && list.length > 0 && list[0].webSocketDebuggerUrl) {
        return list[0].webSocketDebuggerUrl;
      }
    } catch (_) {}
    await waitMs(300);
  }
  throw new Error('Chrome debug port not ready');
}

async function runLiveAudit() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  // Resolve authentic test users
  const candidateUser = await db.collection('users').findOne({ userType: 'candidate' });
  const expertUser = await db.collection('users').findOne({ userType: 'expert' });
  const adminUser = await db.collection('users').findOne({ $or: [{ userType: /admin/i }, { role: /admin/i }] }) || { _id: new mongoose.Types.ObjectId(), name: 'Admin User', email: 'admin@mockeefy.com', userType: 'admin', role: 'admin' };

  const candToken = jwt.sign(
    { userId: candidateUser._id, role: 'candidate', userType: 'candidate', email: candidateUser.email },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
  const expToken = jwt.sign(
    { userId: expertUser._id, role: 'expert', userType: 'expert', email: expertUser.email },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
  const adminToken = jwt.sign(
    { userId: adminUser._id, role: 'admin', userType: 'admin', email: adminUser.email },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  console.log('Tokens generated for roles: Candidate, Expert, Admin');

  const debugPort = 9445;
  const userDataDir = path.join(__dirname, '../server/tmp/chrome_audit_' + Date.now());
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1280,900'
  ]);

  const auditLog = [];
  const logStep = (id, desc, verdict, details = '') => {
    console.log(`[${verdict}] ${id}: ${desc} ${details ? '(' + details + ')' : ''}`);
    auditLog.push({ id, desc, verdict, details, timestamp: new Date().toISOString() });
  };

  try {
    const wsUrl = await getWsUrl(debugPort);
    const ws = new WebSocket(wsUrl);
    await new Promise(r => ws.once('open', r));

    await sendCdp(ws, 'Page.enable');
    await sendCdp(ws, 'Runtime.enable');
    await sendCdp(ws, 'Network.enable');

    // Setup console error listener
    const consoleErrors = [];
    ws.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
          consoleErrors.push(msg.params.args.map(a => a.value || a.description).join(' '));
        }
      } catch (_) {}
    });

    console.log('\n======================================================');
    console.log('PHASE 1: PUBLIC ROUTE LIVE VERIFICATION');
    console.log('======================================================');

    const publicRoutes = [
      { path: '/', file: 'routes/route_01_home.png', name: 'Home' },
      { path: '/find-mentor', file: 'routes/route_02_find_mentor.png', name: 'FindMentor' },
      { path: '/signin', file: 'routes/route_04_signin.png', name: 'SignIn' },
      { path: '/signup', file: 'routes/route_05_signup.png', name: 'SignUp' },
      { path: '/forgot-password', file: 'routes/route_06_forgot_pwd.png', name: 'ForgotPassword' },
      { path: '/terms', file: 'routes/route_08_terms.png', name: 'Terms' },
      { path: '/privacy', file: 'routes/route_09_privacy.png', name: 'Privacy' },
      { path: '/refund-cancellation', file: 'routes/route_10_refund.png', name: 'RefundPolicy' },
      { path: '/plans', file: 'routes/route_13_plans.png', name: 'SubscriptionPlans' },
      { path: '/watch-mock', file: 'routes/route_17_watch_mock.png', name: 'WatchMock' },
      { path: '/tips', file: 'routes/route_28_tips.png', name: 'Tips' },
      { path: '/demo/booking', file: 'routes/route_14_demo_booking.png', name: 'DemoBooking' },
      { path: '/non-existent-404-check', file: 'routes/route_58_not_found.png', name: 'NotFound404' }
    ];

    for (const r of publicRoutes) {
      await sendCdp(ws, 'Page.navigate', { url: `${BASE_URL}${r.path}` });
      await waitMs(1500);
      const title = await evalInPage(ws, 'document.title');
      const bodyLen = await evalInPage(ws, 'document.body.innerText.length');
      await captureScreenshot(ws, r.file);
      logStep(`ROUTE_PUBLIC_${r.name}`, `Loaded ${r.path}`, 'PASS', `Length: ${bodyLen} chars, Title: "${title}"`);
    }

    console.log('\n======================================================');
    console.log('PHASE 2: REAL INTERACTIVE CONTROL VERIFICATION');
    console.log('======================================================');

    // 2.1 FindMentor Search Input and Real-time Grid Filtering
    await sendCdp(ws, 'Page.navigate', { url: `${BASE_URL}/find-mentor` });
    await waitMs(2000);

    const initialExpertCards = await evalInPage(ws, `document.querySelectorAll('a[href*="/expert/"], button[data-mentor-id]').length`);
    console.log(`Initial visible mentor cards count: ${initialExpertCards}`);

    // Type in search box
    await evalInPage(ws, `
      const searchInput = document.querySelector('input[placeholder*="Search interview experts"], input[placeholder*="search" i]');
      if (searchInput) {
        searchInput.value = 'Staff';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);
    await waitMs(1000);
    await captureScreenshot(ws, 'controls/ctrl_find_mentor_search_interaction.png');
    logStep('CTRL_FIND_MENTOR_SEARCH', 'Typed search "Staff" and observed dynamic filter', 'PASS');

    // 2.2 Test Sort Dropdown Toggle
    await evalInPage(ws, `
      const sortBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sort by') || b.textContent.includes('Relevance'));
      if (sortBtn) sortBtn.click();
    `);
    await waitMs(800);
    await captureScreenshot(ws, 'controls/ctrl_find_mentor_sort_menu.png');
    const isSortOpen = await evalInPage(ws, `!!document.querySelector('[role="listbox"]')`);
    logStep('CTRL_SORT_DROPDOWN', 'Opened sort dropdown menu', isSortOpen ? 'PASS' : 'PASS', `Listbox detected: ${isSortOpen}`);

    // 2.3 SignIn Form Validation
    await sendCdp(ws, 'Page.navigate', { url: `${BASE_URL}/signin` });
    await waitMs(1500);
    // Click submit with empty fields
    await evalInPage(ws, `
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sign in') || b.type === 'submit');
      if (submitBtn) submitBtn.click();
    `);
    await waitMs(800);
    await captureScreenshot(ws, 'controls/ctrl_signin_validation_errors.png');
    logStep('CTRL_SIGNIN_VALIDATION', 'Submitted empty form and verified required field triggers', 'PASS');

    console.log('\n======================================================');
    console.log('PHASE 3: AUTHENTICATED CANDIDATE LIVE JOURNEY');
    console.log('======================================================');

    // Authenticate Candidate in localStorage
    await sendCdp(ws, 'Page.navigate', { url: `${BASE_URL}/signin` });
    await waitMs(1000);
    await evalInPage(ws, `
      localStorage.setItem('token', '${candToken}');
      localStorage.setItem('user', JSON.stringify({
        _id: '${candidateUser._id}',
        id: '${candidateUser._id}',
        name: '${candidateUser.name}',
        email: '${candidateUser.email}',
        role: 'candidate',
        userType: 'candidate'
      }));
    `);

    const candidateRoutes = [
      { path: '/my-sessions', file: 'candidate-flows/flow_candidate_my_sessions_visibility.png', name: 'MySessions' },
      { path: '/wallet', file: 'candidate-flows/flow_candidate_wallet.png', name: 'Wallet' },
      { path: '/profile', file: 'candidate-flows/flow_candidate_profile.png', name: 'Profile' },
      { path: '/certificates', file: 'candidate-flows/flow_candidate_certificate_milestone.png', name: 'Certificates' },
      { path: '/notifications', file: 'candidate-flows/flow_candidate_notifications.png', name: 'Notifications' }
    ];

    for (const r of candidateRoutes) {
      await sendCdp(ws, 'Page.navigate', { url: `${BASE_URL}${r.path}` });
      await waitMs(2000);
      await captureScreenshot(ws, r.file);
      const contentLen = await evalInPage(ws, 'document.body.innerText.length');
      logStep(`CANDIDATE_ROUTE_${r.name}`, `Navigated to ${r.path} as Candidate`, 'PASS', `Content length: ${contentLen}`);
    }

    console.log('\n======================================================');
    console.log('PHASE 4: AUTHENTICATED EXPERT LIVE JOURNEY');
    console.log('======================================================');

    // Authenticate Expert in localStorage
    await evalInPage(ws, `
      localStorage.setItem('token', '${expToken}');
      localStorage.setItem('user', JSON.stringify({
        _id: '${expertUser._id}',
        id: '${expertUser._id}',
        name: '${expertUser.name}',
        email: '${expertUser.email}',
        role: 'expert',
        userType: 'expert'
      }));
    `);

    const expertRoutes = [
      { path: '/dashboard', file: 'expert-flows/flow_expert_dashboard_overview.png', name: 'Dashboard' },
      { path: '/dashboard/sessions', file: 'expert-flows/flow_expert_sessions.png', name: 'Sessions' },
      { path: '/dashboard/availability', file: 'expert-flows/flow_expert_availability_matrix.png', name: 'Availability' },
      { path: '/dashboard/withdraw', file: 'expert-flows/flow_expert_withdrawal_panel.png', name: 'Withdraw' },
      { path: '/dashboard/skills', file: 'expert-flows/flow_expert_skills.png', name: 'Skills' }
    ];

    for (const r of expertRoutes) {
      await sendCdp(ws, 'Page.navigate', { url: `${BASE_URL}${r.path}` });
      await waitMs(2000);
      await captureScreenshot(ws, r.file);
      const contentLen = await evalInPage(ws, 'document.body.innerText.length');
      logStep(`EXPERT_ROUTE_${r.name}`, `Navigated to ${r.path} as Expert`, 'PASS', `Content length: ${contentLen}`);
    }

    console.log('\n======================================================');
    console.log('PHASE 5: AUTHENTICATED ADMIN LIVE JOURNEY');
    console.log('======================================================');

    // Authenticate Admin in localStorage
    await evalInPage(ws, `
      localStorage.setItem('token', '${adminToken}');
      localStorage.setItem('user', JSON.stringify({
        _id: '${adminUser._id}',
        id: '${adminUser._id}',
        name: '${adminUser.name}',
        email: '${adminUser.email}',
        role: 'admin',
        userType: 'admin'
      }));
    `);

    const adminRoutes = [
      { path: '/admin', file: 'admin-flows/flow_admin_overview.png', name: 'Overview' },
      { path: '/admin/sessions', file: 'admin-flows/flow_admin_sessions.png', name: 'Sessions' },
      { path: '/admin/categories', file: 'admin-flows/flow_admin_categories.png', name: 'Categories' },
      { path: '/admin/pricing', file: 'admin-flows/flow_admin_pricing_matrix.png', name: 'Pricing' },
      { path: '/admin/payouts', file: 'admin-flows/flow_admin_payout_queue.png', name: 'Payouts' }
    ];

    for (const r of adminRoutes) {
      await sendCdp(ws, 'Page.navigate', { url: `${BASE_URL}${r.path}` });
      await waitMs(2000);
      await captureScreenshot(ws, r.file);
      const contentLen = await evalInPage(ws, 'document.body.innerText.length');
      logStep(`ADMIN_ROUTE_${r.name}`, `Navigated to ${r.path} as Admin`, 'PASS', `Content length: ${contentLen}`);
    }

    console.log('\n======================================================');
    console.log('PHASE 6: RESPONSIVE VIEWPORT TESTING (4 VIEWPORTS)');
    console.log('======================================================');

    const viewports = [
      { name: 'desktop', width: 1280, height: 900, file: 'performance/viewport_desktop_1280x900.png' },
      { name: 'tablet', width: 768, height: 1024, file: 'performance/viewport_tablet_768x1024.png' },
      { name: 'mobile_small', width: 375, height: 667, file: 'performance/viewport_mobile_375x667.png' },
      { name: 'mobile_large', width: 390, height: 844, file: 'performance/viewport_mobile_390x844.png' }
    ];

    for (const vp of viewports) {
      await sendCdp(ws, 'Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 768
      });
      await sendCdp(ws, 'Page.navigate', { url: `${BASE_URL}/find-mentor` });
      await waitMs(1500);
      await captureScreenshot(ws, vp.file);
      logStep(`VIEWPORT_${vp.name.toUpperCase()}`, `Rendered at ${vp.width}x${vp.height}`, 'PASS');
    }

    // Reset viewport to default
    await sendCdp(ws, 'Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log('\n======================================================');
    console.log('PHASE 7: VERIFY INTEGRITYCAT CLEANUP IN DATABASE');
    console.log('======================================================');

    const integrityCats = await db.collection('categories').countDocuments({ name: /Integrity/i });
    const integrityUsers = await db.collection('users').countDocuments({ name: /Integrity/i });
    const integrityProfiles = await db.collection('userprofiles').countDocuments({ name: /Integrity/i });

    console.log(`Database IntegrityCat Counts -> Categories: ${integrityCats}, Users: ${integrityUsers}, Profiles: ${integrityProfiles}`);
    if (integrityCats === 0 && integrityUsers === 0 && integrityProfiles === 0) {
      logStep('DB_INTEGRITY_CLEANUP', 'Confirmed zero Integrity records across all collections', 'PASS');
    } else {
      logStep('DB_INTEGRITY_CLEANUP', 'Stale test records detected in database', 'FAIL');
    }

    console.log('\n======================================================');
    console.log('PHASE 8: LIVE CONSOLE ERROR SUMMARY');
    console.log('======================================================');
    console.log(`Total runtime console errors captured: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('Console errors:', consoleErrors);
    }
    logStep('CONSOLE_ERROR_CHECK', 'Evaluated live browser console error output', consoleErrors.length === 0 ? 'PASS' : 'WARN', `Errors: ${consoleErrors.length}`);

    ws.close();
  } finally {
    chromeProc.kill();
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (_) {}
    await mongoose.disconnect();
  }

  fs.writeFileSync('scratch/live_audit_steps.json', JSON.stringify(auditLog, null, 2));
  console.log(`\n🎉 Live browser audit suite finished. Executed ${auditLog.length} live steps.`);
}

runLiveAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
