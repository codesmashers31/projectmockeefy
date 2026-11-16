const mongoose = require('mongoose');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const API_BASE = 'http://localhost:5000/api';

async function run() {
  console.log('=== VERIFYING CERTIFICATE REGRESSION (5 SCENARIOS) ===\n');
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const Session = (await import('../models/Session.js')).default;
  const User = (await import('../models/User.js')).default;
  const Expert = (await import('../models/expertModel.js')).default;
  const Review = (await import('../models/reviewModel.js')).default;

  // Create a clean dedicated test candidate
  const testCandidate = await User.create({
    name: 'Cert Test Candidate',
    email: `cert_test_${Date.now()}@mockeefy.test`,
    userType: 'candidate',
    password: 'password123',
    certificateIdentityConfirmation: {
      confirmedName: 'Cert Test Candidate',
      confirmedAt: new Date()
    }
  });

  const expertUser = await User.findOne({ userType: 'expert' });
  const expertDoc = await Expert.findOne({ userId: expertUser._id });

  const candToken = jwt.sign(
    { userId: testCandidate._id, userType: 'candidate', email: testCandidate.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const results = [];

  const Category = (await import('../models/Category.js')).default;
  const activeCategory = await Category.findOne({});

  // Helper to query backend eligibility
  async function getEligibility() {
    const res = await axios.get(`${API_BASE}/certifications/status/${testCandidate._id}`, {
      headers: { Authorization: `Bearer ${candToken}` }
    });
    return res.data.data || res.data;
  }

  // 1. Initial State: Candidate never joined any session -> Count = 0
  console.log('--- Test 1: Candidate never joined (Count = 0) ---');
  const session1 = await Session.create({
    sessionId: 'CERT-SESS-1-' + Date.now(),
    candidateId: testCandidate._id,
    expertId: expertDoc._id,
    categoryId: activeCategory?._id,
    startTime: new Date(Date.now() - 3600000),
    endTime: new Date(Date.now() - 1800000),
    status: 'CANDIDATE_NO_SHOW',
    attendanceStatus: 'absent',
    attendanceOutcome: 'DID_NOT_ATTEND',
    candidateJoinedAt: null
  });

  const elig1 = await getEligibility();
  const count1 = elig1.completedSessions ?? elig1.totalEligibleCount ?? elig1.completedCount ?? 0;
  console.log('Never joined session count:', count1);
  const t1Passed = count1 === 0;
  results.push({ name: 'Candidate never joined -> 0 credit', pass: t1Passed });
  console.log(`[${t1Passed ? 'PASS' : 'FAIL'}] Test 1`);

  // 2. Candidate joined but left early (ATTENDED_INCOMPLETE) -> Count = 0
  console.log('\n--- Test 2: Candidate joined but left early (Count = 0) ---');
  const session2 = await Session.create({
    sessionId: 'CERT-SESS-2-' + Date.now(),
    candidateId: testCandidate._id,
    expertId: expertDoc._id,
    categoryId: activeCategory?._id,
    startTime: new Date(Date.now() - 3600000),
    endTime: new Date(Date.now() - 1800000),
    status: 'completed',
    attendanceStatus: 'attended',
    attendanceOutcome: 'ATTENDED_INCOMPLETE',
    candidateJoinedAt: new Date(Date.now() - 3500000),
    candidateLeftAt: new Date(Date.now() - 3100000),
    candidateConnectionStatus: 'left'
  });

  const elig2 = await getEligibility();
  const count2 = elig2.completedSessions ?? elig2.totalEligibleCount ?? elig2.completedCount ?? 0;
  console.log('Early departure session count:', count2);
  const t2Passed = count2 === 0;
  results.push({ name: 'Candidate joined but left early -> 0 credit', pass: t2Passed });
  console.log(`[${t2Passed ? 'PASS' : 'FAIL'}] Test 2`);

  // 3. Attended & completed without feedback -> Count = 0 (Requires qualifying feedback to count for certificates)
  console.log('\n--- Test 3: Attended & completed without feedback (Count = 0) ---');
  const session3 = await Session.create({
    sessionId: 'CERT-SESS-3-' + Date.now(),
    candidateId: testCandidate._id,
    expertId: expertDoc._id,
    categoryId: activeCategory?._id,
    startTime: new Date(Date.now() - 3600000),
    endTime: new Date(Date.now() - 1800000),
    status: 'completed',
    attendanceStatus: 'attended',
    attendanceOutcome: 'ATTENDED_COMPLETED',
    candidateJoinedAt: new Date(Date.now() - 3600000),
    completionEvidence: {
      verified: true,
      verifiedAt: new Date(),
      durationMinutes: 45,
      candidateJoinedConfirmed: true,
      interviewConducted: true
    }
  });

  const elig3 = await getEligibility();
  const count3 = elig3.completedSessions ?? elig3.totalEligibleCount ?? elig3.completedCount ?? 0;
  console.log('Completed without feedback count:', count3);
  const t3Passed = count3 === 0;
  results.push({ name: 'Attended & completed without feedback -> 0 credit', pass: t3Passed });
  console.log(`[${t3Passed ? 'PASS' : 'FAIL'}] Test 3`);

  // 4. Attended & completed WITH qualifying feedback -> Count = 1
  console.log('\n--- Test 4: Attended & completed with qualifying feedback (Count = 1) ---');
  const review = await Review.create({
    sessionId: session3.sessionId,
    candidateId: testCandidate._id,
    expertId: expertUser._id,
    overallRating: 4.5,
    technicalRating: 4.5,
    communicationRating: 4.5,
    feedback: 'Excellent problem solving skills demonstrated during coding challenges.',
    reviewerRole: 'expert',
    createdAt: new Date()
  });

  const elig4 = await getEligibility();
  const count4 = elig4.completedSessions ?? elig4.totalEligibleCount ?? elig4.completedCount ?? 0;
  console.log('Completed with feedback count:', count4);
  const t4Passed = count4 === 1;
  results.push({ name: 'Attended & completed with qualifying feedback -> exactly 1 credit', pass: t4Passed });
  console.log(`[${t4Passed ? 'PASS' : 'FAIL'}] Test 4`);

  // 5. Duplicate completion / evaluation calls -> Count remains exactly 1 (Idempotent)
  console.log('\n--- Test 5: Duplicate completion requests (Count remains exactly 1) ---');
  // Re-save review or session
  await Session.updateOne({ _id: session3._id }, { $set: { status: 'completed' } });
  const elig5 = await getEligibility();
  const count5 = elig5.completedSessions ?? elig5.totalEligibleCount ?? elig5.completedCount ?? 0;
  console.log('After duplicate touch count:', count5);
  const t5Passed = count5 === 1;
  results.push({ name: 'Duplicate requests idempotent -> exactly 1 credit', pass: t5Passed });
  console.log(`[${t5Passed ? 'PASS' : 'FAIL'}] Test 5`);

  // Clean up test data
  await Session.deleteMany({ candidateId: testCandidate._id });
  await Review.deleteMany({ candidateId: testCandidate._id });
  await User.deleteOne({ _id: testCandidate._id });

  console.log('\n=== CERTIFICATE REGRESSION RESULTS ===');
  const allPass = results.every(r => r.pass);
  for (const r of results) {
    console.log(`[${r.pass ? 'PASS' : 'FAIL'}] ${r.name}`);
  }
  console.log('\nOVERALL RESULT:', allPass ? 'ALL 5 SCENARIOS PASSED' : 'SOME FAILED');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
