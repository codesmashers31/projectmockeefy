import mongoose from "mongoose";
import dotenv from "dotenv";
import Session from "../models/Session.js";
import reviewModel from "../models/reviewModel.js";

dotenv.config();

async function clean() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const candidateId = new mongoose.Types.ObjectId("6ad1fd8b146a0a4e7ca163aa");

  const seededSessions = await Session.find({
    candidateId,
    sessionId: { $regex: "^(WD-QUAL|SD-QUAL)" }
  }).lean();

  console.log(`Found ${seededSessions.length} seeded sessions to clean.`);
  const sessionIds = seededSessions.map(s => s.sessionId);

  const delReviews = await reviewModel.deleteMany({ sessionId: { $in: sessionIds } });
  console.log(`Deleted ${delReviews.deletedCount} reviews associated with seeded sessions.`);

  const delSessions = await Session.deleteMany({
    candidateId,
    sessionId: { $in: sessionIds }
  });
  console.log(`Deleted ${delSessions.deletedCount} seeded sessions from Darwin's account.`);

  // Verify Darwin's remaining sessions
  const remaining = await Session.find({ candidateId }).lean();
  console.log(`Darwin now has ${remaining.length} total genuine sessions.`);
  const cats = new Set(remaining.map(s => s.categoryNameSnapshot || s.category));
  console.log(`Darwin's remaining categories:`, Array.from(cats));

  process.exit(0);
}

clean().catch(console.error);
