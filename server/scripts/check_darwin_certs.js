import mongoose from "mongoose";
import dotenv from "dotenv";
import Certification from "../models/Certification.js";

dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const userId = new mongoose.Types.ObjectId("6ad1fd8b146a0a4e7ca163aa");
  const certs = await Certification.find({ userId }).lean();
  console.log(`Found ${certs.length} certifications for Joel A / Darwin:`);
  for (const c of certs) {
    console.log(`Cert ${c._id}:
  certificateId: ${c.certificateId}
  milestoneNumber: ${c.milestoneNumber}
  milestoneRange: ${c.milestoneRange}
  categoryId: ${c.categoryId}
  categoryNameSnapshot: ${c.categoryNameSnapshot}
  recipientName: ${c.candidateNameSnapshot}
  qualifyingSessionIds: ${JSON.stringify(c.qualifyingSessionIds)}
  issueDate: ${c.issueDate}
  status: ${c.certificateStatus}`);
  }
  process.exit(0);
}

check().catch(console.error);
