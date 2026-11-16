const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function debugTestA() {
    await mongoose.connect(process.env.MONGO_URI);
    const Session = (await import('../models/Session.js')).default;
    const PaymentRecord = (await import('../models/PaymentRecord.js')).default;
    const User = (await import('../models/User.js')).default;
    const { completeSession } = await import('../controllers/sessionController.js');

    const testRunId = `debug_${Date.now()}`;
    const testExpertUser = await User.create({
        name: `${testRunId} Expert`,
        email: `${testRunId}_expert@mockeefy.test`,
        password: 'Password123!',
        userType: 'expert',
        walletBalance: 0
    });
    const testCandidateUser = await User.create({
        name: `${testRunId} Candidate`,
        email: `${testRunId}_candidate@mockeefy.test`,
        password: 'Password123!',
        userType: 'candidate',
        walletBalance: 0
    });

    const sessionA = await Session.create({
        sessionId: `${testRunId}_session_a`,
        expertId: testExpertUser._id,
        candidateId: testCandidateUser._id,
        topics: ['Testing'],
        startTime: new Date(Date.now() - 30 * 60 * 1000),
        endTime: new Date(Date.now() - 5 * 60 * 1000),
        price: 500,
        status: 'confirmed',
        attendanceStatus: 'attended',
        candidateJoinedAt: new Date(Date.now() - 28 * 60 * 1000)
    });

    const payA = await PaymentRecord.create({
        paymentId: `pay_${testRunId}_a`,
        orderId: `ord_${testRunId}_a`,
        userId: testCandidateUser._id,
        paymentType: 'booking',
        amount: 500,
        sessionId: sessionA.sessionId,
        status: 'verified'
    });

    console.log('Created sessionA:', sessionA.sessionId, 'PaymentRecord:', payA.sessionId, payA.status);

    const mockReq = {
        params: { sessionId: sessionA.sessionId },
        body: {
            attendanceOutcome: 'ATTENDED_COMPLETED',
            completionEvidence: { interviewConducted: true }
        },
        user: { userId: testExpertUser._id.toString(), userType: 'expert' }
    };
    let resStatus = null;
    let resData = null;
    const mockRes = {
        status: function(code) { resStatus = code; return this; },
        json: function(data) { resData = data; return this; }
    };

    await completeSession(mockReq, mockRes);
    console.log('completeSession response:', resStatus, resData?.success, resData?.message);

    const updated = await Session.findOne({ sessionId: sessionA.sessionId });
    console.log('Updated sessionA in DB:', {
        status: updated.status,
        attendanceOutcome: updated.attendanceOutcome,
        payoutStatus: updated.payoutStatus,
        payoutAmount: updated.payoutAmount,
        payoutCredited: updated.payoutCredited
    });

    await Session.deleteOne({ _id: sessionA._id });
    await PaymentRecord.deleteOne({ _id: payA._id });
    await mongoose.disconnect();
}

debugTestA();
