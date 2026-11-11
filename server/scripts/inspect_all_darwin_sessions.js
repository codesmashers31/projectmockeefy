import mongoose from "mongoose";
import dotenv from "dotenv";
import Session from "../models/Session.js";
import reviewModel from "../models/reviewModel.js";
import Certification from "../models/Certification.js";

dotenv.config();

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const candidateId = new mongoose.Types.ObjectId("6ad1fd8b146a0a4e7ca163aa");

  const sessions = await Session.find({ candidateId }).sort({ createdAt: 1 }).lean();
  console.log(`Candidate 6ad1fd8b146a0a4e7ca163aa has ${sessions.length} sessions.`);

  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    const reviews = await reviewModel.find({
      $or: [
        { sessionId: s._id.toString() },
        { sessionId: s.sessionId },
        { session: s._id }
      ]
    }).lean();

    console.log(`[${i + 1}] ID: ${s._id} | sessionId: ${s.sessionId} | category: ${s.categoryNameSnapshot || s.category} | status: ${s.status} | candAtt: ${s.candidateAttended} | attStatus: ${s.attendanceStatus} | candJoined: ${s.candidateJoinedAt} | reviews: ${reviews.length} | allocCert: ${s.allocatedCertificateId} | allocMilestone: ${s.allocatedMilestone} | createdAt: ${s.createdAt?.toISOString()}`);
  }

  process.exit(0);
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
