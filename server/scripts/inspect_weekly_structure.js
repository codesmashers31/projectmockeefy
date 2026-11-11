import mongoose from "mongoose";
import dotenv from "dotenv";
import ExpertDetails from "../models/expertModel.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const experts = await ExpertDetails.find({ status: "Active", "settings.publicProfile": { $ne: false } }).select("availability").lean();

  const dayKeysFound = new Set();
  experts.forEach(e => {
    if (e.availability?.weekly) {
      Object.keys(e.availability.weekly).forEach(k => {
        if (e.availability.weekly[k]?.length > 0) dayKeysFound.add(k);
      });
    }
  });

  console.log("Day keys found with slots > 0:", Array.from(dayKeysFound));

  experts.slice(0, 15).forEach((e, idx) => {
    console.log(`Expert ${idx}:`, JSON.stringify(e.availability?.weekly));
  });

  await mongoose.disconnect();
}

run().catch(console.error);
