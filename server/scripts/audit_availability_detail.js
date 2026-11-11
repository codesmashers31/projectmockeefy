import mongoose from "mongoose";
import dotenv from "dotenv";
import ExpertDetails from "../models/expertModel.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  
  const experts = await ExpertDetails.find({ status: "Active", "settings.publicProfile": { $ne: false } })
    .select("personalInformation availability professionalDetails")
    .lean();

  console.log("Sample 5 experts weekly availability:");
  for (let i = 0; i < Math.min(5, experts.length); i++) {
    const e = experts[i];
    console.log(`- ${e.personalInformation?.userName} (${e.personalInformation?.category}):`, JSON.stringify(e.availability?.weekly));
  }

  // Check today's day of week in Asia/Kolkata
  const now = new Date();
  const kolkataDay = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' }).format(now).toLowerCase();
  console.log("Current day in Asia/Kolkata:", kolkataDay);

  let availToday = 0;
  let availThisWeek = 0;

  experts.forEach(e => {
    const weekly = e.availability?.weekly || {};
    // weekly can have keys like 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'
    const todaySlots = weekly[kolkataDay] || weekly[kolkataDay.slice(0, 3)] || [];
    if (Array.isArray(todaySlots) && todaySlots.length > 0) {
      availToday++;
    }
    const hasAny = Object.values(weekly).some(slots => Array.isArray(slots) && slots.length > 0);
    if (hasAny) {
      availThisWeek++;
    }
  });

  console.log(`Experts available today (${kolkataDay}):`, availToday);
  console.log(`Experts available this week:`, availThisWeek);

  await mongoose.disconnect();
}

run().catch(console.error);
