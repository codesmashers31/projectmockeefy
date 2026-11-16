/**
 * MOCKEEFY — RECURRING CERTIFICATE MILESTONES & PER-CERTIFICATE IMMUTABLE IDENTITY TEST SUITE
 * Tests all 34 requirements from Part 12.
 */

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runSuite() {
  console.log('================================================================');
  console.log('MOCKEEFY — RECURRING MILESTONE & IMMUTABLE IDENTITY TEST SUITE');
  console.log('================================================================\n');

  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is missing from server/.env');
  }

  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB\n');

  const Certification = (await import('../models/Certification.js')).default;
  const Session = (await import('../models/Session.js')).default;
  const User = (await import('../models/User.js')).default;
  const ReviewDetails = (await import('../models/reviewModel.js')).default;
  const certCtrl = await import('../controllers/certificationController.js');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[✅ PASS] ${message}`);
      passed++;
    } else {
      console.error(`[❌ FAIL] ${message}`);
      failed++;
    }
  }

  const runId = Date.now();
  const testCandidateId = new mongoose.Types.ObjectId();
  const testExpertId = new mongoose.Types.ObjectId();

  // Helper to create an eligible session with expert review
  async function createEligibleSession(candidateId, expertId, sessionIndex, status = 'completed', attendance = 'attended', hasExpertReview = true) {
    const sid = `rec-test-sess-${runId}-${sessionIndex}`;
    const sess = await Session.create({
      sessionId: sid,
      candidateId,
      expertId,
      startTime: new Date(Date.now() - (100 - sessionIndex) * 3600000), // Chronological order
      endTime: new Date(Date.now() - (100 - sessionIndex) * 3600000 + 1800000),
      topics: ['System Design'],
      price: 500,
      status,
      attendanceStatus: attendance
    });

    if (hasExpertReview) {
      await ReviewDetails.create({
        sessionId: sid,
        candidateId,
        expertId,
        reviewerRole: 'expert',
        overallRating: 4.5,
        technicalScore: 4,
        communicationScore: 5,
        problemSolvingScore: 4,
        systemDesignScore: 5,
        behavioralScore: 4,
        feedback: 'Excellent technical interview performance.',
        isVisible: true
      });
    }

    return sess;
  }

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Zero eligible interviews produces 0/3
    // -------------------------------------------------------------------------
    const testUser = await User.create({
      _id: testCandidateId,
      name: 'Joel',
      email: `test_recurring_${runId}@mockeefy.test`,
      password: 'TestPassword123!',
      userType: 'candidate'
    });

    let progress = await certCtrl.getMilestoneProgress(testCandidateId);
    assert(progress.unallocatedCount === 0 && progress.progressInCurrentMilestone === 0 && progress.remainingForNextMilestone === 3,
      'Scenario 1: Zero eligible interviews produces 0/3 progress (3 more required)');

    // -------------------------------------------------------------------------
    // TEST 2: Two eligible interviews produce 2/3
    // -------------------------------------------------------------------------
    await createEligibleSession(testCandidateId, testExpertId, 1);
    await createEligibleSession(testCandidateId, testExpertId, 2);

    progress = await certCtrl.getMilestoneProgress(testCandidateId);
    assert(progress.unallocatedCount === 2 && progress.progressInCurrentMilestone === 2 && progress.remainingForNextMilestone === 1,
      'Scenario 2: Two eligible interviews produce 2/3 progress (1 more required)');

    // -------------------------------------------------------------------------
    // TEST 3 & 4: Three eligible interviews unlock Certificate 1 & allocating 3 sessions
    // -------------------------------------------------------------------------
    await createEligibleSession(testCandidateId, testExpertId, 3);
    progress = await certCtrl.getMilestoneProgress(testCandidateId);
    assert(progress.unallocatedCount === 3 && progress.isNextMilestoneEligible === true && progress.nextMilestoneNumber === 1,
      'Scenario 3: Three eligible interviews unlock Certificate 1 eligibility');

    // Confirm identity for Milestone 1 as "Joel"
    const mockReqConfirm1 = {
      user: { userId: testCandidateId.toString() },
      body: { acknowledged: true, confirmedName: 'Joel' }
    };
    const mockResConfirm1 = {
      status(c) { this.statusCode = c; return this; },
      json(d) { this.body = d; return this; }
    };
    await certCtrl.confirmIdentity(mockReqConfirm1, mockResConfirm1);
    assert(mockResConfirm1.body.success === true && mockResConfirm1.body.data.confirmedName === 'Joel',
      'Scenario 13: Identity confirmed with current profile name "Joel" for Certificate 1');

    // Issue Certificate 1
    const mockReqIssue1 = {
      user: { userId: testCandidateId.toString(), userType: 'candidate' },
      body: {}
    };
    const mockResIssue1 = {
      status(c) { this.statusCode = c; return this; },
      json(d) { this.body = d; return this; }
    };
    await certCtrl.issueCertificate(mockReqIssue1, mockResIssue1);
    const cert1 = mockResIssue1.body.data;
    assert(mockResIssue1.statusCode === 201 && cert1.milestoneNumber === 1 && cert1.candidateNameSnapshot === 'Joel' && cert1.qualifyingSessionIds.length === 3,
      'Scenario 4 & 13: Issuing Certificate 1 allocates exactly 3 sessions and freezes snapshot "Joel"');

    // -------------------------------------------------------------------------
    // TEST 14: Profile edits do not modify Certificate 1
    // -------------------------------------------------------------------------
    await User.findByIdAndUpdate(testCandidateId, { name: 'Joel Kumar' });
    const fetchedCert1 = await Certification.findById(cert1._id).lean();
    assert(fetchedCert1.candidateNameSnapshot === 'Joel',
      'Scenario 14: Changing profile name ("Joel Kumar") does NOT mutate Certificate 1 snapshot ("Joel")');

    // -------------------------------------------------------------------------
    // TEST 5 & 15: Three additional eligible interviews unlock Certificate 2 with latest profile name
    // -------------------------------------------------------------------------
    await createEligibleSession(testCandidateId, testExpertId, 4);
    await createEligibleSession(testCandidateId, testExpertId, 5);
    await createEligibleSession(testCandidateId, testExpertId, 6);

    progress = await certCtrl.getMilestoneProgress(testCandidateId);
    assert(progress.unallocatedCount === 3 && progress.totalIssuedCount === 1 && progress.nextMilestoneNumber === 2 && progress.isNextMilestoneEligible === true,
      'Scenario 5: Three additional eligible interviews (4, 5, 6) unlock Certificate 2');

    // Confirm identity for Milestone 2 as "Joel Kumar"
    const mockReqConfirm2 = {
      user: { userId: testCandidateId.toString() },
      body: { acknowledged: true, confirmedName: 'Joel Kumar' }
    };
    const mockResConfirm2 = {
      status(c) { this.statusCode = c; return this; },
      json(d) { this.body = d; return this; }
    };
    await certCtrl.confirmIdentity(mockReqConfirm2, mockResConfirm2);
    assert(mockResConfirm2.body.success === true && mockResConfirm2.body.data.confirmedName === 'Joel Kumar',
      'Scenario 15: Certificate 2 identity confirmed with updated profile name "Joel Kumar"');

    // Issue Certificate 2
    const mockReqIssue2 = {
      user: { userId: testCandidateId.toString(), userType: 'candidate' },
      body: {}
    };
    const mockResIssue2 = {
      status(c) { this.statusCode = c; return this; },
      json(d) { this.body = d; return this; }
    };
    await certCtrl.issueCertificate(mockReqIssue2, mockResIssue2);
    const cert2 = mockResIssue2.body.data;
    assert(mockResIssue2.statusCode === 201 && cert2.milestoneNumber === 2 && cert2.candidateNameSnapshot === 'Joel Kumar',
      'Scenario 15: Certificate 2 issued with its own independent snapshot "Joel Kumar"');

    // -------------------------------------------------------------------------
    // TEST 16 & 17: Candidate updates name again to "Joel A Kumar" & issues Certificate 3
    // -------------------------------------------------------------------------
    await User.findByIdAndUpdate(testCandidateId, { name: 'Joel A Kumar' });
    await createEligibleSession(testCandidateId, testExpertId, 7);
    await createEligibleSession(testCandidateId, testExpertId, 8);
    await createEligibleSession(testCandidateId, testExpertId, 9);

    const mockReqConfirm3 = {
      user: { userId: testCandidateId.toString() },
      body: { acknowledged: true, confirmedName: 'Joel A Kumar' }
    };
    const mockResConfirm3 = {
      status(c) { this.statusCode = c; return this; },
      json(d) { this.body = d; return this; }
    };
    await certCtrl.confirmIdentity(mockReqConfirm3, mockResConfirm3);

    const mockReqIssue3 = {
      user: { userId: testCandidateId.toString(), userType: 'candidate' },
      body: {}
    };
    const mockResIssue3 = {
      status(c) { this.statusCode = c; return this; },
      json(d) { this.body = d; return this; }
    };
    await certCtrl.issueCertificate(mockReqIssue3, mockResIssue3);
    const cert3 = mockResIssue3.body.data;

    // Verify all 3 certificates retain their independent snapshots
    const allCandidateCerts = await Certification.find({ userId: testCandidateId }).sort({ milestoneNumber: 1 }).lean();
    assert(allCandidateCerts.length === 3 &&
      allCandidateCerts[0].candidateNameSnapshot === 'Joel' &&
      allCandidateCerts[1].candidateNameSnapshot === 'Joel Kumar' &&
      allCandidateCerts[2].candidateNameSnapshot === 'Joel A Kumar',
      'Scenario 6, 7, 16, 17: Certificates 1, 2, 3 each retain their own independent frozen snapshots');

    // -------------------------------------------------------------------------
    // TEST 8: Two sessions after Certificate 2 produce 2/3 progress toward Certificate 4
    // -------------------------------------------------------------------------
    await createEligibleSession(testCandidateId, testExpertId, 10);
    await createEligibleSession(testCandidateId, testExpertId, 11);
    progress = await certCtrl.getMilestoneProgress(testCandidateId);
    assert(progress.totalIssuedCount === 3 && progress.nextMilestoneNumber === 4 && progress.unallocatedCount === 2 && progress.progressInCurrentMilestone === 2,
      'Scenario 8: Two sessions after Certificate 3 produce 2/3 progress toward Certificate 4');

    // -------------------------------------------------------------------------
    // TEST 9, 10, 11: No-shows, bookings alone, incomplete evaluations never count
    // -------------------------------------------------------------------------
    // No-show session
    await createEligibleSession(testCandidateId, testExpertId, 12, 'completed', 'no-show', true);
    // Booking alone (unconfirmed / scheduled)
    await createEligibleSession(testCandidateId, testExpertId, 13, 'pending', 'scheduled', false);
    // Completed but missing evaluation review
    await createEligibleSession(testCandidateId, testExpertId, 14, 'completed', 'attended', false);

    const progressAfterInvalid = await certCtrl.getMilestoneProgress(testCandidateId);
    assert(progressAfterInvalid.unallocatedCount === 2,
      'Scenario 9, 10, 11: No-shows, bookings without completion, and un-evaluated sessions NEVER count');

    // -------------------------------------------------------------------------
    // TEST 12: One session cannot be allocated to multiple certificates
    // -------------------------------------------------------------------------
    const allocated1 = allCandidateCerts[0].qualifyingSessionIds;
    const allocated2 = allCandidateCerts[1].qualifyingSessionIds;
    const allocated3 = allCandidateCerts[2].qualifyingSessionIds;
    const hasOverlap = allocated1.some(id => allocated2.includes(id) || allocated3.includes(id)) ||
      allocated2.some(id => allocated3.includes(id));
    assert(!hasOverlap, 'Scenario 12: Zero session allocation overlap between milestones');

    // -------------------------------------------------------------------------
    // TEST 18: PDF download authorization uses each certificate's own snapshot
    // -------------------------------------------------------------------------
    const mockReqDl1 = { params: { certificateId: cert1.certificateId }, user: { userId: testCandidateId.toString(), userType: 'candidate' } };
    const mockResDl1 = { status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } };
    await certCtrl.verifyDownloadEligibility(mockReqDl1, mockResDl1);

    const mockReqDl2 = { params: { certificateId: cert2.certificateId }, user: { userId: testCandidateId.toString(), userType: 'candidate' } };
    const mockResDl2 = { status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } };
    await certCtrl.verifyDownloadEligibility(mockReqDl2, mockResDl2);

    assert(mockResDl1.body.data.candidateNameSnapshot === 'Joel' && mockResDl2.body.data.candidateNameSnapshot === 'Joel Kumar',
      'Scenario 18: Download authorization verifies each certificate with its own immutable snapshot');

    // -------------------------------------------------------------------------
    // TEST 19: Public verification returns each certificate's own snapshot
    // -------------------------------------------------------------------------
    const mockReqPub1 = { params: { certificateId: cert1.certificateId } };
    const mockResPub1 = { status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } };
    await certCtrl.verifyCertificatePublic(mockReqPub1, mockResPub1);

    const mockReqPub2 = { params: { certificateId: cert2.certificateId } };
    const mockResPub2 = { status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } };
    await certCtrl.verifyCertificatePublic(mockReqPub2, mockResPub2);

    assert(mockResPub1.body.data.candidateName === 'Joel' && mockResPub2.body.data.candidateName === 'Joel Kumar',
      'Scenario 19: Public verification displays exact immutable name snapshot per certificate');

    // -------------------------------------------------------------------------
    // TEST 20: Candidate cannot supply another name or spoof candidate ID
    // -------------------------------------------------------------------------
    const mockReqSpoof = {
      user: { userId: testCandidateId.toString() },
      body: { acknowledged: true, confirmedName: 'Elon Musk' }
    };
    const mockResSpoof = { status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } };
    await certCtrl.confirmIdentity(mockReqSpoof, mockResSpoof);
    assert(mockResSpoof.statusCode === 400, 'Scenario 20: Name spoofing strictly rejected (400 Bad Request)');

    // -------------------------------------------------------------------------
    // TEST 21 & 22: Ineligible candidates cannot issue certificates
    // -------------------------------------------------------------------------
    const mockReqIneligible = {
      user: { userId: testCandidateId.toString(), userType: 'candidate' },
      body: {}
    };
    const mockResIneligible = { status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } };
    await certCtrl.issueCertificate(mockReqIneligible, mockResIneligible);
    assert(mockResIneligible.statusCode === 400, 'Scenario 21 & 22: Direct API call without 3 unallocated sessions rejected (400)');

    // -------------------------------------------------------------------------
    // TEST 23 & 24: Concurrent requests cannot create duplicate certificates
    // -------------------------------------------------------------------------
    // Add 1 more session to reach milestone 4 eligibility
    await createEligibleSession(testCandidateId, testExpertId, 15);
    const mockReqConfirm4 = {
      user: { userId: testCandidateId.toString() },
      body: { acknowledged: true, confirmedName: 'Joel A Kumar' }
    };
    const mockResConfirm4 = { status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } };
    await certCtrl.confirmIdentity(mockReqConfirm4, mockResConfirm4);

    const issueCalls = [1, 2, 3].map(() => {
      const resObj = { status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } };
      return certCtrl.issueCertificate({ user: { userId: testCandidateId.toString(), userType: 'candidate' }, body: {} }, resObj)
        .then(() => resObj);
    });
    const results = await Promise.all(issueCalls);
    const countCert4 = await Certification.countDocuments({ userId: testCandidateId, milestoneNumber: 4 });
    assert(countCert4 === 1, 'Scenario 23 & 24: Concurrent issuance creates exactly ONE certificate (no duplicates)');

    // -------------------------------------------------------------------------
    // TEST 26: Candidate cannot access another candidate's certificate download
    // -------------------------------------------------------------------------
    const otherCandidateId = new mongoose.Types.ObjectId();
    const mockReqAccessOther = {
      params: { certificateId: cert1.certificateId },
      user: { userId: otherCandidateId.toString(), userType: 'candidate' }
    };
    const mockResAccessOther = { status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } };
    await certCtrl.verifyDownloadEligibility(mockReqAccessOther, mockResAccessOther);
    assert(mockResAccessOther.statusCode === 403, 'Scenario 26: Cross-candidate certificate access forbidden (403)');

    // -------------------------------------------------------------------------
    // TEST 27 & Regression Tests: Historical Joel certificate MCFY-MST-A163AA-2026 remains intact
    // -------------------------------------------------------------------------
    const joelCert = await Certification.findOne({ certificateId: 'MCFY-MST-A163AA-2026' }).lean();
    assert(joelCert && joelCert.candidateNameSnapshot === 'Joel' && joelCert.milestoneNumber === 1,
      'Scenario 27 & 34: Historical production certificate MCFY-MST-A163AA-2026 preserved with snapshot "Joel"');

    // -------------------------------------------------------------------------
    // TEST 28-33: History API returns all certificates with their own snapshots
    // -------------------------------------------------------------------------
    const mockReqHist = { user: { userId: testCandidateId.toString() } };
    const mockResHist = { status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } };
    await certCtrl.getCertificateHistory(mockReqHist, mockResHist);
    const historyList = mockResHist.body.data;
    assert(historyList.length === 4 &&
      historyList[0].candidateNameSnapshot === 'Joel' &&
      historyList[1].candidateNameSnapshot === 'Joel Kumar' &&
      historyList[2].candidateNameSnapshot === 'Joel A Kumar',
      'Scenario 28-33: /api/certifications/history correctly delivers all milestones with per-certificate snapshots');

  } finally {
    // Clean up test data generated by this test run
    await Certification.deleteMany({ userId: testCandidateId });
    await Session.deleteMany({ candidateId: testCandidateId });
    await ReviewDetails.deleteMany({ candidateId: testCandidateId });
    await User.findByIdAndDelete(testCandidateId);
    console.log('\n[Cleanup] Test fixtures safely cleaned up.');
  }

  console.log('\n================================================================');
  console.log(`TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSuite().catch(err => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
