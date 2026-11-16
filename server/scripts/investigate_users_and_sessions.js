import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Session from "../models/Session.js";
import Certification from "../models/Certification.js";
import Category from "../models/Category.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  console.log("Connected to DB.");

  // Look up users with darwin or joel
  const users = await User.find({
    $or: [
      { name: { $regex: "darwin", $options: "i" } },
      { email: { $regex: "darwin", $options: "i" } },
      { name: { $regex: "joel", $options: "i" } },
      { email: { $regex: "joel", $options: "i" } }
    ]
  }).lean();

  console.log("\n--- USERS FOUND ---");
  for (const u of users) {
    console.log(`User: ${u._id} | Name: ${u.name} | Email: ${u.email} | Type: ${u.userType}`);
  }

  // Look up all sessions for these users
  for (const u of users) {
    const candidateSessions = await Session.find({ candidateId: u._id }).lean();
    console.log(`\nCandidate [${u.name} - ${u._id}]: Total sessions found = ${candidateSessions.length}`);

    // Group by categoryId / categoryNameSnapshot
    const catMap = {};
    for (const s of candidateSessions) {
      const catKey = s.categoryNameSnapshot || s.categoryId || "UNKNOWN";
      if (!catMap[catKey]) catMap[catKey] = [];
      catMap[catKey].push({
        id: s._id,
        status: s.status,
        paymentStatus: s.paymentStatus,
        candidateAttended: s.candidateAttended,
        meetingAttendance: s.meetingAttendance,
        reviewSubmitted: s.reviewSubmitted,
        allocatedCertificateId: s.allocatedCertificateId,
        allocatedMilestone: s.allocatedMilestone,
        createdAt: s.createdAt
      });
    }

    for (const [cat, list] of Object.entries(catMap)) {
      console.log(`  Category: ${cat} -> ${list.length} sessions`);
      for (const item of list) {
        console.log(`    Session ${item.id}: status=${item.status}, payment=${item.paymentStatus}, candAtt=${item.candidateAttended}, revSub=${item.reviewSubmitted}, allocCert=${item.allocatedCertificateId}, allocMilestone=${item.allocatedMilestone}`);
      }
    }

    const certs = await Certification.find({ candidateId: u._id }).lean();
    console.log(`  Certifications count: ${certs.length}`);
    for (const c of certs) {
      console.log(`    Cert ${c._id}: domain=${c.domain}, milestone=${c.milestoneNumber}, serial=${c.certificateSerialNumber}, issuedDate=${c.issueDate}`);
    }
  }

  process.exit(0);
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
