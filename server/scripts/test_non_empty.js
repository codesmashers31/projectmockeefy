import mongoose from "mongoose";
import dotenv from "dotenv";
import ExpertDetails from "../models/expertModel.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const experts = await ExpertDetails.find({ status: "Active", "settings.publicProfile": { $ne: false } }).select("availability personalInformation").lean();

  experts.forEach((e, i) => {
    const weekly = e.availability?.weekly;
    if (weekly && typeof weekly === 'object') {
      const keys = Object.keys(weekly);
      const nonEmpty = keys.filter(k => Array.isArray(weekly[k]) && weekly[k].length > 0);
      if (nonEmpty.length > 0) {
        console.log(`Expert ${i} (${e.personalInformation?.userName}): non-empty days:`, nonEmpty);
      }
    }
  });

  await mongoose.disconnect();
}

run().catch(console.error);
