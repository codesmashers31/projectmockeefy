const mongoose = require('../node_modules/mongoose');
const path = require('path');
require('../node_modules/dotenv').config({ path: path.join(__dirname, '../.env') });

async function inspectSession() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const Session = (await import('../models/Session.js')).default;
  const SlotReservation = (await import('../models/SlotReservation.js')).default;
  const WalletTransaction = (await import('../models/WalletTransaction.js')).default;

  const targetSessionId = 'session-1794586264656-i35z7gw37';
  const session = await Session.findOne({ sessionId: targetSessionId }).lean();
  console.log('=== TARGET TEST SESSION ===');
  console.log(JSON.stringify(session, null, 2));

  console.log('\n=== ALL SESSIONS OVERLAPPING NOV 20 21:30 - 22:00 IST ===');
  const expertId = '6ae2e7cf2ad1edd333f2aded';
  const start = new Date('2026-11-20T21:30:00+05:30');
  const end = new Date('2026-11-20T22:00:00+05:30');

  const overlapping = await Session.find({
    expertId,
    $or: [
      { startTime: { $lt: end, $gte: start } },
      { endTime: { $gt: start, $lte: end } }
    ]
  }).lean();
  console.log('Overlapping sessions count:', overlapping.length);
  overlapping.forEach(s => {
    console.log(s.sessionId, s.status, s.startTime, s.endTime, 'slotLockKey:', s.slotLockKey);
  });

  console.log('\n=== RESERVATIONS OVERLAPPING NOV 20 21:30 - 22:00 IST ===');
  const reservations = await SlotReservation.find({
    expertId,
    $or: [
      { startTime: { $lt: end, $gte: start } },
      { endTime: { $gt: start, $lte: end } }
    ]
  }).lean();
  console.log('Reservations count:', reservations.length);
  reservations.forEach(r => console.log(r.orderId, r.status, r.startTime, r.endTime));

  console.log('\n=== WALLET TRANSACTIONS FOR TARGET SESSION ===');
  const txns = await WalletTransaction.find({ sessionId: targetSessionId }).lean();
  txns.forEach(t => console.log(t.type, t.amount, t.reason, t.status, t.balanceAfter));

  await mongoose.disconnect();
}
inspectSession().catch(console.error);
