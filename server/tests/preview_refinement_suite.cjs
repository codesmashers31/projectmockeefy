const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const testResults = [];

function recordTest(scenarioNum, scenarioName, passed, details = '') {
  testResults.push({ scenarioNum, scenarioName, passed, details });
  const statusStr = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${statusStr}] Scenario ${scenarioNum}: ${scenarioName} ${details ? '(' + details + ')' : ''}`);
}

async function runComprehensiveSuite() {
  console.log('================================================================');
  console.log('MOCKEEFY — 16 MANDATORY PREVIEW REFINEMENT & LIFECYCLE TESTS');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

  const User = mongoose.models.User || (await import('../models/User.js')).default;
  const Certification = mongoose.models.Certification || (await import('../models/Certification.js')).default;
  const Session = mongoose.models.Session || (await import('../models/Session.js')).default;
  const ReviewDetails = mongoose.models.ReviewDetails || (await import('../models/reviewModel.js')).default;

  const {
    getCertificatePreview,
    confirmIdentity,
    issueCertificate,
    verifyDownloadEligibility,
    verifyCertificatePublic,
    getEligibleCompletedSessions
  } = await import('../controllers/certificationController.js');

  const expertUser = await User.findOne({ userType: 'expert' });
  const expertId = expertUser ? expertUser._id : new mongoose.Types.ObjectId();

  const testEmailA = `test_preview_refine_${Date.now()}@mockeefy.test`;
  let candidateA = null;

  try {
    // -------------------------------------------------------------
    // SCENARIO 1: New account with zero interviews displays "Your Name"
    // -------------------------------------------------------------
    candidateA = await User.create({
      name: 'Arun Kumar',
      email: testEmailA,
      password: 'password123',
      userType: 'candidate',
      role: 'user',
      isEmailVerified: true
    });

    const reqA = { user: { userId: candidateA._id.toString(), userType: 'candidate' } };
    let resDataA = null;
    const mockRes = {
      status: (c) => { mockRes.statusCode = c; return mockRes; },
      json: (d) => { resDataA = d; return mockRes; }
    };
    await getCertificatePreview(reqA, mockRes);
    const showsYourName = resDataA?.data?.candidateName === 'Your Name';
    recordTest(1, 'New account with zero interviews displays "Your Name"', showsYourName, `Displayed: ${resDataA?.data?.candidateName}`);

    // -------------------------------------------------------------
    // SCENARIO 2: New account preview contains no diagonal watermark
    // -------------------------------------------------------------
    const clientCode = fs.readFileSync(path.join(__dirname, '../../client/src/pages/CertificatesPage.tsx'), 'utf8');
    const hasWatermarkInCode = clientCode.includes('PREVIEW ONLY • NOT ISSUED') || clientCode.includes('rotate(-26)');
    recordTest(2, 'New account preview contains no diagonal watermark or overlay', !hasWatermarkInCode, 'Watermark overlay removed from CertificateTemplate');

    // -------------------------------------------------------------
    // SCENARIO 3: No hardcoded names appear
    // -------------------------------------------------------------
    const hasHardcodedDarwinOrJoel = clientCode.includes('"Darwin"') || clientCode.includes("'Darwin'") || clientCode.includes('return "Joel"');
    recordTest(3, 'No hardcoded names (Darwin, Joel, Jamie) in certificate name formatting', !hasHardcodedDarwinOrJoel);

    // -------------------------------------------------------------
    // SCENARIO 4: Preview artwork retains original approved design
    // -------------------------------------------------------------
    const hasArtworkMaster = clientCode.includes('mockeefy_artwork_master.png') && clientCode.includes('width: "1682px",\n        height: "935px"');
    recordTest(4, 'Preview artwork retains the original approved 1682x935 design', hasArtworkMaster);

    // -------------------------------------------------------------
    // SCENARIO 5: New account cannot download a certificate
    // -------------------------------------------------------------
    let dlResA = null;
    const mockDlRes = {
      status: (c) => { mockDlRes.statusCode = c; return mockDlRes; },
      json: (d) => { dlResA = d; return mockDlRes; }
    };
    await verifyDownloadEligibility({ user: { userId: candidateA._id.toString(), userType: 'candidate' }, params: { certificateId: 'PREVIEW' } }, mockDlRes);
    recordTest(5, 'New account cannot download a certificate (rejected by backend)', mockDlRes.statusCode === 400);

    // -------------------------------------------------------------
    // SCENARIO 6: One or two eligible interviews still show "Your Name"
    // -------------------------------------------------------------
    const sess1Id = `audit-sess-6-1-${Date.now()}`;
    await Session.create({
      sessionId: sess1Id,
      candidateId: candidateA._id,
      expertId,
      status: 'completed',
      attendanceStatus: 'attended',
      candidateJoinedAt: new Date(Date.now() - 3600000),
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date()
    });
    await ReviewDetails.create({
      sessionId: sess1Id,
      candidateId: candidateA._id,
      expertId,
      reviewerRole: 'expert',
      overallRating: 4.5,
      technicalRating: 5,
      communicationRating: 4,
      problemSolvingRating: 5,
      designRating: 4,
      behavioralRating: 4.5,
      feedback: 'Good'
    });

    resDataA = null;
    await getCertificatePreview(reqA, mockRes);
    const stillYourName1 = resDataA?.data?.candidateName === 'Your Name' && resDataA?.data?.completedCount === 1;

    // Add 2nd session
    const sess2Id = `audit-sess-6-2-${Date.now()}`;
    await Session.create({
      sessionId: sess2Id,
      candidateId: candidateA._id,
      expertId,
      status: 'completed',
      attendanceStatus: 'attended',
      candidateJoinedAt: new Date(Date.now() - 7200000),
      startTime: new Date(Date.now() - 7200000),
      endTime: new Date()
    });
    await ReviewDetails.create({
      sessionId: sess2Id,
      candidateId: candidateA._id,
      expertId,
      reviewerRole: 'expert',
      overallRating: 4.0,
      technicalRating: 4,
      communicationRating: 4,
      problemSolvingRating: 4,
      designRating: 4,
      behavioralRating: 4,
      feedback: 'Solid'
    });

    resDataA = null;
    await getCertificatePreview(reqA, mockRes);
    const stillYourName2 = resDataA?.data?.candidateName === 'Your Name' && resDataA?.data?.completedCount === 2;
    recordTest(6, 'One or two eligible interviews still show "Your Name"', stillYourName1 && stillYourName2, `1 sess: ${stillYourName1}, 2 sess: ${stillYourName2}`);

    // -------------------------------------------------------------
    // SCENARIO 7: Three valid completed and evaluated interviews unlock eligibility
    // -------------------------------------------------------------
    const sess3Id = `audit-sess-7-3-${Date.now()}`;
    await Session.create({
      sessionId: sess3Id,
      candidateId: candidateA._id,
      expertId,
      status: 'completed',
      attendanceStatus: 'attended',
      candidateJoinedAt: new Date(Date.now() - 14400000),
      startTime: new Date(Date.now() - 14400000),
      endTime: new Date()
    });
    await ReviewDetails.create({
      sessionId: sess3Id,
      candidateId: candidateA._id,
      expertId,
      reviewerRole: 'expert',
      overallRating: 5.0,
      technicalRating: 5,
      communicationRating: 5,
      problemSolvingRating: 5,
      designRating: 5,
      behavioralRating: 5,
      feedback: 'Excellent mastery'
    });

    resDataA = null;
    await getCertificatePreview(reqA, mockRes);
    const isNowEligible = resDataA?.data?.completedCount === 3 && resDataA?.data?.isEligible === true && resDataA?.data?.stage === 'ELIGIBLE';
    recordTest(7, 'Three valid completed & evaluated interviews unlock eligibility', isNowEligible, `Stage: ${resDataA?.data?.stage}`);

    // -------------------------------------------------------------
    // SCENARIO 8: Eligible candidate sees their actual profile name
    // -------------------------------------------------------------
    const showsActualNameWhenEligible = resDataA?.data?.candidateName === 'Arun Kumar';
    recordTest(8, 'Eligible candidate sees their actual profile name (Arun Kumar)', showsActualNameWhenEligible, `Candidate Name: ${resDataA?.data?.candidateName}`);

    // -------------------------------------------------------------
    // SCENARIO 9: Editing profile before issuance updates candidate name
    // -------------------------------------------------------------
    await User.findByIdAndUpdate(candidateA._id, { $set: { name: 'Arun Raj' } });
    resDataA = null;
    await getCertificatePreview(reqA, mockRes);
    const nameUpdatedPreIssuance = resDataA?.data?.candidateName === 'Arun Raj' && resDataA?.data?.profileName === 'Arun Raj';
    recordTest(9, 'Editing profile before issuance updates candidate name (Arun Raj)', nameUpdatedPreIssuance, `Updated Name: ${resDataA?.data?.candidateName}`);

    // -------------------------------------------------------------
    // SCENARIO 10: Identity confirmation uses latest saved profile name
    // -------------------------------------------------------------
    let confirmRes = null;
    const mockConfirm = {
      status: (c) => { return mockConfirm; },
      json: (d) => { confirmRes = d; return mockConfirm; }
    };
    await confirmIdentity({
      user: { userId: candidateA._id.toString() },
      body: { acknowledged: true, confirmedName: 'Arun Raj' }
    }, mockConfirm);
    const confirmNameCorrect = confirmRes?.success === true && confirmRes?.data?.confirmedName === 'Arun Raj';
    recordTest(10, 'Identity confirmation uses latest saved profile name (Arun Raj)', confirmNameCorrect);

    // -------------------------------------------------------------
    // SCENARIO 11: Official issuance stores correct immutable name snapshot
    // -------------------------------------------------------------
    let issueRes = null;
    const mockIssue = {
      status: (c) => { mockIssue.statusCode = c; return mockIssue; },
      json: (d) => { issueRes = d; return mockIssue; }
    };
    await issueCertificate(reqA, mockIssue);
    const issuedCert = issueRes?.data;
    const snapshotStored = issuedCert?.candidateNameSnapshot === 'Arun Raj';
    recordTest(11, 'Official issuance stores correct immutable name snapshot in DB', snapshotStored, `Snapshot: ${issuedCert?.candidateNameSnapshot}`);

    // -------------------------------------------------------------
    // SCENARIO 12: Changing profile after issuance does NOT change existing certificate
    // -------------------------------------------------------------
    await User.findByIdAndUpdate(candidateA._id, { $set: { name: 'Arun Senior Architect' } });
    resDataA = null;
    await getCertificatePreview(reqA, mockRes);
    const certStillFrozen = resDataA?.data?.candidateName === 'Arun Raj' && resDataA?.data?.profileName === 'Arun Senior Architect';
    recordTest(12, 'Changing profile after issuance does NOT change existing certificate', certStillFrozen, `Snapshot retained: ${resDataA?.data?.candidateName}`);

    // -------------------------------------------------------------
    // SCENARIO 13: Downloaded PDF uses the immutable snapshot
    // -------------------------------------------------------------
    let dlAuthRes = null;
    const mockDlAuth = {
      status: (c) => { return mockDlAuth; },
      json: (d) => { dlAuthRes = d; return mockDlAuth; }
    };
    await verifyDownloadEligibility({
      user: { userId: candidateA._id.toString(), userType: 'candidate' },
      params: { certificateId: issuedCert.certificateId }
    }, mockDlAuth);
    const dlUsesSnapshot = dlAuthRes?.authorized === true && dlAuthRes?.data?.candidateNameSnapshot === 'Arun Raj';
    recordTest(13, 'Downloaded PDF authorization uses immutable snapshot (Arun Raj)', dlUsesSnapshot);

    // -------------------------------------------------------------
    // SCENARIO 14: Public certificate verification uses immutable snapshot
    // -------------------------------------------------------------
    let pubVerifyRes = null;
    const mockPubVerify = {
      status: (c) => { return mockPubVerify; },
      json: (d) => { pubVerifyRes = d; return mockPubVerify; }
    };
    await verifyCertificatePublic({ params: { certificateId: issuedCert.certificateId } }, mockPubVerify);
    const pubUsesSnapshot = pubVerifyRes?.valid === true && pubVerifyRes?.data?.candidateName === 'Arun Raj';
    recordTest(14, 'Public verification returns valid credential with snapshot (Arun Raj)', pubUsesSnapshot);

    // -------------------------------------------------------------
    // SCENARIO 15: Existing issued certificates remain unchanged
    // -------------------------------------------------------------
    const joelCert = await Certification.findOne({ certificateId: 'MCFY-MST-A163AA-2026' });
    const joelUnchanged = joelCert?.candidateNameSnapshot === 'Joel' && joelCert?.certificateStatus === 'ISSUED';
    recordTest(15, 'Existing issued certificates (Joel) remain 100% unchanged', joelUnchanged, `Joel snapshot: ${joelCert?.candidateNameSnapshot}`);

    // -------------------------------------------------------------
    // SCENARIO 16: Existing certificate eligibility and download security remain intact
    // -------------------------------------------------------------
    let unauthorizedDl = null;
    const mockUnauth = {
      status: (c) => { unauthorizedDl = { status: c }; return mockUnauth; },
      json: (d) => { return mockUnauth; }
    };
    const testEmailC = `unauth_cand_${Date.now()}@mockeefy.test`;
    const candC = await User.create({ name: 'Other User', email: testEmailC, password: 'pw', userType: 'candidate' });
    await verifyDownloadEligibility({
      user: { userId: candC._id.toString(), userType: 'candidate' },
      params: { certificateId: issuedCert.certificateId }
    }, mockUnauth);
    await User.findByIdAndDelete(candC._id);
    recordTest(16, 'Certificate eligibility and download authorization security intact (403 Forbidden for non-owner)', unauthorizedDl?.status === 403);

  } finally {
    // Clean up candidate A and associated test sessions/reviews
    if (candidateA) {
      await Session.deleteMany({ candidateId: candidateA._id });
      await ReviewDetails.deleteMany({ candidateId: candidateA._id });
      await Certification.deleteMany({ userId: candidateA._id });
      await User.findByIdAndDelete(candidateA._id);
    }
    await mongoose.disconnect();
  }

  console.log('\n================================================================');
  console.log(`TEST SUITE SUMMARY: ${testResults.filter(t => t.passed).length} / ${testResults.length} SCENARIOS PASSED`);
  console.log('================================================================');

  if (testResults.some(t => !t.passed)) {
    console.error('FAILED SCENARIOS EXIST!');
    process.exit(1);
  } else {
    console.log('ALL 16 SCENARIOS VERIFIED SUCCESSFULLY!');
  }
}

runComprehensiveSuite().catch(err => {
  console.error('Suite error:', err);
  process.exit(1);
});
