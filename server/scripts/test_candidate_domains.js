import mongoose from "mongoose";
import dotenv from "dotenv";
import { getDomainMilestoneProgress } from "../controllers/certificationController.js";
import User from "../models/User.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const joel = await User.findById("6ad1fd8b146a0a4e7ca163aa");
  console.log("Candidate:", joel.name, joel.email);

  const res = await getDomainMilestoneProgress(joel._id);
  console.log("Total Eligible Completed Sessions:", res.totalEligibleCount);
  console.log("Total Issued Certs:", res.totalIssuedCount);
  console.log("Active Category Progress (domains with activity > 0 or certs > 0):");
  res.activeCategoryProgress.forEach(cp => {
    console.log(`- ${cp.categoryName} (${cp.categoryId}): totalQualifying=${cp.totalQualifyingCount}, totalIssued=${cp.totalIssuedCount}, unallocated=${cp.unallocatedCount}, progressInMilestone=${cp.progressInMilestone}/3, milestone=${cp.nextMilestoneNumber}`);
  });

  console.log("\nAll Category Progress count:", res.categoryProgress.length);
  const zeroActivity = res.categoryProgress.filter(cp => cp.totalQualifyingCount === 0 && cp.totalIssuedCount === 0);
  console.log("Zero activity categories count:", zeroActivity.length);
  console.log("Zero activity category names (sample):", zeroActivity.slice(0, 5).map(c => c.categoryName));

  await mongoose.disconnect();
}

run().catch(console.error);
