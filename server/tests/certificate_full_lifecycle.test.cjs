const mongoose = require('mongoose');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function runFullLifecycleTest() {
  console.log('--- STARTING COMPREHENSIVE CERTIFICATE LIFECYCLE VERIFICATION ---');
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

  const User = mongoose.models.User || (await import('../models/User.js')).default;
  const Certification = mongoose.models.Certification || (await import('../models/Certification.js')).default;
  const Session = mongoose.models.Session || (await import('../models/Session.js')).default;
  const ReviewDetails = mongoose.models.ReviewDetails || (await import('../models/reviewModel.js')).default;

  const testEmail = `cert_audit_${Date.now()}@mockeefy.test`;
  const initialName = 'Arun Kumar';

  const expertUser = await User.findOne({ userType: 'expert' });
  const expertId = expertUser ? expertUser._id : new mongoose.Types.ObjectId();

  // 1. Create candidate user with name "Arun Kumar"
  const candidate = await User.create({
    name: initialName,
    email: testEmail,
    password: 'hashedpassword123',
    userType: 'candidate',
    role: 'user',
    isEmailVerified: true
  });
  console.log('Created test candidate:', candidate._id.toString(), candidate.name);

  const {
    getCertificatePreview,
    confirmIdentity,
    issueCertificate,
    verifyDownloadEligibility,
    getEligibleCompletedSessions
  } = await import('../controllers/certificationController.js');

  const req = {
    user: { userId: candidate._id.toString(), userType: 'candidate' }
  };

  const createMockRes = () => {
    const res = { status: 200, data: null };
    return {
      res,
      status: (c) => { res.status = c; return this; },
      json: (d) => { res.data = d; return this; }
    };
  };

  try {
    // Stage 1: 0 completed sessions
    let m = createMockRes();
    await getCertificatePreview(req, {
      status: (c) => { m.res.status = c; return m; },
      json: (d) => { m.res.data = d; return m; }
    });
    console.log('Stage 1 Check (0 sessions):', {
      stage: m.res.data?.data?.stage,
      candidateName: m.res.data?.data?.candidateName,
      isEligible: m.res.data?.data?.isEligible,
      isIssued: m.res.data?.data?.isIssued
    });
    if (m.res.data?.data?.stage !== 'PREVIEW' || m.res.data?.data?.candidateName !== 'Arun Kumar') {
      throw new Error('Stage 1 failed: Expected PREVIEW with Arun Kumar');
    }

    // Add 1 completed and evaluated session
    const s1Id = `audit-sess-1-${Date.now()}`;
    const s1 = await Session.create({
      sessionId: s1Id,
      candidateId: candidate._id,
      expertId,
      status: 'completed',
      attendanceStatus: 'attended',
      candidateJoinedAt: new Date(Date.now() - 3500000),
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date()
    });
    await ReviewDetails.create({
      sessionId: s1Id,
      candidateId: candidate._id,
      expertId,
      reviewerRole: 'expert',
      overallRating: 4.5,
      technicalRating: 4,
      communicationRating: 5,
      problemSolvingRating: 4,
      designRating: 5,
      behavioralRating: 4.5,
      feedback: 'Good'
    });

    let eligible = await getEligibleCompletedSessions(candidate._id);
    console.log('After 1 session: eligible count =', eligible.length);
    if (eligible.length !== 1) throw new Error('Expected 1 eligible session');

    // Stage 1 Check with 1 session
    m = createMockRes();
    await getCertificatePreview(req, {
      status: (c) => { m.res.status = c; return m; },
      json: (d) => { m.res.data = d; return m; }
    });
    if (m.res.data?.data?.stage !== 'PREVIEW' || m.res.data?.data?.completedCount !== 1) {
      throw new Error('Stage 1 with 1 session failed');
    }

    // Add 2nd session
    const s2Id = `audit-sess-2-${Date.now()}`;
    await Session.create({
      sessionId: s2Id,
      candidateId: candidate._id,
      expertId,
      status: 'completed',
      attendanceStatus: 'attended',
      candidateJoinedAt: new Date(Date.now() - 7100000),
      startTime: new Date(Date.now() - 7200000),
      endTime: new Date()
    });
    await ReviewDetails.create({
      sessionId: s2Id,
      candidateId: candidate._id,
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

    // Add a NO-SHOW session (must NOT count!)
    const sNoShowId = `audit-sess-noshow-${Date.now()}`;
    await Session.create({
      sessionId: sNoShowId,
      candidateId: candidate._id,
      expertId,
      status: 'no-show',
      attendanceStatus: 'no-show',
      startTime: new Date(Date.now() - 10000000),
      endTime: new Date()
    });

    eligible = await getEligibleCompletedSessions(candidate._id);
    console.log('After 2 sessions + 1 no-show: eligible count =', eligible.length);
    if (eligible.length !== 2) throw new Error('Expected 2 eligible sessions (no-show excluded)');

    // Add 3rd genuinely completed & evaluated session
    const s3Id = `audit-sess-3-${Date.now()}`;
    await Session.create({
      sessionId: s3Id,
      candidateId: candidate._id,
      expertId,
      status: 'completed',
      attendanceStatus: 'attended',
      candidateJoinedAt: new Date(Date.now() - 14300000),
      startTime: new Date(Date.now() - 14400000),
      endTime: new Date()
    });
    await ReviewDetails.create({
      sessionId: s3Id,
      candidateId: candidate._id,
      expertId,
      reviewerRole: 'expert',
      overallRating: 5.0,
      technicalRating: 5,
      communicationRating: 5,
      problemSolvingRating: 5,
      designRating: 5,
      behavioralRating: 5,
      feedback: 'Excellent'
    });

    eligible = await getEligibleCompletedSessions(candidate._id);
    console.log('After 3 completed & evaluated sessions: eligible count =', eligible.length);
    if (eligible.length !== 3) throw new Error('Expected 3 eligible sessions');

    // Stage 2: Eligible! But not yet confirmed or issued
    m = createMockRes();
    await getCertificatePreview(req, {
      status: (c) => { m.res.status = c; return m; },
      json: (d) => { m.res.data = d; return m; }
    });
    console.log('Stage 2 Check (3 sessions, pre-confirmation):', {
      stage: m.res.data?.data?.stage,
      isEligible: m.res.data?.data?.isEligible,
      isIssued: m.res.data?.data?.isIssued
    });
    if (m.res.data?.data?.stage !== 'ELIGIBLE' || !m.res.data?.data?.isEligible) {
      throw new Error('Stage 2 check failed: Expected ELIGIBLE');
    }

    // Try to issue before identity confirmation (must fail!)
    m = createMockRes();
    await issueCertificate(req, {
      status: (c) => { m.res.status = c; return m; },
      json: (d) => { m.res.data = d; return m; }
    });
    console.log('Issuance without confirmation status:', m.res.status);
    if (m.res.status !== 400) {
      throw new Error('Expected 400 when attempting to issue before identity confirmation');
    }

    // Now Confirm Identity with Arun Kumar
    m = createMockRes();
    await confirmIdentity({
      user: { userId: candidate._id.toString() },
      body: { acknowledged: true, confirmedName: 'Arun Kumar' }
    }, {
      status: (c) => { m.res.status = c; return m; },
      json: (d) => { m.res.data = d; return m; }
    });
    console.log('Identity confirmed response:', m.res.data?.data);
    if (m.res.data?.data?.confirmedName !== 'Arun Kumar') {
      throw new Error('Identity confirmation failed');
    }

    // Now Issue Certificate
    m = createMockRes();
    await issueCertificate(req, {
      status: (c) => { m.res.status = c; return m; },
      json: (d) => { m.res.data = d; return m; }
    });
    console.log('Certificate Issued response:', {
      status: m.res.status,
      certificateId: m.res.data?.data?.certificateId,
      candidateNameSnapshot: m.res.data?.data?.candidateNameSnapshot
    });
    if (m.res.data?.data?.candidateNameSnapshot !== 'Arun Kumar') {
      throw new Error('Expected candidateNameSnapshot to be Arun Kumar');
    }
    const issuedCertId = m.res.data?.data?.certificateId;

    // Stage 3 Check: Must now be ISSUED
    m = createMockRes();
    await getCertificatePreview(req, {
      status: (c) => { m.res.status = c; return m; },
      json: (d) => { m.res.data = d; return m; }
    });
    console.log('Stage 3 Check (After issuance):', {
      stage: m.res.data?.data?.stage,
      candidateName: m.res.data?.data?.candidateName,
      isIssued: m.res.data?.data?.isIssued
    });
    if (m.res.data?.data?.stage !== 'ISSUED' || m.res.data?.data?.candidateName !== 'Arun Kumar') {
      throw new Error('Stage 3 preview failed');
    }

    // CRITICAL TEST: Edit Candidate Profile Name to "Arun Raj" in MongoDB
    console.log('\n--- SIMULATING PROFILE NAME CHANGE TO "Arun Raj" ---');
    await User.findByIdAndUpdate(candidate._id, { $set: { name: 'Arun Raj' } });
    const updatedUser = await User.findById(candidate._id);
    console.log('Candidate updated name in MongoDB:', updatedUser.name);

    // Verify Issued Certificate still returns "Arun Kumar"
    m = createMockRes();
    await getCertificatePreview(req, {
      status: (c) => { m.res.status = c; return m; },
      json: (d) => { m.res.data = d; return m; }
    });
    console.log('Preview after profile name change:', {
      stage: m.res.data?.data?.stage,
      candidateName: m.res.data?.data?.candidateName,
      profileName: m.res.data?.data?.profileName
    });
    if (m.res.data?.data?.candidateName !== 'Arun Kumar') {
      throw new Error(`CRITICAL BREACH: Certificate name mutated to "${m.res.data?.data?.candidateName}" instead of staying frozen as "Arun Kumar"!`);
    }

    // Verify Download check returns frozen snapshot "Arun Kumar"
    m = createMockRes();
    await verifyDownloadEligibility({
      user: { userId: candidate._id.toString(), userType: 'candidate' },
      params: { certificateId: issuedCertId }
    }, {
      status: (c) => { m.res.status = c; return m; },
      json: (d) => { m.res.data = d; return m; }
    });
    console.log('Download check after profile name change:', m.res.data?.data);
    if (m.res.data?.data?.candidateNameSnapshot !== 'Arun Kumar') {
      throw new Error('Download check failed: snapshot was not Arun Kumar');
    }

    console.log('\n>>> ALL 8 FULL-LIFECYCLE VERIFICATION CHECKS PASSED PERFECTLY! <<<');

  } finally {
    // Clean up test data
    console.log('Cleaning up test data...');
    await Session.deleteMany({ candidateId: candidate._id });
    await ReviewDetails.deleteMany({ sessionId: { $regex: /^audit-sess-/ } });
    await Certification.deleteMany({ userId: candidate._id });
    await User.findByIdAndDelete(candidate._id);
    console.log('Cleaned up test candidate & test records.');
    await mongoose.disconnect();
  }
}

runFullLifecycleTest().catch(err => {
  console.error('Lifecycle Test Failed:', err);
  process.exit(1);
});
