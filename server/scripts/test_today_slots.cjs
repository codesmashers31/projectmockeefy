const mongoose = require('../node_modules/mongoose');
const path = require('path');
require('../node_modules/dotenv').config({ path: path.join(__dirname, '../.env') });

async function testToday() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const Expert = (await import('../models/expertModel.js')).default;
  const Session = (await import('../models/Session.js')).default;
  const expert = await Expert.findById('6ae2e7cf2ad1edd333f2aded').lean();

  const now = new Date();
  console.log('Current Server Time UTC:', now.toISOString());
  console.log('Current Server Time IST:', now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

  const todayDate = new Date();
  const booked = await Session.find({
    expertId: expert._id,
    status: { $nin: ['cancelled'] }
  }).lean();

  // Test slot generator logic
  const weekly = expert.availability.weekly;
  console.log('Friday ranges in weekly:', weekly.fri);

  for (const range of weekly.fri) {
    const [startH, startM] = range.from.split(':').map(Number);
    const [endH, endM] = range.to.split(':').map(Number);

    const kolkataDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
    const slotStart = new Date(`${kolkataDateStr}T${range.from}:00+05:30`);
    const slotEnd = new Date(`${kolkataDateStr}T${range.to}:00+05:30`);
    const effectiveDeadline = Math.min(slotStart.getTime(), slotEnd.getTime() - 10 * 60 * 1000);

    const isCutoffExpired = now.getTime() >= effectiveDeadline;
    console.log(`Slot ${range.from} - ${range.to} IST:`);
    console.log(`  Slot Start: ${slotStart.toISOString()} (${slotStart.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })})`);
    console.log(`  Deadline:   ${new Date(effectiveDeadline).toISOString()} (${new Date(effectiveDeadline).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })})`);
    console.log(`  Current:    ${now.toISOString()} (${now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })})`);
    console.log(`  Expired?    ${isCutoffExpired ? 'YES (EXPIRED)' : 'NO (AVAILABLE)'}`);
  }

  await mongoose.disconnect();
}
testToday().catch(console.error);
