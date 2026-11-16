const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function scanAllCandidates() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const { getDomainMilestoneProgress, getEligibleCompletedSessions } = await import("../controllers/certificationController.js");
  const Session = (await import("../models/Session.js")).default;
  const ReviewDetails = (await import("../models/reviewModel.js")).default;
  const Report = (await import("../models/Report.js")).default;
  const User = (await import("../models/User.js")).default;
  const Category = (await import("../models/Category.js")).default;

  const users = await User.find({}).lean();
  console.log(`Total users in system: ${users.length}`);

  for (const u of users) {
    const userSessions = await Session.find({ candidateId: u._id }).lean();
    if (userSessions.length === 0) continue;

    // Check how many have reviews
    const sids = userSessions.map(s => s.sessionId || s._id.toString());
    const reviews = await ReviewDetails.find({ sessionId: { $in: sids } }).lean();
    const reports = await Report.find({ sessionId: { $in: userSessions.map(s => s._id) } }).lean();

    const completed = userSessions.filter(s => (s.status || "").toLowerCase() === "completed");
    
    // Calculate eligible
    const eligible = await getEligibleCompletedSessions(u._id);
    const domainProg = await getDomainMilestoneProgress(u._id);

    console.log(`\nUser: "${u.name}" (${u.email}) [ID: ${u._id}] Role: ${u.role}`);
    console.log(`  Total Sessions: ${userSessions.length}, Completed: ${completed.length}`);
    console.log(`  ReviewDetails count: ${reviews.length}, Reports count: ${reports.length}`);
    console.log(`  getEligibleCompletedSessions count: ${eligible.length}`);
    console.log(`  Total Qualifying in domainProg: ${domainProg.totalEligibleCount}`);

    for (const s of userSessions) {
      const sRev = reviews.filter(r => r.sessionId === (s.sessionId || s._id.toString()));
      console.log(`    Session ${s.sessionId || s._id}: status=${s.status}, attendanceStatus=${s.attendanceStatus}, candidateJoinedAt=${s.candidateJoinedAt}, category=${s.category}, categoryId=${s.categoryId}`);
      console.log(`      Reviews: ${sRev.map(r => `${r.reviewerRole}(${r.overallRating})`).join(", ") || "none"}`);
    }

    if (domainProg.categoryProgress) {
      domainProg.categoryProgress.filter(c => c.totalEligibleCount > 0 || c.totalIssuedCount > 0).forEach(cp => {
        console.log(`    Domain: ${cp.categoryName} -> totalEligible: ${cp.totalEligibleCount}, progress: ${cp.progressInMilestone}/3, unallocated: ${cp.unallocatedCount}`);
      });
    }

    // Flag if there's any discrepancy where reviews >= 2 but eligible == 1 or progress == 1
    const sessionsWithReview = new Set(reviews.map(r => r.sessionId));
    if (sessionsWithReview.size >= 2 && (eligible.length < sessionsWithReview.size || domainProg.totalEligibleCount < sessionsWithReview.size)) {
      console.log(`  ⚠️ POTENTIAL DISCREPANCY: ${sessionsWithReview.size} sessions have reviews, but only ${eligible.length} eligible / ${domainProg.totalEligibleCount} in domain progress!`);
    }
  }

  await mongoose.disconnect();
}
scanAllCandidates().catch(console.error);
