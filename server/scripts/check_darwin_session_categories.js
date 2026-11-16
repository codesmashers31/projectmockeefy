import mongoose from "mongoose";
import dotenv from "dotenv";
import Session from "../models/Session.js";
import Category from "../models/Category.js";

dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const candidateId = new mongoose.Types.ObjectId("6ad1fd8b146a0a4e7ca163aa");

  const sessions = await Session.find({ candidateId }).sort({ createdAt: 1 }).lean();
  console.log(`Candidate has ${sessions.length} sessions.`);

  const itCat = await Category.findOne({ name: "IT" }).lean();
  console.log("IT category ID:", itCat._id.toString());

  for (const s of sessions) {
    console.log(`Session: ${s._id} | sessionId: ${s.sessionId} | categoryId: ${s.categoryId} | snapshot: ${s.categoryNameSnapshot} | raw category: ${s.category}`);
  }

  process.exit(0);
}

check().catch(console.error);
