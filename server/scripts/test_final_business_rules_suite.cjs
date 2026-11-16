const mongoose = require('mongoose');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const API_BASE = 'http://localhost:5000/api';

async function run() {
  console.log('================================================================');
  console.log('   MOCKEEFY CRITICAL BUSINESS RULES & FINAL 10-TEST SUITE       ');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas');

  const Session = (await import('../models/Session.js')).default;
  const User = (await import('../models/User.js')).default;
  const Expert = (await import('../models/expertModel.js')).default;
  const Review = (await import('../models/reviewModel.js')).default;
  const Category = (await import('../models/Category.js')).default;
  const { isSlotWithinBookingWindow } = await import('../utils/availabilityValidator.js');

  const expertUser = await User.findOne({ userType: 'expert' });
  const expertDoc = await Expert.findOne({ userId: expertUser._id });
  const activeCategory = await Category.findOne({});

  // Create clean candidate for testing
  const candidateUser = await User.create({
    name: 'Business Rules Test Candidate',
    email: `cand_biz_rules_${Date.now()}@mockeefy.test`,
    password: 'password123',
    userType: 'candidate',
    certificateIdentityConfirmation: {
      confirmedName: 'Business Rules Test Candidate',
      confirmedAt: new Date()
    }
  });

  const candToken = jwt.sign(
    { userId: candidateUser._id, userType: 'candidate', email: candidateUser.email },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
  const expToken = jwt.sign(
    { userId: expertUser._id, userType: 'expert', email: expertUser.email },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  const testResults = [];
  const createdSessionIds = [];

  // =========================================================================
  // TEST 1: 10-Minute Booking Cutoff Boundaries
  // =========================================================================
  console.log('--- TEST 1: 10-Minute Booking Cutoff Boundaries ---');
  {
    // Slot ending at T + 30 mins -> Cutoff is T + 20 mins.
    const slotEndTime = new Date(Date.now() + 30 * 60 * 1000);
    const bookingCutoff = new Date(slotEndTime.getTime() - 10 * 60 * 1000);

    const slotStartTime = new Date(slotEndTime.getTime() - 30 * 60 * 1000);
    // Boundary 1: Strictly BEFORE cutoff (e.g. 5 seconds before cutoff)
    const beforeTime = new Date(bookingCutoff.getTime() - 5000);
    const validBefore = isSlotWithinBookingWindow(slotStartTime, slotEndTime, beforeTime);

    // Boundary 2: At EXACT cutoff (currentTime === bookingCutoff)
    const exactTime = new Date(bookingCutoff.getTime());
    const validExact = isSlotWithinBookingWindow(slotStartTime, slotEndTime, exactTime);

    // Boundary 3: AFTER cutoff (e.g. 5 seconds after cutoff)
    const afterTime = new Date(bookingCutoff.getTime() + 5000);
    const validAfter = isSlotWithinBookingWindow(slotStartTime, slotEndTime, afterTime);

    console.log(`Booking Cutoff Formula: scheduledEndTime - 10 minutes`);
    console.log(`Slot End Time: ${slotEndTime.toISOString()}`);
    console.log(`Booking Cutoff: ${bookingCutoff.toISOString()}`);
    console.log(`[Boundary 1] Before Cutoff (${beforeTime.toISOString()}): Valid? ${validBefore}`);
    console.log(`[Boundary 2] Exact Cutoff (${exactTime.toISOString()}): Valid? ${validExact}`);
    console.log(`[Boundary 3] After Cutoff (${afterTime.toISOString()}): Valid? ${validAfter}`);

    const pass = validBefore === true && validExact === false && validAfter === false;
    testResults.push({
      testNum: 1,
      name: '10-minute booking cutoff boundaries (before=valid, exact=rejected, after=rejected)',
      pass,
      details: { bookingCutoff: bookingCutoff.toISOString(), validBefore, validExact, validAfter }
    });
    console.log(`Result Test 1: [${pass ? 'PASS' : 'FAIL'}]\n`);
  }

  // =========================================================================
  // TEST 2: Candidate Never Joins (Lock at 0-14:59, Unlocks at 15:00)
  // =========================================================================
  console.log('--- TEST 2: Candidate Never Joins & 15-Minute Grace Period ---');
  {
    const now = new Date();
    // Case 2A: Session started 5 mins ago (< 15m). DID_NOT_ATTEND must be REJECTED.
    const sess2A = await Session.create({
      sessionId: 'TEST-BIZ-NOJOIN-EARLY-' + Date.now(),
      candidateId: candidateUser._id,
      expertId: expertDoc._id,
      categoryId: activeCategory?._id,
      startTime: new Date(now.getTime() - 5 * 60 * 1000), // 5 mins ago
      endTime: new Date(now.getTime() + 25 * 60 * 1000),
      status: 'confirmed',
      attendanceStatus: 'scheduled',
      candidateJoinedAt: null
    });
    createdSessionIds.push(sess2A.sessionId);

    let earlyLockBlocked = false;
    try {
      await axios.post(`${API_BASE}/sessions/${sess2A.sessionId}/complete`, {
        attendanceOutcome: 'DID_NOT_ATTEND',
        reason: 'Candidate did not show'
      }, { headers: { Authorization: `Bearer ${expToken}` } });
    } catch (err) {
      earlyLockBlocked = err.response?.status === 400 && err.response?.data?.message?.includes('Mark Absent is locked');
      console.log(`Early DID_NOT_ATTEND at 5 mins properly rejected: ${err.response?.data?.message}`);
    }

    // Case 2B: Session started 16 mins ago (>= 15m). DID_NOT_ATTEND must be ACCEPTED.
    const sess2B = await Session.create({
      sessionId: 'TEST-BIZ-NOJOIN-LATE-' + Date.now(),
      candidateId: candidateUser._id,
      expertId: expertDoc._id,
      categoryId: activeCategory?._id,
      startTime: new Date(now.getTime() - 16 * 60 * 1000), // 16 mins ago
      endTime: new Date(now.getTime() + 14 * 60 * 1000),
      status: 'confirmed',
      attendanceStatus: 'scheduled',
      candidateJoinedAt: null
    });
    createdSessionIds.push(sess2B.sessionId);

    let lateNoShowAccepted = false;
    try {
      const res2B = await axios.post(`${API_BASE}/sessions/${sess2B.sessionId}/complete`, {
        attendanceOutcome: 'DID_NOT_ATTEND',
        reason: 'Candidate did not attend within 15-minute grace period'
      }, { headers: { Authorization: `Bearer ${expToken}` } });
      lateNoShowAccepted = res2B.data?.success === true;
      console.log(`Late DID_NOT_ATTEND at 16 mins accepted: ${res2B.data?.message}`);
    } catch (err) {
      console.log('Unexpected rejection on 16m no-show:', err.response?.data || err.message);
    }

    const pass = earlyLockBlocked && lateNoShowAccepted;
    testResults.push({
      testNum: 2,
      name: 'Candidate never joins: locked 00:00-14:59, unlocked at 15:00',
      pass,
      details: { earlyLockBlocked, lateNoShowAccepted }
    });
    console.log(`Result Test 2: [${pass ? 'PASS' : 'FAIL'}]\n`);
  }

  // =========================================================================
  // TEST 3: Candidate Joins and Completes Legitimate Interview in LESS Than 15 Minutes
  // =========================================================================
  console.log('--- TEST 3: Candidate Completes Legitimate Interview in < 15 Minutes ---');
  {
    const now = new Date();
    // Started 8 minutes ago, candidate joined 7 minutes ago, interview conducted and completed now (duration = 7 mins)
    const sess3 = await Session.create({
      sessionId: 'TEST-BIZ-SHORT-COMP-' + Date.now(),
      candidateId: candidateUser._id,
      expertId: expertDoc._id,
      categoryId: activeCategory?._id,
      startTime: new Date(now.getTime() - 8 * 60 * 1000),
      endTime: new Date(now.getTime() + 22 * 60 * 1000),
      status: 'confirmed',
      attendanceStatus: 'attended',
      candidateJoinedAt: new Date(now.getTime() - 7 * 60 * 1000),
      candidateConnectionStatus: 'connected'
    });
    createdSessionIds.push(sess3.sessionId);

    let shortInterviewAccepted = false;
    let savedSess3 = null;
    try {
      const res3 = await axios.post(`${API_BASE}/sessions/${sess3.sessionId}/complete`, {
        attendanceOutcome: 'ATTENDED_COMPLETED',
        completionEvidence: {
          interviewConducted: true,
          summary: 'Fast-paced mock interview and technical Q&A completed in 7 minutes.'
        }
      }, { headers: { Authorization: `Bearer ${expToken}` } });

      savedSess3 = await Session.findOne({ sessionId: sess3.sessionId });
      shortInterviewAccepted = res3.data?.success === true &&
        savedSess3.status === 'completed' &&
        savedSess3.attendanceOutcome === 'ATTENDED_COMPLETED' &&
        savedSess3.completionEvidence?.verified === true;

      console.log(`Short interview (<15m) completion response:`, res3.data?.message);
      console.log(`Saved session outcome: ${savedSess3.attendanceOutcome}, evidence verified: ${savedSess3.completionEvidence?.verified}`);
    } catch (err) {
      console.log('Unexpected error on short interview completion:', err.response?.data || err.message);
    }

    const pass = shortInterviewAccepted;
    testResults.push({
      testNum: 3,
      name: 'Candidate joins and completes legitimate interview in < 15 minutes',
      pass,
      details: { shortInterviewAccepted, status: savedSess3?.status, outcome: savedSess3?.attendanceOutcome }
    });
    console.log(`Result Test 3: [${pass ? 'PASS' : 'FAIL'}]\n`);
  }

  // =========================================================================
  // TEST 4: Candidate Joins and Completes a Longer Interview
  // =========================================================================
  console.log('--- TEST 4: Candidate Joins and Completes a Longer Interview ---');
  {
    const now = new Date();
    // Started 35 minutes ago, candidate joined 34 minutes ago
    const sess4 = await Session.create({
      sessionId: 'TEST-BIZ-LONG-COMP-' + Date.now(),
      candidateId: candidateUser._id,
      expertId: expertDoc._id,
      categoryId: activeCategory?._id,
      startTime: new Date(now.getTime() - 35 * 60 * 1000),
      endTime: new Date(now.getTime() - 5 * 60 * 1000),
      status: 'confirmed',
      attendanceStatus: 'attended',
      candidateJoinedAt: new Date(now.getTime() - 34 * 60 * 1000),
      candidateConnectionStatus: 'connected'
    });
    createdSessionIds.push(sess4.sessionId);

    let longInterviewAccepted = false;
    let savedSess4 = null;
    try {
      const res4 = await axios.post(`${API_BASE}/sessions/${sess4.sessionId}/complete`, {
        attendanceOutcome: 'ATTENDED_COMPLETED',
        completionEvidence: {
          interviewConducted: true,
          summary: 'Full in-depth 34-minute coding and system design mock interview.'
        }
      }, { headers: { Authorization: `Bearer ${expToken}` } });

      savedSess4 = await Session.findOne({ sessionId: sess4.sessionId });
      longInterviewAccepted = res4.data?.success === true &&
        savedSess4.status === 'completed' &&
        savedSess4.attendanceOutcome === 'ATTENDED_COMPLETED' &&
        savedSess4.completionEvidence?.durationMinutes >= 30;

      console.log(`Long interview completion response:`, res4.data?.message);
      console.log(`Duration recorded: ${savedSess4.completionEvidence?.durationMinutes} minutes`);
    } catch (err) {
      console.log('Unexpected error on long interview completion:', err.response?.data || err.message);
    }

    const pass = longInterviewAccepted;
    testResults.push({
      testNum: 4,
      name: 'Candidate joins and completes a longer interview (34 minutes)',
      pass,
      details: { longInterviewAccepted, durationMinutes: savedSess4?.completionEvidence?.durationMinutes }
    });
    console.log(`Result Test 4: [${pass ? 'PASS' : 'FAIL'}]\n`);
  }

  // =========================================================================
  // TEST 5: Candidate Joins and Leaves Before Completion (ATTENDED_INCOMPLETE)
  // =========================================================================
  console.log('--- TEST 5: Candidate Joins and Leaves Before Completion ---');
  {
    const now = new Date();
    // Started 20 mins ago, candidate joined at T-20m, candidate left at T-15m
    const sess5 = await Session.create({
      sessionId: 'TEST-BIZ-EARLY-LEAVE-' + Date.now(),
      candidateId: candidateUser._id,
      expertId: expertDoc._id,
      categoryId: activeCategory?._id,
      startTime: new Date(now.getTime() - 20 * 60 * 1000),
      endTime: new Date(now.getTime() + 10 * 60 * 1000),
      status: 'confirmed',
      attendanceStatus: 'attended',
      candidateJoinedAt: new Date(now.getTime() - 20 * 60 * 1000),
      candidateLeftAt: new Date(now.getTime() - 15 * 60 * 1000),
      candidateConnectionStatus: 'left'
    });
    createdSessionIds.push(sess5.sessionId);

    let incompleteAccepted = false;
    let savedSess5 = null;
    try {
      const res5 = await axios.post(`${API_BASE}/sessions/${sess5.sessionId}/complete`, {
        attendanceOutcome: 'ATTENDED_INCOMPLETE',
        earlyEndReason: 'Candidate experienced audio failure and disconnected after 5 minutes.'
      }, { headers: { Authorization: `Bearer ${expToken}` } });

      savedSess5 = await Session.findOne({ sessionId: sess5.sessionId });
      incompleteAccepted = res5.data?.success === true &&
        savedSess5.status === 'completed' &&
        savedSess5.attendanceOutcome === 'ATTENDED_INCOMPLETE' &&
        savedSess5.earlyEnded === true;

      console.log(`Incomplete interview response:`, res5.data?.message);
      console.log(`Session attendance outcome: ${savedSess5.attendanceOutcome}, earlyEnded: ${savedSess5.earlyEnded}`);
    } catch (err) {
      console.log('Unexpected error on incomplete session:', err.response?.data || err.message);
    }

    const pass = incompleteAccepted;
    testResults.push({
      testNum: 5,
      name: 'Candidate joins and leaves before completion (ATTENDED_INCOMPLETE)',
      pass,
      details: { incompleteAccepted, outcome: savedSess5?.attendanceOutcome }
    });
    console.log(`Result Test 5: [${pass ? 'PASS' : 'FAIL'}]\n`);
  }

  // =========================================================================
  // TEST 6: Candidate Remains Connected When Expert Completes the Interview
  // =========================================================================
  console.log('--- TEST 6: Candidate Remains Connected When Expert Completes ---');
  {
    const now = new Date();
    // Candidate is actively in the meeting room, candidateLeftAt is null
    const sess6 = await Session.create({
      sessionId: 'TEST-BIZ-ACTIVE-CONN-' + Date.now(),
      candidateId: candidateUser._id,
      expertId: expertDoc._id,
      categoryId: activeCategory?._id,
      startTime: new Date(now.getTime() - 25 * 60 * 1000),
      endTime: new Date(now.getTime() + 5 * 60 * 1000),
      status: 'confirmed',
      attendanceStatus: 'attended',
      candidateJoinedAt: new Date(now.getTime() - 24 * 60 * 1000),
      candidateLeftAt: null, // Still connected!
      candidateConnectionStatus: 'connected'
    });
    createdSessionIds.push(sess6.sessionId);

    let activeConnCompleteSuccess = false;
    let savedSess6 = null;
    try {
      const res6 = await axios.post(`${API_BASE}/sessions/${sess6.sessionId}/complete`, {
        attendanceOutcome: 'ATTENDED_COMPLETED',
        completionEvidence: {
          interviewConducted: true,
          summary: 'Interview concluded while candidate remained actively connected.'
        }
      }, { headers: { Authorization: `Bearer ${expToken}` } });

      savedSess6 = await Session.findOne({ sessionId: sess6.sessionId });
      // Crucial: candidateLeftAt was NOT invented/faked, remains null
      const fakeLeftNotInvented = savedSess6.candidateLeftAt === null;
      activeConnCompleteSuccess = res6.data?.success === true &&
        savedSess6.status === 'completed' &&
        savedSess6.attendanceOutcome === 'ATTENDED_COMPLETED' &&
        savedSess6.completionEvidence?.verified === true &&
        fakeLeftNotInvented;

      console.log(`Completion while candidate connected succeeded: ${res6.data?.success}`);
      console.log(`candidateLeftAt in DB: ${savedSess6.candidateLeftAt} (fake timestamp not invented: ${fakeLeftNotInvented})`);
      console.log(`duration calculated accurately using completion now timestamp: ${savedSess6.completionEvidence?.durationMinutes} mins`);
    } catch (err) {
      console.log('Unexpected error on connected candidate completion:', err.response?.data || err.message);
    }

    const pass = activeConnCompleteSuccess;
    testResults.push({
      testNum: 6,
      name: 'Candidate remains connected when Expert completes (no fake leave timestamp invented)',
      pass,
      details: { activeConnCompleteSuccess, candidateLeftAt: savedSess6?.candidateLeftAt }
    });
    console.log(`Result Test 6: [${pass ? 'PASS' : 'FAIL'}]\n`);
  }

  // =========================================================================
  // TEST 7: Candidate Refreshes and Reconnects (Timestamp Preserved)
  // =========================================================================
  console.log('--- TEST 7: Candidate Refreshes and Reconnects ---');
  {
    const now = new Date();
    const sess7 = await Session.create({
      sessionId: 'TEST-BIZ-RECONN-' + Date.now(),
      candidateId: candidateUser._id,
      expertId: expertDoc._id,
      categoryId: activeCategory?._id,
      startTime: new Date(now.getTime() - 10 * 60 * 1000),
      endTime: new Date(now.getTime() + 20 * 60 * 1000),
      status: 'confirmed',
      attendanceStatus: 'scheduled',
      candidateJoinedAt: null
    });
    createdSessionIds.push(sess7.sessionId);

    // Initial Join
    await axios.post(`${API_BASE}/sessions/${sess7.sessionId}/join`, {}, {
      headers: { Authorization: `Bearer ${candToken}` }
    });
    const afterFirstJoin = await Session.findOne({ sessionId: sess7.sessionId });
    const initialJoinTime = afterFirstJoin.candidateJoinedAt;

    // Simulate page refresh / reconnect 1 second later
    await new Promise(r => setTimeout(r, 1000));
    await axios.post(`${API_BASE}/sessions/${sess7.sessionId}/join`, {}, {
      headers: { Authorization: `Bearer ${candToken}` }
    });
    const afterSecondJoin = await Session.findOne({ sessionId: sess7.sessionId });
    const secondJoinTime = afterSecondJoin.candidateJoinedAt;

    const timePreserved = initialJoinTime && secondJoinTime && (initialJoinTime.getTime() === secondJoinTime.getTime());
    console.log(`Initial Join Timestamp: ${initialJoinTime?.toISOString()}`);
    console.log(`Second Join Timestamp:  ${secondJoinTime?.toISOString()}`);
    console.log(`Preserved across reconnect: ${timePreserved}`);

    const pass = timePreserved === true && afterSecondJoin.candidateConnectionStatus === 'connected';
    testResults.push({
      testNum: 7,
      name: 'Candidate refreshes and reconnects (candidateJoinedAt timestamp preserved)',
      pass,
      details: { timePreserved, status: afterSecondJoin.candidateConnectionStatus }
    });
    console.log(`Result Test 7: [${pass ? 'PASS' : 'FAIL'}]\n`);
  }

  // =========================================================================
  // TEST 8: Expert Attempts an Invalid Attendance Outcome
  // =========================================================================
  console.log('--- TEST 8: Expert Attempts Invalid Attendance Outcomes ---');
  {
    const now = new Date();
    const sess8 = await Session.create({
      sessionId: 'TEST-BIZ-INVALID-' + Date.now(),
      candidateId: candidateUser._id,
      expertId: expertDoc._id,
      categoryId: activeCategory?._id,
      startTime: new Date(now.getTime() - 20 * 60 * 1000),
      endTime: new Date(now.getTime() + 10 * 60 * 1000),
      status: 'confirmed',
      attendanceStatus: 'attended',
      candidateJoinedAt: new Date(now.getTime() - 19 * 60 * 1000)
    });
    createdSessionIds.push(sess8.sessionId);

    // Subtest 8A: Candidate joined, but Expert attempts DID_NOT_ATTEND -> must reject
    let attendedNoShowBlocked = false;
    try {
      await axios.post(`${API_BASE}/sessions/${sess8.sessionId}/complete`, {
        attendanceOutcome: 'DID_NOT_ATTEND'
      }, { headers: { Authorization: `Bearer ${expToken}` } });
    } catch (err) {
      attendedNoShowBlocked = err.response?.status === 400 && err.response?.data?.message?.includes("Candidate joined this session");
      console.log(`DID_NOT_ATTEND for joined candidate properly rejected: ${err.response?.data?.message}`);
    }

    // Subtest 8B: Invalid outcome string -> must reject
    let invalidStringBlocked = false;
    try {
      await axios.post(`${API_BASE}/sessions/${sess8.sessionId}/complete`, {
        attendanceOutcome: 'ATTENDED_MAYBE'
      }, { headers: { Authorization: `Bearer ${expToken}` } });
    } catch (err) {
      invalidStringBlocked = err.response?.status === 400;
      console.log(`Invalid outcome string properly rejected: ${err.response?.data?.message}`);
    }

    // Subtest 8C: Missing completionEvidence for ATTENDED_COMPLETED -> must reject
    let missingEvidenceBlocked = false;
    try {
      await axios.post(`${API_BASE}/sessions/${sess8.sessionId}/complete`, {
        attendanceOutcome: 'ATTENDED_COMPLETED'
      }, { headers: { Authorization: `Bearer ${expToken}` } });
    } catch (err) {
      missingEvidenceBlocked = err.response?.status === 400 && err.response?.data?.message?.includes("Proof of interview completion is required");
      console.log(`Missing completion evidence properly rejected: ${err.response?.data?.message}`);
    }

    const pass = attendedNoShowBlocked && invalidStringBlocked && missingEvidenceBlocked;
    testResults.push({
      testNum: 8,
      name: 'Expert attempts invalid attendance outcomes (all 3 properly rejected by backend)',
      pass,
      details: { attendedNoShowBlocked, invalidStringBlocked, missingEvidenceBlocked }
    });
    console.log(`Result Test 8: [${pass ? 'PASS' : 'FAIL'}]\n`);
  }

  // =========================================================================
  // TEST 9: Duplicate Completion Request (Idempotency)
  // =========================================================================
  console.log('--- TEST 9: Duplicate Completion Request Idempotency ---');
  {
    const now = new Date();
    const sess9 = await Session.create({
      sessionId: 'TEST-BIZ-IDEMP-' + Date.now(),
      candidateId: candidateUser._id,
      expertId: expertDoc._id,
      categoryId: activeCategory?._id,
      startTime: new Date(now.getTime() - 25 * 60 * 1000),
      endTime: new Date(now.getTime() + 5 * 60 * 1000),
      status: 'confirmed',
      attendanceStatus: 'attended',
      candidateJoinedAt: new Date(now.getTime() - 24 * 60 * 1000),
      candidateConnectionStatus: 'connected'
    });
    createdSessionIds.push(sess9.sessionId);

    // Call 1
    const res9A = await axios.post(`${API_BASE}/sessions/${sess9.sessionId}/complete`, {
      attendanceOutcome: 'ATTENDED_COMPLETED',
      completionEvidence: { interviewConducted: true, summary: 'Original call' }
    }, { headers: { Authorization: `Bearer ${expToken}` } });

    // Call 2 (Duplicate)
    const res9B = await axios.post(`${API_BASE}/sessions/${sess9.sessionId}/complete`, {
      attendanceOutcome: 'ATTENDED_COMPLETED',
      completionEvidence: { interviewConducted: true, summary: 'Duplicate call' }
    }, { headers: { Authorization: `Bearer ${expToken}` } });

    console.log(`First call response message: "${res9A.data?.message}"`);
    console.log(`Duplicate call response message: "${res9B.data?.message}"`);

    const pass = res9A.data?.success === true &&
      res9B.data?.success === true &&
      res9B.data?.message === 'Session already finalized';

    testResults.push({
      testNum: 9,
      name: 'Duplicate completion request is safe and idempotent',
      pass,
      details: { firstCallSuccess: res9A.data?.success, duplicateCallMessage: res9B.data?.message }
    });
    console.log(`Result Test 9: [${pass ? 'PASS' : 'FAIL'}]\n`);
  }

  // =========================================================================
  // TEST 10: Certificate Eligibility for All Three Outcomes
  // =========================================================================
  console.log('--- TEST 10: Certificate Eligibility for All Three Outcomes ---');
  {
    // Clean all candidate sessions and reviews to test from scratch
    await Session.deleteMany({ candidateId: candidateUser._id });
    await Review.deleteMany({ candidateId: candidateUser._id });

    async function getCertCount() {
      const res = await axios.get(`${API_BASE}/certifications/status/${candidateUser._id}`, {
        headers: { Authorization: `Bearer ${candToken}` }
      });
      const d = res.data.data || res.data;
      return d.completedSessions ?? d.totalEligibleCount ?? d.completedCount ?? 0;
    }

    const now = new Date();

    // 10A: Outcome DID_NOT_ATTEND -> Count = 0
    const sessNoShow = await Session.create({
      sessionId: 'CERT-TEST-NOSHOW-' + Date.now(),
      candidateId: candidateUser._id,
      expertId: expertDoc._id,
      categoryId: activeCategory?._id,
      startTime: new Date(now.getTime() - 3600000),
      endTime: new Date(now.getTime() - 1800000),
      status: 'CANDIDATE_NO_SHOW',
      attendanceStatus: 'absent',
      attendanceOutcome: 'DID_NOT_ATTEND',
      candidateJoinedAt: null
    });
    createdSessionIds.push(sessNoShow.sessionId);
    const countA = await getCertCount();
    console.log(`[10A] DID_NOT_ATTEND session count: ${countA} (expected 0)`);

    // 10B: Outcome ATTENDED_INCOMPLETE -> Count = 0
    const sessIncomplete = await Session.create({
      sessionId: 'CERT-TEST-INCOMP-' + Date.now(),
      candidateId: candidateUser._id,
      expertId: expertDoc._id,
      categoryId: activeCategory?._id,
      startTime: new Date(now.getTime() - 3600000),
      endTime: new Date(now.getTime() - 1800000),
      status: 'completed',
      attendanceStatus: 'attended',
      attendanceOutcome: 'ATTENDED_INCOMPLETE',
      candidateJoinedAt: new Date(now.getTime() - 3500000),
      candidateLeftAt: new Date(now.getTime() - 3400000),
      candidateConnectionStatus: 'left'
    });
    createdSessionIds.push(sessIncomplete.sessionId);
    const countB = await getCertCount();
    console.log(`[10B] ATTENDED_INCOMPLETE session count: ${countB} (expected 0)`);

    // 10C: Outcome ATTENDED_COMPLETED without evaluation -> Count = 0
    const sessCompletedNoEval = await Session.create({
      sessionId: 'CERT-TEST-NOEVAL-' + Date.now(),
      candidateId: candidateUser._id,
      expertId: expertDoc._id,
      categoryId: activeCategory?._id,
      startTime: new Date(now.getTime() - 3600000),
      endTime: new Date(now.getTime() - 1800000),
      status: 'completed',
      attendanceStatus: 'attended',
      attendanceOutcome: 'ATTENDED_COMPLETED',
      candidateJoinedAt: new Date(now.getTime() - 3500000),
      completionEvidence: {
        verified: true,
        verifiedAt: now,
        durationMinutes: 25,
        candidateJoinedConfirmed: true,
        interviewConducted: true
      }
    });
    createdSessionIds.push(sessCompletedNoEval.sessionId);
    const countC = await getCertCount();
    console.log(`[10C] ATTENDED_COMPLETED without evaluation count: ${countC} (expected 0)`);

    // 10D: Add qualifying Expert evaluation -> Count = EXACTLY 1
    const review = await Review.create({
      sessionId: sessCompletedNoEval.sessionId,
      candidateId: candidateUser._id,
      expertId: expertUser._id,
      overallRating: 5,
      technicalRating: 5,
      communicationRating: 5,
      feedback: 'Outstanding interview performance.',
      reviewerRole: 'expert',
      createdAt: now
    });
    const countD = await getCertCount();
    console.log(`[10D] ATTENDED_COMPLETED with qualifying evaluation count: ${countD} (expected 1)`);

    const pass = countA === 0 && countB === 0 && countC === 0 && countD === 1;
    testResults.push({
      testNum: 10,
      name: 'Certificate eligibility for all 3 outcomes (DID_NOT_ATTEND=0, INCOMPLETE=0, COMPLETED without eval=0, COMPLETED with eval=1)',
      pass,
      details: { countA, countB, countC, countD }
    });
    console.log(`Result Test 10: [${pass ? 'PASS' : 'FAIL'}]\n`);
  }

  // Clean up test sessions & candidate
  await Session.deleteMany({ candidateId: candidateUser._id });
  await Review.deleteMany({ candidateId: candidateUser._id });
  await User.deleteOne({ _id: candidateUser._id });

  console.log('================================================================');
  console.log('                 FINAL TEST SUITE SUMMARY                        ');
  console.log('================================================================');
  let allPass = true;
  for (const r of testResults) {
    console.log(`Test ${r.testNum}: [${r.pass ? 'PASS' : 'FAIL'}] - ${r.name}`);
    if (!r.pass) allPass = false;
  }
  console.log(`\nOVERALL SUITE RESULT: ${allPass ? 'ALL 10 TESTS PASSED (100%)' : 'SOME TESTS FAILED'}`);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
