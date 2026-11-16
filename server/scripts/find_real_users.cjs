const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function findRealUsers() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const User = (await import("../models/User.js")).default;
  const Session = (await import("../models/Session.js")).default;
  const ReviewDetails = (await import("../models/reviewModel.js")).default;
  
  // Real users: email does not end with @mockeefy.test
  const realUsers = await User.find({ email: { $not: /@mockeefy\.test$/i } }).lean();
  console.log(`Found ${realUsers.length} non-test users:`);
  
  for (const u of realUsers) {
    const sessions = await Session.find({ candidateId: u._id }).lean();
    if (sessions.length > 0) {
      console.log(`\nCandidate: ${u.name} (${u.email}) [ID: ${u._id}] Role: ${u.role}`);
      for (const s of sessions) {
        const revs = await ReviewDetails.find({ sessionId: s.sessionId || s._id.toString() }).lean();
        console.log(`  Session ${s.sessionId || s._id}: status=${s.status}, attendanceStatus=${s.attendanceStatus}, category=${s.category}, categoryId=${s.categoryId}`);
        console.log(`    Reviews: ${revs.map(r => `${r.reviewerRole}(${r.overallRating})`).join(", ")}`);
      }
    }
  }
  
  await mongoose.disconnect();
}
findRealUsers().catch(console.error);
