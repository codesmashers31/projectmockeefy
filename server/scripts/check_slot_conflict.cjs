const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkConflict() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const Session = (await import('../models/Session.js')).default;
  const SlotReservation = (await import('../models/SlotReservation.js')).default;

  const expertId = '6ae2e7cf2ad1edd333f2aded';
  const startTime = new Date('2026-11-12T10:45:00.000Z');
  const endTime = new Date('2026-11-12T11:15:00.000Z');

  const conflict = await Session.findOne({
    expertId,
    status: { $in: ['confirmed', 'scheduled', 'in_progress', 'completed'] },
    $or: [
      { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
    ]
  });

  console.log('Slot conflict exists?', conflict ? conflict.sessionId : 'NO CONFLICT - SLOT IS 100% FREE!');
  process.exit(0);
}
checkConflict();
