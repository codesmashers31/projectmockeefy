const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function check13Reviews() {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const candidateOid = new mongoose.Types.ObjectId('6ad1fd8b146a0a4e7ca163aa');

    const sessions = await db.collection('sessions').find({ candidateId: candidateOid }).toArray();
    const sessionIds = sessions.map(s => s.sessionId);
    const reviews = await db.collection('reviews').find({ sessionId: { $in: sessionIds }, reviewerRole: 'expert' }).toArray();

    console.log(`Found ${reviews.length} expert reviews for candidate:`);
    for (const r of reviews) {
        const s = sessions.find(sess => sess.sessionId === r.sessionId);
        console.log({
            sessionId: r.sessionId,
            reviewId: r._id,
            reviewerRole: r.reviewerRole,
            overallRating: r.overallRating,
            sessionStatus: s?.status,
            attendanceStatus: s?.attendanceStatus,
            candidateJoinedAt: s?.candidateJoinedAt,
            allocatedCertificateId: s?.allocatedCertificateId,
            categoryId: s?.categoryId,
            categoryNameSnapshot: s?.categoryNameSnapshot,
            topics: s?.topics,
            price: s?.price,
            meetingLink: s?.meetingLink
        });
    }

    process.exit(0);
}
check13Reviews();
