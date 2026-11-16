const mongoose = require('../node_modules/mongoose');
require('../node_modules/dotenv').config({ path: 'server/.env' });

async function checkLogic() {
  await mongoose.connect(process.env.MONGO_URI);
  const Session = mongoose.model('Session', new mongoose.Schema({}, { strict: false }));
  const Review = mongoose.model('Review', new mongoose.Schema({}, { strict: false }));
  const Report = mongoose.model('Report', new mongoose.Schema({}, { strict: false }));
  const Meeting = mongoose.model('Meeting', new mongoose.Schema({}, { strict: false }));

  const joelId = new mongoose.Types.ObjectId('6ad1fd8b146a0a4e7ca163aa');
  const candidateSessions = await Session.find({ candidateId: joelId, status: { $in: ['completed', 'evaluated'] } }).sort({ startTime: 1 }).lean();

  const sessionIds = candidateSessions.map(s => s.sessionId);
  const reviews = await Review.find({ sessionId: { $in: sessionIds }, reviewerRole: 'expert' }).lean();
  const reports = await Report.find({ sessionId: { $in: candidateSessions.map(s => s._id) }, status: 'Submitted' }).lean();
  const meetings = await Meeting.find({ sessionId: { $in: sessionIds } }).lean();

  const revSet = new Set(reviews.map(r => r.sessionId));
  const repSet = new Set(reports.map(r => r.sessionId?.toString()));
  const meetMap = new Map();
  meetings.forEach(m => meetMap.set(m.sessionId, m));

  const eligible = [];
  const reqReview = [];

  for (const s of candidateSessions) {
    if (s.status === 'no-show' || s.attendanceStatus === 'absent' || s.attendanceStatus === 'no-show') continue;
    if (!revSet.has(s.sessionId) && !repSet.has(s._id?.toString())) continue;

    const m = meetMap.get(s.sessionId);
    const hasAtt = s.attendanceStatus === 'attended';
    const hasJoin = !!s.candidateJoinedAt;
    const hasMeet = m && m.status === 'finished';
    const hasCert = !!s.allocatedCertificateId;

    if (hasAtt || hasJoin || hasMeet || hasCert) {
      eligible.push({ sid: s.sessionId, hasAtt, hasJoin, hasMeet, hasCert, startTime: s.startTime });
    } else {
      reqReview.push({ sid: s.sessionId, startTime: s.startTime });
    }
  }

  console.log('Positively verified eligible count:', eligible.length);
  console.log('Eligible sessions:', eligible);
  console.log('Sessions requiring admin review count:', reqReview.length);
  console.log('Requiring review sessions:', reqReview);

  await mongoose.disconnect();
}
checkLogic();
