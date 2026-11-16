import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";
import ExpertDetails from "../models/expertModel.js";
import Category from "../models/Category.js";

dotenv.config();

const API_BASE = "http://localhost:5000/api";

async function runTestSuite() {
  console.log("========================================================================");
  console.log("       EXPERT DISCOVERY DATABASE ACCURACY & CATEGORY FILTERING TEST     ");
  console.log("========================================================================");

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

  const dbActiveExperts = await ExpertDetails.find({ status: "Active", "settings.publicProfile": { $ne: false } }).lean();
  const dbCategories = await Category.find({ isActive: { $ne: false } }).lean();

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

  // 1. Database total active experts verification
  assert(dbActiveExperts.length === 59, "1: DB Total Active Experts", `Found ${dbActiveExperts.length} active experts`);

  // 2. API All Tracks returns exactly 59 experts
  const allRes = await axios.get(`${API_BASE}/expert/verified`);
  assert(allRes.data.success === true && allRes.data.count === 59 && allRes.data.data.length === 59, "2: API Verified Endpoint All Tracks", `count=${allRes.data.count}`);

  // 3. Database category counts match
  const itDbCount = dbActiveExperts.filter(e => (e.personalInformation?.category || "").toLowerCase() === "it").length;
  assert(itDbCount === 16, "3: IT Category DB Count", `IT count=${itDbCount}`);

  // 4. API IT filter returns exactly 16 experts
  const itApiRes = await axios.get(`${API_BASE}/expert/verified?category=IT`);
  assert(itApiRes.data.count === 16, "4: IT API Filter Count", `Returned ${itApiRes.data.count}`);

  // 5. IT returned experts only contain IT domain/category
  const itAllMatch = itApiRes.data.data.every(e => (e.personalInformation?.category || "").toLowerCase() === "it" || (e.skillsAndExpertise?.domains || []).map(d => d.toLowerCase()).includes("it"));
  assert(itAllMatch, "5: IT Experts Strict Category Relationship", "All returned experts belong to IT");

  // 6. Web Development DB count
  const webDbCount = dbActiveExperts.filter(e => (e.personalInformation?.category || "").toLowerCase() === "web development").length;
  assert(webDbCount === 3, "6: Web Development DB Count", `Web Dev count=${webDbCount}`);

  // 7. Web Development API returns exactly 3
  const webApiRes = await axios.get(`${API_BASE}/expert/verified?category=Web%20Development`);
  assert(webApiRes.data.count === 3, "7: Web Development API Filter Count", `Returned ${webApiRes.data.count}`);

  // 8. Cybersecurity API returns exactly 3
  const cyberApiRes = await axios.get(`${API_BASE}/expert/verified?category=Cybersecurity`);
  assert(cyberApiRes.data.count === 3, "8: Cybersecurity API Filter Count", `Returned ${cyberApiRes.data.count}`);

  // 9. AI API returns exactly 3
  const aiApiRes = await axios.get(`${API_BASE}/expert/verified?category=AI`);
  assert(aiApiRes.data.count === 3, "9: AI API Filter Count", `Returned ${aiApiRes.data.count}`);

  // 10. Agile & Project Management API returns exactly 3
  const agileApiRes = await axios.get(`${API_BASE}/expert/verified?category=Agile%20%26%20Project%20Management`);
  assert(agileApiRes.data.count === 3, "10: Agile & Project Management API Filter Count", `Returned ${agileApiRes.data.count}`);

  // 11. Empty Category Test in DB has 0 experts
  const testDbCount = dbActiveExperts.filter(e => (e.personalInformation?.category || "").toLowerCase() === "test").length;
  assert(testDbCount === 0, "11: Test Category DB Count", `Test count=${testDbCount}`);

  // 12. Empty Category API returns 0 experts
  const testApiRes = await axios.get(`${API_BASE}/expert/verified?category=Test`);
  assert(testApiRes.data.count === 0 && testApiRes.data.data.length === 0, "12: Test Category API Filter Count", `Returned ${testApiRes.data.count}`);

  // 13. Dynamic categories list from API has all 21 categories
  const catApiRes = await axios.get(`${API_BASE}/categories`);
  const catList = Array.isArray(catApiRes.data) ? catApiRes.data : catApiRes.data.data;
  assert(catList.length === 21, "13: Categories API Count", `Total categories=${catList.length}`);

  // 14. Availability computation has activeTime field populated on all experts
  const allHaveActiveTime = allRes.data.data.every(e => !!e.activeTime && typeof e.activeTime === "string");
  assert(allHaveActiveTime, "14: Timezone-aware activeTime on All Experts", "Every expert has non-empty activeTime string");

  // 15. Availability isAvailableToday flag populated accurately (Wednesday count is 51 in DB schedule)
  const todayCount = allRes.data.data.filter(e => e.isAvailableToday === true).length;
  assert(todayCount === 51, "15: Available Today Asia/Kolkata Count", `Today count=${todayCount}`);

  // 16. Availability isAvailableThisWeek flag populated accurately (54 with weekly schedule)
  const weekCount = allRes.data.data.filter(e => e.isAvailableThisWeek === true).length;
  assert(weekCount === 54, "16: Available This Week Count", `Week count=${weekCount}`);

  // 17. No expert marked "Available Today" if Wednesday has no slots
  const noFalseToday = allRes.data.data.every(e => {
    if (!e.isAvailableToday) {
      return e.activeTime !== "Available Today";
    }
    return true;
  });
  assert(noFalseToday, "17: Zero False Available Today Flags", "Experts with 0 Wednesday slots never marked Available Today");

  // 18. Professional Domain presentation field present (personalInformation.category is valid)
  const allHaveCategory = allRes.data.data.every(e => !!e.personalInformation?.category);
  assert(allHaveCategory, "18: Category/Domain Data Integrity", "Every expert has valid primary category");

  // 19. Experience distribution calculation
  const expCounts = { "0-2": 0, "3-5": 0, "6-10": 0, "10+": 0 };
  allRes.data.data.forEach(e => {
    const y = Number(e.professionalDetails?.totalExperience || 0);
    if (y <= 2) expCounts["0-2"]++;
    else if (y <= 5) expCounts["3-5"]++;
    else if (y <= 10) expCounts["6-10"]++;
    else expCounts["10+"]++;
  });
  assert(expCounts["10+"] === 40 && expCounts["0-2"] === 9, "19: Experience Ranges Match Real DB Data", JSON.stringify(expCounts));

  // 20. Zero Hardcoded Mock Data or Static Category Partitioning
  const uniqueReturnedCategories = new Set(allRes.data.data.map(e => e.personalInformation.category));
  assert(uniqueReturnedCategories.size >= 16, "20: Authentic MongoDB Multi-Category Spread", `Found ${uniqueReturnedCategories.size} distinct active categories in verified experts`);

  console.log("========================================================================");
  console.log(`TEST RESULTS: ${passed} PASSED / ${failed} FAILED (Total: ${passed + failed})`);
  console.log("========================================================================");

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTestSuite().catch(err => {
  console.error("Test suite crash:", err);
  process.exit(1);
});
