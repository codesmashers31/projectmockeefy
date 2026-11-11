import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

dotenv.config();

const API_BASE = "http://localhost:5000/api";

async function runTestSuite() {
  console.log("========================================================================");
  console.log("       CANDIDATE-ACTIVITY-BASED DOMAIN SELECTION TEST SUITE             ");
  console.log("========================================================================");

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

  let passed = 0;
  let failed = 0;

  function assert(condition, scenarioName, detail = "") {
    if (condition) {
      console.log(`[PASS] Scenario ${scenarioName}${detail ? " - " + detail : ""}`);
      passed++;
    } else {
      console.error(`[FAIL] Scenario ${scenarioName} FAILED! ${detail}`);
      failed++;
    }
  }

  // 1. Fetch Candidate Joel (active candidate in DB)
  const joel = await User.findById("6ad1fd8b146a0a4e7ca163aa");
  assert(!!joel, "1: Authenticated Candidate Lookup", `User ${joel?.name}`);

  const JWT_SECRET = process.env.JWT_SECRET || "mockeefy_secret_key";
  const joelToken = jwt.sign(
    { email: joel.email, userType: joel.userType, name: joel.name, userId: joel._id },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  // 2. Inspect API preview response for Joel
  const previewRes = await axios.get(`${API_BASE}/certifications/preview`, {
    headers: { Authorization: `Bearer ${joelToken}` }
  });
  assert(previewRes.data.success === true, "2: Preview Endpoint Success", "Preview response successful");

  const previewData = previewRes.data.data;
  assert(Array.isArray(previewData.activeDomains), "3: activeDomains Payload Present", `Active domains count: ${previewData.activeDomains?.length}`);

  // 4. Joel's active domains strictly contains IT, Web Development, Software Development
  const activeDomainNames = previewData.activeDomains.map(d => d.categoryName);
  assert(activeDomainNames.includes("IT"), "4: Active Domain IT Present", `Found: ${activeDomainNames.join(", ")}`);
  assert(activeDomainNames.includes("Web Development"), "5: Active Domain Web Development Present", `Found: ${activeDomainNames.join(", ")}`);
  assert(activeDomainNames.includes("Software Development"), "6: Active Domain Software Development Present", `Found: ${activeDomainNames.join(", ")}`);

  // 7. Zero-activity domains are strictly excluded
  assert(!activeDomainNames.includes("Cybersecurity"), "7: Zero-activity Cybersecurity Excluded", "Cybersecurity not in activeDomains");
  assert(!activeDomainNames.includes("Data Science & ML"), "8: Zero-activity Data Science & ML Excluded", "Data Science & ML not in activeDomains");
  assert(!activeDomainNames.includes("AI"), "9: Zero-activity AI Excluded", "AI not in activeDomains");
  assert(!activeDomainNames.includes("Business"), "10: Zero-activity Business Excluded", "Business not in activeDomains");

  // 11. Independent Milestone Calculation for IT (16 interviews, 4 certs, milestone 5, 3/3 ready)
  const itProg = previewData.activeDomains.find(d => d.categoryName === "IT");
  assert(itProg?.totalQualifyingInterviews === 16, "11: IT Total Qualifying Interviews", `Total=${itProg?.totalQualifyingInterviews}`);
  assert(itProg?.totalIssuedCertificates === 4, "12: IT Total Issued Certificates", `Issued=${itProg?.totalIssuedCertificates}`);
  assert(itProg?.currentMilestoneNumber === 5, "13: IT Current Milestone Number", `Milestone=${itProg?.currentMilestoneNumber}`);
  assert(itProg?.currentMilestoneProgress === 3, "14: IT Milestone Progress (Unallocated >= 3)", `Progress=${itProg?.currentMilestoneProgress}/3 Ready`);
  assert(itProg?.isEligibleForNext === true, "15: IT Milestone Eligibility Ready", `Eligible=${itProg?.isEligibleForNext}`);

  // 16. Independent Milestone Calculation for Web Development (2 interviews, 0 certs, milestone 1, 2/3)
  const webProg = previewData.activeDomains.find(d => d.categoryName === "Web Development");
  assert(webProg?.totalQualifyingInterviews === 2, "16: Web Dev Total Qualifying Interviews", `Total=${webProg?.totalQualifyingInterviews}`);
  assert(webProg?.totalIssuedCertificates === 0, "17: Web Dev Total Issued Certificates", `Issued=${webProg?.totalIssuedCertificates}`);
  assert(webProg?.currentMilestoneProgress === 2, "18: Web Dev Milestone Progress", `Progress=${webProg?.currentMilestoneProgress}/3`);
  assert(webProg?.remainingInterviews === 1, "19: Web Dev Remaining Interviews", `Remaining=${webProg?.remainingInterviews}`);

  // 20. Independent Milestone Calculation for Software Development (1 interview, 0 certs, milestone 1, 1/3)
  const softProg = previewData.activeDomains.find(d => d.categoryName === "Software Development");
  assert(softProg?.totalQualifyingInterviews === 1, "20: Soft Dev Total Qualifying Interviews", `Total=${softProg?.totalQualifyingInterviews}`);
  assert(softProg?.currentMilestoneProgress === 1, "21: Soft Dev Milestone Progress", `Progress=${softProg?.currentMilestoneProgress}/3`);
  assert(softProg?.remainingInterviews === 2, "22: Soft Dev Remaining Interviews", `Remaining=${softProg?.remainingInterviews}`);

  // 23. Verification for candidate with 0 interviews
  let zeroUser = await User.findOne({ email: "zero_activity_test@mockeefy.com" });
  if (!zeroUser) {
    zeroUser = await User.create({
      name: "Zero Activity Candidate",
      email: "zero_activity_test@mockeefy.com",
      userType: "candidate",
      password: "password123"
    });
  }

  const zeroToken = jwt.sign(
    { email: zeroUser.email, userType: zeroUser.userType, name: zeroUser.name, userId: zeroUser._id },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  const zeroRes = await axios.get(`${API_BASE}/certifications/preview`, {
    headers: { Authorization: `Bearer ${zeroToken}` }
  });
  const zeroData = zeroRes.data.data;
  assert(zeroData.activeDomains.length === 0, "23: Zero Activity Candidate Has 0 Active Domains", `Count=${zeroData.activeDomains.length}`);
  assert(zeroData.completedCount === 0, "24: Zero Activity Completed Count is 0", `Count=${zeroData.completedCount}`);

  // Clean up test zeroUser
  await User.deleteOne({ _id: zeroUser._id });

  console.log("========================================================================");
  console.log(`TEST RESULTS: ${passed} PASSED / ${failed} FAILED (Total: ${passed + failed})`);
  console.log("========================================================================");

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTestSuite().catch(err => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
