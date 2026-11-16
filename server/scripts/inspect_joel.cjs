const mongoose = require("mongoose");
const path = require("path");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function inspectJoel() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const cid = "6af326acf549d9aa26049ba4";
  const user = await mongoose.connection.collection("users").findOne({ _id: new mongoose.Types.ObjectId(cid) });
  console.log("Candidate User:", user?.name, user?.email);

  const { getDomainMilestoneProgress, getEligibleCompletedSessions } = await import("../controllers/certificationController.js");
  
  const eligible = await getEligibleCompletedSessions(cid);
  console.log("\nEligible completed sessions count:", eligible.length);
  eligible.forEach(e => {
    console.log(` - ID: ${e.sessionId || e._id}, category: ${e.category}, categoryId: ${e.categoryId}, categoryNameSnapshot: ${e.categoryNameSnapshot}`);
  });
  console.log("Ineligible audits:", eligible.ineligibleAudits);

  const domainProg = await getDomainMilestoneProgress(cid);
  console.log("\nDomain Milestone Progress: totalEligible =", domainProg.totalEligibleCount);
  domainProg.categoryProgress.filter(c => c.totalEligibleCount > 0 || c.totalIssuedCount > 0).forEach(cp => {
    console.log(` Category: "${cp.categoryName}" (${cp.categoryId}): totalEligible=${cp.totalEligibleCount}, progress=${cp.progressInMilestone}/3, unallocated=${cp.unallocatedCount}`);
    console.log(`   unallocatedSessions:`, cp.unallocatedSessions?.map(s => s.sessionId || s._id));
  });

  const token = jwt.sign(
    { userId: user._id, id: user._id, email: user.email, role: "candidate", userType: "candidate" },
    process.env.JWT_SECRET || "code@1234",
    { expiresIn: "2h" }
  );

  const baseUrl = "http://localhost:5000";
  const prevRes = await fetch(`${baseUrl}/api/certifications/preview`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const prevData = await prevRes.json();
  console.log("\n--- Preview API Response ---");
  console.log("completedCount:", prevData.data?.completedCount);
  console.log("activeDomains:", prevData.data?.activeDomains);
  if (prevData.data?.categoryProgress) {
    console.log("Categories with progress > 0 in previewData:");
    prevData.data.categoryProgress.filter(c => c.totalEligibleCount > 0).forEach(c => {
      console.log(`  ${c.categoryName}: totalEligible=${c.totalEligibleCount}, progress=${c.progressInMilestone}`);
    });
  }

  // Also check sessions returned by /api/sessions/candidate/:id
  const sessRes = await fetch(`${baseUrl}/api/sessions/candidate/${cid}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const sessData = await sessRes.json();
  console.log("\n--- /api/sessions/candidate/:id Response ---");
  console.log("Sessions count:", sessData.length);
  sessData.forEach(s => {
    console.log(`Session ${s.sessionId || s._id}: status=${s.status}, attendanceStatus=${s.attendanceStatus}, category=${s.category}, categoryId=${s.categoryId}, expertReview=${Boolean(s.expertReview)}, candidateReview=${Boolean(s.candidateReview)}`);
  });

  await mongoose.disconnect();
}
inspectJoel().catch(console.error);
