const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function check() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const Session = mongoose.models.Session || (await import('../models/Session.js')).default;
  const Meeting = mongoose.models.Meeting || (await import('../models/Meeting.js')).default;
  const Review = mongoose.models.Review || (await import('../models/reviewModel.js')).default;
  const Certification = mongoose.models.Certification || (await import('../models/Certification.js')).default;
  const Category = mongoose.models.Category || (await import('../models/Category.js')).default;
  const User = mongoose.models.User || (await import('../models/User.js')).default;

  const user = await User.findOne({ email: 'darwininfantmichael@gmail.com' });
  const allSessions = await Session.find({ candidateId: user._id }).lean();

  console.log(`\n================ ALL CANDIDATE SESSIONS (${allSessions.length}) ================`);
  for (let i = 0; i < allSessions.length; i++) {
    const s = allSessions[i];
    console.log(`\n--- Session #${i + 1}: ${s.sessionId} (Mongo _id: ${s._id}) ---`);
    console.log({
      status: s.status,
      attendanceStatus: s.attendanceStatus,
      candidateJoinedAt: s.candidateJoinedAt,
      category: s.category,
      categoryId: s.categoryId,
      categoryNameSnapshot: s.categoryNameSnapshot,
      topic: s.topic,
      allocatedCertificateId: s.allocatedCertificateId,
      certificateId: s.certificateId,
      allocatedMilestone: s.allocatedMilestone,
      expertReview: s.expertReview ? {
        overallRating: s.expertReview.overallRating,
        feedback: s.expertReview.feedback ? s.expertReview.feedback.substring(0, 40) + '...' : null
      } : null,
      expertId: s.expertId
    });

    const m = await Meeting.findOne({ sessionId: s.sessionId }).lean();
    if (m) {
      console.log('  Meeting:', {
        status: m.status,
        candidateJoinedAt: m.candidateJoinedAt,
        expertJoinedAt: m.expertJoinedAt,
        endedAt: m.endedAt,
        durationMinutes: m.durationMinutes
      });
    } else {
      console.log('  Meeting: NONE');
    }

    const r = await Review.findOne({ sessionId: s.sessionId }).lean();
    if (r) {
      console.log('  Review model doc:', {
        rating: r.rating || r.overallRating,
        feedback: r.feedback ? r.feedback.substring(0, 40) + '...' : null
      });
    }
  }

  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
