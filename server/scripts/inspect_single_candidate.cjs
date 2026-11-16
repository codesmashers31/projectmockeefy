const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function checkSingleCandidate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const { getDomainMilestoneProgress, getEligibleCompletedSessions } = await import("../controllers/certificationController.js");
  
  // Look for candidates who have recent sessions or sessions starting with ses_cert
  const certSessions = await mongoose.connection.collection("sessions").find({ sessionId: /^ses_cert/ }).toArray();
  console.log("Total ses_cert sessions:", certSessions.length);
  const candidateIds = [...new Set(certSessions.map(s => s.candidateId?.toString()))];
  console.log("Candidates with ses_cert sessions:", candidateIds);

  for (const cid of candidateIds) {
    const user = await mongoose.connection.collection("users").findOne({ _id: new mongoose.Types.ObjectId(cid) });
    console.log(`\n======================================================`);
    console.log(`Candidate: ${user?.name} (${user?.email}) [ID: ${cid}]`);
    console.log(`======================================================`);

    const userSessions = await mongoose.connection.collection("sessions").find({ candidateId: new mongoose.Types.ObjectId(cid) }).toArray();
    for (const s of userSessions) {
      const revs = await mongoose.connection.collection("reviewdetails").find({ sessionId: s.sessionId || s._id.toString() }).toArray();
      const feeds = await mongoose.connection.collection("feedbacks").find({ sessionId: s.sessionId || s._id.toString() }).toArray();
      console.log(`\nSession ${s.sessionId || s._id}:`);
      console.log(`  status: ${s.status}, attendanceStatus: ${s.attendanceStatus}, candidateJoinedAt: ${s.candidateJoinedAt}`);
      console.log(`  category: ${s.category}, categoryId: ${s.categoryId}, categoryNameSnapshot: ${s.categoryNameSnapshot}`);
      console.log(`  Reviews (${revs.length}):`, revs.map(r => ({ reviewerRole: r.reviewerRole, rating: r.overallRating })));
      console.log(`  Feedbacks (${feeds.length}):`, feeds.map(f => ({ rating: f.rating })));
    }

    const eligible = await getEligibleCompletedSessions(cid);
    console.log(`\nBackend Eligible sessions count: ${eligible.length}`);
    console.log(`Eligible session IDs:`, eligible.map(e => e.sessionId || e._id));
    console.log(`Ineligible audits:`, eligible.ineligibleAudits);

    const domainProgress = await getDomainMilestoneProgress(cid);
    console.log(`\nDomain Milestone Progress:`);
    console.log(`Total Eligible: ${domainProgress.totalEligibleCount}`);
    for (const cp of domainProgress.categoryProgress) {
      if (cp.totalEligibleCount > 0 || cp.totalIssuedCount > 0) {
        console.log(`Category: ${cp.categoryName} (${cp.categoryId})`);
        console.log(`  totalEligibleCount: ${cp.totalEligibleCount}`);
        console.log(`  progressInMilestone: ${cp.progressInMilestone}`);
        console.log(`  unallocatedCount: ${cp.unallocatedCount}`);
        console.log(`  isEligibleForNext: ${cp.isEligibleForNext}`);
        console.log(`  unallocatedSessions:`, cp.unallocatedSessions?.map(s => s.sessionId || s._id));
      }
    }
  }

  await mongoose.disconnect();
}
checkSingleCandidate().catch(console.error);
