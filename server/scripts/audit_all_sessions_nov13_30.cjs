const mongoose = require('../node_modules/mongoose');
const path = require('path');
require('../node_modules/dotenv').config({ path: path.join(__dirname, '../.env') });

async function auditAll() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const Expert = (await import('../models/expertModel.js')).default;
  const Session = (await import('../models/Session.js')).default;
  const SlotReservation = (await import('../models/SlotReservation.js')).default;
  const User = (await import('../models/User.js')).default;

  const expertId = '6ae2e7cf2ad1edd333f2aded';
  const expert = await Expert.findById(expertId).lean();
  console.log('=== EXPERT AVAILABILITY ===');
  console.log(JSON.stringify(expert.availability?.weekly, null, 2));

  console.log('\n=== ALL SESSIONS (Nov 13 - Nov 30, 2026) FOR EXPERT ===');
  const sessions = await Session.find({
    expertId,
    startTime: {
      $gte: new Date('2026-11-13T00:00:00.000Z'),
      $lte: new Date('2026-12-01T00:00:00.000Z')
    }
  }).sort({ startTime: 1 }).lean();

  console.log(`Total sessions found: ${sessions.length}`);
  for (const s of sessions) {
    const cand = await User.findById(s.candidateId).lean();
    console.log({
      sessionId: s.sessionId,
      status: s.status,
      paymentStatus: s.paymentStatus,
      candidate: cand ? `${cand.name} (${cand.email})` : s.candidateId,
      startUTC: s.startTime.toISOString(),
      endUTC: s.endTime.toISOString(),
      startIST: new Date(s.startTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
      endIST: new Date(s.endTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
      notes: s.notes,
      slotLockKey: s.slotLockKey,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    });
  }

  console.log('\n=== ALL RESERVATIONS (Nov 13 - Nov 30, 2026) FOR EXPERT ===');
  const reservations = await SlotReservation.find({
    expertId,
    startTime: {
      $gte: new Date('2026-11-13T00:00:00.000Z'),
      $lte: new Date('2026-12-01T00:00:00.000Z')
    }
  }).sort({ startTime: 1 }).lean();

  console.log(`Total reservations found: ${reservations.length}`);
  for (const r of reservations) {
    console.log({
      orderId: r.orderId,
      status: r.status,
      startUTC: r.startTime.toISOString(),
      endUTC: r.endTime.toISOString(),
      startIST: new Date(r.startTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
      endIST: new Date(r.endTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
      expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
      isExpired: r.expiresAt ? new Date() > r.expiresAt : false
    });
  }

  await mongoose.disconnect();
}

auditAll().catch(console.error);
