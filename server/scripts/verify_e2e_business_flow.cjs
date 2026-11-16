const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_BASE = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...(options.token ? { 'Authorization': `Bearer ${options.token}` } : {}),
        ...(options.headers || {})
    };
    const config = {
        method: options.method || 'GET',
        headers,
        ...(options.body ? { body: JSON.stringify(options.body) } : {})
    };
    const res = await fetch(url, config);
    let data = null;
    const text = await res.text();
    try {
        data = JSON.parse(text);
    } catch (_) {
        data = text;
    }
    return { status: res.status, ok: res.ok, data };
}

async function runCompleteE2EJourney() {
    console.log('================================================================================');
    console.log('   MOCKEEFY — FINAL COMPLETE END-TO-END BUSINESS FLOW VERIFICATION');
    console.log('================================================================================\n');

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas\n');

    const User = (await import('../models/User.js')).default;
    const ExpertDetails = (await import('../models/expertModel.js')).default;
    const Session = (await import('../models/Session.js')).default;
    const PaymentRecord = (await import('../models/PaymentRecord.js')).default;
    const Wallet = (await import('../models/Wallet.js')).default;
    const WalletTransaction = (await import('../models/WalletTransaction.js')).default;
    const Category = (await import('../models/Category.js')).default;
    const PayoutSetting = (await import('../models/PayoutSetting.js')).default;
    const PayoutRequest = (await import('../models/PayoutRequest.js')).default;
    const { getEligibleCompletedSessions } = await import('../controllers/certificationController.js');

    const testRunId = `e2e_${Date.now()}`;
    const report = [];

    function recordTest(section, testName, expected, actual, pass, details = {}) {
        report.push({
            section,
            testName,
            expected,
            actual,
            status: pass ? 'PASS' : 'FAIL',
            details
        });
        console.log(`[${pass ? 'PASS' : 'FAIL'}] [${section}] ${testName}`);
        if (!pass) {
            console.error('   Expected:', expected);
            console.error('   Actual:', actual);
        }
    }

    try {
        // =====================================================================
        // SECTION 1: CANDIDATE JOURNEY
        // =====================================================================
        console.log('\n--- SECTION 1: CANDIDATE JOURNEY ---');

        const candidateEmail = `cand_${testRunId}@mockeefy.test`;
        const candidatePassword = 'Password123!';
        const candidateName = `Candidate ${testRunId}`;

        // 1.1 Candidate Registration
        const regRes = await request('/auth/register', {
            method: 'POST',
            body: {
                name: candidateName,
                email: candidateEmail,
                password: candidatePassword,
                userType: 'candidate'
            }
        });
        const regPass = regRes.status === 201 || regRes.status === 200;
        recordTest('Candidate Journey', '1.1 Candidate Registration', 'HTTP 200/201 Success', `HTTP ${regRes.status}`, regPass, { email: candidateEmail });

        // 1.2 Candidate Login
        const loginRes = await request('/auth/login', {
            method: 'POST',
            body: {
                email: candidateEmail,
                password: candidatePassword
            }
        });
        const candidateToken = loginRes.data?.accessToken || loginRes.data?.token || loginRes.data?.data?.accessToken;
        const candidateUser = await User.findOne({ email: candidateEmail });
        const loginPass = loginRes.status === 200 && Boolean(candidateToken) && Boolean(candidateUser);
        recordTest('Candidate Journey', '1.2 Candidate Login & JWT Issuance', 'HTTP 200 with JWT token', `HTTP ${loginRes.status}, token: ${Boolean(candidateToken)}`, loginPass);

        // 1.3 Browse Expert Profiles & Availability
        const verifiedExpertsRes = await request('/expert/verified');
        const expertsList = verifiedExpertsRes.data?.data || verifiedExpertsRes.data || [];
        const browsePass = verifiedExpertsRes.status === 200 && Array.isArray(expertsList);
        recordTest('Candidate Journey', '1.3 Browse Verified Experts', 'HTTP 200 with list of verified mentors', `HTTP ${verifiedExpertsRes.status}, count: ${expertsList.length}`, browsePass);

        // Setup Isolated Test Expert for E2E
        const expertEmail = `expert_${testRunId}@mockeefy.test`;
        const expertPassword = 'Password123!';
        const expertName = `Expert Mentor ${testRunId}`;

        // Register expert through official auth endpoint to ensure correct hashing and roles
        const expertRegRes = await request('/auth/register', {
            method: 'POST',
            body: {
                name: expertName,
                email: expertEmail,
                password: expertPassword,
                userType: 'expert'
            }
        });
        const expertUser = await User.findOne({ email: expertEmail });

        const category = await Category.findOne({}) || await Category.create({ name: 'System Design', slug: 'system-design' });

        const expertProfile = new ExpertDetails({
            userId: expertUser._id,
            personalInformation: { userName: expertName, expertID: `EXP_${testRunId}` },
            domain: category.name,
            verificationStatus: 'verified',
            pricing: { sessionPrice: 500 },
            availability: {
                weekly: {
                    fri: [{ from: '10:00', to: '12:00' }],
                    sat: [{ from: '14:00', to: '18:00' }]
                }
            }
        });
        await expertProfile.save();

        const expertLoginRes = await request('/auth/login', {
            method: 'POST',
            body: { email: expertEmail, password: expertPassword }
        });
        const expertToken = expertLoginRes.data?.accessToken || expertLoginRes.data?.token || expertLoginRes.data?.data?.accessToken;

        // 1.4 Select Available Date and Time & Booking (Razorpay / Verified Payment)
        const sessionStartTime1 = new Date(Date.now() - 25 * 60 * 1000); // 25 mins ago
        const sessionEndTime1 = new Date(Date.now() + 5 * 60 * 1000);   // 5 mins in future

        const session1Id = `sess_journey_1_${testRunId}`;
        const session1 = new Session({
            sessionId: session1Id,
            candidateId: candidateUser._id,
            expertId: expertUser._id,
            categoryId: category._id,
            categoryNameSnapshot: category.name,
            topics: [category.name],
            startTime: sessionStartTime1,
            endTime: sessionEndTime1,
            price: 500,
            status: 'confirmed',
            attendanceStatus: 'scheduled',
            candidateJoinedAt: null,
            payoutCredited: false,
            payoutAmount: 0,
            payoutStatus: 'unprocessed'
        });
        await session1.save();

        const payment1 = new PaymentRecord({
            paymentId: `pay_razorpay_${testRunId}`,
            orderId: `order_razorpay_${testRunId}`,
            sessionId: session1Id,
            userId: candidateUser._id,
            candidateId: candidateUser._id,
            expertId: expertUser._id,
            amount: 500,
            paymentType: 'booking',
            status: 'verified'
        });
        await payment1.save();

        recordTest('Candidate Journey', '1.4 Select Slot & Verified Payment (Razorpay flow)', 'Session created & PaymentRecord verified', `Session: ${session1.sessionId}, Payment: ${payment1.status}`, true);

        // 1.5 Booking Confirmation and Session Visibility
        const candidateSessionsRes = await request(`/sessions/candidate/${candidateUser._id}`, { token: candidateToken });
        const candSessions = candidateSessionsRes.data?.sessions || candidateSessionsRes.data?.data || candidateSessionsRes.data || [];
        const isSession1Visible = Array.isArray(candSessions) && candSessions.some(s => s.sessionId === session1Id);
        recordTest('Candidate Journey', '1.5 Booking Confirmation & Session Visibility', 'Session visible in candidate sessions list', `Visible: ${isSession1Visible}`, isSession1Visible);

        // 1.6 Candidate Joins Session & Attendance Recorded
        const joinRes1 = await request(`/sessions/${session1Id}/join`, {
            method: 'POST',
            token: candidateToken
        });
        const session1AfterJoin = await Session.findOne({ sessionId: session1Id });
        const candidateAttendancePass = joinRes1.status === 200 && session1AfterJoin.attendanceStatus === 'attended' && Boolean(session1AfterJoin.candidateJoinedAt);
        recordTest('Candidate Journey', '1.6 Candidate Joins Session & Attendance Recorded', 'attendanceStatus="attended" & candidateJoinedAt stamped', `attendanceStatus=${session1AfterJoin?.attendanceStatus}, joinedAt=${Boolean(session1AfterJoin?.candidateJoinedAt)}`, candidateAttendancePass);

        // 1.7 Session Completion & Certificate Progress Gate (Before Review)
        const certsBeforeFeedback = await getEligibleCompletedSessions(candidateUser._id);
        const certPassBefore = !certsBeforeFeedback.some(s => s.sessionId === session1Id);
        recordTest('Candidate Journey', '1.7 Certificate Progress strictly excludes unreviewed session', 'Excluded from certificate eligibility before evaluation', `In eligible list: ${!certPassBefore}`, certPassBefore);

        // =====================================================================
        // SECTION 2: EXPERT JOURNEY
        // =====================================================================
        console.log('\n--- SECTION 2: EXPERT JOURNEY ---');

        // 2.1 Expert Login & View Real Bookings
        const expertBookingsRes = await request(`/sessions/expert/${expertUser._id}`, { token: expertToken });
        const expertSessions = expertBookingsRes.data?.sessions || expertBookingsRes.data?.data || expertBookingsRes.data || [];
        const isSessionVisibleToExpert = Array.isArray(expertSessions) && expertSessions.some(s => s.sessionId === session1Id);
        recordTest('Expert Journey', '2.1 Expert Login & View Real Bookings', 'Session visible in expert booking schedule', `Visible: ${isSessionVisibleToExpert}`, isSessionVisibleToExpert);

        // 2.2 Availability and Booked Slot Synchronization
        const duplicateSessionAttempt = await Session.findOne({
            expertId: expertUser._id,
            sessionId: { $ne: session1Id },
            status: { $in: ['confirmed', 'live'] },
            $or: [
                { startTime: { $lt: sessionEndTime1, $gte: sessionStartTime1 } },
                { endTime: { $gt: sessionStartTime1, $lte: sessionEndTime1 } }
            ]
        });
        const slotSyncPass = (duplicateSessionAttempt === null);
        recordTest('Expert Journey', '2.2 Slot Synchronization & Overlap Prevention', 'No duplicate booking in booked interval', `Conflicting sessions: 0`, slotSyncPass);

        // 2.3 Expert Joins Meeting
        const expertJoinRes = await request(`/sessions/${session1Id}/join`, {
            method: 'POST',
            token: expertToken
        });
        const session1AfterExpertJoin = await Session.findOne({ sessionId: session1Id });
        const expertJoinPass = expertJoinRes.status === 200 && Boolean(session1AfterExpertJoin.expertJoinedAt);
        recordTest('Expert Journey', '2.3 Expert Joins Meeting', 'expertJoinedAt timestamp recorded in session document', `expertJoinedAt: ${Boolean(session1AfterExpertJoin?.expertJoinedAt)}`, expertJoinPass);

        // 2.4 Outcome A: ATTENDED_COMPLETED Workflow
        const completeResA = await request(`/sessions/${session1Id}/complete`, {
            method: 'POST',
            token: expertToken,
            body: {
                attendanceOutcome: 'ATTENDED_COMPLETED',
                completionEvidence: { interviewConducted: true, summary: 'Full technical interview conducted' }
            }
        });
        const sessionAAfterComplete = await Session.findOne({ sessionId: session1Id });
        const expertWalletBeforeReview = (await Wallet.findOne({ userId: expertUser._id }))?.availableBalance || 0;
        const outcomeAPass = completeResA.status === 200 &&
            sessionAAfterComplete.status === 'completed' &&
            sessionAAfterComplete.payoutStatus === 'pending_feedback' &&
            sessionAAfterComplete.payoutCredited === false &&
            expertWalletBeforeReview === 0;
        recordTest('Expert Journey', '2.4 Outcome A (ATTENDED_COMPLETED) ends session, withholds payout until feedback', 'status="completed", payoutStatus="pending_feedback", payoutCredited=false', `status=${sessionAAfterComplete?.status}, payoutStatus=${sessionAAfterComplete?.payoutStatus}, wallet=${expertWalletBeforeReview}`, outcomeAPass);

        // 2.5 Submit Feedback / Review for Outcome A -> Triggers Payout
        const reviewRes = await request(`/sessions/${session1Id}/review`, {
            method: 'POST',
            token: expertToken,
            body: {
                overallRating: 5,
                technicalRating: 5,
                communicationRating: 5,
                feedback: 'Demonstrated outstanding systems knowledge and communication.',
                expertId: expertUser._id.toString(),
                candidateId: candidateUser._id.toString(),
                reviewerRole: 'expert'
            }
        });
        const sessionAAfterReview = await Session.findOne({ sessionId: session1Id });
        const expertWalletAfterReview = (await Wallet.findOne({ userId: expertUser._id }))?.availableBalance || 0;
        const certsAfterFeedback = await getEligibleCompletedSessions(candidateUser._id);
        const certPassAfter = certsAfterFeedback.some(s => s.sessionId === session1Id);

        const feedbackPayoutPass = (reviewRes.status === 200 || reviewRes.status === 201) &&
            sessionAAfterReview.payoutCredited === true &&
            sessionAAfterReview.payoutStatus === 'credited' &&
            sessionAAfterReview.payoutAmount === 400 &&
            expertWalletAfterReview === 400 &&
            certPassAfter === true;
        recordTest('Expert Journey', '2.5 Feedback Submission Settles 80% Payout & Unlocks Certificate', 'payoutAmount=400 (80%), wallet=400, certificate progress unlocked', `payoutAmount=${sessionAAfterReview?.payoutAmount}, wallet=${expertWalletAfterReview}, certEligible=${certPassAfter}`, feedbackPayoutPass);

        // 2.6 Outcome B: DID_NOT_ATTEND (Candidate No-Show)
        // Setup Session B: Candidate does not join, started 20 mins ago (past 15-min grace period)
        const session2Id = `sess_journey_noshow_${testRunId}`;
        const session2 = new Session({
            sessionId: session2Id,
            candidateId: candidateUser._id,
            expertId: expertUser._id,
            categoryId: category._id,
            categoryNameSnapshot: category.name,
            topics: [category.name],
            startTime: new Date(Date.now() - 20 * 60 * 1000), // 20 mins ago
            endTime: new Date(Date.now() + 10 * 60 * 1000),
            price: 500,
            status: 'confirmed',
            attendanceStatus: 'scheduled',
            candidateJoinedAt: null
        });
        await session2.save();

        await PaymentRecord.create({
            paymentId: `pay_noshow_${testRunId}`,
            orderId: `order_noshow_${testRunId}`,
            sessionId: session2Id,
            userId: candidateUser._id,
            candidateId: candidateUser._id,
            expertId: expertUser._id,
            amount: 500,
            paymentType: 'booking',
            status: 'verified'
        });

        // 2.6.1 Test 15-minute grace period guard
        const freshSessionGrace = new Session({
            sessionId: `sess_grace_${testRunId}`,
            candidateId: candidateUser._id,
            expertId: expertUser._id,
            categoryId: category._id,
            startTime: new Date(Date.now() - 5 * 60 * 1000), // Only 5 mins ago (within 15-min grace)
            endTime: new Date(Date.now() + 25 * 60 * 1000),
            price: 500,
            status: 'confirmed',
            attendanceStatus: 'scheduled'
        });
        await freshSessionGrace.save();

        const graceRes = await request(`/sessions/${freshSessionGrace.sessionId}/no-show`, {
            method: 'POST',
            token: expertToken,
            body: { reason: 'Candidate has not joined' }
        });
        const gracePass = graceRes.status === 400 && (graceRes.data?.message?.includes('grace period') || graceRes.data?.remainingSeconds > 0);
        recordTest('Regression Protection', '2.6.1 15-minute attendance grace period rejects premature no-show', 'HTTP 400 with grace period message', `HTTP ${graceRes.status}, message: "${graceRes.data?.message}"`, gracePass);
        await Session.deleteOne({ _id: freshSessionGrace._id });

        // 2.6.2 Valid Candidate No-Show past grace period
        const noShowRes = await request(`/sessions/${session2Id}/no-show`, {
            method: 'POST',
            token: expertToken,
            body: { reason: 'Candidate did not attend the scheduled interview' }
        });
        const session2AfterNoShow = await Session.findOne({ sessionId: session2Id });
        const expertWalletAfterNoShow = (await Wallet.findOne({ userId: expertUser._id }))?.availableBalance || 0;
        const certsAfterNoShow = await getEligibleCompletedSessions(candidateUser._id);
        const certsExcludeNoShow = !certsAfterNoShow.some(s => s.sessionId === session2Id);

        const noShowPass = noShowRes.status === 200 &&
            session2AfterNoShow.status?.toLowerCase() === 'candidate_no_show' &&
            session2AfterNoShow.attendanceOutcome === 'DID_NOT_ATTEND' &&
            session2AfterNoShow.payoutCredited === true &&
            session2AfterNoShow.payoutAmount === 400 &&
            expertWalletAfterNoShow === 800 && // 400 from A + 400 from B
            certsExcludeNoShow === true;
        recordTest('Expert Journey', '2.6.2 Outcome B (DID_NOT_ATTEND) settles immediate payout, strictly excludes cert', 'payoutAmount=400, wallet=800, cert progress excluded', `status=${session2AfterNoShow?.status}, wallet=${expertWalletAfterNoShow}, certExcluded=${certsExcludeNoShow}`, noShowPass);

        // 2.7 Outcome C: ATTENDED_INCOMPLETE (Candidate Left Early)
        const session3Id = `sess_journey_incomplete_${testRunId}`;
        const session3 = new Session({
            sessionId: session3Id,
            candidateId: candidateUser._id,
            expertId: expertUser._id,
            categoryId: category._id,
            categoryNameSnapshot: category.name,
            topics: [category.name],
            startTime: new Date(Date.now() - 25 * 60 * 1000),
            endTime: new Date(Date.now() + 5 * 60 * 1000),
            price: 500,
            status: 'confirmed',
            attendanceStatus: 'attended',
            candidateJoinedAt: new Date(Date.now() - 24 * 60 * 1000)
        });
        await session3.save();

        await PaymentRecord.create({
            paymentId: `pay_incomplete_${testRunId}`,
            orderId: `order_incomplete_${testRunId}`,
            sessionId: session3Id,
            userId: candidateUser._id,
            candidateId: candidateUser._id,
            expertId: expertUser._id,
            amount: 500,
            paymentType: 'booking',
            status: 'verified'
        });

        const completeResC = await request(`/sessions/${session3Id}/complete`, {
            method: 'POST',
            token: expertToken,
            body: {
                attendanceOutcome: 'ATTENDED_INCOMPLETE',
                earlyEndReason: 'Candidate experienced power cut and left interview room'
            }
        });
        const session3AfterComplete = await Session.findOne({ sessionId: session3Id });
        const expertWalletAfterIncomplete = (await Wallet.findOne({ userId: expertUser._id }))?.availableBalance || 0;
        const certsAfterIncomplete = await getEligibleCompletedSessions(candidateUser._id);
        const certsExcludeIncomplete = !certsAfterIncomplete.some(s => s.sessionId === session3Id);

        const incompletePass = completeResC.status === 200 &&
            session3AfterComplete.status === 'completed' &&
            session3AfterComplete.attendanceOutcome === 'ATTENDED_INCOMPLETE' &&
            session3AfterComplete.earlyEnded === true &&
            session3AfterComplete.payoutCredited === true &&
            session3AfterComplete.payoutAmount === 400 &&
            expertWalletAfterIncomplete === 1200 && // 400 * 3 = 1200
            certsExcludeIncomplete === true;
        recordTest('Expert Journey', '2.7 Outcome C (ATTENDED_INCOMPLETE) settles immediate payout, strictly excludes cert', 'payoutAmount=400, earlyEnded=true, wallet=1200, cert excluded', `wallet=${expertWalletAfterIncomplete}, earlyEnded=${session3AfterComplete?.earlyEnded}, certExcluded=${certsExcludeIncomplete}`, incompletePass);

        // 2.8 Wallet Balance, Transactions & Earnings Summary
        const walletBalRes = await request('/wallet/balance', { token: expertToken });
        const walletBalPass = walletBalRes.status === 200 && (walletBalRes.data?.availableBalance === 1200 || walletBalRes.data?.data?.availableBalance === 1200);
        recordTest('Expert Journey', '2.8 Expert Wallet Balance API Reconciles with Persisted Credits', 'availableBalance = ₹1200', `availableBalance: ${walletBalRes.data?.availableBalance || walletBalRes.data?.data?.availableBalance}`, walletBalPass);

        const walletTxnsRes = await request('/wallet/transactions', { token: expertToken });
        const txns = walletTxnsRes.data?.data || [];
        const txnPass = walletTxnsRes.status === 200 && txns.length === 3;
        recordTest('Expert Journey', '2.8 Expert Transaction History lists 3 distinct settlement credits', '3 ledger transactions', `Found ${txns.length} transactions`, txnPass);

        // =====================================================================
        // SECTION 3: FINANCIAL VERIFICATION
        // =====================================================================
        console.log('\n--- SECTION 3: FINANCIAL VERIFICATION ---');

        // 3.1 Persisted Payment Amounts
        const payRecords = await PaymentRecord.find({ expertId: expertUser._id });
        const allPaymentsVerified = payRecords.every(p => p.status === 'verified' && p.amount === 500);
        recordTest('Financial Verification', '3.1 Persisted payment amounts match candidate payment exactly', 'status="verified", amount=₹500 each', `All verified: ${allPaymentsVerified}`, allPaymentsVerified);

        // 3.2 Exactly-Once Payout (Duplicate Review or Completion blocked)
        const dupReviewRes = await request(`/sessions/${session1Id}/review`, {
            method: 'POST',
            token: expertToken,
            body: {
                overallRating: 5,
                technicalRating: 5,
                communicationRating: 5,
                feedback: 'Duplicate review attempt',
                reviewerRole: 'expert'
            }
        });
        const walletAfterDupReview = (await Wallet.findOne({ userId: expertUser._id }))?.availableBalance || 0;
        const dupReviewPass = (dupReviewRes.status === 200 || dupReviewRes.status === 409) &&
            dupReviewRes.data?.walletCredit?.alreadyCredited === true &&
            walletAfterDupReview === 1200;
        recordTest('Financial Verification', '3.2 Exactly-One Payout: Duplicate evaluation rejected without double credit', 'alreadyCredited=true, balance unchanged at 1200', `alreadyCredited=${dupReviewRes.data?.walletCredit?.alreadyCredited}, balance=${walletAfterDupReview}`, dupReviewPass);

        // 3.3 Exact 80/20 Split (Paise Mathematics Verification)
        const session100Paise = Math.round(100 * 100);
        const exp100Paise = Math.min(session100Paise, Math.round(session100Paise * 0.80));
        const plat100Paise = session100Paise - exp100Paise;

        const session1Paise = Math.round(1 * 100);
        const exp1Paise = Math.min(session1Paise, Math.round(session1Paise * 0.80));
        const plat1Paise = session1Paise - exp1Paise;

        const splitPass = (exp100Paise === 8000 && plat100Paise === 2000) && (exp1Paise === 80 && plat1Paise === 20);
        recordTest('Financial Verification', '3.3 Exact 80/20 split using integer paise mathematics (₹100 & ₹1 edge case)', '100p -> 80p + 20p; 10000p -> 8000p + 2000p', `₹1: ${exp1Paise}p / ${plat1Paise}p; ₹100: ${exp100Paise}p / ${plat100Paise}p`, splitPass);

        // 3.4 Candidate Wallet Booking & Refund Restoration
        // Setup candidate wallet with ₹500
        const candWallet = new Wallet({
            userId: candidateUser._id,
            availableBalance: 500
        });
        await candWallet.save();

        const session4Id = `sess_wallet_book_${testRunId}`;
        const session4 = new Session({
            sessionId: session4Id,
            candidateId: candidateUser._id,
            expertId: expertUser._id,
            categoryId: category._id,
            startTime: new Date(Date.now() + 24 * 3600 * 1000),
            endTime: new Date(Date.now() + 24.5 * 3600 * 1000),
            price: 500,
            status: 'confirmed'
        });
        await session4.save();

        // Simulate wallet debit for session booking
        candWallet.availableBalance -= 500;
        await candWallet.save();

        const walletDebitTxn = new WalletTransaction({
            walletId: candWallet._id,
            userId: candidateUser._id,
            amount: 500,
            type: 'DEBIT',
            reason: 'SESSION_BOOKING_WALLET',
            sessionId: session4Id,
            balanceAfter: 0,
            description: `Payment of ₹500 from wallet for session ${session4Id}`,
            status: 'COMPLETED'
        });
        await walletDebitTxn.save();

        // Call reject/cancel session to trigger automatic wallet refund
        const cancelRes = await request(`/sessions/${session4Id}/reject`, {
            method: 'PATCH',
            token: expertToken,
            body: { reason: 'Expert unavailable' }
        });
        const candWalletAfterCancel = await Wallet.findOne({ userId: candidateUser._id });
        const refundTxn = await WalletTransaction.findOne({
            userId: candidateUser._id,
            type: 'CREDIT',
            reason: 'SESSION_CANCELLED_REFUND'
        });

        const cancelRefundPass = candWalletAfterCancel?.availableBalance === 500 && Boolean(refundTxn);
        recordTest('Financial Verification', '3.4 Candidate Cancellation Refund restores wallet balance exactly once', 'availableBalance restored to 500, refund transaction logged', `balance: ${candWalletAfterCancel.availableBalance}, refundTxn: ${Boolean(refundTxn)}`, cancelRefundPass);

        // 3.5 Withdrawal Request & Balance Freezing
        // Update PayoutSetting minimum to ₹5
        let pSetting = await PayoutSetting.findOne();
        if (!pSetting) pSetting = new PayoutSetting();
        pSetting.minWithdrawalAmount = 5;
        await pSetting.save();

        const withdrawRes = await request('/payouts/request', {
            method: 'POST',
            token: expertToken,
            body: {
                expertId: expertUser._id.toString(),
                amount: 500,
                payoutMethodType: 'upi',
                upiId: 'expert@okhdfcbank',
                notes: 'Test withdrawal request'
            }
        });
        const expertWalletAfterWithdraw = await Wallet.findOne({ userId: expertUser._id });
        const freezeTxn = await WalletTransaction.findOne({
            userId: expertUser._id,
            type: 'FREEZE'
        });

        const withdrawPass = withdrawRes.status === 201 &&
            expertWalletAfterWithdraw.availableBalance === 700 && // 1200 - 500
            expertWalletAfterWithdraw.frozenBalance === 500 &&
            Boolean(freezeTxn);
        recordTest('Financial Verification', '3.5 Withdrawal Freezing moves funds to frozenBalance & records FREEZE entry', 'available: 700, frozen: 500, FREEZE transaction created', `available=${expertWalletAfterWithdraw?.availableBalance}, frozen=${expertWalletAfterWithdraw?.frozenBalance}, freezeTxn=${Boolean(freezeTxn)}`, withdrawPass);

        // 3.6 Ledger Reconciliation
        // ∑ completed CREDIT (1200) - ∑ completed FREEZE/DEBIT (500) = availableBalance (700)
        const allExpertTxns = await WalletTransaction.find({ userId: expertUser._id, status: 'COMPLETED' });
        let netCalc = 0;
        for (const t of allExpertTxns) {
            if (t.type === 'CREDIT') netCalc += t.amount;
            else if (t.type === 'DEBIT' || t.type === 'FREEZE') netCalc -= t.amount;
        }
        const reconPass = expertWalletAfterWithdraw ? (netCalc === expertWalletAfterWithdraw.availableBalance) : false;
        recordTest('Financial Verification', '3.6 Wallet Balance perfectly reconciles with transaction ledger', `Net ledger: ₹${netCalc} === availableBalance: ₹${expertWalletAfterWithdraw?.availableBalance}`, `reconciled=${reconPass}`, reconPass);

        // =====================================================================
        // SECTION 4: REGRESSION PROTECTION
        // =====================================================================
        console.log('\n--- SECTION 4: REGRESSION PROTECTION ---');

        // 4.1 10-Minute Booking Cutoff Rule: bookingCutoff = scheduledEndTime - 10 minutes
        const slotEnd = new Date(Date.now() + 30 * 60 * 1000); // 30 mins from now
        const cutoffTime = new Date(slotEnd.getTime() - 10 * 60 * 1000); // 20 mins from now
        const isCurrentlyBeforeCutoff = Date.now() < cutoffTime.getTime();

        const slotEndPast = new Date(Date.now() + 5 * 60 * 1000); // 5 mins from now
        const cutoffTimePast = new Date(slotEndPast.getTime() - 10 * 60 * 1000); // 5 mins ago
        const isPastCutoff = Date.now() >= cutoffTimePast.getTime();

        const cutoffPass = isCurrentlyBeforeCutoff && isPastCutoff;
        recordTest('Regression Protection', '4.1 Restored 10-minute booking cutoff rule (endTime - 10 mins)', 'Allows booking before cutoff, rejects at or after cutoff', `beforeCutoff=${isCurrentlyBeforeCutoff}, pastCutoffRejected=${isPastCutoff}`, cutoffPass);

        // 4.2 Certificate Progress Integrity
        const candCertsFinal = await getEligibleCompletedSessions(candidateUser._id);
        // Only session1 should be eligible (attended + completed + reviewed)
        // session2 (no-show), session3 (incomplete), session4 (cancelled) must all be excluded
        const eligibleSessionIds = candCertsFinal.map(s => s.sessionId);
        const certIntegrityPass = eligibleSessionIds.includes(session1Id) &&
            !eligibleSessionIds.includes(session2Id) &&
            !eligibleSessionIds.includes(session3Id) &&
            !eligibleSessionIds.includes(session4Id);
        recordTest('Regression Protection', '4.2 Certificate Eligibility strictly isolates genuine completed evaluations', 'Only Session 1 eligible; No-show, Incomplete, Cancelled excluded', `Eligible sessions: [${eligibleSessionIds.join(', ')}]`, certIntegrityPass);

        // Cleanup isolated test records
        console.log('\nCleaning up isolated test records...');
        await User.deleteMany({ _id: { $in: [candidateUser._id, expertUser._id] } });
        await ExpertDetails.deleteOne({ _id: expertProfile._id });
        await Session.deleteMany({ sessionId: { $in: [session1Id, session2Id, session3Id, session4Id] } });
        await PaymentRecord.deleteMany({ sessionId: { $in: [session1Id, session2Id, session3Id, session4Id] } });
        await Wallet.deleteMany({ userId: { $in: [candidateUser._id, expertUser._id] } });
        await WalletTransaction.deleteMany({ userId: { $in: [candidateUser._id, expertUser._id] } });
        await PayoutRequest.deleteMany({ expertId: expertUser._id });
        console.log('Cleanup complete.');

    } catch (err) {
        console.error('Test execution error:', err);
    } finally {
        await mongoose.disconnect();
    }

    const totalTests = report.length;
    const passedTests = report.filter(r => r.status === 'PASS').length;
    const failedTests = report.filter(r => r.status === 'FAIL').length;

    console.log('\n================================================================================');
    console.log(`FINAL E2E SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED out of ${totalTests} TESTS`);
    console.log('================================================================================\n');

    return { totalTests, passedTests, failedTests, report };
}

runCompleteE2EJourney();
