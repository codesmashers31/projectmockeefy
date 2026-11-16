const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function inspect() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const User = mongoose.models.User || (await import('../models/User.js')).default;
  const Session = mongoose.models.Session || (await import('../models/Session.js')).default;
  const Review = mongoose.models.Review || (await import('../models/reviewModel.js')).default;
  const Meeting = mongoose.models.Meeting || (await import('../models/Meeting.js')).default;

  const user = await User.findOne({ email: 'darwininfantmichael@gmail.com' });
  console.log('User:', user._id);

  const reviews = await Review.find({ candidateId: user._id }).lean();
  console.log('\n--- ALL REVIEWS FOR CANDIDATE (' + reviews.length + ') ---');
  reviews.forEach((r, idx) => {
    console.log(`[${idx+1}] ID: ${r._id} | sessionId: "${r.sessionId}" | role: "${r.reviewerRole}" | overall: ${r.overallRating}`);
  });

  const sessions = await Session.find({ candidateId: user._id }).sort({ startTime: 1 }).lean();
  console.log('\n--- SESSION ATTENDANCE & REVIEW ANALYSIS (Total: ' + sessions.length + ') ---');

  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    const matchingReview = reviews.find(r => r.sessionId === s.sessionId || r.sessionId === s._id.toString());
    const meeting = await Meeting.findOne({ sessionId: s.sessionId }).lean();

    console.log(`\nSession #${i+1}: ${s.sessionId} (Mongo _id: ${s._id})`);
    console.log('  Status:', s.status);
    console.log('  Session attendanceStatus:', s.attendanceStatus);
    console.log('  Session candidateJoinedAt:', s.candidateJoinedAt);
    console.log('  Session.expertReview on doc:', Boolean(s.expertReview));
    console.log('  Matching Review doc:', matchingReview ? `Found (role: ${matchingReview.reviewerRole}, rating: ${matchingReview.overallRating})` : 'None');
    console.log('  Meeting:', meeting ? {
      status: meeting.status,
      candidateId: meeting.candidateId,
      activeUsers: meeting.activeUsers,
      candidateJoinedAt: meeting.candidateJoinedAt
    } : 'None');
  }

  process.exit(0);
}

inspect().catch(e => { console.error(e); process.exit(1); });
