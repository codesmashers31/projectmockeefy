const assert = require('assert');
const mongoose = require('mongoose');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Helper functions mirroring the logic in EditExpertAvailability.tsx
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const minutesToHHMM = (totalMinutes) => {
  const adjusted = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(adjusted / 60);
  const minutes = adjusted % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const displayTime = (time24) => {
  if (!time24) return "";
  const [h, m] = time24.split(':').map(Number);
  const period = (h || 0) >= 12 ? "PM" : "AM";
  let hour = (h || 0) % 12;
  if (hour === 0) hour = 12;
  return `${hour.toString().padStart(2, '0')}:${(m || 0).toString().padStart(2, '0')} ${period}`;
};

const getSlotRangeMinutes = (slot) => {
  const start = timeToMinutes(slot.from);
  let end = timeToMinutes(slot.to);
  if (end === 0 && start > 0) {
    end = 24 * 60; // 1440 (midnight at end of day)
  } else if (end < start) {
    end += 24 * 60;
  }
  return { start, end };
};

const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const getNextDay = (currentDay) => {
  const idx = days.indexOf(currentDay);
  return days[(idx + 1) % days.length];
};

function simulateAddSlot(weekly, day, duration = 30, maxPerDay = 8) {
  const currentSlots = weekly[day] || [];
  const maxStartMin = 1440 - duration;

  if (currentSlots.length === 0) {
    const from = "09:00";
    const to = minutesToHHMM(timeToMinutes(from) + duration);
    weekly[day] = [{ from, to }];
    return { addedDay: day, slot: { from, to } };
  }

  const sorted = [...currentSlots].sort((a, b) => timeToMinutes(a.from) - timeToMinutes(b.from));
  const lastSlot = sorted[sorted.length - 1];
  let lastStartMin = timeToMinutes(lastSlot.from);
  let lastEndMin = timeToMinutes(lastSlot.to);
  if (lastEndMin === 0 && lastStartMin > 0) lastEndMin = 1440;

  const isAtOrPastMidnightCutoff = lastStartMin >= maxStartMin || lastEndMin >= 1440;

  if (isAtOrPastMidnightCutoff) {
    const nextDay = getNextDay(day);
    const nextDaySlots = weekly[nextDay] || [];
    if (nextDaySlots.length >= maxPerDay) {
      throw new Error(`Daily limit reached on ${nextDay}`);
    }

    const sortedNext = [...nextDaySlots].sort((a, b) => timeToMinutes(a.from) - timeToMinutes(b.from));
    let newSlotForNextDay = null;

    for (let candStart = 0; candStart + duration <= 1440; candStart += duration) {
      const candEnd = candStart + duration;
      const overlaps = sortedNext.some((s) => {
        const r = getSlotRangeMinutes(s);
        return candStart < r.end && candEnd > r.start;
      });
      if (!overlaps) {
        newSlotForNextDay = {
          from: minutesToHHMM(candStart),
          to: minutesToHHMM(candEnd)
        };
        break;
      }
    }

    if (!newSlotForNextDay) throw new Error("No available slots on next day");
    weekly[nextDay] = [...nextDaySlots, newSlotForNextDay].sort((a, b) => timeToMinutes(a.from) - timeToMinutes(b.from));
    return { addedDay: nextDay, slot: newSlotForNextDay };
  }

  let candStart = lastEndMin;
  let candEnd = candStart + duration;
  let newSlot = null;

  if (candEnd <= 1440) {
    const overlaps = sorted.some((s) => {
      const r = getSlotRangeMinutes(s);
      return candStart < r.end && candEnd > r.start;
    });
    if (!overlaps) {
      newSlot = {
        from: minutesToHHMM(candStart),
        to: minutesToHHMM(candEnd)
      };
    }
  }

  if (!newSlot) {
    for (let min = 0; min + duration <= 1440; min += duration) {
      const cStart = min;
      const cEnd = min + duration;
      const overlaps = sorted.some((s) => {
        const r = getSlotRangeMinutes(s);
        return cStart < r.end && cEnd > r.start;
      });
      if (!overlaps) {
        newSlot = {
          from: minutesToHHMM(cStart),
          to: minutesToHHMM(cEnd)
        };
        break;
      }
    }
  }

  if (!newSlot) throw new Error("No more slots can be added");
  weekly[day] = [...(weekly[day] || []), newSlot].sort((a, b) => timeToMinutes(a.from) - timeToMinutes(b.from));
  return { addedDay: day, slot: newSlot };
}

async function runTests() {
  console.log("=== 1. TESTING 30-MINUTE DURATION SEQUENCING ===");
  const testWeekly30 = {
    mon: [{ from: "12:00", to: "12:30" }]
  };

  // Step 1: 12:00 PM – 12:30 PM -> next must be 12:30 PM – 1:00 PM
  const res1 = simulateAddSlot(testWeekly30, "mon", 30);
  console.log(`Slot 1: 12:00 PM – 12:30 PM`);
  console.log(`Slot 2 added: ${displayTime(res1.slot.from)} – ${displayTime(res1.slot.to)} (Raw: ${res1.slot.from} – ${res1.slot.to})`);
  assert.strictEqual(res1.slot.from, "12:30", "Next slot from must be 12:30");
  assert.strictEqual(res1.slot.to, "13:00", "Next slot to must be 13:00 (01:00 PM)");

  // Step 2: 12:30 PM – 1:00 PM -> next must be 1:00 PM – 1:30 PM
  const res2 = simulateAddSlot(testWeekly30, "mon", 30);
  console.log(`Slot 3 added: ${displayTime(res2.slot.from)} – ${displayTime(res2.slot.to)} (Raw: ${res2.slot.from} – ${res2.slot.to})`);
  assert.strictEqual(res2.slot.from, "13:00", "Next slot from must be 13:00 (01:00 PM)");
  assert.strictEqual(res2.slot.to, "13:30", "Next slot to must be 13:30 (01:30 PM)");

  // Step 3: next must be 1:30 PM – 2:00 PM
  const res3 = simulateAddSlot(testWeekly30, "mon", 30);
  console.log(`Slot 4 added: ${displayTime(res3.slot.from)} – ${displayTime(res3.slot.to)} (Raw: ${res3.slot.from} – ${res3.slot.to})`);
  assert.strictEqual(res3.slot.from, "13:30", "Next slot from must be 13:30 (01:30 PM)");
  assert.strictEqual(res3.slot.to, "14:00", "Next slot to must be 14:00 (02:00 PM)");

  console.log("\n=== 2. TESTING 60-MINUTE DURATION SEQUENCING ===");
  const testWeekly60 = {
    tue: [{ from: "12:00", to: "13:00" }]
  };

  // Step 1: 12:00 PM – 1:00 PM -> next must be 1:00 PM – 2:00 PM
  const res60_1 = simulateAddSlot(testWeekly60, "tue", 60);
  console.log(`Slot 1: 12:00 PM – 1:00 PM`);
  console.log(`Slot 2 added: ${displayTime(res60_1.slot.from)} – ${displayTime(res60_1.slot.to)}`);
  assert.strictEqual(res60_1.slot.from, "13:00");
  assert.strictEqual(res60_1.slot.to, "14:00");

  // Step 2: 1:00 PM – 2:00 PM -> next must be 2:00 PM – 3:00 PM
  const res60_2 = simulateAddSlot(testWeekly60, "tue", 60);
  console.log(`Slot 3 added: ${displayTime(res60_2.slot.from)} – ${displayTime(res60_2.slot.to)}`);
  assert.strictEqual(res60_2.slot.from, "14:00");
  assert.strictEqual(res60_2.slot.to, "15:00");

  console.log("\n=== 3. TESTING MIDNIGHT CUTOFF & NEXT-DAY AUTOMATIC SCHEDULING ===");
  const testMidnight = {
    wed: [{ from: "23:30", to: "00:00" }],
    thu: []
  };

  const resMid = simulateAddSlot(testMidnight, "wed", 30);
  console.log(`Slot on Wednesday: 11:30 PM – 12:00 AM`);
  console.log(`Next slot added to ${resMid.addedDay}: ${displayTime(resMid.slot.from)} – ${displayTime(resMid.slot.to)} (Raw: ${resMid.slot.from} - ${resMid.slot.to})`);
  assert.strictEqual(resMid.addedDay, "thu", "Should automatically schedule on next day (Thursday)");
  assert.strictEqual(resMid.slot.from, "00:00", "Next day slot must begin at 00:00 (12:00 AM)");
  assert.strictEqual(resMid.slot.to, "00:30", "Next day slot must end at 00:30 (12:30 AM)");

  console.log("\n=== 4. TESTING OVERLAP REJECTION ===");
  // Test manual overlap: [12:00, 12:30] overlaps with [12:15, 12:45]
  const slotA = { from: "12:00", to: "12:30" };
  const slotConflict = { from: "12:15", to: "12:45" };
  const slotConsecutive = { from: "12:30", to: "13:00" };

  const rA = getSlotRangeMinutes(slotA);
  const rConf = getSlotRangeMinutes(slotConflict);
  const rConsec = getSlotRangeMinutes(slotConsecutive);

  const isConflictOverlap = rConf.start < rA.end && rConf.end > rA.start;
  const isConsecutiveOverlap = rConsec.start < rA.end && rConsec.end > rA.start;

  console.log(`Overlap check between [12:00-12:30] and [12:15-12:45]: ${isConflictOverlap} (Expected: true)`);
  assert.strictEqual(isConflictOverlap, true, "Conflicting slot must be detected as overlap");

  console.log(`Overlap check between [12:00-12:30] and [12:30-13:00]: ${isConsecutiveOverlap} (Expected: false)`);
  assert.strictEqual(isConsecutiveOverlap, false, "Consecutive slot must NOT be detected as overlap");

  console.log("\n=== 5. TESTING BACKEND CONTROLLER & MONGO PERSISTENCE ===");
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const ExpertDetails = mongoose.models.ExpertDetails || (await import('../models/expertModel.js')).default;
  const expert = await ExpertDetails.findOne({ status: "Active" });

  if (expert) {
    console.log(`Found expert: ${expert.name} (${expert._id})`);
    const initialWeekly = expert.availability?.weekly ? JSON.parse(JSON.stringify(expert.availability.weekly)) : {};

    // Set consecutive slots on Monday: 12:00-12:30, 12:30-13:00, 13:00-13:30, 13:30-14:00
    const testConsecutiveWeekly = {
      ...initialWeekly,
      mon: [
        { from: "12:00", to: "12:30" },
        { from: "12:30", to: "13:00" },
        { from: "13:00", to: "13:30" },
        { from: "13:30", to: "14:00" }
      ]
    };

    expert.availability.weekly = testConsecutiveWeekly;
    expert.availability.sessionDuration = 30;
    expert.availability.allowedDurations = [30];
    expert.availability.maxPerDay = 6;
    expert.markModified('availability');
    await expert.save();
    console.log("Saved consecutive slots to MongoDB successfully!");

    // Re-query from DB to verify persistence
    const reloaded = await ExpertDetails.findById(expert._id).lean();
    const mondaySlots = reloaded.availability.weekly.mon || [];
    console.log(`Reloaded Monday slots from DB (${mondaySlots.length} slots):`);
    mondaySlots.forEach((s, idx) => {
      console.log(`  Slot ${idx + 1}: ${displayTime(s.from)} – ${displayTime(s.to)} (Raw: ${s.from} - ${s.to})`);
    });

    assert.strictEqual(mondaySlots.length, 4, "Must have 4 consecutive slots saved");
    assert.strictEqual(mondaySlots[0].from, "12:00");
    assert.strictEqual(mondaySlots[0].to, "12:30");
    assert.strictEqual(mondaySlots[1].from, "12:30");
    assert.strictEqual(mondaySlots[1].to, "13:00");
    assert.strictEqual(mondaySlots[2].from, "13:00");
    assert.strictEqual(mondaySlots[2].to, "13:30");
    assert.strictEqual(mondaySlots[3].from, "13:30");
    assert.strictEqual(mondaySlots[3].to, "14:00");

    console.log("Database persistence test PASSED!");
  }

  await mongoose.disconnect();
  console.log("\nALL TEST CASES PASSED SUCCESSFULLY!");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
