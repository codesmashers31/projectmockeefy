import mongoose from "mongoose";
import dotenv from "dotenv";
import ExpertDetails from "../models/expertModel.js";
import Category from "../models/Category.js";

dotenv.config();

function getExpertAvailabilityInfo(weekly) {
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayFullNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Current date in Asia/Kolkata
  const now = new Date();
  const kolkataFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });
  
  const kolkataShortDay = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short'
  }).format(now).toLowerCase(); // 'wed'
  
  const currentDayIdx = dayNames.indexOf(kolkataShortDay);

  if (!weekly || typeof weekly !== 'object') {
    return {
      isAvailableToday: false,
      isAvailableThisWeek: false,
      activeTime: "Next: Upon Request"
    };
  }

  // Check today
  const todaySlots = weekly[kolkataShortDay];
  const isAvailableToday = Array.isArray(todaySlots) && todaySlots.length > 0;

  // Check this week
  const isAvailableThisWeek = Object.values(weekly).some(
    slots => Array.isArray(slots) && slots.length > 0
  );

  let activeTime = "Next: Upon Request";
  if (isAvailableToday) {
    activeTime = "Available Today";
  } else if (isAvailableThisWeek) {
    // find next day
    for (let offset = 1; offset < 7; offset++) {
      const nextDayIdx = (currentDayIdx + offset) % 7;
      const nextDayShort = dayNames[nextDayIdx];
      const slots = weekly[nextDayShort];
      if (Array.isArray(slots) && slots.length > 0) {
        if (offset === 1) {
          activeTime = "Available Tomorrow";
        } else {
          activeTime = `Next: ${dayFullNames[nextDayIdx].slice(0, 3)}`;
        }
        break;
      }
    }
  }

  return {
    isAvailableToday,
    isAvailableThisWeek,
    activeTime
  };
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const experts = await ExpertDetails.find({ status: "Active", "settings.publicProfile": { $ne: false } }).lean();

  let todayCount = 0;
  let weekCount = 0;
  const activeTimes = {};

  experts.forEach(e => {
    const info = getExpertAvailabilityInfo(e.availability?.weekly);
    if (info.isAvailableToday) todayCount++;
    if (info.isAvailableThisWeek) weekCount++;
    activeTimes[info.activeTime] = (activeTimes[info.activeTime] || 0) + 1;
  });

  console.log("Availability summary in Asia/Kolkata:");
  console.log("Available Today count:", todayCount);
  console.log("Available This Week count:", weekCount);
  console.log("Active Time breakdown:", activeTimes);

  await mongoose.disconnect();
}

run().catch(console.error);
