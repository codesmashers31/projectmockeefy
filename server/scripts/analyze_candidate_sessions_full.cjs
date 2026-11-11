const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function analyzeAll() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const User = mongoose.models.User || (await import('../models/User.js')).default;
  const Session = mongoose.models.Session || (await import('../models/Session.js')).default;
  const Meeting = mongoose.models.Meeting || (await import('../models/Meeting.js')).default;
  const Review = mongoose.models.Review || (await import('../models/reviewModel.js')).default;
  const Report = mongoose.models.Report || (await import('../models/Report.js')).default;
  const Certification = mongoose.models.Certification || (await import('../models/Certification.js')).default;

  const user = await User.findOne({ email: 'darwininfantmichael@gmail.com' });
  const sessions = await Session.find({ candidateId: user._id }).sort({ startTime: 1 }).lean();

  console.log(`\nCandidate: ${user.name} (${user._id})`);
  console.log(`Total sessions in DB: ${sessions.length}`);

  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    const meeting = await Meeting.findOne({ sessionId: s.sessionId }).lean();
    const reviews = await Review.find({ sessionId: s.sessionId }).lean();
    const expertRev = reviews.find(r => r.reviewerRole === 'expert');
    const candRev = reviews.find(r => r.reviewerRole === 'candidate');
    const report = await Report.findOne({ sessionId: s._id }).lean();

    console.log(`\n======================================================`);
    console.log(`SESSION [${i+1}] ${s.sessionId} (Mongo ID: ${s._id})`);
    console.log(`  status: "${s.status}"`);
    console.log(`  attendanceStatus: "${s.attendanceStatus}"`);
    console.log(`  candidateJoinedAt: ${s.candidateJoinedAt}`);
    console.log(`  attendanceAudit:`, s.attendanceAudit || 'none');
    console.log(`  allocatedCertificateId: "${s.allocatedCertificateId}"`);
    console.log(`  certificateId: "${s.certificateId}"`);
    console.log(`  Expert Review in Review collection:`, expertRev ? { id: expertRev._id, rating: expertRev.overallRating } : 'none');
    console.log(`  Candidate Review in Review collection:`, candRev ? { id: candRev._id, rating: candRev.overallRating } : 'none');
    console.log(`  Session.expertReview field:`, Boolean(s.expertReview));
    console.log(`  Report:`, report ? { id: report._id, status: report.status } : 'none');
    console.log(`  Meeting:`, meeting ? {
      id: meeting._id,
      status: meeting.status,
      candidateId: meeting.candidateId,
      expertId: meeting.expertId,
      candidateJoinedAt: meeting.candidateJoinedAt,
      expertJoinedAt: meeting.expertJoinedAt,
      activeUsers: meeting.activeUsers
    } : 'none');
  }

  process.exit(0);
}

analyzeAll().catch(e => { console.error(e); process.exit(1); });
