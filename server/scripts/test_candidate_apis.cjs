const mongoose = require("mongoose");
const path = require("path");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function testCandidateApis() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const cid = "6af68ada44e1e1d2dde674b3";
  const user = await mongoose.connection.collection("users").findOne({ _id: new mongoose.Types.ObjectId(cid) });
  console.log("Candidate User:", user?.name, user?.email);

  const token = jwt.sign(
    { userId: user._id, id: user._id, email: user.email, role: user.role || "candidate", userType: user.role || "candidate" },
    process.env.JWT_SECRET || "code@1234",
    { expiresIn: "1h" }
  );

  const baseUrl = "http://localhost:5000";

  // 1. /api/certifications/preview
  const prevRes = await fetch(`${baseUrl}/api/certifications/preview`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const prevData = await prevRes.json();
  console.log("\n--- GET /api/certifications/preview ---");
  console.log("Status:", prevRes.status);
  console.log("Success:", prevData.success);
  console.log("completedCount:", prevData.data?.completedCount);
  console.log("unallocatedCount:", prevData.data?.unallocatedCount);
  console.log("isEligible:", prevData.data?.isEligible);
  console.log("eligibleSessionIds:", prevData.data?.eligibleSessionIds);
  console.log("ineligibleAudits:", prevData.data?.ineligibleAudits);
  console.log("activeDomains count:", prevData.data?.activeDomains?.length);
  if (prevData.data?.categoryProgress) {
    console.log("categoryProgress with count > 0:");
    prevData.data.categoryProgress.filter(c => c.totalEligibleCount > 0).forEach(c => {
      console.log(`  ${c.categoryName}: totalEligible=${c.totalEligibleCount}, progress=${c.progressInMilestone}, unallocated=${c.unallocatedCount}`);
    });
  }

  // 2. /api/sessions/candidate/:userId
  const sessRes = await fetch(`${baseUrl}/api/sessions/candidate/${cid}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const sessData = await sessRes.json();
  console.log("\n--- GET /api/sessions/candidate/:userId ---");
  console.log("Status:", sessRes.status);
  console.log("Total sessions returned:", sessData.length);
  sessData.forEach(s => {
    console.log(`Session ${s.sessionId || s._id}: status=${s.status}, attendanceStatus=${s.attendanceStatus}, candidateJoinedAt=${s.candidateJoinedAt}, category=${s.category}, categoryId=${s.categoryId}`);
    console.log(`   expertReview=${Boolean(s.expertReview)}, candidateReview=${Boolean(s.candidateReview)}`);
  });

  await mongoose.disconnect();
}
testCandidateApis().catch(console.error);
