const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function debugEligibility() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const cid = "6af68ada44e1e1d2dde674b3";
  const Session = (await import("../models/Session.js")).default;
  const ReviewDetails = (await import("../models/reviewModel.js")).default;
  const Report = (await import("../models/Report.js")).default;
  const Meeting = (await import("../models/Meeting.js")).default;
  
  const candidateOid = new mongoose.Types.ObjectId(cid);
  const candidateSessions = await Session.find({ candidateId: candidateOid }).sort({ startTime: 1 }).lean();
  
  const sessionIds = candidateSessions.map(s => s.sessionId).filter(Boolean);
  const mongoIds = candidateSessions.map(s => s._id).filter(Boolean);
  const allQueryIds = [...new Set([...sessionIds, ...mongoIds.map(String)])];
  const validObjectIds = allQueryIds.filter(id => mongoose.Types.ObjectId.isValid(id));

  console.log("allQueryIds:", allQueryIds);
  console.log("validObjectIds:", validObjectIds);

  const [reviews, submittedReports, meetingRecords] = await Promise.all([
      ReviewDetails.find({
          sessionId: { $in: allQueryIds }
      }).select('sessionId reviewerRole').lean(),
      Report.find({
          sessionId: { $in: validObjectIds },
          status: 'Submitted'
      }).select('sessionId').lean(),
      Meeting.find({
          sessionId: { $in: allQueryIds }
      }).select('sessionId candidateId expertId status activeUsers').lean()
  ]);

  console.log("Found reviews:", reviews);
  console.log("Found submittedReports:", submittedReports);
  console.log("Found meetingRecords:", meetingRecords.length);

  await mongoose.disconnect();
}
debugEligibility().catch(console.error);
