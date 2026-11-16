const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Session = require('../models/Session.js').default;
const User = require('../models/User.js').default;
const ExpertDetails = require('../models/expertModel.js').default;
const PaymentRecord = require('../models/PaymentRecord.js').default;
const Wallet = require('../models/Wallet.js').default;
const WalletTransaction = require('../models/WalletTransaction.js').default;
const ReviewDetails = require('../models/reviewModel.js').default;
const Category = require('../models/Category.js').default;

const { completeSession, markCandidateNoShow, submitReview } = require('../controllers/sessionController.js');
const { getEligibleCompletedSessions } = require('../controllers/certificationController.js');

const testRunId = `payout_test_${Date.now()}`;
let testExpertUser, testExpertProfile, testCandidateUser;
const results = [];

function assert(condition, name, details = '') {
    if (condition) {
        console.log(`  [PASS] ${name}`);
        results.push({ name, pass: true });
    } else {
        console.error(`  [FAIL] ${name} - Details: ${details}`);
        results.push({ name, pass: false, error: details });
    }
}

function mockReq(params = {}, body = {}, user = {}) {
    return {
        params,
        body,
        user,
        ip: '127.0.0.1',
        headers: { 'user-agent': 'TestAgent/1.0' }
    };
}

function mockRes() {
    return {
        statusCode: 200,
        data: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.data = payload;
            return this;
        }
    };
}

async function run() {
    console.log(`\n======================================================`);
    console.log(`  MOCKEEFY CRITICAL EXPERT PAYOUT & OUTCOME TEST SUITE`);
    console.log(`======================================================\n`);

    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for testing.\n");

    try {
        // Setup Isolated Test Users
        testExpertUser = await User.create({
            name: `${testRunId} Expert`,
            email: `${testRunId}_expert@mockeefy.test`,
            password: 'Password123!',
            userType: 'expert',
            walletBalance: 0
        });

        testExpertProfile = await ExpertDetails.create({
            userId: testExpertUser._id,
            personalInformation: { userName: 'Test Expert', expertID: `${testRunId}_EXP` }
        });

        testCandidateUser = await User.create({
            name: `${testRunId} Candidate`,
            email: `${testRunId}_candidate@mockeefy.test`,
            password: 'Password123!',
            userType: 'candidate',
            walletBalance: 0
        });

        const expertAuth = { userId: testExpertUser._id.toString(), userType: 'expert' };
        const candidateAuth = { userId: testCandidateUser._id.toString(), userType: 'candidate' };

        const realCategory = await Category.findOne({});
        const catId = realCategory?._id || new mongoose.Types.ObjectId();
        const catName = realCategory?.name || 'Software Engineering';

        console.log("--- TEST A: ATTENDED_COMPLETED Outcome ---");
        // Create an attended session (price 500)
        const sessionA = await Session.create({
            sessionId: `${testRunId}_session_a`,
            expertId: testExpertUser._id,
            candidateId: testCandidateUser._id,
            categoryId: catId,
            categoryNameSnapshot: catName,
            topics: [catName],
            startTime: new Date(Date.now() - 30 * 60 * 1000),
            endTime: new Date(Date.now() - 5 * 60 * 1000),
            price: 500,
            status: 'confirmed',
            attendanceStatus: 'attended',
            candidateJoinedAt: new Date(Date.now() - 28 * 60 * 1000)
        });

        await PaymentRecord.create({
            paymentId: `pay_${testRunId}_a`,
            orderId: `ord_${testRunId}_a`,
            userId: testCandidateUser._id,
            paymentType: 'booking',
            amount: 500,
            sessionId: sessionA.sessionId,
            status: 'verified'
        });

        // 1. Expert ends session as ATTENDED_COMPLETED
        const resA1 = mockRes();
        await completeSession(mockReq(
            { sessionId: sessionA.sessionId },
            {
                attendanceOutcome: 'ATTENDED_COMPLETED',
                completionEvidence: { interviewConducted: true, summary: 'Conducted successfully' }
            },
            expertAuth
        ), resA1);

        const sessionAAfterEnd = await Session.findOne({ sessionId: sessionA.sessionId });
        const walletBeforeReview = (await Wallet.findOne({ userId: testExpertUser._id }))?.availableBalance || 0;

        assert(resA1.statusCode === 200 && sessionAAfterEnd.status === 'completed',
            'Test A1: Session ends with status "completed" and ATTENDED_COMPLETED outcome',
            `Status: ${sessionAAfterEnd?.status}, outcome: ${sessionAAfterEnd?.attendanceOutcome}`);

        assert(sessionAAfterEnd.payoutStatus === 'pending_feedback' && sessionAAfterEnd.payoutCredited === false,
            'Test A2: Payout status is "pending_feedback" and not yet credited before feedback',
            `payoutStatus: ${sessionAAfterEnd?.payoutStatus}, payoutCredited: ${sessionAAfterEnd?.payoutCredited}`);

        assert(walletBeforeReview === 0,
            'Test A3: Expert wallet balance remains 0 before feedback is submitted',
            `Balance: ${walletBeforeReview}`);

        // Check certificate eligibility before feedback: should NOT be eligible
        const eligibleBeforeFeedback = await getEligibleCompletedSessions(testCandidateUser._id);
        const aEligibleBefore = eligibleBeforeFeedback.some(s => s.sessionId === sessionA.sessionId);
        assert(!aEligibleBefore,
            'Test A4: Candidate certificate progress excludes session before feedback is submitted',
            `In eligible list: ${aEligibleBefore}`);

        // 2. Submit expert feedback
        const resA2 = mockRes();
        await submitReview(mockReq(
            { sessionId: sessionA.sessionId },
            {
                overallRating: 5,
                technicalRating: 5,
                communicationRating: 5,
                feedback: 'Excellent candidate, demonstrated strong problem solving.',
                expertId: testExpertUser._id.toString(),
                candidateId: testCandidateUser._id.toString(),
                reviewerRole: 'expert'
            },
            expertAuth
        ), resA2);

        const sessionAAfterReview = await Session.findOne({ sessionId: sessionA.sessionId });
        const walletAfterReview = (await Wallet.findOne({ userId: testExpertUser._id }))?.availableBalance || 0;
        const txnsA = await WalletTransaction.find({ referenceId: sessionA._id, type: 'CREDIT' });

        assert(resA2.statusCode === 201 || resA2.statusCode === 200,
            'Test A5: Expert feedback submitted successfully',
            `Status: ${resA2.statusCode}`);

        assert(sessionAAfterReview.payoutStatus === 'credited' && sessionAAfterReview.payoutCredited === true && sessionAAfterReview.payoutAmount === 400,
            'Test A6: Payout credited upon feedback submission (₹400, 80% share)',
            `payoutStatus: ${sessionAAfterReview?.payoutStatus}, payoutAmount: ${sessionAAfterReview?.payoutAmount}`);

        assert(walletAfterReview === 400,
            'Test A7: Expert wallet balance updated to ₹400',
            `Wallet balance: ${walletAfterReview}`);

        assert(txnsA.length === 1 && txnsA[0].amount === 400,
            'Test A8: Exactly one ledger transaction created for session A',
            `Txn count: ${txnsA.length}, amount: ${txnsA[0]?.amount}`);

        // Check certificate eligibility after feedback: should now be eligible!
        const eligibleAfterFeedback = await getEligibleCompletedSessions(testCandidateUser._id);
        const aEligibleAfter = eligibleAfterFeedback.some(s => s.sessionId === sessionA.sessionId);
        assert(aEligibleAfter,
            'Test A9: Candidate certificate progress now includes genuinely evaluated completed interview',
            `In eligible list: ${aEligibleAfter}`);

        // Duplicate review submission should not credit payout again
        const resA3 = mockRes();
        await submitReview(mockReq(
            { sessionId: sessionA.sessionId },
            { overallRating: 5, technicalRating: 5, feedback: 'Duplicate' },
            expertAuth
        ), resA3);
        const walletAfterDup = (await Wallet.findOne({ userId: testExpertUser._id }))?.availableBalance || 0;
        assert(walletAfterDup === 400,
            'Test A10: Duplicate review submission does not credit expert again',
            `Balance after duplicate: ${walletAfterDup}`);


        console.log("\n--- TEST B: DID_NOT_ATTEND Outcome ---");
        // Create an unattended session (price 500) where 15 min grace elapsed
        const sessionB = await Session.create({
            sessionId: `${testRunId}_session_b`,
            expertId: testExpertUser._id,
            candidateId: testCandidateUser._id,
            startTime: new Date(Date.now() - 20 * 60 * 1000),
            endTime: new Date(Date.now() + 10 * 60 * 1000),
            price: 500,
            status: 'confirmed',
            candidateJoinedAt: null
        });

        await PaymentRecord.create({
            paymentId: `pay_${testRunId}_b`,
            orderId: `ord_${testRunId}_b`,
            userId: testCandidateUser._id,
            paymentType: 'booking',
            amount: 500,
            sessionId: sessionB.sessionId,
            status: 'verified'
        });

        const resB = mockRes();
        await completeSession(mockReq(
            { sessionId: sessionB.sessionId },
            { attendanceOutcome: 'DID_NOT_ATTEND', reason: 'Candidate did not show up' },
            expertAuth
        ), resB);

        const sessionBAfter = await Session.findOne({ sessionId: sessionB.sessionId });
        const walletAfterB = (await Wallet.findOne({ userId: testExpertUser._id }))?.availableBalance || 0;
        const txnsB = await WalletTransaction.find({ referenceId: sessionB._id, type: 'CREDIT' });

        assert(resB.statusCode === 200 && sessionBAfter.status === 'CANDIDATE_NO_SHOW' && sessionBAfter.attendanceOutcome === 'DID_NOT_ATTEND',
            'Test B1: Session transitioned to CANDIDATE_NO_SHOW and DID_NOT_ATTEND',
            `Status: ${sessionBAfter?.status}, outcome: ${sessionBAfter?.attendanceOutcome}`);

        assert(sessionBAfter.payoutStatus === 'credited' && sessionBAfter.payoutCredited === true && sessionBAfter.payoutAmount === 400,
            'Test B2: Payout settled immediately without requiring feedback (₹400)',
            `payoutStatus: ${sessionBAfter?.payoutStatus}, payoutAmount: ${sessionBAfter?.payoutAmount}`);

        assert(walletAfterB === 800,
            'Test B3: Expert wallet credited immediately (balance now ₹800)',
            `Wallet balance: ${walletAfterB}`);

        assert(txnsB.length === 1 && txnsB[0].amount === 400,
            'Test B4: Exactly one ledger transaction created for no-show session B',
            `Txn count: ${txnsB.length}`);

        // Verify Certificate Eligibility: Must NOT count towards certificate progress
        const eligibleAfterB = await getEligibleCompletedSessions(testCandidateUser._id);
        const bEligible = eligibleAfterB.some(s => s.sessionId === sessionB.sessionId);
        assert(!bEligible,
            'Test B5: Candidate certificate progress strictly excludes DID_NOT_ATTEND session',
            `In eligible list: ${bEligible}`);


        console.log("\n--- TEST C: ATTENDED_INCOMPLETE Outcome ---");
        // Create an attended session where candidate left early
        const sessionC = await Session.create({
            sessionId: `${testRunId}_session_c`,
            expertId: testExpertUser._id,
            candidateId: testCandidateUser._id,
            startTime: new Date(Date.now() - 25 * 60 * 1000),
            endTime: new Date(Date.now() + 5 * 60 * 1000),
            price: 500,
            status: 'confirmed',
            candidateJoinedAt: new Date(Date.now() - 23 * 60 * 1000),
            candidateLeftAt: new Date(Date.now() - 10 * 60 * 1000)
        });

        await PaymentRecord.create({
            paymentId: `pay_${testRunId}_c`,
            orderId: `ord_${testRunId}_c`,
            userId: testCandidateUser._id,
            paymentType: 'booking',
            amount: 500,
            sessionId: sessionC.sessionId,
            status: 'verified'
        });

        const resC = mockRes();
        await completeSession(mockReq(
            { sessionId: sessionC.sessionId },
            {
                attendanceOutcome: 'ATTENDED_INCOMPLETE',
                earlyEndReason: 'Candidate had network issues and disconnected early'
            },
            expertAuth
        ), resC);

        const sessionCAfter = await Session.findOne({ sessionId: sessionC.sessionId });
        const walletAfterC = (await Wallet.findOne({ userId: testExpertUser._id }))?.availableBalance || 0;
        const txnsC = await WalletTransaction.find({ referenceId: sessionC._id, type: 'CREDIT' });

        assert(resC.statusCode === 200 && sessionCAfter.status === 'completed' && sessionCAfter.attendanceOutcome === 'ATTENDED_INCOMPLETE',
            'Test C1: Session transitioned to completed with ATTENDED_INCOMPLETE outcome and earlyEnded: true',
            `Status: ${sessionCAfter?.status}, outcome: ${sessionCAfter?.attendanceOutcome}, earlyEnded: ${sessionCAfter?.earlyEnded}`);

        assert(sessionCAfter.payoutStatus === 'credited' && sessionCAfter.payoutCredited === true && sessionCAfter.payoutAmount === 400,
            'Test C2: Payout settled immediately without requiring feedback (₹400)',
            `payoutStatus: ${sessionCAfter?.payoutStatus}, payoutAmount: ${sessionCAfter?.payoutAmount}`);

        assert(walletAfterC === 1200,
            'Test C3: Expert wallet credited immediately (balance now ₹1200)',
            `Wallet balance: ${walletAfterC}`);

        assert(txnsC.length === 1 && txnsC[0].amount === 400,
            'Test C4: Exactly one ledger transaction created for incomplete session C',
            `Txn count: ${txnsC.length}`);

        // Verify Certificate Eligibility: Must NOT count towards certificate progress
        const eligibleAfterC = await getEligibleCompletedSessions(testCandidateUser._id);
        const cEligible = eligibleAfterC.some(s => s.sessionId === sessionC.sessionId);
        assert(!cEligible,
            'Test C5: Candidate certificate progress strictly excludes ATTENDED_INCOMPLETE session',
            `In eligible list: ${cEligible}`);


        console.log("\n--- TEST D: Financial Integrity & Arithmetic Reconciliations ---");
        // Test Zero / Free Promo Session
        const sessionFree = await Session.create({
            sessionId: `${testRunId}_session_free`,
            expertId: testExpertUser._id,
            candidateId: testCandidateUser._id,
            startTime: new Date(Date.now() - 25 * 60 * 1000),
            endTime: new Date(Date.now() + 5 * 60 * 1000),
            price: 0,
            status: 'confirmed',
            candidateJoinedAt: new Date(Date.now() - 20 * 60 * 1000)
        });

        const resFree = mockRes();
        await completeSession(mockReq(
            { sessionId: sessionFree.sessionId },
            { attendanceOutcome: 'ATTENDED_INCOMPLETE' },
            expertAuth
        ), resFree);

        const sessionFreeAfter = await Session.findOne({ sessionId: sessionFree.sessionId });
        const walletAfterFree = (await Wallet.findOne({ userId: testExpertUser._id }))?.availableBalance || 0;
        assert(sessionFreeAfter.payoutStatus === 'not_applicable' && walletAfterFree === 1200,
            'Test D1: Free/promo session (price: 0) issues ₹0 payout (wallet unchanged at ₹1200)',
            `payoutStatus: ${sessionFreeAfter?.payoutStatus}, wallet: ${walletAfterFree}`);

        // Test Unverified Payment Session
        const sessionUnverified = await Session.create({
            sessionId: `${testRunId}_session_unverified`,
            expertId: testExpertUser._id,
            candidateId: testCandidateUser._id,
            startTime: new Date(Date.now() - 25 * 60 * 1000),
            endTime: new Date(Date.now() + 5 * 60 * 1000),
            price: 500,
            status: 'confirmed',
            candidateJoinedAt: new Date(Date.now() - 20 * 60 * 1000)
        });
        // No PaymentRecord exists for sessionUnverified

        const resUnverified = mockRes();
        await completeSession(mockReq(
            { sessionId: sessionUnverified.sessionId },
            { attendanceOutcome: 'ATTENDED_INCOMPLETE' },
            expertAuth
        ), resUnverified);

        const sessionUnverifiedAfter = await Session.findOne({ sessionId: sessionUnverified.sessionId });
        const walletAfterUnverified = (await Wallet.findOne({ userId: testExpertUser._id }))?.availableBalance || 0;
        assert(sessionUnverifiedAfter.payoutStatus === 'not_applicable' && walletAfterUnverified === 1200,
            'Test D2: Session without verified payment issues ₹0 payout (wallet unchanged at ₹1200)',
            `payoutStatus: ${sessionUnverifiedAfter?.payoutStatus}, wallet: ${walletAfterUnverified}`);


        console.log("\n--- TEST E: Concurrency & Race Protection ---");
        // Test concurrent requests on same session
        const sessionE = await Session.create({
            sessionId: `${testRunId}_session_e`,
            expertId: testExpertUser._id,
            candidateId: testCandidateUser._id,
            startTime: new Date(Date.now() - 25 * 60 * 1000),
            endTime: new Date(Date.now() + 5 * 60 * 1000),
            price: 1000,
            status: 'confirmed',
            candidateJoinedAt: new Date(Date.now() - 20 * 60 * 1000)
        });

        await PaymentRecord.create({
            paymentId: `pay_${testRunId}_e`,
            orderId: `ord_${testRunId}_e`,
            userId: testCandidateUser._id,
            paymentType: 'booking',
            amount: 1000,
            sessionId: sessionE.sessionId,
            status: 'verified'
        });

        const resE1 = mockRes();
        const resE2 = mockRes();

        // Fire both simultaneously
        await Promise.all([
            completeSession(mockReq(
                { sessionId: sessionE.sessionId },
                { attendanceOutcome: 'ATTENDED_INCOMPLETE', earlyEndReason: 'Concurrent attempt 1' },
                expertAuth
            ), resE1),
            completeSession(mockReq(
                { sessionId: sessionE.sessionId },
                { attendanceOutcome: 'ATTENDED_INCOMPLETE', earlyEndReason: 'Concurrent attempt 2' },
                expertAuth
            ), resE2)
        ]);

        const walletAfterE = (await Wallet.findOne({ userId: testExpertUser._id }))?.availableBalance || 0;
        const txnsE = await WalletTransaction.find({ referenceId: sessionE._id, type: 'CREDIT' });

        // Expected credit: 80% of 1000 = 800.
        // Balance before E was 1200, so after E should be exactly 2000.
        assert(walletAfterE === 2000,
            'Test E1: Concurrent requests resulted in exactly one credit of ₹800 (balance ₹2000)',
            `Wallet balance: ${walletAfterE}`);

        assert(txnsE.length === 1 && txnsE[0].amount === 800,
            'Test E2: Exactly one ledger transaction exists for concurrently finalized session',
            `Txn count: ${txnsE.length}`);


        console.log("\n--- TEST F: Authorization & Validation Safeguards ---");
        // Test that an unattended candidate cannot be marked ATTENDED_COMPLETED
        const sessionF = await Session.create({
            sessionId: `${testRunId}_session_f`,
            expertId: testExpertUser._id,
            candidateId: testCandidateUser._id,
            startTime: new Date(Date.now() - 25 * 60 * 1000),
            endTime: new Date(Date.now() + 5 * 60 * 1000),
            price: 500,
            status: 'confirmed',
            candidateJoinedAt: null // Never joined!
        });

        const resF = mockRes();
        await completeSession(mockReq(
            { sessionId: sessionF.sessionId },
            {
                attendanceOutcome: 'ATTENDED_COMPLETED',
                completionEvidence: { interviewConducted: true }
            },
            expertAuth
        ), resF);

        assert(resF.statusCode === 400 && resF.data.message.includes('has not joined'),
            'Test F1: Unattended candidate cannot be marked ATTENDED_COMPLETED',
            `Status: ${resF.statusCode}, message: ${resF.data?.message}`);

        // Clean up test records
        console.log("\nCleaning up test artifacts...");
        await User.deleteMany({ _id: { $in: [testExpertUser._id, testCandidateUser._id] } });
        await ExpertDetails.deleteMany({ userId: testExpertUser._id });
        await Session.deleteMany({ sessionId: { $regex: testRunId } });
        await PaymentRecord.deleteMany({ sessionId: { $regex: testRunId } });
        await Wallet.deleteMany({ userId: testExpertUser._id });
        await WalletTransaction.deleteMany({ userId: testExpertUser._id });
        await ReviewDetails.deleteMany({ sessionId: { $regex: testRunId } });

        console.log("\n======================================================");
        const passedCount = results.filter(r => r.pass).length;
        const failedCount = results.filter(r => !r.pass).length;
        console.log(`  TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
        console.log(`======================================================\n`);

        if (failedCount > 0) {
            process.exit(1);
        } else {
            process.exit(0);
        }
    } catch (e) {
        console.error("Test execution fatal error:", e);
        process.exit(1);
    }
}

run();
