const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function checkCandidateCertProgress() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Import the actual controller function
  const { getDomainMilestoneProgress, getEligibleCompletedSessions } = await import("../controllers/certificationController.js");
  
  // Find candidates with sessions
  const sessions = await mongoose.connection.collection("sessions").find({}).toArray();
  const candidateIds = [...new Set(sessions.map(s => s.candidateId?.toString()).filter(Boolean))];
  
  console.log("Found unique candidates with sessions:", candidateIds);

  for (const cid of candidateIds) {
    const user = await mongoose.connection.collection("users").findOne({ _id: new mongoose.Types.ObjectId(cid) });
    console.log(`\n======================================================`);
    console.log(`Candidate: ${user?.name} (${user?.email}) [ID: ${cid}]`);
    console.log(`======================================================`);

    const userSessions = sessions.filter(s => s.candidateId?.toString() === cid);
    console.log(`Total sessions in DB: ${userSessions.length}`);
    for (const s of userSessions) {
      const revs = await mongoose.connection.collection("reviewdetails").find({ sessionId: s.sessionId || s._id.toString() }).toArray();
      const feeds = await mongoose.connection.collection("feedbacks").find({ sessionId: s.sessionId || s._id.toString() }).toArray();
      console.log(`Session ${s.sessionId || s._id}: status=${s.status}, attendanceStatus=${s.attendanceStatus}, candidateJoinedAt=${s.candidateJoinedAt}, category=${s.category}, categoryId=${s.categoryId}`);
      console.log(`   Reviews (${revs.length}): ${revs.map(r => `${r.reviewerRole}:${r.overallRating}`).join(", ")}; Feedbacks (${feeds.length}): ${feeds.map(f => f.rating).join(", ")}`);
    }

    try {
      const eligible = await getEligibleCompletedSessions(cid);
      console.log(`\nAuthoritative eligible sessions count: ${eligible.length}`);
      console.log(`Eligible session IDs:`, eligible.map(e => e.sessionId || e._id));
      if (eligible.ineligibleAudits) {
        console.log(`Ineligible audits:`, eligible.ineligibleAudits);
      }

      const domainProgress = await getDomainMilestoneProgress(cid);
      console.log(`\nDomain Milestone Progress:`);
      console.log(`Total Eligible: ${domainProgress.totalEligibleCount}, Any Eligible: ${domainProgress.anyEligible}`);
      for (const cp of domainProgress.categoryProgress) {
        if (cp.totalEligibleCount > 0 || cp.totalIssuedCount > 0) {
          console.log(` - Category: ${cp.categoryName} (${cp.categoryId}): progressInMilestone=${cp.progressInMilestone}/3, totalEligible=${cp.totalEligibleCount}, unallocated=${cp.unallocatedCount}, isEligibleForNext=${cp.isEligibleForNext}`);
          console.log(`   Unallocated session IDs: ${cp.unallocatedSessions?.map(s => s.sessionId || s._id)}`);
        }
      }
    } catch (e) {
      console.error("Error calculating progress:", e);
    }
  }

  await mongoose.disconnect();
}
checkCandidateCertProgress().catch(console.error);
