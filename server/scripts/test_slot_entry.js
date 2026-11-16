import mongoose from "mongoose";
import dotenv from "dotenv";
import ExpertDetails from "../models/expertModel.js";

dotenv.config();

function getDaySlots(weekly, dayName) {
  if (!weekly) return [];
  const entries = weekly instanceof Map ? Array.from(weekly.entries()) : Object.entries(weekly);
  const targetLower = dayName.toLowerCase();
  const targetShort = targetLower.slice(0, 3);

  for (const [key, slots] of entries) {
    const kLower = String(key).toLowerCase();
    const kShort = kLower.slice(0, 3);
    if (kLower === targetLower || kShort === targetShort) {
      if (Array.isArray(slots)) return slots;
    }
  }
  return [];
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const all = await ExpertDetails.find({ status: "Active", "settings.publicProfile": { $ne: false } }).lean();
  const doc10 = all[10];
  console.log("Entries:", Object.entries(doc10.availability?.weekly));
  console.log("getDaySlots wed:", getDaySlots(doc10.availability?.weekly, 'wed'));
  await mongoose.disconnect();
}

run().catch(console.error);
