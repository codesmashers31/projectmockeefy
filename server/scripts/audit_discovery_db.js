import mongoose from "mongoose";
import dotenv from "dotenv";
import ExpertDetails from "../models/expertModel.js";
import Category from "../models/Category.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  
  const cats = await Category.find({ isActive: { $ne: false } }).select("name").lean();
  const experts = await ExpertDetails.find({ status: "Active", "settings.publicProfile": { $ne: false } })
    .select("personalInformation.category skillsAndExpertise.domains availability")
    .lean();

  console.log("Active categories count:", cats.length);
  console.log("Categories:", cats.map(c => c.name));
  console.log("Active experts count:", experts.length);

  const catCounts = {};
  cats.forEach(c => { catCounts[c.name] = 0; });

  experts.forEach(exp => {
    const primary = exp.personalInformation?.category;
    if (primary && catCounts[primary] !== undefined) {
      catCounts[primary]++;
    }
  });

  console.log("Expert counts per category in DB:", catCounts);

  // Check availability
  let availTodayCount = 0;
  experts.forEach(exp => {
    const weekly = exp.availability?.weekly;
    if (weekly && Object.keys(weekly).length > 0) {
      availTodayCount++;
    }
  });
  console.log("Experts with weekly availability:", availTodayCount);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
