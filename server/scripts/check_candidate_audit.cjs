const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function checkReviews() {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    const candidateOid = new mongoose.Types.ObjectId('6ad1fd8b146a0a4e7ca163aa');
    const sessions = await db.collection('sessions').find({ candidateId: candidateOid }).toArray();
    console.log('Total candidate sessions:', sessions.length);

    const sessionIds = sessions.map(s => s.sessionId);
    const reviews = await db.collection('reviews').find({ sessionId: { $in: sessionIds } }).toArray();
    console.log('Total reviews for candidate sessions:', reviews.length);

    for (const r of reviews) {
        console.log({
            sessionId: r.sessionId,
            reviewerRole: r.reviewerRole,
            candidateId: r.candidateId,
            overallRating: r.overallRating,
            createdAt: r.createdAt
        });
    }

    const expertReviews = reviews.filter(r => r.reviewerRole === 'expert');
    console.log('Expert reviews count:', expertReviews.length);

    const candidateReviews = reviews.filter(r => r.reviewerRole === 'candidate');
    console.log('Candidate reviews count:', candidateReviews.length);

    // Now let's see how many sessions have expert reviews
    const expertReviewedSessionIds = new Set(expertReviews.map(r => r.sessionId));
    console.log('Unique sessions with expert reviews:', expertReviewedSessionIds.size);

    // Let's inspect each of these sessions
    console.log('\n--- Details of Sessions with Expert Reviews ---');
    for (const sid of expertReviewedSessionIds) {
        const s = sessions.find(sess => sess.sessionId === sid);
        const m = await db.collection('meetings').findOne({ sessionId: sid });
        console.log({
            sessionId: sid,
            status: s?.status,
            attendanceStatus: s?.attendanceStatus,
            candidateJoinedAt: s?.candidateJoinedAt,
            allocatedCertificateId: s?.allocatedCertificateId,
            categoryId: s?.categoryId,
            categoryNameSnapshot: s?.categoryNameSnapshot,
            topics: s?.topics,
            meetingStatus: m?.status,
            meetingCandidateId: m?.candidateId,
            meetingActiveUsers: m?.activeUsers
        });
    }

    // Now let's check sessions that do NOT have expert reviews
    const nonReviewedSessions = sessions.filter(s => !expertReviewedSessionIds.has(s.sessionId));
    console.log('\n--- Sessions WITHOUT Expert Reviews (' + nonReviewedSessions.length + ') ---');
    for (const s of nonReviewedSessions) {
        console.log({
            sessionId: s.sessionId,
            status: s.status,
            attendanceStatus: s.attendanceStatus,
            allocatedCertificateId: s.allocatedCertificateId,
            categoryNameSnapshot: s.categoryNameSnapshot,
            topics: s.topics
        });
    }

    process.exit(0);
}
checkReviews();
