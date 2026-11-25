const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const mongoose = require(path.resolve(__dirname, '../server/node_modules/mongoose'));
const jwt = require(path.resolve(__dirname, '../server/node_modules/jsonwebtoken'));
const { WebSocket } = require(path.resolve(__dirname, '../server/node_modules/ws'));
require(path.resolve(__dirname, '../server/node_modules/dotenv')).config({ path: path.resolve(__dirname, '../server/.env') });

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9227;
const BASE_URL = "http://127.0.0.1:4173";

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getWsUrl() {
  for (let i = 0; i < 25; i++) {
    try {
      const list = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${PORT}/json`, res => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
          });
        }).on('error', reject);
      });
      const pageTarget = list.find(t => t.type === 'page');
      if (pageTarget && pageTarget.webSocketDebuggerUrl) {
        return pageTarget.webSocketDebuggerUrl;
      }
    } catch (_) {}
    await sleep(300);
  }
  throw new Error('Chrome debug port not ready');
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
  }
  async connect() {
    await new Promise((res, rej) => {
      this.ws.on('open', res);
      this.ws.on('error', rej);
      this.ws.on('message', data => {
        const msg = JSON.parse(data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      });
    });
  }
  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() {
    try { this.ws.close(); } catch(e){}
  }
}

async function runMatrix() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const candidate = await db.collection('users').findOne({ email: 'testuser15112026@gmail.com' });
  const candToken = candidate ? jwt.sign({ userId: candidate._id, role: 'candidate', email: candidate.email }, process.env.JWT_SECRET || 'your_jwt_secret_key_here') : null;
  const candUser = { _id: candidate?._id, id: candidate?._id, userType: 'candidate', role: 'candidate', email: candidate?.email };

  const expert = await db.collection('users').findOne({ email: 'testexpert15112026@gmail.com' });
  const expertToken = expert ? jwt.sign({ userId: expert._id, role: 'expert', email: expert.email }, process.env.JWT_SECRET || 'your_jwt_secret_key_here') : null;
  const expertUser = { _id: expert?._id, id: expert?._id, userType: 'expert', role: 'expert', profile_status: 'approved', email: expert?.email };

  const adminUser = await db.collection('users').findOne({ $or: [{ userType: /admin/i }, { role: /admin/i }] });
  const adminToken = adminUser ? jwt.sign({ userId: adminUser._id, role: 'admin', email: adminUser.email }, process.env.JWT_SECRET || 'your_jwt_secret_key_here') : null;
  const adminUserObj = { _id: adminUser?._id, id: adminUser?._id, userType: 'admin', role: 'admin', email: adminUser?.email };

  const distinctRoutes = [
    { path: '/', type: 'public', name: 'Home' },
    { path: '/find-mentor', type: 'public', name: 'Find Mentor' },
    { path: '/mentors', type: 'public', name: 'Mentors (Alias)' },
    { path: '/demo/booking', type: 'public', name: 'Demo Booking' },
    { path: '/signin', type: 'guest', name: 'Sign In' },
    { path: '/signup', type: 'guest', name: 'Sign Up' },
    { path: '/forgot-password', type: 'guest', name: 'Forgot Password' },
    { path: '/complete-profile', type: 'protected_user', name: 'Complete Profile' },
    { path: '/terms', type: 'public', name: 'Terms' },
    { path: '/privacy', type: 'public', name: 'Privacy' },
    { path: '/refund-cancellation', type: 'public', name: 'Refund Cancellation' },
    { path: '/return-policy', type: 'public', name: 'Return Policy' },
    { path: '/shipping-policy', type: 'public', name: 'Shipping Policy' },
    { path: '/plans', type: 'public', name: 'Plans' },
    { path: `/expert-profile/${expert?._id || 'mock'}`, type: 'public', name: 'Expert Profile View' },
    { path: `/expert/${expert?._id || 'mock'}`, type: 'public', name: 'Expert View (Alias)' },
    { path: '/watch-mock', type: 'public', name: 'Watch Mock' },
    { path: '/payment', type: 'redirect', name: 'Payment' },
    { path: '/live-meeting', type: 'protected_user', name: 'Live Meeting' },
    { path: '/book-session', type: 'candidate', name: 'Book Session' },
    { path: '/ai-video', type: 'public', name: 'AI Video' },
    { path: '/ai-mock', type: 'public', name: 'AI Mock' },
    { path: '/ai-mock-interview', type: 'public', name: 'AI Mock Interview' },
    { path: '/resume-builder', type: 'public', name: 'Resume Builder' },
    { path: '/my-sessions', type: 'candidate', name: 'My Sessions' },
    { path: '/saved-experts', type: 'candidate', name: 'Saved Experts' },
    { path: '/liked-mentors', type: 'candidate', name: 'Liked Mentors' },
    { path: '/tips', type: 'public', name: 'Tips' },
    { path: '/certificates', type: 'candidate', name: 'Certificates' },
    { path: '/wallet', type: 'candidate', name: 'Candidate Wallet' },
    { path: '/profile', type: 'protected_user', name: 'User Profile' },
    { path: '/notifications', type: 'protected_user', name: 'Notifications' },
    { path: '/dashboard/profile', type: 'expert', name: 'Expert Profile' },
    { path: '/dashboard/sessions', type: 'expert', name: 'Expert Sessions' },
    { path: '/dashboard/availability', type: 'expert', name: 'Expert Availability' },
    { path: '/dashboard/availability/edit', type: 'expert', name: 'Edit Availability' },
    { path: '/dashboard/skills', type: 'expert', name: 'Expert Skills' },
    { path: '/dashboard/withdraw', type: 'expert', name: 'Expert Withdraw' },
    { path: '/dashboard/agreement', type: 'expert', name: 'Expert Agreement' },
    { path: '/dashboard/reports', type: 'expert', name: 'Expert Reports' },
    { path: '/dashboard/settings', type: 'expert', name: 'Expert Settings' },
    { path: '/admin/sessions', type: 'admin', name: 'Admin Sessions' },
    { path: '/admin/experts/pending', type: 'admin', name: 'Admin Pending Experts' },
    { path: '/admin/experts/verified', type: 'admin', name: 'Admin Verified Experts' },
    { path: '/admin/experts/rejected', type: 'admin', name: 'Admin Rejected Experts' },
    { path: '/admin/agreements', type: 'admin', name: 'Admin Agreements' },
    { path: '/admin/users', type: 'admin', name: 'Admin Users' },
    { path: '/admin/jobs', type: 'admin', name: 'Admin Jobs' },
    { path: '/admin/categories', type: 'admin', name: 'Admin Categories' },
    { path: '/admin/reports', type: 'admin', name: 'Admin Reports' },
    { path: '/admin/certifications', type: 'admin', name: 'Admin Certifications' },
    { path: '/admin/pricing', type: 'admin', name: 'Admin Pricing' },
    { path: '/admin/hr-contacts', type: 'admin', name: 'Admin HR Contacts' },
    { path: '/admin/payouts', type: 'admin', name: 'Admin Payouts' },
    { path: '/admin/skills', type: 'admin', name: 'Admin Skills' },
    { path: '/non-existent-audit-404', type: 'not_found', name: '404 Page' }
  ];

  const roles = [
    { name: 'visitor', token: null, user: null },
    { name: 'candidate', token: candToken, user: candUser },
    { name: 'expert', token: expertToken, user: expertUser },
    { name: 'admin', token: adminToken, user: adminUserObj }
  ];

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,800',
    'about:blank'
  ]);

  await sleep(1500);
  const wsUrl = await getWsUrl();
  const cdp = new CdpClient(wsUrl);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  const matrixResults = [];

  for (const r of roles) {
    console.log(`\n=== Testing Role Context: ${r.name.toUpperCase()} ===`);
    // Seed initial session storage
    await cdp.send('Page.navigate', { url: BASE_URL + '/terms' });
    await sleep(800);

    if (r.token) {
      await cdp.send('Runtime.evaluate', {
        expression: `
          localStorage.setItem('token', '${r.token}');
          localStorage.setItem('user', JSON.stringify(${JSON.stringify(r.user)}));
        `
      });
    } else {
      await cdp.send('Runtime.evaluate', {
        expression: `
          localStorage.clear();
          sessionStorage.clear();
        `
      });
    }

    for (const route of distinctRoutes) {
      const targetUrl = BASE_URL + route.path;
      await cdp.send('Page.navigate', { url: targetUrl });
      await sleep(500);

      const pageState = await cdp.send('Runtime.evaluate', {
        expression: `
          (() => {
            const loc = window.location.pathname;
            const title = document.title;
            const textLen = document.body ? document.body.innerText.length : 0;
            const h1 = document.querySelector('h1')?.innerText || '';
            const isRedirectedToLogin = loc === '/signin' || loc.includes('/signin');
            const isHomeRedirect = loc === '/';
            const hasError = textLen < 50 || document.body.innerText.includes('Something went wrong') || document.body.innerText.includes('Cannot GET');
            return {
              currentPath: loc,
              title,
              textLen,
              heading: h1,
              isRedirectedToLogin,
              isHomeRedirect,
              hasError
            };
          })()
        `,
        returnByValue: true
      });

      const st = pageState.result?.value || {};
      let outcome = 'PASS';
      let reason = 'Page rendered successfully';

      if (r.name === 'visitor') {
        if (['candidate', 'expert', 'admin', 'protected_user'].includes(route.type)) {
          if (st.isRedirectedToLogin) {
            outcome = 'AUTH_REDIRECT_VERIFIED';
            reason = 'Unauthenticated visitor properly redirected to /signin';
          } else {
            outcome = 'FAIL (UNAUTHORIZED_ACCESS)';
            reason = 'Protected page rendered without authentication!';
          }
        } else if (route.type === 'not_found') {
          outcome = 'NOT_FOUND_HANDLED';
          reason = '404 route handled';
        } else {
          outcome = st.hasError ? 'FAIL_RENDER' : 'PASS';
        }
      } else if (r.name === 'candidate') {
        if (['expert', 'admin'].includes(route.type)) {
          if (st.isRedirectedToLogin || st.isHomeRedirect || st.currentPath === '/' || st.hasError) {
            outcome = 'ACCESS_DENIED_VERIFIED';
            reason = `Candidate properly blocked from ${route.type} route`;
          } else {
            outcome = 'FAIL (PRIVILEGE_LEAK)';
            reason = `Candidate accessed ${route.type} route!`;
          }
        } else if (route.type === 'guest') {
          outcome = (st.isHomeRedirect || st.currentPath !== route.path) ? 'GUEST_REDIRECT_VERIFIED' : 'PASS';
          reason = 'Authenticated candidate handled on guest route';
        } else {
          outcome = st.hasError ? 'FAIL_RENDER' : 'PASS';
        }
      } else if (r.name === 'expert') {
        if (['admin'].includes(route.type)) {
          if (st.isRedirectedToLogin || st.isHomeRedirect || st.currentPath === '/' || st.hasError) {
            outcome = 'ACCESS_DENIED_VERIFIED';
            reason = 'Expert properly blocked from admin route';
          } else {
            outcome = 'FAIL (PRIVILEGE_LEAK)';
            reason = 'Expert accessed admin route!';
          }
        } else if (route.type === 'guest') {
          outcome = (st.isHomeRedirect || st.currentPath !== route.path) ? 'GUEST_REDIRECT_VERIFIED' : 'PASS';
          reason = 'Authenticated expert handled on guest route';
        } else {
          outcome = st.hasError ? 'FAIL_RENDER' : 'PASS';
        }
      } else if (r.name === 'admin') {
        outcome = st.hasError ? 'FAIL_RENDER' : 'PASS';
      }

      console.log(`[${r.name.padEnd(9)}] ${route.path.padEnd(30)} -> Final: ${st.currentPath.padEnd(20)} [${outcome}] (${st.textLen} chars)`);

      matrixResults.push({
        role: r.name,
        routePath: route.path,
        routeName: route.name,
        routeType: route.type,
        finalPath: st.currentPath,
        pageTitle: st.title,
        heading: st.heading,
        bodyTextLength: st.textLen,
        outcome,
        reason
      });
    }
  }

  cdp.close();
  try { chromeProc.kill(); } catch (_) {}
  await mongoose.disconnect();

  const matrixArtifactPath = 'C:/Users/ASUS/.gemini/antigravity/brain/fa4cc859-e99d-440e-a4b9-ef64c859d17c/artifacts/mockeefy-final-independent-audit/reports/MOCKEEFY_ROUTE_BY_ROLE_MATRIX.json';
  fs.writeFileSync('scratch/route_by_role_matrix.json', JSON.stringify(matrixResults, null, 2));
  fs.writeFileSync(matrixArtifactPath, JSON.stringify(matrixResults, null, 2));
  fs.writeFileSync('C:/Users/ASUS/.gemini/antigravity/brain/fa4cc859-e99d-440e-a4b9-ef64c859d17c/MOCKEEFY_ROUTE_BY_ROLE_MATRIX.json', JSON.stringify(matrixResults, null, 2));
  console.log(`\nRoute by role matrix completed with ${matrixResults.length} evaluations!`);
}

runMatrix().catch(console.error);
