const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

let categoryCache = null;
let categoryCacheTime = 0;

async function getCachedCategories(Category) {
  if (categoryCache && (Date.now() - categoryCacheTime < 60000)) {
    return categoryCache;
  }
  categoryCache = await Category.find({}).lean();
  categoryCacheTime = Date.now();
  return categoryCache;
}

async function profile() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const Session = (await import('../models/Session.js')).default;
  const ReviewDetails = (await import('../models/reviewModel.js')).default;
  const Report = (await import('../models/Report.js')).default;
  const Meeting = (await import('../models/Meeting.js')).default;
  const Category = (await import('../models/Category.js')).default;

  const candId = new mongoose.Types.ObjectId('69e84f2c95297b77e3372178');

  // Warmup cache
  await getCachedCategories(Category);

  const tStart = process.hrtime.bigint();

  // 1. Lean Session find
  const candidateSessions = await Session.find({
    candidateId: candId,
    status: { $in: ['completed', 'evaluated'] }
  }).sort({ startTime: 1 }).lean();

  const sessionIds = candidateSessions.map(s => s.sessionId).filter(Boolean);
  const mongoIds = candidateSessions.map(s => s._id).filter(Boolean);
  const allQueryIds = [...new Set([...sessionIds, ...mongoIds.map(String)])];
  const validObjectIds = allQueryIds.filter(id => mongoose.Types.ObjectId.isValid(id));

  // 2. Single ReviewDetails query + Report + Meeting
  const [reviews, submittedReports, meetingRecords, allDbCategories] = await Promise.all([
    ReviewDetails.find({
      sessionId: { $in: allQueryIds }
    }).select('sessionId reviewerRole').lean(),
    Report.find({
      sessionId: { $in: validObjectIds },
      status: 'Submitted'
    }).select('sessionId').lean(),
    Meeting.find({
      sessionId: { $in: allQueryIds }
    }).select('sessionId candidateId expertId status activeUsers').lean(),
    getCachedCategories(Category)
  ]);

  const reviewedSessionIds = new Set(reviews.filter(r => r.reviewerRole === 'expert').map(r => String(r.sessionId)));
  const candidateReviewedSessionIds = new Set(reviews.filter(r => r.reviewerRole === 'candidate').map(r => String(r.sessionId)));
  const reportedSessionIds = new Set(submittedReports.map(r => String(r.sessionId)));
  const meetingMap = new Map();
  meetingRecords.forEach(m => {
    if (m.sessionId) meetingMap.set(String(m.sessionId), m);
  });

  const catByIdMap = new Map();
  const catByNameMap = new Map();
  allDbCategories.forEach(c => {
    catByIdMap.set(c._id.toString(), c);
    if (c.name) catByNameMap.set(c.name.trim().toLowerCase(), c);
  });

  const eligibleSessions = [];
  const seenSessionIds = new Set();

  for (const session of candidateSessions) {
    const st = (session.status || '').toLowerCase();
    if (st === 'no-show' || st === 'candidate_no_show' || st === 'no_show' || st === 'cancelled') continue;
    if (session.attendanceStatus === 'absent' || session.attendanceStatus === 'no-show') continue;

    const sidStr = String(session.sessionId || '');
    const mongoIdStr = String(session._id || '');
    const hasReview = (sidStr && reviewedSessionIds.has(sidStr)) || (mongoIdStr && reviewedSessionIds.has(mongoIdStr));
    const hasReport = (mongoIdStr && reportedSessionIds.has(mongoIdStr)) || (sidStr && reportedSessionIds.has(sidStr));
    const hasExistingAllocation = Boolean(session.allocatedCertificateId);

    if (!hasReview && !hasReport && !hasExistingAllocation) continue;

    const sid = session.sessionId || session._id.toString();
    if (seenSessionIds.has(sid)) continue;
    seenSessionIds.add(sid);

    const isExplicitlyAttended = session.attendanceStatus === 'attended';
    const hasCandidateJoinTimestamp = Boolean(session.candidateJoinedAt);
    const hasAdminAuditApproval = session.attendanceAudit?.decision === 'approved';
    const hasCandidateReview = (sidStr && candidateReviewedSessionIds.has(sidStr)) || (mongoIdStr && candidateReviewedSessionIds.has(mongoIdStr));

    const meetingDoc = meetingMap.get(sidStr) || meetingMap.get(mongoIdStr);
    const hasMeetingWithCandidate = Boolean(
      meetingDoc &&
      String(meetingDoc.candidateId) === String(candId) &&
      meetingDoc.status === 'finished' &&
      (
        (Array.isArray(meetingDoc.activeUsers) && meetingDoc.activeUsers.map(String).includes(String(candId))) ||
        Boolean(session.candidateJoinedAt) ||
        session.attendanceStatus === 'attended'
      )
    );

    if (isExplicitlyAttended || hasCandidateJoinTimestamp || hasAdminAuditApproval || hasCandidateReview || hasMeetingWithCandidate || hasExistingAllocation) {
      let matchedCat = null;
      if (session.categoryId && catByIdMap.has(session.categoryId.toString())) {
        matchedCat = catByIdMap.get(session.categoryId.toString());
      } else if (session.categoryNameSnapshot && catByNameMap.has(session.categoryNameSnapshot.trim().toLowerCase())) {
        matchedCat = catByNameMap.get(session.categoryNameSnapshot.trim().toLowerCase());
      } else if (session.category && catByNameMap.has(session.category.trim().toLowerCase())) {
        matchedCat = catByNameMap.get(session.category.trim().toLowerCase());
      }

      if (matchedCat) {
        session.categoryId = matchedCat._id;
        session.categoryNameSnapshot = matchedCat.name;
        eligibleSessions.push(session);
      }
    }
  }

  const durationMs = Number(process.hrtime.bigint() - tStart) / 1e6;
  console.log(`Optimized getEligibleCompletedSessions: ${durationMs.toFixed(2)} ms (Returned: ${eligibleSessions.length} sessions)`);

  await mongoose.disconnect();
}
profile().catch(console.error);
