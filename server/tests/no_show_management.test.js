import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Session from '../models/Session.js';
import User from '../models/User.js';
import ExpertDetails from '../models/expertModel.js';
import PaymentRecord from '../models/PaymentRecord.js';
import Wallet from '../models/Wallet.js';
import WalletTransaction from '../models/WalletTransaction.js';
import ReviewDetails from '../models/reviewModel.js';
import Report from '../models/Report.js';
import Certification from '../models/Certification.js';
import { markCandidateNoShow, completeSession, joinSession, submitReview } from '../controllers/sessionController.js';
import { getEligibleCompletedSessions, ensureMasterCertification, issueCertificate } from '../controllers/certificationController.js';

let testExpertUser;
let testExpertProfile;
let testCandidateUser;
let testOtherExpertUser;

const testPrefix = `test_noshow_${Date.now()}`;

function mockReq(params = {}, body = {}, user = {}) {
    return {
        params,
        body,
        user,
        ip: '127.0.0.1',
        headers: { 'user-agent': 'TestRunner/1.0' }
    };
}

function mockRes() {
    const res = {
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
    return res;
}

const results = [];

function assert(condition, testName, details = '') {
    if (condition) {
        console.log(`  PASS: ${testName}`);
        results.push({ name: testName, pass: true });
    } else {
        console.error(`  FAIL: ${testName} - ${details}`);
        results.push({ name: testName, pass: false, error: details });
    }
}

async function runTests() {
    console.log(`\n======================================================`);
    console.log(`  MOCKEEFY CANDIDATE NO-SHOW SUITE`);
    console.log(`======================================================\n`);

    const uri = process.env.MONGO_URI;
    if (!uri) {
        throw new Error("MONGO_URI not configured in server/.env");
    }

    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
    });
    console.log("Connected to MongoDB for testing.\n");

    try {
        // Setup Test Users
        testExpertUser = await User.create({
            name: `${testPrefix} Expert`,
            email: `${testPrefix}_expert@mockeefy.test`,
            password: 'Password123!',
            userType: 'expert',
            walletBalance: 0
        });

        testExpertProfile = await ExpertDetails.create({
            userId: testExpertUser._id,
            personalInformation: { userName: 'Test Expert', expertID: `${testPrefix}_EXP` }
        });

        testCandidateUser = await User.create({
            name: `${testPrefix} Candidate`,
            email: `${testPrefix}_candidate@mockeefy.test`,
            password: 'Password123!',
            userType: 'candidate',
            certificateIdentityConfirmation: {
                confirmedName: `${testPrefix} Candidate`,
                confirmedAt: new Date(),
                confirmedForCycle: 1,
                confirmationReference: `REF-${Date.now()}`
            }
        });

        testOtherExpertUser = await User.create({
            name: `${testPrefix} Other Expert`,
            email: `${testPrefix}_other@mockeefy.test`,
            password: 'Password123!',
            userType: 'expert'
        });

        const expertAuth = { userId: testExpertUser._id.toString(), userType: 'expert' };
        const otherExpertAuth = { userId: testOtherExpertUser._id.toString(), userType: 'expert' };
        const candidateAuth = { userId: testCandidateUser._id.toString(), userType: 'candidate' };

        console.log(`--- SECTION 1: Grace Period & Attendance Enforcement ---`);

        // Test 1: Expert cannot mark session before grace period (e.g. session start is 5 min ago, grace is 10 min)
        const recentSession = await Session.create({
            sessionId: `${testPrefix}_s1`,
            expertId: testExpertUser._id,
            candidateId: testCandidateUser._id,
            startTime: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago (grace period is 10 min)
            endTime: new Date(Date.now() + 25 * 60 * 1000),
            price: 500,
            status: 'confirmed'
        });

        const res1 = mockRes();
        await markCandidateNoShow(mockReq({ sessionId: recentSession.sessionId }, {}, expertAuth), res1);
        assert(res1.statusCode === 400 && res1.data.message.includes('grace period'),
            'Test 1: Expert cannot mark session before grace period',
            `Status: ${res1.statusCode}, msg: ${res1.data?.message}`);

        // Test 2: Expert can mark eligible session after grace period (e.g. 15 mins ago)
        const eligibleSession = await Session.create({
            sessionId: `${testPrefix}_s2`,
            expertId: testExpertUser._id,
            candidateId: testCandidateUser._id,
            startTime: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago (grace elapsed)
            endTime: new Date(Date.now() + 15 * 60 * 1000),
            price: 500,
            status: 'confirmed'
        });

        // Add verified payment for s2
        await PaymentRecord.create({
            paymentId: `pay_${testPrefix}_s2`,
            orderId: `order_${testPrefix}_s2`,
            userId: testCandidateUser._id,
            paymentType: 'booking',
            amount: 500,
            sessionId: eligibleSession.sessionId,
            status: 'verified'
        });

        const res2 = mockRes();
        await markCandidateNoShow(mockReq({ sessionId: eligibleSession.sessionId }, { reason: 'No-show after 10 mins' }, expertAuth), res2);
        assert(res2.statusCode === 200 && res2.data.data.status === 'CANDIDATE_NO_SHOW',
            'Test 2: Expert can mark eligible unattended session after grace period',
            `Status: ${res2.statusCode}, body: ${JSON.stringify(res2.data)}`);

        // Test 3: Candidate attendance prevents no-show marking
        const attendedSession = await Session.create({
            sessionId: `${testPrefix}_s3`,
            expertId: testExpertUser._id,
            candidateId: testCandidateUser._id,
            startTime: new Date(Date.now() - 20 * 60 * 1000),
            endTime: new Date(Date.now() + 10 * 60 * 1000),
            price: 500,
            status: 'confirmed',
            attendanceStatus: 'attended',
            candidateJoinedAt: new Date(Date.now() - 18 * 60 * 1000)
        });

        const res3 = mockRes();
        await markCandidateNoShow(mockReq({ sessionId: attendedSession.sessionId }, {}, expertAuth), res3);
        assert(res3.statusCode === 400 && res3.data.message.includes('already attended'),
            'Test 3: Candidate attendance prevents no-show marking',
            `Status: ${res3.statusCode}, msg: ${res3.data?.message}`);

        // Test 4: Completed sessions cannot become no-show
        const completedSession = await Session.create({
            sessionId: `${testPrefix}_s4`,
            expertId: testExpertUser._id,
            candidateId: testCandidateUser._id,
            startTime: new Date(Date.now() - 60 * 60 * 1000),
            endTime: new Date(Date.now() - 30 * 60 * 1000),
            price: 500,
            status: 'completed'
        });

        const res4 = mockRes();
        await markCandidateNoShow(mockReq({ sessionId: completedSession.sessionId }, {}, expertAuth), res4);
        assert(res4.statusCode === 400 && res4.data.message.includes('Completed sessions'),
            'Test 4: Completed sessions cannot become no-show',
            `Status: ${res4.statusCode}, msg: ${res4.data?.message}`);

        // Test 5: Cancelled sessions cannot become no-show
        const cancelledSession = await Session.create({
            sessionId: `${testPrefix}_s5`,
            expertId: testExpertUser._id,
            candidateId: testCandidateUser._id,
            startTime: new Date(Date.now() - 60 * 60 * 1000),
            endTime: new Date(Date.now() - 30 * 60 * 1000),
            price: 500,
            status: 'cancelled'
        });

        const res5 = mockRes();
        await markCandidateNoShow(mockReq({ sessionId: cancelledSession.sessionId }, {}, expertAuth), res5);
        assert(res5.statusCode === 400 && res5.data.message.includes('Cancelled sessions'),
            'Test 5: Cancelled sessions cannot become no-show',
            `Status: ${res5.statusCode}, msg: ${res5.data?.message}`);

        // Test 6: Another expert cannot mark the session
        const res6 = mockRes();
        await markCandidateNoShow(mockReq({ sessionId: recentSession.sessionId }, {}, otherExpertAuth), res6);
        assert(res6.statusCode === 403,
            'Test 6: Another expert cannot mark the session (authorization failure)',
            `Status: ${res6.statusCode}, msg: ${res6.data?.message}`);

        // Test 7: Repeated requests cannot create duplicate no-show records
        const res7 = mockRes();
        await markCandidateNoShow(mockReq({ sessionId: eligibleSession.sessionId }, {}, expertAuth), res7);
        assert(res7.statusCode === 400 && res7.data.message.includes('already been marked as a candidate no-show'),
            'Test 7: Repeated requests cannot create duplicate no-show records',
            `Status: ${res7.statusCode}, msg: ${res7.data?.message}`);

        console.log(`\n--- SECTION 2: Payment and Expert Payout Settlement ---`);

        // Test 8: Verified captured payment triggers applicable no-show payout (80% net expert share)
        // Check expert wallet after s2 was marked no-show in Test 2 (price 500 * 0.8 = 400)
        const expertWallet = await Wallet.findOne({ userId: testExpertUser._id });
        const walletTxn = await WalletTransaction.findOne({
            referenceId: eligibleSession._id,
            type: 'CREDIT'
        });

        assert(expertWallet && expertWallet.availableBalance >= 400 && walletTxn && walletTxn.amount === 400,
            'Test 8: Verified captured payment triggers 80% net expert payout (₹400)',
            `Wallet balance: ${expertWallet?.availableBalance}, txn amount: ${walletTxn?.amount}`);

        // Test 9: Failed payment does not trigger payout
        const failedPaySession = await Session.create({
            sessionId: `${testPrefix}_s9`,
            expertId: testExpertUser._id,
            candidateId: testCandidateUser._id,
            startTime: new Date(Date.now() - 25 * 60 * 1000),
            endTime: new Date(Date.now() + 5 * 60 * 1000),
            price: 500,
            status: 'confirmed'
        });
        await PaymentRecord.create({
            paymentId: `pay_${testPrefix}_s9`,
            orderId: `order_${testPrefix}_s9`,
            userId: testCandidateUser._id,
            paymentType: 'booking',
            amount: 500,
            sessionId: failedPaySession.sessionId,
            status: 'failed' // NOT verified
        });

        const balBefore9 = (await Wallet.findOne({ userId: testExpertUser._id }))?.availableBalance || 0;
        const res9 = mockRes();
        await markCandidateNoShow(mockReq({ sessionId: failedPaySession.sessionId }, {}, expertAuth), res9);
        const balAfter9 = (await Wallet.findOne({ userId: testExpertUser._id }))?.availableBalance || 0;

        assert(res9.statusCode === 200 && res9.data.walletCredit.credited === false && balAfter9 === balBefore9,
            'Test 9: Failed payment does not trigger payout',
            `Credited: ${res9.data.walletCredit.credited}, bal delta: ${balAfter9 - balBefore9}`);

        // Test 10: Unverified/refunded payment does not trigger payout
        const pendingPaySession = await Session.create({
            sessionId: `${testPrefix}_s10`,
            expertId: testExpertUser._id,
            candidateId: testCandidateUser._id,
            startTime: new Date(Date.now() - 25 * 60 * 1000),
            endTime: new Date(Date.now() + 5 * 60 * 1000),
            price: 500,
            status: 'confirmed'
        });
        await PaymentRecord.create({
            paymentId: `pay_${testPrefix}_s10`,
            orderId: `order_${testPrefix}_s10`,
            userId: testCandidateUser._id,
            paymentType: 'booking',
            amount: 500,
            sessionId: pendingPaySession.sessionId,
            status: 'refunded' // NOT verified
        });

        const balBefore10 = (await Wallet.findOne({ userId: testExpertUser._id }))?.availableBalance || 0;
        const res10 = mockRes();
        await markCandidateNoShow(mockReq({ sessionId: pendingPaySession.sessionId }, {}, expertAuth), res10);
        const balAfter10 = (await Wallet.findOne({ userId: testExpertUser._id }))?.availableBalance || 0;

        assert(res10.statusCode === 200 && res10.data.walletCredit.credited === false && balAfter10 === balBefore10,
            'Test 10: Pending payment does not trigger payout',
            `Credited: ${res10.data.walletCredit.credited}, bal delta: ${balAfter10 - balBefore10}`);

        // Test 11: Repeated requests cannot generate duplicate payouts (idempotency)
        const txnCountForS2 = await WalletTransaction.countDocuments({
            referenceId: eligibleSession._id,
            type: 'CREDIT'
        });
        assert(txnCountForS2 === 1,
            'Test 11: Idempotency: exactly 1 wallet ledger transaction for the session',
            `Transaction count: ${txnCountForS2}`);

        // Test 12: Normal completion payout and no-show payout cannot both be issued
        // Attempting to evaluate or complete a no-show session fails
        const res12a = mockRes();
        await completeSession(mockReq({ sessionId: eligibleSession.sessionId }, {}, expertAuth), res12a);
        assert(res12a.statusCode === 400 && res12a.data.message.includes('no-show session cannot be marked as completed'),
            'Test 12a: No-show session cannot be completed',
            `Status: ${res12a.statusCode}, msg: ${res12a.data?.message}`);

        const res12b = mockRes();
        await submitReview(mockReq({ sessionId: eligibleSession.sessionId }, { overallRating: 5, technicalRating: 5, feedback: 'Great' }, expertAuth), res12b);
        assert(res12b.statusCode === 400 && res12b.data.message.includes('candidate no-show and cannot be evaluated'),
            'Test 12b: No-show session cannot be evaluated by expert',
            `Status: ${res12b.statusCode}, msg: ${res12b.data?.message}`);

        console.log(`\n--- SECTION 3: Certificate Eligibility ---`);

        // Test 13: Booking alone does not count toward certificate count
        const bookingOnlySession = await Session.create({
            sessionId: `${testPrefix}_cert_booked`,
            expertId: testExpertUser._id,
            candidateId: testCandidateUser._id,
            startTime: new Date(Date.now() + 86400000), // tomorrow
            endTime: new Date(Date.now() + 86400000 + 1800000),
            price: 500,
            status: 'confirmed'
        });
        const eligibleAfterBooking = await getEligibleCompletedSessions(testCandidateUser._id);
        assert(!eligibleAfterBooking.some(s => s.sessionId === bookingOnlySession.sessionId),
            'Test 13: Booking alone does not increase certificate eligibility count',
            `Eligible count: ${eligibleAfterBooking.length}`);

        // Test 14: Payment alone does not count
        await PaymentRecord.create({
            paymentId: `pay_${testPrefix}_booked`,
            orderId: `order_${testPrefix}_booked`,
            userId: testCandidateUser._id,
            paymentType: 'booking',
            amount: 500,
            sessionId: bookingOnlySession.sessionId,
            status: 'verified'
        });
        const eligibleAfterPayment = await getEligibleCompletedSessions(testCandidateUser._id);
        assert(!eligibleAfterPayment.some(s => s.sessionId === bookingOnlySession.sessionId),
            'Test 14: Paid booking without completion does not increase certificate count',
            `Eligible count: ${eligibleAfterPayment.length}`);

        // Test 15: No-show session does not count
        const eligibleAfterNoShow = await getEligibleCompletedSessions(testCandidateUser._id);
        assert(!eligibleAfterNoShow.some(s => s.sessionId === eligibleSession.sessionId),
            'Test 15: No-show session is strictly excluded from certificate eligibility',
            `Eligible count: ${eligibleAfterNoShow.length}`);

        // Test 16: Cancelled session does not count
        assert(!eligibleAfterNoShow.some(s => s.sessionId === cancelledSession.sessionId),
            'Test 16: Cancelled session is strictly excluded from certificate eligibility',
            `Eligible count: ${eligibleAfterNoShow.length}`);

        // Setup 3 valid completed, evaluated sessions for Candidate
        const validSessions = [];
        for (let i = 1; i <= 3; i++) {
            const vSession = await Session.create({
                sessionId: `${testPrefix}_valid_${i}`,
                expertId: testExpertUser._id,
                candidateId: testCandidateUser._id,
                startTime: new Date(Date.now() - (i + 1) * 3600000),
                endTime: new Date(Date.now() - (i + 1) * 3600000 + 1800000),
                price: 500,
                status: 'completed',
                attendanceStatus: 'attended',
                candidateJoinedAt: new Date(Date.now() - (i + 1) * 3600000 + 60000)
            });

            // Add expert evaluation review
            await ReviewDetails.create({
                sessionId: vSession.sessionId,
                reviewerId: testExpertUser._id,
                candidateId: testCandidateUser._id,
                expertId: testExpertUser._id,
                reviewerRole: 'expert',
                overallRating: 5,
                technicalRating: 5,
                communicationRating: 5,
                problemSolvingRating: 5,
                designRating: 5,
                behavioralRating: 5,
                feedback: `Valid completed test interview ${i}`
            });

            validSessions.push(vSession);
        }

        // Test 17: Completed and attended session counts exactly once
        const eligibleCountAfter1 = (await getEligibleCompletedSessions(testCandidateUser._id)).filter(s => s.sessionId === validSessions[0].sessionId).length;
        assert(eligibleCountAfter1 === 1,
            'Test 17: Valid completed and attended session counts exactly once',
            `Count: ${eligibleCountAfter1}`);

        // Test 18: Three valid completed interviews make candidate eligible
        const eligibleThree = await getEligibleCompletedSessions(testCandidateUser._id);
        const validThreeMatches = eligibleThree.filter(s => s.sessionId.startsWith(`${testPrefix}_valid_`));
        assert(validThreeMatches.length === 3,
            'Test 18: Three valid attended & evaluated interviews qualify candidate',
            `Qualified count: ${validThreeMatches.length}`);

        // Test 19: Candidate with 2 valid + 1 no-show is NOT eligible
        const candidate2 = await User.create({
            name: `${testPrefix} Candidate 2`,
            email: `${testPrefix}_c2@mockeefy.test`,
            password: 'Password123!',
            userType: 'candidate'
        });

        // 2 valid sessions
        for (let j = 1; j <= 2; j++) {
            const c2s = await Session.create({
                sessionId: `${testPrefix}_c2_valid_${j}`,
                expertId: testExpertUser._id,
                candidateId: candidate2._id,
                startTime: new Date(Date.now() - (j + 1) * 3600000),
                endTime: new Date(Date.now() - (j + 1) * 3600000 + 1800000),
                price: 500,
                status: 'completed',
                attendanceStatus: 'attended'
            });
            await ReviewDetails.create({
                sessionId: c2s.sessionId,
                reviewerId: testExpertUser._id,
                candidateId: candidate2._id,
                expertId: testExpertUser._id,
                reviewerRole: 'expert',
                overallRating: 5,
                feedback: `Evaluation for c2 session ${j}`
            });
        }

        // 1 no-show session
        await Session.create({
            sessionId: `${testPrefix}_c2_noshow_3`,
            expertId: testExpertUser._id,
            candidateId: candidate2._id,
            startTime: new Date(Date.now() - 4 * 3600000),
            endTime: new Date(Date.now() - 4 * 3600000 + 1800000),
            price: 500,
            status: 'CANDIDATE_NO_SHOW',
            attendanceStatus: 'no-show'
        });

        const eligibleC2 = await getEligibleCompletedSessions(candidate2._id);
        assert(eligibleC2.length === 2,
            'Test 19: Two valid completed interviews + one no-show yields exactly 2 eligible sessions (NOT eligible for certificate)',
            `Eligible count: ${eligibleC2.length}`);

        // Test 20: Certificate issuance API rejects candidate with fewer than 3 valid interviews
        const res20 = mockRes();
        await issueCertificate(mockReq({}, { userId: candidate2._id.toString() }, { userId: candidate2._id.toString(), userType: 'candidate' }), res20);
        assert(res20.statusCode === 400 && res20.data.message.includes('Not eligible yet'),
            'Test 20: Certificate issuance API rejects candidate with fewer than 3 valid interviews',
            `Status: ${res20.statusCode}, msg: ${res20.data?.message}`);

        console.log(`\n--- SECTION 4: Regression Checks ---`);

        // Test 21: Meeting Join API rejects no-show sessions
        const res21 = mockRes();
        await joinSession(mockReq({ sessionId: eligibleSession.sessionId }, {}, candidateAuth), res21);
        assert(res21.statusCode === 400 && res21.data.message.includes('candidate no-show'),
            'Test 21: Meeting join API blocks no-show sessions',
            `Status: ${res21.statusCode}, msg: ${res21.data?.message}`);

    } finally {
        // Cleanup all test documents created with testPrefix
        console.log("\nCleaning up test data...");
        await Session.deleteMany({ sessionId: { $regex: testPrefix } });
        await PaymentRecord.deleteMany({ sessionId: { $regex: testPrefix } });
        await WalletTransaction.deleteMany({ description: { $regex: testPrefix } });
        await ReviewDetails.deleteMany({ sessionId: { $regex: testPrefix } });
        await Certification.deleteMany({ userId: { $in: [testCandidateUser?._id, testExpertUser?._id] } });
        if (testExpertProfile) await ExpertDetails.deleteOne({ _id: testExpertProfile._id });
        if (testExpertUser) {
            await Wallet.deleteOne({ userId: testExpertUser._id });
            await User.deleteOne({ _id: testExpertUser._id });
        }
        if (testCandidateUser) await User.deleteOne({ _id: testCandidateUser._id });
        if (testOtherExpertUser) await User.deleteOne({ _id: testOtherExpertUser._id });
        console.log("Cleanup complete.");

        await mongoose.disconnect();
    }

    const passed = results.filter(r => r.pass).length;
    const failed = results.filter(r => !r.pass).length;
    console.log(`\n======================================================`);
    console.log(`  SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL ${results.length})`);
    console.log(`======================================================\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error("Test execution fatal error:", err);
    process.exit(1);
});
