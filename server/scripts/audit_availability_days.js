import mongoose from "mongoose";
import dotenv from "dotenv";
import ExpertDetails from "../models/expertModel.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  
  const experts = await ExpertDetails.find({ status: "Active", "settings.publicProfile": { $ne: false } })
    .select("personalInformation availability professionalDetails price")
    .lean();

  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayCounts = {};
  days.forEach(d => dayCounts[d] = 0);

  experts.forEach(e => {
    const weekly = e.availability?.weekly || {};
    days.forEach(d => {
      const slots = weekly[d];
      if (Array.isArray(slots) && slots.length > 0) {
        dayCounts[d]++;
      }
    });
  });

  console.log("Day of week availability counts across all 59 experts:", dayCounts);

  // Experience distribution
  const expCounts = { "0-2": 0, "3-5": 0, "6-10": 0, "10+": 0 };
  experts.forEach(e => {
    const y = Number(e.professionalDetails?.totalExperience || 0);
    if (y <= 2) expCounts["0-2"]++;
    else if (y <= 5) expCounts["3-5"]++;
    else if (y <= 10) expCounts["6-10"]++;
    else expCounts["10+"]++;
  });
  console.log("Experience counts:", expCounts);

  await mongoose.disconnect();
}

run().catch(console.error);
