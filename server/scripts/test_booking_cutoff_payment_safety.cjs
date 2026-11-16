const mongoose = require('mongoose');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ARTIFACT_DIR = "C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\fa4cc859-e99d-440e-a4b9-ef64c859d17c";

async function runTests() {
  console.log("==================================================================");
  console.log("MOCKEEFY - BOOKING CUTOFF, PAYMENT SAFETY & NOTIFICATION TEST SUITE");
  console.log("==================================================================\n");

  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  const { validateBookingSlot } = await import('../utils/availabilityValidator.js');
  const Session = (await import('../models/Session.js')).default;
  const ExpertDetails = (await import('../models/expertModel.js')).default;
  const User = (await import('../models/User.js')).default;
  const PaymentRecord = (await import('../models/PaymentRecord.js')).default;
  const Notification = (await import('../models/Notification.js')).default;
  const { verifyPayment, createOrder } = await import('../controllers/paymentController.js');

  // Find or create test expert and candidate
  let expertUser = await User.findOne({ email: 'expert.test@mockeefy.com' });
  if (!expertUser) {
    expertUser = await User.create({
      name: 'Dr. Expert Test',
      email: 'expert.test@mockeefy.com',
      password: 'testPassword123',
      userType: 'expert',
      role: 'expert',
      category: 'Information Technology'
    });
  }

  let expertDoc = await ExpertDetails.findOne({ userId: expertUser._id });
  if (!expertDoc) {
    expertDoc = await ExpertDetails.create({
      userId: expertUser._id,
      personalInformation: {
        userName: 'Dr. Expert Test',
        email: expertUser.email,
        category: 'Information Technology'
      },
      professionalDetails: {
        title: 'Principal Software Architect',
        level: 'Elite Mentor'
      },
      availability: {
        sessionDuration: 30,
        allowedDurations: [30, 60],
        maxPerDay: 8,
        timezone: 'Asia/Kolkata',
        weekly: {
          wednesday: [{ from: '09:00', to: '17:00' }],
          thursday: [{ from: '09:00', to: '17:00' }],
          friday: [{ from: '09:00', to: '17:00' }]
        },
        breakDates: []
      },
      status: 'Active'
    });
  } else {
    expertDoc.availability.allowedDurations = [30, 60];
    expertDoc.availability.weekly = {
      wednesday: [{ from: '09:00', to: '17:00' }],
      thursday: [{ from: '09:00', to: '17:00' }],
      friday: [{ from: '09:00', to: '17:00' }]
    };
    await expertDoc.save();
  }

  let candidateUser = await User.findOne({ email: 'candidate.test@mockeefy.com' });
  if (!candidateUser) {
    candidateUser = await User.create({
      name: 'Jane Candidate',
      email: 'candidate.test@mockeefy.com',
      password: 'testPassword123',
      userType: 'candidate',
      role: 'candidate'
    });
  }

  let testPassed = 0;
  let testFailed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      testPassed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      testFailed++;
    }
  }

  // Target slot date: A Thursday
  const testDateStr = '2026-11-19'; // A Thursday
  const slot30Start = new Date(`${testDateStr}T09:00:00+05:30`);
  const slot30End = new Date(`${testDateStr}T09:30:00+05:30`);
  // Expected Cutoff: 09:30 - 10 min = 09:20:00+05:30

  console.log("\n--- TEST GROUP 1: Controllable Clock - 30 Min Slot (09:00 - 09:30 AM, Cutoff: 09:20 AM) ---");

  // 1. Booking before scheduled start (08:59 AM)
  const clock1 = new Date(`${testDateStr}T08:59:00+05:30`);
  const res1 = await validateBookingSlot({
    expertId: expertDoc._id,
    startTime: slot30Start,
    endTime: slot30End,
    duration: 30,
    currentTime: clock1
  });
  assert(res1.valid === true, "1. Booking before scheduled start (08:59 AM) must be ALLOWED");

  // 2. Booking exactly at scheduled start (09:00 AM)
  const clock2 = new Date(`${testDateStr}T09:00:00+05:30`);
  const res2 = await validateBookingSlot({
    expertId: expertDoc._id,
    startTime: slot30Start,
    endTime: slot30End,
    duration: 30,
    currentTime: clock2
  });
  assert(res2.valid === true, "2. Booking exactly at scheduled start (09:00 AM) must be ALLOWED");

  // 3. Booking after start with >10 mins remaining (09:10 AM - 20 mins remain)
  const clock3 = new Date(`${testDateStr}T09:10:00+05:30`);
  const res3 = await validateBookingSlot({
    expertId: expertDoc._id,
    startTime: slot30Start,
    endTime: slot30End,
    duration: 30,
    currentTime: clock3
  });
  assert(res3.valid === true, "3. Booking after start with 20 mins remaining (09:10 AM) must be ALLOWED");

  // 4. Booking 1 min before cutoff (09:19 AM - 11 mins remain)
  const clock4 = new Date(`${testDateStr}T09:19:00+05:30`);
  const res4 = await validateBookingSlot({
    expertId: expertDoc._id,
    startTime: slot30Start,
    endTime: slot30End,
    duration: 30,
    currentTime: clock4
  });
  assert(res4.valid === true, "4. Booking 1 minute before cutoff (09:19 AM) must be ALLOWED");

  // 5. Booking exactly at cutoff (09:20 AM - exactly 10 mins remain)
  const clock5 = new Date(`${testDateStr}T09:20:00+05:30`);
  const res5 = await validateBookingSlot({
    expertId: expertDoc._id,
    startTime: slot30Start,
    endTime: slot30End,
    duration: 30,
    currentTime: clock5
  });
  assert(res5.valid === false && res5.cutoffExpired === true, "5. Booking exactly at cutoff (09:20 AM) must be REJECTED with cutoffExpired: true");

  // 6. Booking after cutoff (09:25 AM - 5 mins remain)
  const clock6 = new Date(`${testDateStr}T09:25:00+05:30`);
  const res6 = await validateBookingSlot({
    expertId: expertDoc._id,
    startTime: slot30Start,
    endTime: slot30End,
    duration: 30,
    currentTime: clock6
  });
  assert(res6.valid === false && res6.cutoffExpired === true, "6. Booking after cutoff (09:25 AM) must be REJECTED with cutoffExpired: true");

  console.log("\n--- TEST GROUP 2: Controllable Clock - 60 Min Slot (10:00 - 11:00 AM, Cutoff: 10:50 AM) ---");
  const slot60Start = new Date(`${testDateStr}T10:00:00+05:30`);
  const slot60End = new Date(`${testDateStr}T11:00:00+05:30`);

  // 7. 60-min slot: 1 min before cutoff (10:49 AM)
  const clock7 = new Date(`${testDateStr}T10:49:00+05:30`);
  const res7 = await validateBookingSlot({
    expertId: expertDoc._id,
    startTime: slot60Start,
    endTime: slot60End,
    duration: 60,
    currentTime: clock7
  });
  assert(res7.valid === true, "7. 60-min slot: Booking 1 min before cutoff (10:49 AM) must be ALLOWED");

  // 8. 60-min slot: Exactly at cutoff (10:50 AM)
  const clock8 = new Date(`${testDateStr}T10:50:00+05:30`);
  const res8 = await validateBookingSlot({
    expertId: expertDoc._id,
    startTime: slot60Start,
    endTime: slot60End,
    duration: 60,
    currentTime: clock8
  });
  assert(res8.valid === false && res8.cutoffExpired === true, "8. 60-min slot: Booking at cutoff (10:50 AM) must be REJECTED with cutoffExpired: true");

  console.log("\n--- TEST GROUP 3: Payment Safety - Late Payment Verification & Automatic Refund ---");
  
  // Clean up any test sessions
  await Session.deleteMany({ candidateId: candidateUser._id, notes: /CUTOFF-TEST/ });
  await PaymentRecord.deleteMany({ userId: candidateUser._id });

  // Generate valid Razorpay signature for testing
  const mockOrderId = `order_${Date.now()}`;
  const mockPaymentId = `pay_${Date.now()}_expired`;
  const razorpaySecret = process.env.RAZORPAY_KEY_SECRET || "code@1234";
  const validSignature = crypto
    .createHmac('sha256', razorpaySecret)
    .update(`${mockOrderId}|${mockPaymentId}`)
    .digest('hex');

  // Simulate late payment verification where slot endTime was 30 mins ago
  const expiredSlotStart = new Date(Date.now() - 40 * 60 * 1000);
  const expiredSlotEnd = new Date(Date.now() - 10 * 60 * 1000); // Ended 10 min ago, cutoff was 20 min ago

  const mockReqExpired = {
    body: {
      razorpay_order_id: mockOrderId,
      razorpay_payment_id: mockPaymentId,
      razorpay_signature: validSignature,
      paymentType: 'booking',
      user: { id: candidateUser._id, name: candidateUser.name, email: candidateUser.email },
      bookingDetails: {
        expertId: expertDoc._id.toString(),
        expertName: expertDoc.personalInformation.userName,
        candidateId: candidateUser._id.toString(),
        candidateName: candidateUser.name,
        candidateEmail: candidateUser.email,
        startTime: expiredSlotStart,
        endTime: expiredSlotEnd,
        price: 500,
        duration: 30,
        notes: "CUTOFF-TEST-EXPIRED"
      }
    }
  };

  let resStatus = 200;
  let resJson = null;
  const mockResExpired = {
    status: (s) => { resStatus = s; return mockResExpired; },
    json: (j) => { resJson = j; return mockResExpired; }
  };

  await verifyPayment(mockReqExpired, mockResExpired);

  assert(resStatus === 400, "9. Late payment verification must return HTTP 400");
  assert(resJson?.cutoffExpired === true, "10. Late payment verification must flag cutoffExpired: true");
  assert(resJson?.success === false, "11. Late payment verification must return success: false");

  // Verify session was NOT created
  const expiredSessionCheck = await Session.findOne({ candidateId: candidateUser._id, notes: /CUTOFF-TEST-EXPIRED/ });
  assert(!expiredSessionCheck, "12. Expired slot must NEVER create or confirm a Session");

  // Verify PaymentRecord was saved as refunded
  const paymentRecordCheck = await PaymentRecord.findOne({ paymentId: mockPaymentId });
  assert(paymentRecordCheck !== null, "13. Expired payment must be tracked in PaymentRecord");
  assert(paymentRecordCheck?.cutoffExpired === true, "14. PaymentRecord must record cutoffExpired: true");

  console.log("\n--- TEST GROUP 4: Idempotency & Anti-Replay Protection ---");
  // Retry same expired payment callback
  let replayStatus = 200;
  let replayJson = null;
  const mockResReplay = {
    status: (s) => { replayStatus = s; return mockResReplay; },
    json: (j) => { replayJson = j; return mockResReplay; }
  };
  await verifyPayment(mockReqExpired, mockResReplay);
  assert(replayJson?.alreadyRefunded === true || replayStatus === 400, "15. Replayed payment callback must be handled idempotently");

  console.log("\n--- TEST GROUP 5: Successful Future Booking, In-App Notifications & Confirmation Emails ---");
  
  // Future slot: Tomorrow at 10:00 AM (Friday)
  const tomorrowStart = new Date();
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  // Ensure it falls on a Thursday or Friday
  while (tomorrowStart.getDay() !== 4 && tomorrowStart.getDay() !== 5) {
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  }
  tomorrowStart.setHours(10, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart.getTime() + 30 * 60 * 1000);

  const validOrderId = `order_${Date.now()}_future`;
  const validPaymentId = `pay_${Date.now()}_future`;
  const validFutureSig = crypto
    .createHmac('sha256', razorpaySecret)
    .update(`${validOrderId}|${validPaymentId}`)
    .digest('hex');

  const mockReqFuture = {
    body: {
      razorpay_order_id: validOrderId,
      razorpay_payment_id: validPaymentId,
      razorpay_signature: validFutureSig,
      paymentType: 'booking',
      user: { id: candidateUser._id, name: candidateUser.name, email: candidateUser.email },
      bookingDetails: {
        expertId: expertDoc._id.toString(),
        expertName: expertDoc.personalInformation.userName,
        candidateId: candidateUser._id.toString(),
        candidateName: candidateUser.name,
        candidateEmail: candidateUser.email,
        startTime: tomorrowStart,
        endTime: tomorrowEnd,
        price: 500,
        duration: 30,
        topics: ["Information Technology"],
        notes: "CUTOFF-TEST-FUTURE"
      }
    }
  };

  let futureResStatus = 200;
  let futureResJson = null;
  const mockResFuture = {
    status: (s) => { futureResStatus = s; return mockResFuture; },
    json: (j) => { futureResJson = j; return mockResFuture; }
  };

  await verifyPayment(mockReqFuture, mockResFuture);

  assert(futureResStatus === 200, "16. Valid future payment verification must return HTTP 200");
  assert(futureResJson?.success === true, "17. Valid future payment verification must return success: true");

  const createdSession = await Session.findOne({ candidateId: candidateUser._id, notes: /CUTOFF-TEST-FUTURE/ });
  assert(createdSession !== null && createdSession.status === 'confirmed', "18. Confirmed session must exist in MongoDB");

  // Check In-App Notification for Candidate
  const candidateNotif = await Notification.findOne({
    userId: candidateUser._id,
    type: 'booking_confirmed',
    'metadata.sessionId': createdSession.sessionId
  });
  assert(candidateNotif !== null, "19. Candidate must receive In-App Notification");
  assert(candidateNotif?.message.includes("Information Technology"), "20. Candidate notification must include domain name");
  assert(candidateNotif?.metadata?.link === '/my-sessions', "21. Candidate notification must link to /my-sessions");

  // Check In-App Notification for Expert
  const expertNotif = await Notification.findOne({
    userId: expertUser._id,
    type: 'booking_confirmed',
    'metadata.sessionId': createdSession.sessionId
  });
  assert(expertNotif !== null, "22. Expert must receive In-App Notification");
  assert(expertNotif?.message.includes(candidateUser.name), "23. Expert notification must include candidate name");
  assert(expertNotif?.metadata?.link === '/dashboard/sessions', "24. Expert notification must link to /dashboard/sessions");

  console.log("\n--- TEST GROUP 6: Concurrency Protection (Double Booking Prevention) ---");
  // Second candidate attempts to confirm the exact same slot that was just confirmed
  const concurrentPaymentId = `pay_${Date.now()}_concurrent`;
  const concurrentSig = crypto
    .createHmac('sha256', razorpaySecret)
    .update(`${validOrderId}|${concurrentPaymentId}`)
    .digest('hex');

  const mockReqConcurrent = {
    body: {
      razorpay_order_id: validOrderId,
      razorpay_payment_id: concurrentPaymentId,
      razorpay_signature: concurrentSig,
      paymentType: 'booking',
      user: { id: candidateUser._id, name: "Second Candidate", email: "second@test.com" },
      bookingDetails: {
        expertId: expertDoc._id.toString(),
        candidateId: candidateUser._id.toString(),
        startTime: tomorrowStart,
        endTime: tomorrowEnd,
        price: 500,
        duration: 30,
        notes: "CUTOFF-TEST-CONCURRENT"
      }
    }
  };

  let concurrentStatus = 200;
  let concurrentJson = null;
  const mockResConcurrent = {
    status: (s) => { concurrentStatus = s; return mockResConcurrent; },
    json: (j) => { concurrentJson = j; return mockResConcurrent; }
  };

  await verifyPayment(mockReqConcurrent, mockResConcurrent);

  assert(concurrentStatus === 409 || concurrentStatus === 400, "25. Concurrent double-booking must be REJECTED (HTTP 409/400)");
  assert(concurrentJson?.success === false, "26. Concurrent double-booking must return success: false");

  // Clean up test data
  await Session.deleteMany({ notes: /CUTOFF-TEST/ });
  await PaymentRecord.deleteMany({ userId: candidateUser._id });
  await Notification.deleteMany({ 'metadata.sessionId': createdSession.sessionId });

  console.log("\n==================================================================");
  console.log(`TEST SUMMARY: ${testPassed} PASSED, ${testFailed} FAILED`);
  console.log("==================================================================\n");

  await mongoose.disconnect();
  process.exit(testFailed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
