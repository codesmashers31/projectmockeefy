import mongoose from "mongoose";
import dotenv from "dotenv";
import ExpertDetails from "../models/expertModel.js";

dotenv.config();

function getDaySlots(weekly, dayName) {
  if (!weekly || typeof weekly !== 'object') return [];
  const lower = dayName.toLowerCase();
  const short = lower.slice(0, 3);
  for (const [key, slots] of Object.entries(weekly)) {
    const k = key.toLowerCase();
    if (k === lower || k === short) {
      if (Array.isArray(slots)) return slots;
    }
  }
  return [];
}

function calculateExpertAvailability(weekly) {
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayNamesFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const now = new Date();
  const kolkataShort = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short'
  }).format(now).toLowerCase();

  const currentIdx = days.indexOf(kolkataShort);

  const todaySlots = getDaySlots(weekly, kolkataShort);
  const isAvailableToday = todaySlots.length > 0;

  let isAvailableThisWeek = false;
  for (const d of days) {
    if (getDaySlots(weekly, d).length > 0) {
      isAvailableThisWeek = true;
      break;
    }
  }

  let activeTime = "Next: Upon Request";
  if (isAvailableToday) {
    activeTime = "Available Today";
  } else if (isAvailableThisWeek) {
    for (let offset = 1; offset < 7; offset++) {
      const nextIdx = (currentIdx + offset) % 7;
      const nextShort = days[nextIdx];
      if (getDaySlots(weekly, nextShort).length > 0) {
        if (offset === 1) {
          activeTime = "Available Tomorrow";
        } else {
          activeTime = `Next: ${dayNamesFull[nextIdx].slice(0, 3)}`;
        }
        break;
      }
    }
  }

  return { isAvailableToday, isAvailableThisWeek, activeTime };
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const experts = await ExpertDetails.find({ status: "Active", "settings.publicProfile": { $ne: false } }).select("availability personalInformation").lean();

  let today = 0, week = 0;
  const counts = {};
  experts.forEach((e, idx) => {
    const weeklyObj = e.availability?.weekly instanceof Map ? Object.fromEntries(e.availability.weekly) : (e.availability?.weekly || {});
    const res = calculateExpertAvailability(weeklyObj);
    if (res.isAvailableToday) today++;
    if (res.isAvailableThisWeek) week++;
    counts[res.activeTime] = (counts[res.activeTime] || 0) + 1;
    if (idx < 15) {
      console.log(`Expert ${idx} res:`, res);
    }
  });

  console.log("Corrected Availability:");
  console.log("Available Today count:", today);
  console.log("Available This Week count:", week);
  console.log("Active Time breakdown:", counts);

  await mongoose.disconnect();
}

run().catch(console.error);
