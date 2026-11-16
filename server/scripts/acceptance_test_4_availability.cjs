/**
 * ACCEPTANCE TEST 4: AVAILABILITY AND FLICKERING
 *
 * Verifies:
 * 1. Expert slot 11:00 AM – 11:30 AM:
 *    - 11:00: available.
 *    - 11:10: available.
 *    - 11:19: available.
 *    - 11:20: new booking rejected.
 * 2. Slot stability: 50 rapid calls yield identical deterministic slots without flickering.
 * 3. Concurrent reservation locking: Second candidate cannot reserve the same slot.
 * 4. Timezone conversion: Asia/Kolkata calculations are exact.
 */

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const assert = require('assert');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  console.log('================================================================');
  console.log('   ACCEPTANCE TEST 4: AVAILABILITY & FLICKERING VERIFICATION');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('Connected to MongoDB:', mongoose.connection.name);

  const User = (await import('../models/User.js')).default;
  const Session = (await import('../models/Session.js')).default;
  const SlotReservation = (await import('../models/SlotReservation.js')).default;
  const { isSlotWithinBookingWindow, validateBookingSlot, getDateStringInTimezone, getTimePartsInTimezone } = await import('../utils/availabilityValidator.js');
  const { acquireSlotReservation, releaseSlotReservation } = await import('../services/slotReservationService.js');

  const testSuffix = Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  const testCandidateA = await User.create({
    name: 'Candidate A ' + testSuffix,
    email: `cand_a_${testSuffix}@mockeefy.test`,
    password: 'password123',
    userType: 'candidate',
    role: 'candidate'
  });

  const testCandidateB = await User.create({
    name: 'Candidate B ' + testSuffix,
    email: `cand_b_${testSuffix}@mockeefy.test`,
    password: 'password123',
    userType: 'candidate',
    role: 'candidate'
  });

  const testExpert = await User.create({
    name: 'Expert Avail ' + testSuffix,
    email: `exp_avail_${testSuffix}@mockeefy.test`,
    password: 'password123',
    userType: 'expert',
    role: 'expert'
  });

  try {
    // -------------------------------------------------------------
    // Part 1: Slot 11:00 AM – 11:30 AM Cutoff Verification
    // -------------------------------------------------------------
    console.log('\n--- Part 1: 11:00 AM – 11:30 AM Booking Window Validation ---');

    // Slot: 11:00 AM to 11:30 AM IST (05:30 to 06:00 UTC)
    const slotStart = new Date('2026-11-20T05:30:00.000Z'); // 11:00 AM IST
    const slotEnd = new Date('2026-11-20T06:00:00.000Z');   // 11:30 AM IST
    const cutoffTime = new Date('2026-11-20T05:50:00.000Z'); // 11:20 AM IST

    // At 11:00:00 IST
    const time1100 = new Date('2026-11-20T05:30:00.000Z');
    const isAvail1100 = isSlotWithinBookingWindow(slotStart, slotEnd, time1100);
    console.log('11:00 AM Status:', isAvail1100 ? 'AVAILABLE' : 'REJECTED');
    assert.strictEqual(isAvail1100, true, 'Slot must be available at 11:00 AM');

    // At 11:10:00 IST
    const time1110 = new Date('2026-11-20T05:40:00.000Z');
    const isAvail1110 = isSlotWithinBookingWindow(slotStart, slotEnd, time1110);
    console.log('11:10 AM Status:', isAvail1110 ? 'AVAILABLE' : 'REJECTED');
    assert.strictEqual(isAvail1110, true, 'Slot must be available at 11:10 AM');

    // At 11:19:00 IST (1 minute before cutoff)
    const time1119 = new Date('2026-11-20T05:49:00.000Z');
    const isAvail1119 = isSlotWithinBookingWindow(slotStart, slotEnd, time1119);
    console.log('11:19 AM Status:', isAvail1119 ? 'AVAILABLE' : 'REJECTED');
    assert.strictEqual(isAvail1119, true, 'Slot must be available at 11:19 AM');

    // At 11:20:00 IST (Exactly at cutoff)
    const time1120 = new Date('2026-11-20T05:50:00.000Z');
    const isAvail1120 = isSlotWithinBookingWindow(slotStart, slotEnd, time1120);
    console.log('11:20 AM Status:', isAvail1120 ? 'AVAILABLE' : 'REJECTED');
    assert.strictEqual(isAvail1120, false, 'Slot must be strictly rejected at 11:20 AM cutoff');

    // At 11:21:00 IST (After cutoff)
    const time1121 = new Date('2026-11-20T05:51:00.000Z');
    const isAvail1121 = isSlotWithinBookingWindow(slotStart, slotEnd, time1121);
    console.log('11:21 AM Status:', isAvail1121 ? 'AVAILABLE' : 'REJECTED');
    assert.strictEqual(isAvail1121, false, 'Slot must be rejected after cutoff');

    console.log('✅ Criteria 1 Passed: 11:00 (Avail), 11:10 (Avail), 11:19 (Avail), 11:20 (Rejected).');

    // -------------------------------------------------------------
    // Part 2: Repeat Refresh & Anti-Flicker Stability Test
    // -------------------------------------------------------------
    console.log('\n--- Part 2: Rapid Refresh & Deterministic Slot Stability ---');
    const resultsAcrossCalls = [];
    for (let i = 0; i < 50; i++) {
      const isAvail = isSlotWithinBookingWindow(slotStart, slotEnd, time1110);
      resultsAcrossCalls.push(isAvail);
    }
    const allAvailable = resultsAcrossCalls.every(r => r === true);
    assert.strictEqual(allAvailable, true, 'All 50 rapid evaluations must yield identical AVAILABLE result');
    console.log('✅ Criteria 2 Passed: 50/50 rapid evaluations produced identical results. Zero flickering.');

    // -------------------------------------------------------------
    // Part 3: Concurrent Slot Reservation Locking
    // -------------------------------------------------------------
    console.log('\n--- Part 3: Slot Reservation Locking Between Two Candidates ---');
    const orderIdA = `order_cand_a_${testSuffix}`;
    const orderIdB = `order_cand_b_${testSuffix}`;

    // Candidate A reserves slot
    const resA = await acquireSlotReservation({
      expertId: testExpert._id,
      candidateId: testCandidateA._id,
      startTime: slotStart,
      endTime: slotEnd,
      orderId: orderIdA
    });

    console.log('Candidate A Reservation Result:', resA.acquired ? 'ACQUIRED' : 'FAILED');
    assert.strictEqual(resA.acquired, true, 'Candidate A must successfully reserve the slot');

    // Candidate B attempts to reserve the same slot
    const resB = await acquireSlotReservation({
      expertId: testExpert._id,
      candidateId: testCandidateB._id,
      startTime: slotStart,
      endTime: slotEnd,
      orderId: orderIdB
    });

    console.log('Candidate B Reservation Result:', resB.acquired ? 'ACQUIRED' : 'FAILED', `(Reason: ${resB.reason || resB.conflictType})`);
    assert.strictEqual(resB.acquired, false, 'Candidate B must be prevented from reserving the same slot');
    assert.strictEqual(resB.conflictType, 'active_reservation');
    console.log('✅ Criteria 3 Passed: Candidate B is prevented from reserving the locked slot.');

    // Release Candidate A reservation
    await releaseSlotReservation({ orderId: orderIdA });
    console.log('Released Candidate A reservation.');

    // Candidate B tries again after release
    const resBAfterRelease = await acquireSlotReservation({
      expertId: testExpert._id,
      candidateId: testCandidateB._id,
      startTime: slotStart,
      endTime: slotEnd,
      orderId: orderIdB
    });
    console.log('Candidate B Reservation after Release:', resBAfterRelease.acquired ? 'ACQUIRED' : 'FAILED');
    assert.strictEqual(resBAfterRelease.acquired, true, 'Candidate B can reserve once Candidate A releases reservation');
    await releaseSlotReservation({ orderId: orderIdB });

    // -------------------------------------------------------------
    // Part 4: Timezone Conversion Accuracy (Asia/Kolkata)
    // -------------------------------------------------------------
    console.log('\n--- Part 4: Timezone Conversion Accuracy ---');
    const dateStr = getDateStringInTimezone(slotStart, 'Asia/Kolkata');
    const timeParts = getTimePartsInTimezone(slotStart, 'Asia/Kolkata');
    console.log(`Slot Start 05:30 UTC -> Asia/Kolkata Date: ${dateStr}, Time: ${timeParts.hours}:${timeParts.minutes.toString().padStart(2, '0')}`);
    assert.strictEqual(dateStr, '2026-11-20');
    assert.strictEqual(timeParts.hours, 11);
    assert.strictEqual(timeParts.minutes, 0);
    console.log('✅ Criteria 4 Passed: Exact 11:00 AM IST conversion verified.');

    console.log('\n🎉 ALL ACCEPTANCE TEST 4 CRITERIA PASSED WITH 100% SUCCESS!');
  } finally {
    console.log('\n--- Cleaning up Test 4 records ---');
    await SlotReservation.deleteMany({ expertId: testExpert._id });
    await User.deleteMany({ _id: { $in: [testCandidateA._id, testCandidateB._id, testExpert._id] } });
    console.log('Test 4 cleanup complete.');
    await mongoose.disconnect();
  }
}

run().catch(err => {
  console.error('Test 4 Error:', err);
  process.exit(1);
});
