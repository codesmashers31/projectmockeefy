const mongoose = require('../node_modules/mongoose');
require('../node_modules/dotenv').config({ path: 'server/.env' });
const certCtrl = require('../controllers/certificationController.js');

async function runAuditSuite() {
  console.log('================================================================');
  console.log('MOCKEEFY — FINAL CANDIDATE-SPECIFIC ATTENDANCE SECURITY AUDIT');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  const Session = (await import('../models/Session.js')).default;
  const Certification = (await import('../models/Certification.js')).default;
  const User = (await import('../models/User.js')).default;
  const ReviewDetails = (await import('../models/reviewModel.js')).default;
  const Meeting = (await import('../models/Meeting.js')).default;

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[✅ PASS] Test ${totalTests}: ${message}`);
    } else {
      failedTests++;
      console.error(`[❌ FAIL] Test ${totalTests}: ${message}`);
    }
  }

  const runId = Date.now();
  const testCandidateId = new mongoose.Types.ObjectId();
  const testExpertId = new mongoose.Types.ObjectId();
  const testAdminId = new mongoose.Types.ObjectId();

  try {
    // -------------------------------------------------------------------------
    // SECTION 1: CANDIDATE-SPECIFIC ATTENDANCE SECURITY VERIFICATION
    // -------------------------------------------------------------------------

    // 1. Explicitly attended session with candidate join qualifies
    const sessCandAttended = await Session.create({
      sessionId: `sec-cand-att-${runId}-1`,
      candidateId: testCandidateId,
      expertId: testExpertId,
      status: 'completed',
      attendanceStatus: 'attended',
      candidateJoinedAt: new Date(),
      expertJoinedAt: new Date(),
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date()
    });
    await ReviewDetails.create({
      sessionId: sessCandAttended.sessionId,
      candidateId: testCandidateId,
      expertId: testExpertId,
      reviewerRole: 'expert',
      overallRating: 5
    });

    let eligible = await certCtrl.getEligibleCompletedSessions(testCandidateId);
    assert(eligible.some(s => s.sessionId === sessCandAttended.sessionId),
      'Explicit candidate attendance (attendanceStatus: "attended" + candidateJoinedAt) qualifies');

    // 2. Meeting.status === 'finished' alone WITHOUT candidate evidence DOES NOT QUALIFY
    const sessFinishedNoCand = await Session.create({
      sessionId: `sec-finished-nocand-${runId}-2`,
      candidateId: testCandidateId,
      expertId: testExpertId,
      status: 'completed',
      candidateJoinedAt: null, // Candidate never joined
      expertJoinedAt: new Date(Date.now() - 3600000), // Expert joined alone
      attendanceStatus: 'scheduled',
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date()
    });
    await ReviewDetails.create({
      sessionId: sessFinishedNoCand.sessionId,
      candidateId: testCandidateId,
      expertId: testExpertId,
      reviewerRole: 'expert',
      overallRating: 4.5
    });
    await Meeting.create({
      meetingId: sessFinishedNoCand.sessionId,
      sessionId: sessFinishedNoCand.sessionId,
      expertId: testExpertId.toString(),
      candidateId: testCandidateId.toString(),
      status: 'finished',
      activeUsers: [testExpertId.toString()], // Only expert was in the meeting!
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date()
    });

    eligible = await certCtrl.getEligibleCompletedSessions(testCandidateId);
    assert(!eligible.some(s => s.sessionId === sessFinishedNoCand.sessionId),
      'Meeting.status === "finished" WITHOUT candidate-specific join DOES NOT QUALIFY (Expert joined alone)');

    // 3. Meeting-based attendance with verified candidate in activeUsers qualifies
    const sessMeetingWithCand = await Session.create({
      sessionId: `sec-meet-withcand-${runId}-3`,
      candidateId: testCandidateId,
      expertId: testExpertId,
      status: 'completed',
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date()
    });
    await ReviewDetails.create({
      sessionId: sessMeetingWithCand.sessionId,
      candidateId: testCandidateId,
      expertId: testExpertId,
      reviewerRole: 'expert',
      overallRating: 5
    });
    await Meeting.create({
      meetingId: sessMeetingWithCand.sessionId,
      sessionId: sessMeetingWithCand.sessionId,
      expertId: testExpertId.toString(),
      candidateId: testCandidateId.toString(),
      status: 'finished',
      activeUsers: [testExpertId.toString(), testCandidateId.toString()], // Both present!
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date()
    });

    eligible = await certCtrl.getEligibleCompletedSessions(testCandidateId);
    assert(eligible.some(s => s.sessionId === sessMeetingWithCand.sessionId),
      'Meeting-based qualification succeeds when candidateId is explicitly verified in activeUsers');

    // 4. Meeting belonging to another candidate NEVER qualifies
    const otherCandidateId = new mongoose.Types.ObjectId();
    const sessWrongCandMeeting = await Session.create({
      sessionId: `sec-wrongcand-${runId}-4`,
      candidateId: testCandidateId,
      expertId: testExpertId,
      status: 'completed',
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date()
    });
    await ReviewDetails.create({
      sessionId: sessWrongCandMeeting.sessionId,
      candidateId: testCandidateId,
      expertId: testExpertId,
      reviewerRole: 'expert',
      overallRating: 4
    });
    await Meeting.create({
      meetingId: sessWrongCandMeeting.sessionId,
      sessionId: sessWrongCandMeeting.sessionId,
      expertId: testExpertId.toString(),
      candidateId: otherCandidateId.toString(), // Wrong candidate!
      status: 'finished',
      activeUsers: [otherCandidateId.toString()],
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date()
    });

    eligible = await certCtrl.getEligibleCompletedSessions(testCandidateId);
    assert(!eligible.some(s => s.sessionId === sessWrongCandMeeting.sessionId),
      'Meeting belonging to a different candidate NEVER establishes attendance');

    // 5. Absent sessions NEVER qualify
    const sessAbsent = await Session.create({
      sessionId: `sec-absent-${runId}-5`,
      candidateId: testCandidateId,
      expertId: testExpertId,
      status: 'completed',
      attendanceStatus: 'absent',
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date()
    });
    await ReviewDetails.create({
      sessionId: sessAbsent.sessionId,
      candidateId: testCandidateId,
      expertId: testExpertId,
      reviewerRole: 'expert',
      overallRating: 5
    });
    eligible = await certCtrl.getEligibleCompletedSessions(testCandidateId);
    assert(!eligible.some(s => s.sessionId === sessAbsent.sessionId),
      'Absent sessions (attendanceStatus: "absent") NEVER qualify');

    // 6. No-show sessions NEVER qualify
    const sessNoShow = await Session.create({
      sessionId: `sec-noshow-${runId}-6`,
      candidateId: testCandidateId,
      expertId: testExpertId,
      status: 'CANDIDATE_NO_SHOW',
      attendanceStatus: 'no-show',
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date()
    });
    eligible = await certCtrl.getEligibleCompletedSessions(testCandidateId);
    assert(!eligible.some(s => s.sessionId === sessNoShow.sessionId),
      'No-show sessions (CANDIDATE_NO_SHOW) NEVER qualify');

    // 7. Missing attendance status does NOT automatically qualify
    const sessMissingAtt = await Session.create({
      sessionId: `sec-missing-${runId}-7`,
      candidateId: testCandidateId,
      expertId: testExpertId,
      status: 'completed',
      // attendanceStatus missing / undefined
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date()
    });
    await ReviewDetails.create({
      sessionId: sessMissingAtt.sessionId,
      candidateId: testCandidateId,
      expertId: testExpertId,
      reviewerRole: 'expert',
      overallRating: 5
    });
    eligible = await certCtrl.getEligibleCompletedSessions(testCandidateId);
    assert(!eligible.some(s => s.sessionId === sessMissingAtt.sessionId),
      'Missing / unknown attendance status does NOT automatically qualify without candidate evidence');

    // -------------------------------------------------------------------------
    // SECTION 2: ADMINISTRATIVE REVIEW AUDIT TRAIL
    // -------------------------------------------------------------------------

    // 8. Non-admin cannot perform administrative review (403 Forbidden)
    const reqNonAdmin = {
      user: { userId: testCandidateId.toString(), userType: 'candidate' },
      body: { sessionId: sessMissingAtt.sessionId, decision: 'approved' }
    };
    let nonAdminRes = null;
    const mockNonAdminRes = {
      status: (c) => { mockNonAdminRes.statusCode = c; return { json: (d) => { nonAdminRes = { status: c, ...d }; } }; }
    };
    await certCtrl.adminReviewAttendance(reqNonAdmin, mockNonAdminRes);
    assert(nonAdminRes?.status === 403, 'Administrative attendance review by non-admin is strictly REJECTED (403)');

    // 9. Authorized admin review records explicit decision and audit trail
    const reqAdmin = {
      user: { userId: testAdminId.toString(), userType: 'admin' },
      body: {
        sessionId: sessMissingAtt.sessionId,
        decision: 'approved',
        notes: 'Verified candidate participation via video recording audit.'
      }
    };
    let adminRes = null;
    const mockAdminRes = {
      status: (c) => { mockAdminRes.statusCode = c; return { json: (d) => { adminRes = { status: c, ...d }; } }; },
      json: (d) => { adminRes = { status: 200, ...d }; }
    };
    await certCtrl.adminReviewAttendance(reqAdmin, mockAdminRes);
    const updatedSess = await Session.findOne({ sessionId: sessMissingAtt.sessionId });
    assert(
      updatedSess.attendanceStatus === 'attended' &&
      updatedSess.attendanceAudit?.decision === 'approved' &&
      updatedSess.attendanceAudit?.reviewedBy.toString() === testAdminId.toString() &&
      Boolean(updatedSess.attendanceAudit?.reviewedAt),
      'Admin approval sets attendanceStatus: "attended" and records full audit trail (adminId, timestamp, decision, notes)'
    );

    // 10. Once explicitly approved by admin, session qualifies
    eligible = await certCtrl.getEligibleCompletedSessions(testCandidateId);
    assert(eligible.some(s => s.sessionId === sessMissingAtt.sessionId),
      'Session explicitly approved by admin with audit record now qualifies for certificate milestone');

    // -------------------------------------------------------------------------
    // SECTION 3: RECONCILIATION & RECALCULATION OF JOEL'S SESSIONS
    // -------------------------------------------------------------------------
    const joelId = new mongoose.Types.ObjectId('6ad1fd8b146a0a4e7ca163aa');
    const joelSessions = await Session.find({ candidateId: joelId }).sort({ startTime: 1 }).lean();
    assert(joelSessions.length === 25, `Joel Total Sessions in MongoDB is exactly 25 (found: ${joelSessions.length})`);

    const joelProgress = await certCtrl.getMilestoneProgress(joelId);
    assert(joelProgress.totalIssuedCount === 1, 'Joel has exactly 1 issued certificate (Certificate 1: MCFY-MST-A163AA-2026)');
    assert(joelProgress.allocatedSessionIds.length === 3, 'Exactly 3 sessions are preserved with Certificate 1');
    assert(joelProgress.unallocatedCount === 0, `Joel unallocated confirmed candidate-attended count is 0 (found: ${joelProgress.unallocatedCount})`);
    assert(joelProgress.nextMilestoneNumber === 2, 'Next certificate milestone is Milestone 2 (Interviews 4–6)');
    assert(joelProgress.isNextMilestoneEligible === false, 'Joel is NOT automatically eligible for Milestone 2 without admin review (unallocated: 0/3)');
    assert(joelProgress.sessionsRequiringAdminReview.length === 13, `Exactly 13 evaluated sessions require admin review (found: ${joelProgress.sessionsRequiringAdminReview.length})`);

    // -------------------------------------------------------------------------
    // SECTION 4: CERTIFICATE ALLOCATION INTEGRITY
    // -------------------------------------------------------------------------
    const allCerts = await Certification.find({ certificateStatus: 'ISSUED' }).lean();
    let zeroOverlap = true;
    let exactThreePerCert = true;
    let bidirectionalAgreement = true;
    const globalAllocatedSessionIds = new Set();

    for (const cert of allCerts) {
      if (!Array.isArray(cert.qualifyingSessionIds)) continue;
      if (cert.milestoneNumber && cert.milestoneNumber >= 1 && cert.qualifyingSessionIds.length > 0) {
        if (cert.qualifyingSessionIds.length !== 3) {
          exactThreePerCert = false;
        }
      }
      for (const sid of cert.qualifyingSessionIds) {
        if (globalAllocatedSessionIds.has(sid)) {
          zeroOverlap = false;
        }
        globalAllocatedSessionIds.add(sid);

        const sessDoc = await Session.findOne({ sessionId: sid }).lean();
        if (sessDoc && sessDoc.allocatedCertificateId !== cert.certificateId) {
          bidirectionalAgreement = false;
        }
      }
    }

    assert(zeroOverlap, 'No session belongs to multiple certificates (Zero allocation overlap)');
    assert(exactThreePerCert, 'Each milestone certificate contains exactly three qualifying sessions');
    assert(bidirectionalAgreement, 'Certificate and Session allocation references agree bi-directionally');

    // -------------------------------------------------------------------------
    // SECTION 5: IDENTITY SNAPSHOT IMMUTABILITY (Joel -> Joel Kumar -> Joel A Kumar)
    // -------------------------------------------------------------------------
    const candMulti = await User.create({
      name: 'Joel',
      email: `multi_snapshot_${runId}@mockeefy.test`,
      password: 'Password123!',
      userType: 'candidate'
    });

    // Milestone 1 (Interviews 1-3) with explicit candidate attendance
    for (let i = 1; i <= 3; i++) {
      await Session.create({
        sessionId: `ms-cand-1-${runId}-${i}`,
        candidateId: candMulti._id,
        expertId: testExpertId,
        status: 'completed',
        attendanceStatus: 'attended',
        candidateJoinedAt: new Date(Date.now() - (30 - i) * 3600000),
        startTime: new Date(Date.now() - (30 - i) * 3600000),
        endTime: new Date()
      });
      await ReviewDetails.create({
        sessionId: `ms-cand-1-${runId}-${i}`,
        candidateId: candMulti._id,
        expertId: testExpertId,
        reviewerRole: 'expert',
        overallRating: 5
      });
    }

    // Confirm & Issue Milestone 1
    candMulti.certificateIdentityConfirmation = {
      confirmedName: 'Joel',
      confirmedAt: new Date(),
      confirmedForMilestone: 1
    };
    await candMulti.save();

    const reqIssue1 = { user: { userId: candMulti._id.toString(), userType: 'candidate' }, body: {} };
    let resIssue1 = null;
    const mockRes1 = { status: (c) => ({ json: (d) => { resIssue1 = d; } }) };
    await certCtrl.issueCertificate(reqIssue1, mockRes1);
    const cert1 = resIssue1?.data;

    // Update profile to 'Joel Kumar'
    candMulti.name = 'Joel Kumar';
    await candMulti.save();

    // Add sessions 4, 5, 6 with candidate attendance
    for (let i = 4; i <= 6; i++) {
      await Session.create({
        sessionId: `ms-cand-2-${runId}-${i}`,
        candidateId: candMulti._id,
        expertId: testExpertId,
        status: 'completed',
        attendanceStatus: 'attended',
        candidateJoinedAt: new Date(Date.now() - (20 - i) * 3600000),
        startTime: new Date(Date.now() - (20 - i) * 3600000),
        endTime: new Date()
      });
      await ReviewDetails.create({
        sessionId: `ms-cand-2-${runId}-${i}`,
        candidateId: candMulti._id,
        expertId: testExpertId,
        reviewerRole: 'expert',
        overallRating: 5
      });
    }

    // Confirm & Issue Milestone 2 as 'Joel Kumar'
    candMulti.certificateIdentityConfirmation = {
      confirmedName: 'Joel Kumar',
      confirmedAt: new Date(),
      confirmedForMilestone: 2
    };
    await candMulti.save();

    let resIssue2 = null;
    const mockRes2 = { status: (c) => ({ json: (d) => { resIssue2 = d; } }) };
    await certCtrl.issueCertificate(reqIssue1, mockRes2);
    const cert2 = resIssue2?.data;

    // Update profile to 'Joel A Kumar'
    candMulti.name = 'Joel A Kumar';
    await candMulti.save();

    // Add sessions 7, 8, 9 with candidate attendance
    for (let i = 7; i <= 9; i++) {
      await Session.create({
        sessionId: `ms-cand-3-${runId}-${i}`,
        candidateId: candMulti._id,
        expertId: testExpertId,
        status: 'completed',
        attendanceStatus: 'attended',
        candidateJoinedAt: new Date(Date.now() - (10 - i) * 3600000),
        startTime: new Date(Date.now() - (10 - i) * 3600000),
        endTime: new Date()
      });
      await ReviewDetails.create({
        sessionId: `ms-cand-3-${runId}-${i}`,
        candidateId: candMulti._id,
        expertId: testExpertId,
        reviewerRole: 'expert',
        overallRating: 5
      });
    }

    // Confirm & Issue Milestone 3 as 'Joel A Kumar'
    candMulti.certificateIdentityConfirmation = {
      confirmedName: 'Joel A Kumar',
      confirmedAt: new Date(),
      confirmedForMilestone: 3
    };
    await candMulti.save();

    let resIssue3 = null;
    const mockRes3 = { status: (c) => ({ json: (d) => { resIssue3 = d; } }) };
    await certCtrl.issueCertificate(reqIssue1, mockRes3);
    const cert3 = resIssue3?.data;

    // Verify all 3 certificates retain their independent snapshots
    const freshCert1 = await Certification.findOne({ certificateId: cert1.certificateId });
    const freshCert2 = await Certification.findOne({ certificateId: cert2.certificateId });
    const freshCert3 = await Certification.findOne({ certificateId: cert3.certificateId });

    assert(freshCert1.candidateNameSnapshot === 'Joel', 'Certificate 1 permanently retains snapshot "Joel"');
    assert(freshCert2.candidateNameSnapshot === 'Joel Kumar', 'Certificate 2 permanently retains snapshot "Joel Kumar"');
    assert(freshCert3.candidateNameSnapshot === 'Joel A Kumar', 'Certificate 3 permanently retains snapshot "Joel A Kumar"');

    // Public verification & download checks
    let pubVerify1 = null;
    await certCtrl.verifyCertificatePublic({ params: { certificateId: freshCert1.certificateId } }, { json: (d) => { pubVerify1 = d; } });
    assert(pubVerify1?.data?.candidateName === 'Joel', 'Public verification for Certificate 1 returns "Joel"');

    let pubVerify2 = null;
    await certCtrl.verifyCertificatePublic({ params: { certificateId: freshCert2.certificateId } }, { json: (d) => { pubVerify2 = d; } });
    assert(pubVerify2?.data?.candidateName === 'Joel Kumar', 'Public verification for Certificate 2 returns "Joel Kumar"');

    let pubVerify3 = null;
    await certCtrl.verifyCertificatePublic({ params: { certificateId: freshCert3.certificateId } }, { json: (d) => { pubVerify3 = d; } });
    assert(pubVerify3?.data?.candidateName === 'Joel A Kumar', 'Public verification for Certificate 3 returns "Joel A Kumar"');

    // Cleanup test fixtures
    await Session.deleteMany({ candidateId: { $in: [testCandidateId, candMulti._id, otherCandidateId] } });
    await ReviewDetails.deleteMany({ candidateId: { $in: [testCandidateId, candMulti._id, otherCandidateId] } });
    await Certification.deleteMany({ userId: { $in: [testCandidateId, candMulti._id, otherCandidateId] } });
    await Meeting.deleteMany({ candidateId: { $in: [testCandidateId.toString(), candMulti._id.toString(), otherCandidateId.toString()] } });
    await User.deleteMany({ _id: { $in: [testCandidateId, candMulti._id, testAdminId, otherCandidateId] } });

  } catch (err) {
    console.error('Audit Suite Error:', err);
  } finally {
    await mongoose.disconnect();
  }

  console.log('\n================================================================');
  console.log(`FINAL SECURITY AUDIT SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${totalTests})`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAuditSuite();
