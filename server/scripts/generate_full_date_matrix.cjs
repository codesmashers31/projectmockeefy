const mongoose = require('../node_modules/mongoose');
const path = require('path');
require('../node_modules/dotenv').config({ path: path.join(__dirname, '../.env') });

async function generateMatrix() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const Expert = (await import('../models/expertModel.js')).default;
  const Session = (await import('../models/Session.js')).default;
  const SlotReservation = (await import('../models/SlotReservation.js')).default;

  const expertId = '6ae2e7cf2ad1edd333f2aded';
  const expert = await Expert.findById(expertId).lean();
  const weekly = expert.availability?.weekly || {};

  const now = new Date();
  console.log('Current Server Time (UTC):', now.toISOString());
  console.log('Current Server Time (IST):', now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

  const bookedSessions = await Session.find({
    expertId,
    status: { $nin: ['cancelled', 'rejected', 'declined', 'failed', 'expired'] }
  }).lean();

  const matrix = [];

  // Nov 13 to Nov 30
  for (let day = 13; day <= 30; day++) {
    const dayStr = day.toString().padStart(2, '0');
    const dateStr = `2026-11-${dayStr}`;
    const dateObj = new Date(`${dateStr}T12:00:00+05:30`);
    const weekdayShort = dateObj.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' }).toLowerCase();
    const weekdayLong = dateObj.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' });

    const key = Object.keys(weekly).find(k => k.toLowerCase() === weekdayShort || k.toLowerCase() === weekdayLong.toLowerCase());
    const scheduleRanges = key ? weekly[key] : [];

    let scheduleDesc = 'None';
    if (scheduleRanges.length > 0) {
      scheduleDesc = scheduleRanges.map(r => `${r.from} - ${r.to}`).join(', ');
    }

    // Generate slots for date
    const generatedSlots = [];
    const duration = 30;
    const step = 30;

    for (const range of scheduleRanges) {
      const [fromH, fromM] = range.from.split(':').map(Number);
      const [toH, toM] = range.to.split(':').map(Number);
      let startMins = fromH * 60 + fromM;
      let endMins = toH * 60 + toM;
      if (endMins === 0 && startMins > 0) endMins = 1440;
      if (endMins < startMins) endMins += 1440;

      let cur = startMins;
      while (cur + duration <= endMins) {
        if (cur + duration > 1440) break;
        const curH = Math.floor(cur / 60).toString().padStart(2, '0');
        const curM = (cur % 60).toString().padStart(2, '0');
        const slotDate = new Date(`${dateStr}T${curH}:${curM}:00+05:30`);
        const slotEndDate = new Date(slotDate.getTime() + duration * 60 * 1000);

        // Effective deadline: min(start, end - 10m)
        const bookingCutoff = new Date(slotEndDate.getTime() - 10 * 60 * 1000);
        const effectiveDeadline = Math.min(slotDate.getTime(), bookingCutoff.getTime());

        const isCutoffExpired = now.getTime() >= effectiveDeadline;

        // Overlap with booked sessions
        const isBooked = bookedSessions.some(s => {
          const sStart = new Date(s.startTime);
          const sEnd = new Date(s.endTime);
          return slotDate.getTime() < (sEnd.getTime() - 1000) && slotEndDate.getTime() > (sStart.getTime() + 1000);
        });

        // Active reservation
        const activeRes = await SlotReservation.findOne({
          expertId,
          status: 'pending',
          expiresAt: { $gt: now },
          startTime: { $lt: slotEndDate },
          endTime: { $gt: slotDate }
        });

        const isAvailable = !isCutoffExpired && !isBooked && !activeRes;

        let reason = 'Available';
        if (isCutoffExpired) reason = 'Expired (passed deadline)';
        else if (isBooked) reason = 'Occupied by active booking';
        else if (activeRes) reason = 'Blocked by active reservation';

        generatedSlots.push({
          time: `${curH}:${curM}`,
          isAvailable,
          reason
        });

        cur += step;
      }
    }

    const bookableSlots = generatedSlots.filter(s => s.isAvailable);
    const isVisible = bookableSlots.length > 0;

    let dateStatus = isVisible ? 'VISIBLE' : 'HIDDEN';
    let hiddenReason = '';
    if (!isVisible) {
      if (scheduleRanges.length === 0) hiddenReason = 'No schedule configured for ' + weekdayLong;
      else if (generatedSlots.every(s => s.reason.includes('Expired'))) hiddenReason = 'All configured slots expired (past deadline)';
      else if (generatedSlots.every(s => s.reason.includes('Occupied'))) hiddenReason = 'All configured slots occupied by active bookings';
    }

    matrix.push({
      date: dateStr,
      weekday: weekdayLong,
      schedule: scheduleDesc,
      totalSlots: generatedSlots.length,
      bookableSlots: bookableSlots.length,
      isVisible,
      hiddenReason
    });
  }

  console.log('\n--- DATE-BY-DATE DIAGNOSTIC MATRIX (Nov 13 to Nov 30, 2026) ---');
  console.table(matrix);

  await mongoose.disconnect();
}

generateMatrix().catch(console.error);
