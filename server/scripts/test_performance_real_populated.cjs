const mongoose = require('mongoose');
const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_BASE = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'code@1234';

async function run() {
  console.log('========================================================================');
  console.log('🚀 PERFORMANCE BENCHMARKS WITH REAL POPULATED APPLICATION DATA');
  console.log('========================================================================\n');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB replica set:', mongoose.connection.name);

  const User = (await import('../models/User.js')).default;
  const Expert = (await import('../models/expertModel.js')).default;
  const Session = (await import('../models/Session.js')).default;
  const Wallet = (await import('../models/Wallet.js')).default;
  const WalletTransaction = (await import('../models/WalletTransaction.js')).default;
  const Notification = (await import('../models/Notification.js')).default;
  const Category = (await import('../models/Category.js')).default;

  const testSuffix = Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  // 1. Create Isolated Representative Data
  console.log('Seeding representative test records for benchmarking...');
  const catDoc = await Category.findOne({ name: /MERN/i }) || await Category.findOne({});

  const candidateUser = await User.create({
    name: 'Performance Candidate ' + testSuffix,
    email: `cand_perf_${testSuffix}@mockeefy.test`,
    password: 'Password123!',
    role: 'candidate',
    userType: 'candidate'
  });

  const expertUser = await User.create({
    name: 'Performance Expert ' + testSuffix,
    email: `exp_perf_${testSuffix}@mockeefy.test`,
    password: 'Password123!',
    role: 'expert',
    userType: 'expert'
  });

  const expertDoc = await Expert.create({
    userId: expertUser._id,
    name: expertUser.name,
    status: 'Active',
    isActive: true,
    isApproved: true,
    personalInformation: { userName: expertUser.name, category: catDoc?.name || 'Full Stack Development (MERN)' },
    skillsAndExpertise: { domains: [catDoc?.name || 'Full Stack Development (MERN)'] },
    pricing: { sessionPrice: 500 },
    availability: { sessionDuration: 30, maxPerDay: 5, weekly: { monday: [{ from: '09:00', to: '18:00' }] } }
  });

  // Seed 10 sessions for candidate
  const sessionDocs = [];
  for (let i = 0; i < 10; i++) {
    sessionDocs.push({
      sessionId: `ses_perf_${testSuffix}_${i}`,
      candidateId: candidateUser._id,
      expertId: expertDoc._id,
      categoryId: catDoc?._id,
      categoryNameSnapshot: catDoc?.name || 'Full Stack Development (MERN)',
      startTime: new Date(Date.now() - (i + 1) * 86400000),
      endTime: new Date(Date.now() - (i + 1) * 86400000 + 1800000),
      status: i < 6 ? 'completed' : 'confirmed',
      attendanceStatus: i < 6 ? 'attended' : 'scheduled',
      candidateJoinedAt: i < 6 ? new Date(Date.now() - (i + 1) * 86400000 + 60000) : null,
      price: 500,
      currency: 'INR'
    });
  }
  await Session.insertMany(sessionDocs);

  // Seed Wallet and 25 transactions
  const walletDoc = await Wallet.create({
    userId: candidateUser._id,
    availableBalance: 1500,
    frozenBalance: 0
  });

  const txnDocs = [];
  for (let i = 0; i < 25; i++) {
    txnDocs.push({
      walletId: walletDoc._id,
      userId: candidateUser._id,
      type: i % 2 === 0 ? 'CREDIT' : 'DEBIT',
      amount: 100,
      balanceAfter: 1500,
      status: 'COMPLETED',
      referenceId: new mongoose.Types.ObjectId(),
      referenceModel: 'Session',
      description: `Benchmark test transaction ${i}`,
      createdAt: new Date(Date.now() - i * 3600000)
    });
  }
  await WalletTransaction.insertMany(txnDocs);

  // Seed 15 notifications
  const notifDocs = [];
  for (let i = 0; i < 15; i++) {
    notifDocs.push({
      userId: candidateUser._id,
      type: i % 3 === 0 ? 'session_scheduled' : i % 3 === 1 ? 'wallet_credited' : 'certificate_ready',
      title: `Benchmark Notification ${i}`,
      message: `Test notification message content ${i}`,
      isRead: i >= 5, // 5 unread, 10 read
      metadata: { link: i % 3 === 0 ? '/my-sessions' : i % 3 === 1 ? '/wallet' : '/certificates' }
    });
  }
  await Notification.insertMany(notifDocs);

  console.log(`Seeded: 1 Candidate, 1 Expert, ${sessionDocs.length} Sessions, ${txnDocs.length} Transactions, ${notifDocs.length} Notifications.\n`);

  const db = mongoose.connection.db;

  // =========================================================================
  // PART A: MONGODB QUERY EXECUTION STATS & INDEX USAGE (5 ITERATIONS)
  // =========================================================================
  console.log('--- PART A: MONGODB ENGINE BENCHMARKS (WITH REAL POPULATED RECORDS) ---');

  const benchmarkQueries = [
    {
      name: '1. Candidate Completed Sessions (Index: candidateId + status)',
      collection: 'sessions',
      query: { candidateId: candidateUser._id, status: 'completed' },
      hint: { candidateId: 1, status: 1 }
    },
    {
      name: '2. Candidate Sessions Chronological (Index: candidateId + startTime)',
      collection: 'sessions',
      query: { candidateId: candidateUser._id },
      sort: { startTime: -1 },
      limit: 20
    },
    {
      name: '3. Expert Active Listing (Index: status)',
      collection: 'expertdetails',
      query: { status: 'Active' },
      hint: { status: 1 },
      limit: 24
    },
    {
      name: '4. Candidate Wallet Ledger (Index: userId + status + createdAt)',
      collection: 'wallettransactions',
      query: { userId: candidateUser._id, status: 'COMPLETED' },
      sort: { createdAt: -1 },
      limit: 50
    },
    {
      name: '5. Candidate Unread Notifications (Index: userId + isRead)',
      collection: 'notifications',
      query: { userId: candidateUser._id, isRead: false }
    }
  ];

  const mongoResults = [];

  for (const bq of benchmarkQueries) {
    const iterations = 5;
    const latencies = [];

    // Warm-up
    let cursorWarm = db.collection(bq.collection).find(bq.query);
    if (bq.hint) cursorWarm = cursorWarm.hint(bq.hint);
    if (bq.sort) cursorWarm = cursorWarm.sort(bq.sort);
    if (bq.limit) cursorWarm = cursorWarm.limit(bq.limit);
    await cursorWarm.toArray();

    for (let i = 0; i < iterations; i++) {
      const t0 = process.hrtime.bigint();
      let cursor = db.collection(bq.collection).find(bq.query);
      if (bq.hint) cursor = cursor.hint(bq.hint);
      if (bq.sort) cursor = cursor.sort(bq.sort);
      if (bq.limit) cursor = cursor.limit(bq.limit);
      const res = await cursor.toArray();
      const t1 = process.hrtime.bigint();
      latencies.push(Number(t1 - t0) / 1e6);
    }

    let cursorExp = db.collection(bq.collection).find(bq.query);
    if (bq.hint) cursorExp = cursorExp.hint(bq.hint);
    if (bq.sort) cursorExp = cursorExp.sort(bq.sort);
    if (bq.limit) cursorExp = cursorExp.limit(bq.limit);
    const exp = await cursorExp.explain('executionStats');
    const stats = exp.executionStats;

    const avg = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2);
    const min = Math.min(...latencies).toFixed(2);
    const max = Math.max(...latencies).toFixed(2);

    assert.ok(stats.nReturned > 0, `Query ${bq.name} must return at least 1 record from populated data`);
    assert.ok(stats.totalKeysExamined > 0 || stats.totalDocsExamined > 0, 'Must examine keys or documents');

    mongoResults.push({
      Query: bq.name,
      'nReturned': stats.nReturned,
      'totalKeysExamined': stats.totalKeysExamined,
      'totalDocsExamined': stats.totalDocsExamined,
      'Avg Latency (ms)': avg,
      'Min (ms)': min,
      'Max (ms)': max,
      'Winning Stage': exp.queryPlanner?.winningPlan?.stage || 'UNKNOWN'
    });
  }

  console.table(mongoResults);

  // =========================================================================
  // PART B: REAL REST API ENDPOINT LATENCIES (5 ITERATIONS)
  // =========================================================================
  console.log('\n--- PART B: REAL REST API ENDPOINT LATENCIES (EXPRESS BACKEND) ---');

  const token = jwt.sign(
    { id: candidateUser._id.toString(), userId: candidateUser._id.toString(), email: candidateUser.email, role: 'candidate', userType: 'candidate' },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  const apiEndpoints = [
    { name: 'GET /api/sessions/candidate/:id', url: `${API_BASE}/sessions/candidate/${candidateUser._id.toString()}`, auth: true },
    { name: 'GET /api/expert/verified', url: `${API_BASE}/expert/verified`, auth: false },
    { name: 'GET /api/wallet/transactions?limit=50', url: `${API_BASE}/wallet/transactions?limit=50`, auth: true },
    { name: 'GET /api/notifications', url: `${API_BASE}/notifications`, auth: true },
    { name: 'GET /api/certifications/status/:userId', url: `${API_BASE}/certifications/status/${candidateUser._id.toString()}`, auth: true },
    { name: 'GET /api/certifications/preview', url: `${API_BASE}/certifications/preview`, auth: true }
  ];

  const apiResults = [];

  for (const ep of apiEndpoints) {
    const iterations = 5;
    const latencies = [];
    let lastStatusCode = 0;
    let dataLength = 0;

    // Warm-up
    const warmHeaders = ep.auth ? { Authorization: `Bearer ${token}` } : {};
    console.log(`Testing ${ep.name} at ${ep.url}...`);
    const warmRes = await fetch(ep.url, { headers: warmHeaders });
    if (!warmRes.ok) {
      console.warn(`Warm-up for ${ep.name} returned status ${warmRes.status}`);
      const text = await warmRes.text();
      console.warn(`Response text snippet: ${text.slice(0, 150)}`);
    }

    for (let i = 0; i < iterations; i++) {
      const t0 = process.hrtime.bigint();
      const res = await fetch(ep.url, { headers: warmHeaders });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error(`Failed to parse JSON for ${ep.name} (Status: ${res.status}): ${text.slice(0, 200)}`);
        throw err;
      }
      const t1 = process.hrtime.bigint();
      latencies.push(Number(t1 - t0) / 1e6);
      lastStatusCode = res.status;
      dataLength = Array.isArray(data) ? data.length : Array.isArray(data.notifications) ? data.notifications.length : Array.isArray(data.transactions) ? data.transactions.length : Array.isArray(data.sessions) ? data.sessions.length : 1;
    }

    const avg = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2);
    const min = Math.min(...latencies).toFixed(2);
    const max = Math.max(...latencies).toFixed(2);

    assert.strictEqual(lastStatusCode, 200, `Endpoint ${ep.name} must return status 200`);

    apiResults.push({
      Endpoint: ep.name,
      Status: lastStatusCode,
      Iterations: iterations,
      'Avg Latency (ms)': avg,
      'Min (ms)': min,
      'Max (ms)': max,
      'Payload Items': dataLength
    });
  }

  console.table(apiResults);
  console.log('  ✅ [PASS] REST API response latencies measured with real responses.\n');

  // =========================================================================
  // CLEANUP TEST DATA SAFELY
  // =========================================================================
  console.log('Cleaning up isolated benchmark test data...');
  await Session.deleteMany({ candidateId: candidateUser._id });
  await WalletTransaction.deleteMany({ userId: candidateUser._id });
  await Wallet.deleteMany({ userId: candidateUser._id });
  await Notification.deleteMany({ userId: candidateUser._id });
  await Expert.deleteMany({ _id: expertDoc._id });
  await User.deleteMany({ _id: { $in: [candidateUser._id, expertUser._id] } });
  console.log('Test data cleaned up successfully.');

  await mongoose.disconnect();
  console.log('\n========================================================================');
  console.log('🎉 PERFORMANCE BENCHMARKS WITH REAL DATA COMPLETED SUCCESSFULLY!');
  console.log('========================================================================');
}

run().catch(err => {
  console.error('Performance Benchmark Failed:', err);
  process.exit(1);
});
