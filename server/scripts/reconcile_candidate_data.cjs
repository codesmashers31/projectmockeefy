const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function inspect() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('MongoDB Connected');

  const User = mongoose.models.User || (await import('../models/User.js')).default;
  const Session = mongoose.models.Session || (await import('../models/Session.js')).default;
  const Meeting = mongoose.models.Meeting || (await import('../models/Meeting.js')).default;
  const Review = mongoose.models.Review || (await import('../models/reviewModel.js')).default;
  const Certification = mongoose.models.Certification || (await import('../models/Certification.js')).default;
  const Category = mongoose.models.Category || (await import('../models/Category.js')).default;

  const user = await User.findOne({ email: 'darwininfantmichael@gmail.com' });
  console.log('User:', user?.name, user?.email, user?._id);

  const certs = await Certification.find({ userId: user._id }).lean();
  console.log('\n--- ISSUED CERTIFICATES (' + certs.length + ') ---');
  certs.forEach(c => {
    console.log({
      id: c.certificateId,
      category: c.categoryNameSnapshot,
      milestone: c.milestoneNumber,
      range: c.milestoneRange,
      sessions: c.qualifyingSessionIds,
      issued: c.issueDate
    });
  });

  const sessions = await Session.find({ candidateId: user._id }).lean();
  console.log('\n--- TOTAL CANDIDATE SESSIONS: ' + sessions.length + ' ---');

  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    const meeting = await Meeting.findOne({
      $or: [
        { sessionId: s.sessionId },
        { sessionId: s._id.toString() }
      ]
    }).lean();

    const review = await Review.findOne({
      $or: [
        { sessionId: s.sessionId },
        { sessionId: s._id.toString() }
      ]
    }).lean();

    const hasReview = Boolean(s.expertReview || review);
    const alloc = s.allocatedCertificateId || s.certificateId || null;

    console.log(`[${i+1}] ID: ${s.sessionId || s._id} | Cat: ${s.category} | Status: ${s.status} | Att: ${s.attendanceStatus} | JoinedAt: ${s.candidateJoinedAt || meeting?.candidateJoinedAt || 'none'} | Review: ${hasReview} | Alloc: ${alloc}`);
  }

  process.exit(0);
}

inspect().catch(e => {
  console.error(e);
  process.exit(1);
});
