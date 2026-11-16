const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testBackendValidator() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const { validateBookingSlot } = await import('../utils/availabilityValidator.js');

  const expertId = '6ae2e7cf2ad1edd333f2aded';
  const start = new Date('2026-11-13T20:27:00+05:30');
  const end = new Date('2026-11-13T20:57:00+05:30');

  // Test at 8:20 PM IST
  const clock820 = new Date('2026-11-13T20:20:00+05:30');
  const res820 = await validateBookingSlot({
    expertId,
    startTime: start,
    endTime: end,
    duration: 30,
    currentTime: clock820
  });
  console.log('Backend validateBookingSlot at 8:20 PM IST (before start):', res820.valid ? 'VALID' : res820.error);

  // Test at 8:35 PM IST (during interview, before cutoff)
  const clock835 = new Date('2026-11-13T20:35:00+05:30');
  const res835 = await validateBookingSlot({
    expertId,
    startTime: start,
    endTime: end,
    duration: 30,
    currentTime: clock835
  });
  console.log('Backend validateBookingSlot at 8:35 PM IST (during slot, before cutoff):', res835.valid ? 'VALID' : res835.error);

  // Test at 8:46 PM IST (1 min before cutoff)
  const clock846 = new Date('2026-11-13T20:46:00+05:30');
  const res846 = await validateBookingSlot({
    expertId,
    startTime: start,
    endTime: end,
    duration: 30,
    currentTime: clock846
  });
  console.log('Backend validateBookingSlot at 8:46 PM IST (1 min before cutoff):', res846.valid ? 'VALID' : res846.error);

  // Test at 8:48 PM IST (after cutoff)
  const clock848 = new Date('2026-11-13T20:48:00+05:30');
  const res848 = await validateBookingSlot({
    expertId,
    startTime: start,
    endTime: end,
    duration: 30,
    currentTime: clock848
  });
  console.log('Backend validateBookingSlot at 8:48 PM IST (after cutoff):', res848.valid ? 'VALID' : res848.error);

  await mongoose.disconnect();
}
testBackendValidator().catch(console.error);
