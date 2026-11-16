import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Session from "../models/Session.js";
import Certification from "../models/Certification.js";
import Category from "../models/Category.js";
import reviewModel from "../models/reviewModel.js";

dotenv.config();

async function audit() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  console.log("=== MOCKEEFY DATABASE AUDIT ===");

  const totalSessions = await Session.countDocuments();
  console.log(`Total sessions in Session collection: ${totalSessions}`);

  const candidatesWithSessions = await Session.aggregate([
    {
      $group: {
        _id: "$candidateId",
        sessionCount: { $sum: 1 },
        categories: { $addToSet: { $ifNull: ["$categoryNameSnapshot", "$category"] } }
      }
    }
  ]);

  for (const c of candidatesWithSessions) {
    const user = c._id ? await User.findById(c._id).lean() : null;
    console.log(`Candidate ${c._id} (${user?.name || "UNKNOWN"} - ${user?.email || "NO_EMAIL"}): ${c.sessionCount} sessions across [${c.categories.join(", ")}]`);
  }

  console.log("\n=== CERTIFICATIONS IN DB ===");
  const totalCerts = await Certification.find().lean();
  console.log(`Total certifications: ${totalCerts.length}`);
  for (const cert of totalCerts) {
    console.log(`Cert ${cert._id}: candidateId=${cert.candidateId}, domain=${cert.domain}, milestone=${cert.milestoneNumber}, serial=${cert.certificateSerialNumber}, recipientName=${cert.recipientNameSnapshot}`);
  }

  console.log("\n=== ALL REVIEWS IN DB ===");
  const reviews = await reviewModel.find().lean();
  console.log(`Total reviews: ${reviews.length}`);
  const reviewSessions = reviews.map(r => r.sessionId);
  console.log("Review sessionIds:", reviewSessions);

  process.exit(0);
}

audit().catch(err => {
  console.error(err);
  process.exit(1);
});
