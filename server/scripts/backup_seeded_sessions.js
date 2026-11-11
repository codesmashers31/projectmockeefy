import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import Session from "../models/Session.js";
import reviewModel from "../models/reviewModel.js";

dotenv.config();

async function backup() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const candidateId = new mongoose.Types.ObjectId("6ad1fd8b146a0a4e7ca163aa");

  // Find the seeded sessions
  const seededSessions = await Session.find({
    candidateId,
    sessionId: { $regex: "^(WD-QUAL|SD-QUAL)" }
  }).lean();

  console.log(`Found ${seededSessions.length} seeded test sessions for candidate.`);

  const sessionIds = seededSessions.map(s => s.sessionId);
  const seededReviews = await reviewModel.find({
    sessionId: { $in: sessionIds }
  }).lean();

  console.log(`Found ${seededReviews.length} seeded test reviews for candidate.`);

  const backupData = {
    timestamp: new Date().toISOString(),
    candidateId: candidateId.toString(),
    seededSessions,
    seededReviews
  };

  const backupDir = path.join(process.cwd(), "data", "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupPath = path.join(backupDir, "darwin_seeded_sessions_backup.json");
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
  console.log(`Backup saved safely to: ${backupPath}`);

  process.exit(0);
}

backup().catch(console.error);
