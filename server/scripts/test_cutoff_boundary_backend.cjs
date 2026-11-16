const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
  const { validateBookingSlot, isSlotWithinBookingWindow } = await import('../utils/availabilityValidator.js');
  
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const expertId = '6ae2e7cf2ad1edd333f2aded';

  const startTime = new Date('2026-11-13T17:00:00.000Z'); // 10:30 PM IST
  const endTime = new Date('2026-11-13T17:30:00.000Z');   // 11:00 PM IST

  const testCases = [
    { label: '10:20 PM IST (Before start)', time: '2026-11-13T16:50:00.000Z', expected: true },
    { label: '10:30 PM IST (Exact start)', time: '2026-11-13T17:00:00.000Z', expected: true },
    { label: '10:39 PM IST (During interview)', time: '2026-11-13T17:09:00.000Z', expected: true },
    { label: '10:45 PM IST (During interview)', time: '2026-11-13T17:15:00.000Z', expected: true },
    { label: '10:49 PM IST (1 min before cutoff)', time: '2026-11-13T17:19:00.000Z', expected: true },
    { label: '10:50 PM IST (Exact cutoff)', time: '2026-11-13T17:20:00.000Z', expected: false },
    { label: '10:51 PM IST (After cutoff)', time: '2026-11-13T17:21:00.000Z', expected: false }
  ];

  console.log('=== TESTING BACKEND AVAILABILITY VALIDATOR BOUNDARIES ===');
  let allPassed = true;

  for (const tc of testCases) {
    const curTime = new Date(tc.time);
    const inWindow = isSlotWithinBookingWindow(startTime, endTime, curTime);
    const res = await validateBookingSlot({
      expertId,
      startTime,
      endTime,
      duration: 30,
      currentTime: curTime
    });

    const passed = (res.valid === tc.expected) && (inWindow === tc.expected);
    if (!passed) allPassed = false;

    console.log(`[${tc.label}] Expected: ${tc.expected ? 'ALLOWED' : 'REJECTED'} | isSlotWithinBookingWindow: ${inWindow} | validateBookingSlot: ${res.valid ? 'ALLOWED' : 'REJECTED'} -> ${passed ? 'PASS' : 'FAIL'}`);
    if (!res.valid) {
      console.log(`    Error message: "${res.error}"`);
    }
  }

  console.log(`\nOverall Backend Validation Result: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  await mongoose.disconnect();
  process.exit(allPassed ? 0 : 1);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
