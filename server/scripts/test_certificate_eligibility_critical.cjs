const mongoose = require('mongoose');
const assert = require('assert');
require('dotenv').config({ path: 'server/.env' });

async function run() {
  console.log('========================================================================');
  console.log('🧪 TEST: CERTIFICATE ELIGIBILITY CRITICAL VERIFICATION');
  console.log('========================================================================');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB:', mongoose.connection.name);

  // Dynamic import of controller (which imports all models correctly)
  const { getEligibleCompletedSessions, getDomainMilestoneProgress } = await import('../controllers/certificationController.js');
  const Session = (await import('../models/Session.js')).default;
  const Review = (await import('../models/reviewModel.js')).default;
  const User = (await import('../models/User.js')).default;
  const Category = (await import('../models/Category.js')).default;
  const Certification = (await import('../models/Certification.js')).default;

  const testSuffix = Date.now();
  const testCandidate = await User.create({
    name: `Cert Test Candidate ${testSuffix}`,
    email: `cand_cert_${testSuffix}@mockeefy.test`,
    password: 'TestPassword123!',
    role: 'candidate',
    userType: 'candidate'
  });

  const testExpert = await User.create({
    name: `Cert Test Expert ${testSuffix}`,
    email: `exp_cert_${testSuffix}@mockeefy.test`,
    password: 'TestPassword123!',
    role: 'expert',
    userType: 'expert'
  });

  // Ensure an active category exists
  let itCategory = await Category.findOne({ name: /Information Technology|IT/i, status: 'Active' });
  if (!itCategory) {
    itCategory = await Category.create({ name: 'Information Technology', status: 'Active' });
  }

  const createdSessionIds = [];
  const testCases = [
    {
      id: `ses_eligible_cand_fb_${testSuffix}`,
      label: 'Completed and attended session with Candidate feedback',
      status: 'completed',
      attendanceStatus: 'attended',
      candidateJoinedAt: new Date(Date.now() - 3600000),
      category: itCategory.name,
      categoryId: itCategory._id,
      reviews: [{ role: 'candidate', rating: 5, feedback: 'Great experience' }],
      expectedEligible: true
    },
    {
      id: `ses_eligible_exp_fb_${testSuffix}`,
      label: 'Completed and attended session with Expert feedback',
      status: 'completed',
      attendanceStatus: 'attended',
      candidateJoinedAt: new Date(Date.now() - 7200000),
      category: itCategory.name,
      categoryId: itCategory._id,
      reviews: [{ role: 'expert', rating: 4, feedback: 'Strong performance' }],
      expectedEligible: true
    },
    {
      id: `ses_both_reviews_${testSuffix}`,
      label: 'Both reviews for the same session',
      status: 'completed',
      attendanceStatus: 'attended',
      candidateJoinedAt: new Date(Date.now() - 10800000),
      category: itCategory.name,
      categoryId: itCategory._id,
      reviews: [
        { role: 'expert', rating: 5, feedback: 'Excellent' },
        { role: 'candidate', rating: 5, feedback: 'Helpful mentor' }
      ],
      expectedEligible: true
    },
    {
      id: `ses_noshow_with_fb_${testSuffix}`,
      label: 'No-show with feedback',
      status: 'CANDIDATE_NO_SHOW',
      attendanceStatus: 'no-show',
      candidateJoinedAt: null,
      category: itCategory.name,
      categoryId: itCategory._id,
      reviews: [{ role: 'expert', rating: 1, feedback: 'Candidate did not attend' }],
      expectedEligible: false,
      expectedReason: 'STATUS_NO_SHOW'
    },
    {
      id: `ses_cancelled_with_fb_${testSuffix}`,
      label: 'Cancelled session with feedback',
      status: 'cancelled',
      attendanceStatus: 'scheduled',
      candidateJoinedAt: null,
      category: itCategory.name,
      categoryId: itCategory._id,
      reviews: [{ role: 'candidate', rating: 3, feedback: 'Cancelled beforehand' }],
      expectedEligible: false,
      expectedReason: 'STATUS_CANCELLED'
    },
    {
      id: `ses_missing_attendance_with_fb_${testSuffix}`,
      label: 'Missing attendance with feedback',
      status: 'completed',
      attendanceStatus: 'scheduled', // not attended!
      candidateJoinedAt: null,       // no join record!
      category: itCategory.name,
      categoryId: itCategory._id,
      reviews: [{ role: 'candidate', rating: 5, feedback: 'Loved it' }],
      expectedEligible: false,
      expectedReason: 'MISSING_AUTHORITATIVE_ATTENDANCE'
    },
    {
      id: `ses_missing_category_${testSuffix}`,
      label: 'Missing category/domain',
      status: 'completed',
      attendanceStatus: 'attended',
      candidateJoinedAt: new Date(Date.now() - 14400000),
      category: null,
      categoryId: null,
      topic: null,
      topics: [],
      reviews: [{ role: 'expert', rating: 5, feedback: 'Good job' }],
      expectedEligible: false,
      expectedReason: 'MISSING_CATEGORY_DOMAIN'
    }
  ];

  try {
    for (const tc of testCases) {
      createdSessionIds.push(tc.id);
      await Session.create({
        sessionId: tc.id,
        candidateId: testCandidate._id,
        expertId: testExpert._id,
        status: tc.status,
        attendanceStatus: tc.attendanceStatus,
        candidateJoinedAt: tc.candidateJoinedAt,
        startTime: new Date(Date.now() - 7200000),
        endTime: new Date(Date.now() - 5400000),
        duration: 30,
        price: 500,
        category: tc.category,
        categoryId: tc.categoryId,
        topic: tc.topic,
        topics: tc.topics || (tc.category ? [tc.category] : [])
      });

      for (const rev of tc.reviews) {
        await Review.create({
          sessionId: tc.id,
          candidateId: testCandidate._id,
          expertId: testExpert._id,
          reviewerRole: rev.role,
          overallRating: rev.rating,
          feedback: rev.feedback
        });
      }
    }

    const eligible = await getEligibleCompletedSessions(testCandidate._id);
    const eligibleIds = eligible.map(s => s.sessionId);
    const audits = eligible.ineligibleAudits || [];

    console.log('\n--- EVALUATION AUDIT RESULTS ---');
    console.log('Total Sessions Evaluated:', testCases.length);
    console.log('Total Distinct Eligible Sessions:', eligibleIds.length);
    console.log('Eligible Session IDs:');
    eligibleIds.forEach((id, idx) => console.log(`  ${idx + 1}. ${id}`));

    console.log('\nIneligible Sessions & Exclusion Reasons:');
    audits.forEach((a, idx) => console.log(`  ${idx + 1}. Session: ${a.sessionId} -> Reason: ${a.reason}`));

    // Assertions
    console.log('\n--- VERIFYING INDIVIDUAL TEST CASES ---');
    for (const tc of testCases) {
      const isEligible = eligibleIds.includes(tc.id);
      if (tc.expectedEligible) {
        assert.strictEqual(isEligible, true, `Expected session ${tc.id} (${tc.label}) to be ELIGIBLE`);
        console.log(`  ✅ [PASS] ${tc.label} -> Correctly ELIGIBLE`);
      } else {
        assert.strictEqual(isEligible, false, `Expected session ${tc.id} (${tc.label}) to be INELIGIBLE`);
        const audit = audits.find(a => a.sessionId === tc.id);
        assert.ok(audit, `Expected audit entry for ineligible session ${tc.id}`);
        assert.strictEqual(audit.reason, tc.expectedReason, `Expected exclusion reason ${tc.expectedReason} for ${tc.id}, got ${audit.reason}`);
        console.log(`  ✅ [PASS] ${tc.label} -> Correctly INELIGIBLE with Reason: ${audit.reason}`);
      }
    }

    // Verify domain progress & certificate calculation
    console.log('\n--- VERIFYING DOMAIN PROGRESS & CERTIFICATE CALCULATION ---');
    const domainProgress = await getDomainMilestoneProgress(testCandidate._id);
    console.log('Total Eligible Count across Domains:', domainProgress.totalEligibleCount);
    console.log('Total Issued Certificates:', domainProgress.totalIssuedCount);
    console.log('Any Domain Eligible for Milestone (>=3 sessions):', domainProgress.anyEligible);

    // Exactly 3 sessions were eligible in IT category
    assert.strictEqual(domainProgress.totalEligibleCount, 3, 'Exactly 3 sessions must qualify across all test cases');
    const itProgress = domainProgress.categoryProgress.find(cp => cp.categoryId === itCategory._id.toString());
    assert.ok(itProgress, 'IT domain progress must exist');
    assert.strictEqual(itProgress.unallocatedCount, 3, 'IT domain must have exactly 3 unallocated eligible sessions');
    assert.strictEqual(itProgress.isEligibleForNext, true, 'IT domain must be eligible for Milestone 1 Certificate (3/3 reached)');
    console.log(`  ✅ [PASS] IT Domain has 3 qualifying sessions -> Milestone 1 Certificate ELIGIBILITY unlocked!`);

    console.log('\n========================================================================');
    console.log('🎉 ALL CERTIFICATE ELIGIBILITY CRITICAL SCENARIOS VERIFIED 100% PASS!');
    console.log('========================================================================');
  } finally {
    // Cleanup
    await Session.deleteMany({ sessionId: { $in: createdSessionIds } });
    await Review.deleteMany({ sessionId: { $in: createdSessionIds } });
    await User.deleteMany({ _id: { $in: [testCandidate._id, testExpert._id] } });
    await mongoose.disconnect();
  }
}

run().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
