const path = require('path');
const { generateAvailableSlotsForDate, getKolkataDateString } = require('../../client/src/lib/bookSessionUtils.ts');

const expertAvailability = {
  sessionDuration: 30,
  defaultMeetingLink: "https://meet.google.com/ivx-ykao-kun",
  maxPerDay: 10,
  weekly: {
    sat: [{ from: "01:30", to: "02:00" }],
    wed: [{ from: "22:54", to: "23:24" }],
    thu: [{ from: "22:35", to: "23:05" }],
    fri: [{ from: "20:27", to: "20:57" }],
    tue: [{ from: "09:00", to: "09:30" }]
  },
  breakDates: [],
  allowedDurations: [30]
};

// Test with Friday Nov 13, 2026
const targetDate = new Date('2026-11-13T12:00:00+05:30');

// Scenario 1: Clock at 8:20 PM IST (before slot start)
const clockBeforeStart = new Date('2026-11-13T20:20:00+05:30');
const slotsBeforeStart = generateAvailableSlotsForDate(targetDate, expertAvailability, 30, [], clockBeforeStart);
console.log('Slots at 8:20 PM IST:', slotsBeforeStart);

// Scenario 2: Clock at 8:30 PM IST (during slot, before cutoff 8:47 PM)
const clockDuringSlot = new Date('2026-11-13T20:30:00+05:30');
const slotsDuringSlot = generateAvailableSlotsForDate(targetDate, expertAvailability, 30, [], clockDuringSlot);
console.log('Slots at 8:30 PM IST:', slotsDuringSlot);

// Scenario 3: Clock at 8:46 PM IST (1 minute before cutoff)
const clockBeforeCutoff = new Date('2026-11-13T20:46:00+05:30');
const slotsBeforeCutoff = generateAvailableSlotsForDate(targetDate, expertAvailability, 30, [], clockBeforeCutoff);
console.log('Slots at 8:46 PM IST:', slotsBeforeCutoff);

// Scenario 4: Clock at 8:48 PM IST (after cutoff)
const clockAfterCutoff = new Date('2026-11-13T20:48:00+05:30');
const slotsAfterCutoff = generateAvailableSlotsForDate(targetDate, expertAvailability, 30, [], clockAfterCutoff);
console.log('Slots at 8:48 PM IST:', slotsAfterCutoff);
