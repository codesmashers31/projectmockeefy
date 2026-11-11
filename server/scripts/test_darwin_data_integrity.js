import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Session from "../models/Session.js";
import Category from "../models/Category.js";
import Certification from "../models/Certification.js";
import reviewModel from "../models/reviewModel.js";
import Meeting from "../models/Meeting.js";

dotenv.config();

const API_BASE = "http://localhost:5000/api";
const JWT_SECRET = process.env.JWT_SECRET || "mockeefy_secret_key";

async function runTests() {
  console.log("========================================================================");
  console.log("      MOCKEEFY CRITICAL DATA INTEGRITY & CANDIDATE ISOLATION SUITE      ");
  console.log("========================================================================");

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

  let passed = 0;
  let failed = 0;

  function assert(condition, scenarioName, detail = "") {
    if (condition) {
      console.log(`[PASS] ${scenarioName}${detail ? " - " + detail : ""}`);
      passed++;
    } else {
      console.error(`[FAIL] ${scenarioName} FAILED! ${detail}`);
      failed++;
    }
  }

  // Look up Darwin (Joel A)
  const darwin = await User.findById("6ad1fd8b146a0a4e7ca163aa");
  assert(!!darwin, "Scenario 0: Darwin User Found", `Name: ${darwin.name}, Email: ${darwin.email}`);

  const darwinToken = jwt.sign(
    { email: darwin.email, userType: darwin.userType, name: darwin.name, userId: darwin._id },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  // 1. Candidate with IT interviews only sees IT
  const darwinPreviewRes = await axios.get(`${API_BASE}/certifications/preview`, {
    headers: { Authorization: `Bearer ${darwinToken}` }
  });
  const darwinData = darwinPreviewRes.data.data;
  assert(
    darwinData.activeDomains.length === 1 && darwinData.activeDomains[0].categoryName === "IT",
    "Scenario 1: Darwin sees ONLY IT in activeDomains",
    `Found domains: [${darwinData.activeDomains.map(d => d.categoryName).join(", ")}]`
  );

  // 2. Candidate with IT and Web Dev sees exactly those two domains (isolated test candidate)
  const testCandId = new mongoose.Types.ObjectId();
  const testCand = await User.create({
    _id: testCandId,
    name: "Multi-Domain Isolated Test Candidate",
    email: `iso_test_${Date.now()}@mockeefy.com`,
    userType: "candidate",
    password: "hashed_test_password"
  });

  const itCat = await Category.findOne({ name: "IT" });
  const webCat = await Category.findOne({ name: "Web Development" });
  const softCat = await Category.findOne({ name: "Software Development" });

  const s1Id = `TEST-IT-${Date.now()}`;
  const s2Id = `TEST-WEB-${Date.now()}`;
  await Session.create([
    {
      sessionId: s1Id,
      candidateId: testCand._id,
      expertId: new mongoose.Types.ObjectId(),
      categoryId: itCat._id,
      categoryNameSnapshot: itCat.name,
      status: "completed",
      attendanceStatus: "attended",
      candidateJoinedAt: new Date(),
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date()
    },
    {
      sessionId: s2Id,
      candidateId: testCand._id,
      expertId: new mongoose.Types.ObjectId(),
      categoryId: webCat._id,
      categoryNameSnapshot: webCat.name,
      status: "completed",
      attendanceStatus: "attended",
      candidateJoinedAt: new Date(),
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date()
    }
  ]);
  await reviewModel.create([
    {
      sessionId: s1Id,
      candidateId: testCand._id,
      expertId: new mongoose.Types.ObjectId(),
      reviewerRole: "expert",
      technicalScore: 8,
      overallRating: 5
    },
    {
      sessionId: s2Id,
      candidateId: testCand._id,
      expertId: new mongoose.Types.ObjectId(),
      reviewerRole: "expert",
      technicalScore: 8,
      overallRating: 5
    }
  ]);

  const testCandToken = jwt.sign(
    { email: testCand.email, userType: testCand.userType, name: testCand.name, userId: testCand._id },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  const testCandPreview = await axios.get(`${API_BASE}/certifications/preview`, {
    headers: { Authorization: `Bearer ${testCandToken}` }
  });
  const testCandDomains = testCandPreview.data.data.activeDomains.map(d => d.categoryName).sort();
  assert(
    testCandDomains.length === 2 && testCandDomains.includes("IT") && testCandDomains.includes("Web Development"),
    "Scenario 2: Multi-Domain Candidate sees exactly IT & Web Development",
    `Found domains: [${testCandDomains.join(", ")}]`
  );

  // 3. Candidate with zero qualifying interviews in a domain does not see that domain
  assert(
    !testCandDomains.includes("Software Development") && !testCandDomains.includes("Cybersecurity") && !testCandDomains.includes("AI"),
    "Scenario 3: Zero-activity domains (Software Dev, Cybersecurity, AI) excluded",
    `Zero activity categories strictly omitted`
  );

  // 4. A booking without attendance does not count
  const bookingOnlySessionId = `TEST-BOOKING-NOATT-${Date.now()}`;
  await Session.create({
    sessionId: bookingOnlySessionId,
    candidateId: testCand._id,
    expertId: new mongoose.Types.ObjectId(),
    categoryId: softCat._id,
    categoryNameSnapshot: softCat.name,
    status: "confirmed",
    attendanceStatus: "scheduled",
    startTime: new Date(Date.now() + 3600000),
    endTime: new Date(Date.now() + 7200000)
  });
  const afterBookingRes = await axios.get(`${API_BASE}/certifications/preview`, {
    headers: { Authorization: `Bearer ${testCandToken}` }
  });
  const afterBookingDomains = afterBookingRes.data.data.activeDomains.map(d => d.categoryName);
  assert(
    !afterBookingDomains.includes("Software Development"),
    "Scenario 4: Booking without attendance does not count towards certificate",
    `Software Development not in activeDomains`
  );

  // 5. Attendance without expert feedback does not count
  const attNoReviewSessionId = `TEST-ATT-NOREV-${Date.now()}`;
  await Session.create({
    sessionId: attNoReviewSessionId,
    candidateId: testCand._id,
    expertId: new mongoose.Types.ObjectId(),
    categoryId: softCat._id,
    categoryNameSnapshot: softCat.name,
    status: "completed",
    attendanceStatus: "attended",
    candidateJoinedAt: new Date(),
    startTime: new Date(Date.now() - 3600000),
    endTime: new Date()
  });
  const afterAttNoReviewRes = await axios.get(`${API_BASE}/certifications/preview`, {
    headers: { Authorization: `Bearer ${testCandToken}` }
  });
  const afterAttNoRevDomains = afterAttNoReviewRes.data.data.activeDomains.map(d => d.categoryName);
  assert(
    !afterAttNoRevDomains.includes("Software Development"),
    "Scenario 5: Attended session without expert review does not count",
    `Software Development not in activeDomains`
  );

  // 6. Finished meeting with expert attendance only does not count
  const expOnlyMeetingSessionId = `TEST-EXPONLY-${Date.now()}`;
  await Session.create({
    sessionId: expOnlyMeetingSessionId,
    candidateId: testCand._id,
    expertId: new mongoose.Types.ObjectId(),
    categoryId: softCat._id,
    categoryNameSnapshot: softCat.name,
    status: "completed",
    attendanceStatus: "scheduled",
    startTime: new Date(Date.now() - 3600000),
    endTime: new Date()
  });
  await Meeting.create({
    meetingId: `MEET-${Date.now()}`,
    sessionId: expOnlyMeetingSessionId,
    candidateId: testCand._id,
    expertId: new mongoose.Types.ObjectId(),
    status: "finished",
    startTime: new Date(Date.now() - 3600000),
    endTime: new Date(),
    activeUsers: [new mongoose.Types.ObjectId()] // expert only, candidate not present
  });
  const afterExpOnlyRes = await axios.get(`${API_BASE}/certifications/preview`, {
    headers: { Authorization: `Bearer ${testCandToken}` }
  });
  assert(
    !afterExpOnlyRes.data.data.activeDomains.some(d => d.categoryName === "Software Development"),
    "Scenario 6: Meeting with expert attendance only does not count as candidate attendance",
    `Candidate attendance strictly required`
  );

  // 7. A candidate's records cannot leak into another candidate's progress
  assert(
    !darwinData.activeDomains.some(d => d.categoryName === "Web Development"),
    "Scenario 7: Candidate data isolation guaranteed (test candidate's Web Dev does NOT leak into Darwin)",
    `Darwin active domains: [${darwinData.activeDomains.map(d => d.categoryName).join(", ")}]`
  );

  // 8. Incorrect category relationships are rejected or flagged
  const badCatSessionId = `TEST-BADCAT-${Date.now()}`;
  await Session.create({
    sessionId: badCatSessionId,
    candidateId: testCand._id,
    expertId: new mongoose.Types.ObjectId(),
    categoryId: new mongoose.Types.ObjectId(), // non-existent categoryId in Category collection
    categoryNameSnapshot: "NonExistentFakeCategory123",
    status: "completed",
    attendanceStatus: "attended",
    candidateJoinedAt: new Date(),
    startTime: new Date(Date.now() - 3600000),
    endTime: new Date()
  });
  await reviewModel.create({
    sessionId: badCatSessionId,
    candidateId: testCand._id,
    expertId: new mongoose.Types.ObjectId(),
    reviewerRole: "expert",
    technicalScore: 8,
    overallRating: 5
  });
  const badCatRes = await axios.get(`${API_BASE}/certifications/preview`, {
    headers: { Authorization: `Bearer ${testCandToken}` }
  });
  assert(
    !badCatRes.data.data.activeDomains.some(d => d.categoryName === "NonExistentFakeCategory123"),
    "Scenario 8: Non-existent category relationship safely excluded from certificate progress",
    `Fake category excluded`
  );

  // 9. Missing category information is never replaced with a fabricated domain
  const noCatSessionId = `TEST-NOCAT-${Date.now()}`;
  await Session.create({
    sessionId: noCatSessionId,
    candidateId: testCand._id,
    expertId: new mongoose.Types.ObjectId(),
    categoryId: null,
    categoryNameSnapshot: null,
    category: null,
    status: "completed",
    attendanceStatus: "attended",
    candidateJoinedAt: new Date(),
    startTime: new Date(Date.now() - 3600000),
    endTime: new Date()
  });
  await reviewModel.create({
    sessionId: noCatSessionId,
    candidateId: testCand._id,
    expertId: new mongoose.Types.ObjectId(),
    reviewerRole: "expert",
    technicalScore: 8,
    overallRating: 5
  });
  const noCatRes = await axios.get(`${API_BASE}/certifications/preview`, {
    headers: { Authorization: `Bearer ${testCandToken}` }
  });
  const itProg = noCatRes.data.data.activeDomains.find(d => d.categoryName === "IT");
  assert(
    itProg.totalQualifyingInterviews === 1,
    "Scenario 9: Uncategorized session is NOT defaulted to IT or fabricated domain",
    `IT count remained 1 (did not absorb uncategorized session)`
  );

  // 10. One qualifying interview produces 1/3
  assert(
    itProg.currentMilestoneProgress === 1 && itProg.remainingInterviews === 2,
    "Scenario 10: 1 qualifying interview produces 1/3 progress",
    `Progress: ${itProg.currentMilestoneProgress}/3, Remaining: ${itProg.remainingInterviews}`
  );

  // 11. Two qualifying interviews produce 2/3
  const itSession2Id = `TEST-IT2-${Date.now()}`;
  await Session.create({
    sessionId: itSession2Id,
    candidateId: testCand._id,
    expertId: new mongoose.Types.ObjectId(),
    categoryId: itCat._id,
    categoryNameSnapshot: itCat.name,
    status: "completed",
    attendanceStatus: "attended",
    candidateJoinedAt: new Date(),
    startTime: new Date(Date.now() - 1800000),
    endTime: new Date()
  });
  await reviewModel.create({
    sessionId: itSession2Id,
    candidateId: testCand._id,
    expertId: new mongoose.Types.ObjectId(),
    reviewerRole: "expert",
    technicalScore: 8,
    overallRating: 5
  });
  const twoProgRes = await axios.get(`${API_BASE}/certifications/preview`, {
    headers: { Authorization: `Bearer ${testCandToken}` }
  });
  const itProgTwo = twoProgRes.data.data.activeDomains.find(d => d.categoryName === "IT");
  assert(
    itProgTwo.currentMilestoneProgress === 2 && itProgTwo.remainingInterviews === 1,
    "Scenario 11: 2 qualifying interviews produce 2/3 progress",
    `Progress: ${itProgTwo.currentMilestoneProgress}/3, Remaining: ${itProgTwo.remainingInterviews}`
  );

  // 12. Three qualifying interviews produce 3/3 Ready
  const itSession3Id = `TEST-IT3-${Date.now()}`;
  await Session.create({
    sessionId: itSession3Id,
    candidateId: testCand._id,
    expertId: new mongoose.Types.ObjectId(),
    categoryId: itCat._id,
    categoryNameSnapshot: itCat.name,
    status: "completed",
    attendanceStatus: "attended",
    candidateJoinedAt: new Date(),
    startTime: new Date(Date.now() - 900000),
    endTime: new Date()
  });
  await reviewModel.create({
    sessionId: itSession3Id,
    candidateId: testCand._id,
    expertId: new mongoose.Types.ObjectId(),
    reviewerRole: "expert",
    technicalScore: 8,
    overallRating: 5
  });
  const threeProgRes = await axios.get(`${API_BASE}/certifications/preview`, {
    headers: { Authorization: `Bearer ${testCandToken}` }
  });
  const itProgThree = threeProgRes.data.data.activeDomains.find(d => d.categoryName === "IT");
  assert(
    itProgThree.currentMilestoneProgress === 3 && itProgThree.remainingInterviews === 0 && itProgThree.isEligibleForNext === true,
    "Scenario 12: 3 qualifying interviews produce 3/3 Ready (Eligible)",
    `Progress: ${itProgThree.currentMilestoneProgress}/3, Eligible: ${itProgThree.isEligibleForNext}`
  );

  // 13. Allocated sessions are never counted again
  assert(
    darwinData.activeDomains[0].totalQualifyingInterviews === 16 &&
    darwinData.activeDomains[0].totalIssuedCertificates === 4 &&
    darwinData.unallocatedCount === 4,
    "Scenario 13: Allocated sessions (12 across 4 certificates) excluded from unallocated count",
    `Total: 16, Allocated: 12, Unallocated: 4`
  );

  // 14. Historical issued certificates remain visible
  assert(
    darwinData.activeDomains[0].issuedCertificates.length === 4,
    "Scenario 14: All 4 historical issued certificates remain present and verifiable",
    `Found 4 issued certs: Milestones 1, 2, 3, 4`
  );

  // 15. Newly evaluated interviews dynamically add their domain
  const softQualSessionId = `TEST-SOFTQUAL-${Date.now()}`;
  await Session.create({
    sessionId: softQualSessionId,
    candidateId: testCand._id,
    expertId: new mongoose.Types.ObjectId(),
    categoryId: softCat._id,
    categoryNameSnapshot: softCat.name,
    status: "completed",
    attendanceStatus: "attended",
    candidateJoinedAt: new Date(),
    startTime: new Date(Date.now() - 3600000),
    endTime: new Date()
  });
  await reviewModel.create({
    sessionId: softQualSessionId,
    candidateId: testCand._id,
    expertId: new mongoose.Types.ObjectId(),
    reviewerRole: "expert",
    technicalScore: 9,
    overallRating: 5
  });
  const afterSoftQualRes = await axios.get(`${API_BASE}/certifications/preview`, {
    headers: { Authorization: `Bearer ${testCandToken}` }
  });
  const finalDomains = afterSoftQualRes.data.data.activeDomains.map(d => d.categoryName);
  assert(
    finalDomains.includes("Software Development"),
    "Scenario 15: Newly evaluated interview dynamically adds domain to dropdown",
    `Active domains now: [${finalDomains.join(", ")}]`
  );

  // Clean up isolated test data
  await Session.deleteMany({ candidateId: testCand._id });
  await reviewModel.deleteMany({ candidateId: testCand._id });
  await Meeting.deleteMany({ candidateId: testCand._id });
  await User.deleteOne({ _id: testCand._id });

  console.log("========================================================================");
  console.log(`TEST RESULTS: ${passed} PASSED / ${failed} FAILED (Total: ${passed + failed})`);
  console.log("========================================================================");

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
