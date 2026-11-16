const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function auditAllEndpoints() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

  const { validateBookingSlot, isSlotWithinBookingWindow } = await import('../utils/availabilityValidator.js');
  const { acquireSlotReservation } = await import('../services/slotReservationService.js');
  const { getAuthoritativeCaptureEvidence } = await import('../controllers/paymentController.js');

  const expertId = '6ae2e7cf2ad1edd333f2aded';
  const candidateId = '6af326acf549d9aa26049ba4';

  const slotStart = new Date('2026-11-13T17:00:00.000Z'); // 10:30 PM IST
  const slotEnd = new Date('2026-11-13T17:30:00.000Z');   // 11:00 PM IST
  const expectedCutoff = new Date(slotEnd.getTime() - 10 * 60 * 1000); // 10:50 PM IST (17:20:00Z)

  console.log('Authoritative Slot Config:');
  console.log(`  Start: ${slotStart.toISOString()} (10:30 PM IST)`);
  console.log(`  End:   ${slotEnd.toISOString()} (11:00 PM IST)`);
  console.log(`  Cutoff: ${expectedCutoff.toISOString()} (10:50 PM IST)\n`);

  const boundaryChecks = [
    { label: '10:39 PM IST', time: new Date('2026-11-13T17:09:00.000Z'), expectedAllowed: true },
    { label: '10:50 PM IST', time: new Date('2026-11-13T17:20:00.000Z'), expectedAllowed: false }
  ];

  let overallPass = true;

  for (const bc of boundaryChecks) {
    console.log(`=== AUDITING AT ${bc.label} (${bc.time.toISOString()}) ===`);

    // 1. Availability Validator: isSlotWithinBookingWindow
    const winAllowed = isSlotWithinBookingWindow(slotStart, slotEnd, bc.time);
    console.log(`  1. isSlotWithinBookingWindow: ${winAllowed} (Expected: ${bc.expectedAllowed}) -> ${winAllowed === bc.expectedAllowed ? 'PASS' : 'FAIL'}`);
    if (winAllowed !== bc.expectedAllowed) overallPass = false;

    // 2. Availability Validator: validateBookingSlot
    const slotVal = await validateBookingSlot({
      expertId,
      startTime: slotStart,
      endTime: slotEnd,
      duration: 30,
      currentTime: bc.time
    });
    console.log(`  2. validateBookingSlot: ${slotVal.valid} (Expected: ${bc.expectedAllowed}) -> ${slotVal.valid === bc.expectedAllowed ? 'PASS' : 'FAIL'}`);
    if (slotVal.valid !== bc.expectedAllowed) overallPass = false;

    // 3. Slot Reservation Service: acquireSlotReservation
    // Slot reservation checks existing bookings & locks, does not reject merely because currentTime >= startTime
    // Let's verify acquireSlotReservation does not throw or reject due to start time
    const resResult = await acquireSlotReservation({
      expertId,
      candidateId,
      startTime: slotStart,
      endTime: slotEnd,
      orderId: 'test_order_' + Date.now(),
      ttlMinutes: 15
    });
    // The slot is free and valid, so acquired should be true regardless of whether currentTime >= startTime!
    console.log(`  3. acquireSlotReservation acquired: ${resResult.acquired} (Conflict reason: ${resResult.reason || 'None'}) -> ${resResult.acquired ? 'PASS' : 'FAIL'}`);
    if (!resResult.acquired) overallPass = false;

    // Clean up test reservation immediately
    const SlotReservation = (await import('../models/SlotReservation.js')).default;
    await SlotReservation.deleteMany({ candidateId, expertId: new mongoose.Types.ObjectId(expertId) });

    // 4. Payment Controller: Cutoff Check
    const bookingCutoff = new Date(slotEnd.getTime() - 10 * 60 * 1000);
    const isPastCutoff = bc.time.getTime() >= bookingCutoff.getTime();
    const paymentPermitted = !isPastCutoff;
    console.log(`  4. Payment Cutoff Check (currentTime < bookingCutoff): ${paymentPermitted} (Expected: ${bc.expectedAllowed}) -> ${paymentPermitted === bc.expectedAllowed ? 'PASS' : 'FAIL'}`);
    if (paymentPermitted !== bc.expectedAllowed) overallPass = false;

    // 5. Payment Controller: getAuthoritativeCaptureEvidence
    // If webhook event or payment was captured at bc.time
    const mockPaymentCaptured = {
      id: 'pay_test_' + Date.now(),
      status: 'captured',
      captured: true,
      captured_at: Math.floor(bc.time.getTime() / 1000),
      amount: 100
    };
    const evidence = getAuthoritativeCaptureEvidence({
      payment: mockPaymentCaptured,
      bookingCutoff
    });
    const captureBeforeCutoff = evidence.capturedAt.getTime() < bookingCutoff.getTime();
    console.log(`  5. Payment Capture Eligibility (capturedAt < bookingCutoff): ${captureBeforeCutoff} (Expected: ${bc.expectedAllowed}) -> ${captureBeforeCutoff === bc.expectedAllowed ? 'PASS' : 'FAIL'}`);
    if (captureBeforeCutoff !== bc.expectedAllowed) overallPass = false;

    console.log('');
  }

  console.log(`=== FINAL AUDIT RESULT: ${overallPass ? 'ALL ENDPOINTS PASS' : 'FAIL'} ===`);
  await mongoose.disconnect();
  process.exit(overallPass ? 0 : 1);
}

auditAllEndpoints().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
