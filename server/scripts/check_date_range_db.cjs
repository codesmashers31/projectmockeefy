const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkDateRange() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const Session = (await import('../models/Session.js')).default;
  const SlotReservation = (await import('../models/SlotReservation.js')).default;
  const expertId = '6ae2e7cf2ad1edd333f2aded';

  const s = await Session.find({
    expertId,
    startTime: {
      $gte: new Date('2026-11-13T00:00:00.000Z'),
      $lte: new Date('2026-11-21T00:00:00.000Z')
    }
  }).lean();

  console.log('=== SESSIONS (Nov 13 to Nov 20) for Expert ===');
  s.forEach(x => {
    console.log(x.sessionId, x.status, 'Start UTC:', x.startTime.toISOString(), 'End UTC:', x.endTime.toISOString(), 'Start IST:', new Date(x.startTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  });

  const r = await SlotReservation.find({
    expertId,
    startTime: {
      $gte: new Date('2026-11-13T00:00:00.000Z'),
      $lte: new Date('2026-11-21T00:00:00.000Z')
    }
  }).lean();

  console.log('\n=== RESERVATIONS (Nov 13 to Nov 20) ===');
  r.forEach(x => {
    console.log(x.orderId, x.status, 'Start UTC:', x.startTime.toISOString(), 'End UTC:', x.endTime.toISOString(), 'Start IST:', new Date(x.startTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  });

  await mongoose.disconnect();
}
checkDateRange().catch(console.error);
