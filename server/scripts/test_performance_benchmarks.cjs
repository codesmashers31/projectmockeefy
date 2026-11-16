const path = require('path');

async function benchmark() {
  console.log('========================================================================');
  console.log('🚀 TEST 10: PERFORMANCE BENCHMARKS & QUERY PLANS');
  console.log('========================================================================\n');

  const dotenv = await import('dotenv');
  dotenv.config({ path: path.join(__dirname, '../.env') });
  const mongoose = (await import('mongoose')).default;

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB:', mongoose.connection.name);

  const db = mongoose.connection.db;

  const results = [];

  // Helper to measure average latency over N iterations
  const measure = async (name, fn, iterations = 5) => {
    // Warm-up
    await fn();
    const times = [];
    for (let i = 0; i < iterations; i++) {
      const t0 = process.hrtime.bigint();
      await fn();
      const t1 = process.hrtime.bigint();
      times.push(Number(t1 - t0) / 1000000); // ms
    }
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    return { name, avg: avg.toFixed(2), min: min.toFixed(2), max: max.toFixed(2) };
  };

  // 1. Certificate eligibility query
  const testUserId = new mongoose.Types.ObjectId();
  const q1 = await measure('1. Certificate Eligibility (Candidate Sessions + Reviews)', async () => {
    await db.collection('sessions').find({
      $or: [{ candidateId: testUserId }, { userId: testUserId }],
      status: { $in: ['completed', 'evaluated'] }
    }).hint({ candidateId: 1, status: 1 }).toArray();
  });
  results.push(q1);

  // 2. Certificate preview query
  const q2 = await measure('2. Certificate Preview (Verified Certificate Fetch)', async () => {
    await db.collection('certifications').find({
      candidateId: testUserId,
      status: 'issued'
    }).toArray();
  });
  results.push(q2);

  // 3. Candidate session listing
  const q3 = await measure('3. Candidate Sessions Listing (Indexed by candidateId + startTime)', async () => {
    await db.collection('sessions').find({
      $or: [{ candidateId: testUserId }, { userId: testUserId }]
    }).sort({ startTime: -1 }).limit(20).toArray();
  });
  results.push(q3);

  // 4. Expert verified listing
  const q4 = await measure('4. Expert Verified Listing (Approved & Verified Experts)', async () => {
    await db.collection('expertdetails').find({
      approvalStatus: 'approved',
      verificationStatus: 'verified'
    }).project({ name: 1, category: 1, pricing: 1, availability: 1 }).limit(24).toArray();
  });
  results.push(q4);

  // 5. Attendance / No-show settlement check
  const q5 = await measure('5. Attendance / No-Show Settlement Check', async () => {
    await db.collection('sessions').find({
      status: 'confirmed',
      attendanceStatus: { $in: ['scheduled', 'no_show_reported'] }
    }).limit(10).toArray();
  });
  results.push(q5);

  // 6. Wallet ledger calculation
  const q6 = await measure('6. Wallet Ledger Calculation (Transactions aggregation)', async () => {
    await db.collection('wallettransactions').find({
      userId: testUserId,
      status: 'COMPLETED'
    }).sort({ createdAt: -1 }).limit(50).toArray();
  });
  results.push(q6);

  // 7. Notification unread count & fetch
  const q7 = await measure('7. Notification Unread Count & Recent Fetch', async () => {
    await Promise.all([
      db.collection('notifications').countDocuments({ userId: testUserId, isRead: false }),
      db.collection('notifications').find({ userId: testUserId }).sort({ createdAt: -1 }).limit(20).toArray()
    ]);
  });
  results.push(q7);

  console.log('\n------------------------------------------------------------------------');
  console.log('BENCHMARK RESULTS (Average Execution Time in Milliseconds):');
  console.log('------------------------------------------------------------------------');
  console.table(results);

  // Query Plan Inspection for key indexes
  console.log('\n--- QUERY PLAN INSPECTION (INDEX COVERAGE) ---');
  const plan1 = await db.collection('sessions').find({
    candidateId: testUserId,
    status: 'completed'
  }).explain('executionStats');
  console.log('Candidate Sessions Query Winning Stage:', plan1.queryPlanner.winningPlan.stage);
  console.log('Total Docs Examined:', plan1.executionStats.totalDocsExamined);
  console.log('Total Keys Examined:', plan1.executionStats.totalKeysExamined);

  await mongoose.disconnect();
  console.log('\n✅ Performance benchmark complete.');
}

benchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
