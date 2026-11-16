const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function verifyAll() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const ExpertDetails = (await import('../models/expertModel.js')).default;
  const Session = (await import('../models/Session.js')).default;
  const { validateBookingSlot, isSlotWithinBookingWindow } = await import('../utils/availabilityValidator.js');

  const expertId = '6ae2e7cf2ad1edd333f2aded';
  const expert = await ExpertDetails.findById(expertId).lean();
  console.log('Expert Found:', expert.fullName || expert.user, 'Session Duration:', expert.sessionDuration);
  console.log('Weekly Schedule:', JSON.stringify(expert.availability.weekly, null, 2));

  console.log('\n--- 1. DATE-BY-DATE VALIDATION MATRIX (Nov 13 to Nov 20, 2026) ---');
  const dates = [
    { dateStr: '2026-11-13', day: 'Friday', expectedSlot: '20:27 - 20:57' },
    { dateStr: '2026-11-14', day: 'Saturday', expectedSlot: '01:30 - 02:00' },
    { dateStr: '2026-11-15', day: 'Sunday', expectedSlot: 'None' },
    { dateStr: '2026-11-16', day: 'Monday', expectedSlot: 'None' },
    { dateStr: '2026-11-17', day: 'Tuesday', expectedSlot: '09:00 - 09:30' },
    { dateStr: '2026-11-18', day: 'Wednesday', expectedSlot: '22:54 - 23:24' },
    { dateStr: '2026-11-19', day: 'Thursday', expectedSlot: '22:35 - 23:05' },
    { dateStr: '2026-11-20', day: 'Friday', expectedSlot: '20:27 - 20:57' }
  ];

  for (const item of dates) {
    if (item.expectedSlot === 'None') {
      console.log(`[${item.dateStr} (${item.day})] No schedule configured -> 0 slots -> HIDDEN in calendar.`);
      continue;
    }

    const [startHHMM, endHHMM] = item.expectedSlot.split(' - ');
    const slotStart = new Date(`${item.dateStr}T${startHHMM}:00+05:30`);
    const slotEnd = new Date(`${item.dateStr}T${endHHMM}:00+05:30`);

    // Check if booked in DB
    const booked = await Session.findOne({
      expertId,
      status: { $nin: ['cancelled'] },
      $or: [
        { startTime: { $lt: slotEnd, $gte: slotStart } },
        { endTime: { $gt: slotStart, $lte: slotEnd } }
      ]
    }).lean();

    // Check cutoff at current time
    const now = new Date();
    const effectiveDeadline = Math.min(slotStart.getTime(), slotEnd.getTime() - 10 * 60 * 1000);
    const isPastDeadline = now.getTime() >= effectiveDeadline;

    let reason = '';
    let status = 'AVAILABLE';
    if (isPastDeadline) {
      status = 'EXPIRED';
      reason = `Current time (${now.toISOString()}) >= Effective Deadline (${new Date(effectiveDeadline).toISOString()})`;
    } else if (booked) {
      status = 'BOOKED';
      reason = `Booked in DB by sessionId ${booked.sessionId} (${booked.status})`;
    }

    console.log(`[${item.dateStr} (${item.day})] Slot: ${item.expectedSlot} IST | Status: ${status} | Details: ${reason || 'Free to book'}`);
  }

  console.log('\n--- 2. EFFECTIVE DEADLINE BACKEND VALIDATION TESTS ---');
  // Test A: Before slot start (Simulated Nov 13, 20:00 IST -> slot is 20:27 IST)
  const testSlotStart = new Date('2026-11-13T20:27:00+05:30');
  const testSlotEnd = new Date('2026-11-13T20:57:00+05:30');

  const simulatedBefore = new Date('2026-11-13T20:00:00+05:30');
  const resBefore = await validateBookingSlot({
    expertId,
    startTime: testSlotStart,
    endTime: testSlotEnd,
    currentTime: simulatedBefore
  });
  console.log('Test A (Before slot start: 20:00 IST for 20:27 slot):', resBefore.valid ? 'PASS (Allowed)' : 'FAIL: ' + JSON.stringify(resBefore));

  // Test B: After slot start (Simulated Nov 13, 20:28 IST for 20:27 slot)
  const simulatedAfter = new Date('2026-11-13T20:28:00+05:30');
  const resAfter = await validateBookingSlot({
    expertId,
    startTime: testSlotStart,
    endTime: testSlotEnd,
    currentTime: simulatedAfter
  });
  console.log('Test B (After slot start: 20:28 IST for 20:27 slot):', !resAfter.valid && resAfter.error.includes('already started') ? 'PASS (Strictly rejected with message: ' + resAfter.error + ')' : 'FAIL: ' + JSON.stringify(resAfter));

  // Test C: Nov 20 future slot validation
  const currentNow = new Date();
  const nov20Start = new Date('2026-11-20T20:27:00+05:30');
  const nov20End = new Date('2026-11-20T20:57:00+05:30');
  const resNov20 = await validateBookingSlot({
    expertId,
    startTime: nov20Start,
    endTime: nov20End,
    currentTime: currentNow
  });
  console.log('Test C (Nov 20 future slot with current server time):', resNov20.valid ? 'PASS (Valid)' : 'FAIL: ' + JSON.stringify(resNov20));

  // Test D: Saturday Nov 14 (already booked session)
  const nov14Start = new Date('2026-11-14T01:30:00+05:30');
  const nov14End = new Date('2026-11-14T02:00:00+05:30');
  const resNov14 = await validateBookingSlot({
    expertId,
    startTime: nov14Start,
    endTime: nov14End,
    currentTime: new Date('2026-11-13T10:00:00+05:30')
  });
  console.log('Test D (Nov 14 booked slot validation):', !resNov14.valid ? 'PASS (Rejected as booked: ' + resNov14.error + ')' : 'FAIL: ' + JSON.stringify(resNov14));

  await mongoose.disconnect();
}

verifyAll().catch(console.error);
