import mongoose from "mongoose";
import dotenv from "dotenv";
import ExpertDetails from "../models/expertModel.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const experts = await ExpertDetails.find({ status: "Active", "settings.publicProfile": { $ne: false } }).select("availability personalInformation").lean();

  const e10 = experts[10];
  console.log("Expert 10 availability object:", typeof e10.availability?.weekly, e10.availability?.weekly);
  console.log("Keys:", Object.keys(e10.availability?.weekly || {}));
  console.log("Slots for Wednesday:", e10.availability?.weekly?.Wednesday);

  await mongoose.disconnect();
}

run().catch(console.error);
