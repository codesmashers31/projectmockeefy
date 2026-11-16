const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function findCandidateWith4Sessions() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Find all users who have sessions
  const sessions = await mongoose.connection.collection("sessions").find({}).toArray();
  const candidateCounts = {};
  for (const s of sessions) {
    const cid = s.candidateId?.toString();
    if (cid) candidateCounts[cid] = (candidateCounts[cid] || 0) + 1;
  }
  
  console.log("Candidate session counts:", candidateCounts);
  for (const [cid, count] of Object.entries(candidateCounts)) {
    if (count >= 2) {
      const user = await mongoose.connection.collection("users").findOne({ _id: new mongoose.Types.ObjectId(cid) });
      console.log(`\nCandidate ${user?.name} (${user?.email}) [ID: ${cid}] has ${count} sessions:`);
      const userSessions = sessions.filter(s => s.candidateId?.toString() === cid);
      for (const s of userSessions) {
        const revs = await mongoose.connection.collection("reviewdetails").find({ sessionId: s.sessionId || s._id.toString() }).toArray();
        const fbs = await mongoose.connection.collection("feedbacks").find({ sessionId: s.sessionId || s._id.toString() }).toArray();
        console.log(`  Session ${s.sessionId || s._id}: status=${s.status}, attendanceStatus=${s.attendanceStatus}, category=${s.category}, categoryId=${s.categoryId}`);
        console.log(`    Reviews: ${revs.map(r => `${r.reviewerRole}(${r.overallRating})`).join(", ") || "none"}`);
        console.log(`    Feedbacks: ${fbs.map(f => f.rating).join(", ") || "none"}`);
      }
    }
  }
  
  await mongoose.disconnect();
}
findCandidateWith4Sessions().catch(console.error);
