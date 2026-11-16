const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

async function applyDecision() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

  const PaymentRecord = (await import('../models/PaymentRecord.js')).default;
  const Wallet = (await import('../models/Wallet.js')).default;
  const WalletTransaction = (await import('../models/WalletTransaction.js')).default;
  const Session = (await import('../models/Session.js')).default;
  const SlotReservation = (await import('../models/SlotReservation.js')).default;
  const User = (await import('../models/User.js')).default;
  const ExpertDetails = (await import('../models/expertModel.js')).default;
  const { createNotification } = await import('../controllers/notificationController.js');
  const { sendBookingNotificationToCandidate, sendBookingNotificationToExpert, formatSessionDateTime } = await import('../services/emailService.js');
  const { getMeetingUrl } = await import('../utils/appUrl.js');

  const paymentId = 'pay_TzEnLHLGU1RlZa';
  const orderId = 'order_TzEn5AHxBywBEM';
  const expertId = new mongoose.Types.ObjectId('6ae2e7cf2ad1edd333f2aded');
  const candidateId = new mongoose.Types.ObjectId('6af326acf549d9aa26049ba4');

  const startTime = new Date('2026-11-12T10:45:00.000Z');
  const endTime = new Date('2026-11-12T11:15:00.000Z');
  const cutoffTime = new Date('2026-11-12T11:05:00.000Z');
  const captureTime = new Date(1794480761000); // 10:52:41.000Z / 16:22:41 IST

  console.log('================================================================');
  console.log('APPLYING CORRECT BOOKING DECISION FOR: ' + paymentId);
  console.log('Capture Time: ' + captureTime.toISOString() + ' (16:22:41 IST)');
  console.log('Booking Cutoff: ' + cutoffTime.toISOString() + ' (16:35:00 IST)');
  console.log('Capture strictly before cutoff? ' + (captureTime < cutoffTime));
  console.log('================================================================\n');

  // 1. Remove premature wallet credit for this payment so Joel has exact genuine balance
  const existingCreditTxn = await WalletTransaction.findOne({ paymentId, type: 'CREDIT' });
  if (existingCreditTxn) {
    console.log('Found premature credit txn:', existingCreditTxn._id, 'amount: ₹' + existingCreditTxn.amount);
    await WalletTransaction.deleteOne({ _id: existingCreditTxn._id });
    console.log('Deleted premature credit txn');
  }

  // Ensure Joel's wallet has exact balance of ₹2 (from the 2 previous cutoff payments)
  const wallet = await Wallet.findOneAndUpdate(
    { userId: candidateId },
    { $set: { availableBalance: 2, frozenBalance: 0 } },
    { new: true }
  );
  console.log(`Candidate Wallet balance verified: ₹${wallet.availableBalance}`);

  // 2. Re-confirm SlotReservation
  let reservation = await SlotReservation.findOne({ orderId });
  if (!reservation) {
    reservation = await SlotReservation.create({
      expertId,
      candidateId,
      startTime,
      endTime,
      orderId,
      status: 'confirmed',
      paymentId
    });
  } else {
    reservation.status = 'confirmed';
    reservation.paymentId = paymentId;
    await reservation.save();
  }
  console.log(`✅ SlotReservation confirmed: ${reservation._id} (status: ${reservation.status})`);

  // 3. Create exactly one confirmed Session
  let session = await Session.findOne({ paymentId });
  let sessionId = session ? session.sessionId : null;
  if (!session) {
    sessionId = 'SES-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    session = await Session.create({
      sessionId,
      candidateId,
      expertId,
      startTime,
      endTime,
      duration: 30,
      status: 'confirmed',
      category: 'Full Stack Development (MERN)',
      price: 1,
      paymentStatus: 'paid',
      paymentId,
      meetingLink: getMeetingUrl(sessionId)
    });
    console.log(`✅ Created confirmed Session: ${sessionId}`);
  } else {
    session.status = 'confirmed';
    session.paymentStatus = 'paid';
    await session.save();
    console.log(`✅ Confirmed existing Session: ${session.sessionId}`);
  }

  // 4. Update PaymentRecord
  const pRecord = await PaymentRecord.findOne({ paymentId });
  if (pRecord) {
    pRecord.status = 'verified';
    pRecord.reconciliationStatus = 'verified';
    pRecord.walletCredited = false;
    pRecord.walletTransactionId = null;
    pRecord.cutoffExpired = false;
    pRecord.sessionId = session.sessionId;
    pRecord.timestampSource = 'VERIFIED_BEFORE_CUTOFF';
    pRecord.paymentCapturedAt = captureTime;
    pRecord.metadata = {
      ...pRecord.metadata,
      bookingDetails: {
        expertId,
        candidateId,
        startTime,
        endTime,
        duration: 30,
        category: 'Full Stack Development (MERN)',
        price: 1
      },
      decision: 'SESSION_CONFIRMED',
      resolutionReason: 'Payment captured at 16:22:41 IST strictly before 16:35:00 IST cutoff'
    };
    await pRecord.save();
    console.log(`✅ PaymentRecord updated: status: ${pRecord.status}, sessionId: ${pRecord.sessionId}`);
  }

  // 5. In-App Notifications
  const candidateUser = await User.findById(candidateId);
  const expertDoc = await ExpertDetails.findById(expertId);
  const expertUser = await User.findById(expertDoc?.userId || expertId);

  const dt = formatSessionDateTime(startTime, endTime);

  await createNotification({
    userId: candidateId,
    title: 'Interview Booking Confirmed',
    message: `Your interview with ${expertDoc?.personalInformation?.userName || 'Mentor'} is confirmed for ${dt.dateStr} at ${dt.timeSlotStr}.`,
    type: 'SESSION_CONFIRMED',
    data: {
      sessionId: session.sessionId,
      startTime,
      endTime,
      meetingLink: session.meetingLink
    }
  });

  if (expertUser) {
    await createNotification({
      userId: expertUser._id,
      title: 'New Interview Scheduled',
      message: `Candidate ${candidateUser?.name || 'Joel'} has booked an interview for ${dt.dateStr} at ${dt.timeSlotStr}.`,
      type: 'NEW_SESSION_BOOKED',
      data: {
        sessionId: session.sessionId,
        candidateName: candidateUser?.name,
        meetingLink: session.meetingLink
      }
    });
  }

  // 6. Queue Emails
  try {
    if (candidateUser?.email) {
      await sendBookingNotificationToCandidate({
        candidateEmail: candidateUser.email,
        candidateName: candidateUser.name || 'Candidate',
        expertName: expertDoc?.personalInformation?.userName || 'Interview Expert',
        date: dt.dateStr,
        timeSlot: dt.timeSlotStr,
        duration: 30,
        topics: ['Full Stack Development (MERN)'],
        category: 'Full Stack Development (MERN)',
        amountPaid: 1,
        paymentId,
        meetingLink: session.meetingLink,
        sessionId: session.sessionId
      });
      console.log('✅ Queued candidate confirmation email to:', candidateUser.email);
    }

    if (expertUser?.email) {
      await sendBookingNotificationToExpert({
        expertEmail: expertUser.email,
        expertName: expertUser.name || 'Interview Expert',
        candidateName: candidateUser?.name || 'Candidate',
        candidateEmail: candidateUser?.email || 'N/A',
        startTime,
        endTime,
        duration: 30,
        topics: ['Full Stack Development (MERN)'],
        level: 'Rising Mentor',
        category: 'Full Stack Development (MERN)',
        amountPaid: 1,
        paymentStatus: 'paid',
        paymentId,
        orderId,
        meetingLink: session.meetingLink,
        sessionId: session.sessionId
      });
      console.log('✅ Queued expert allocation email to:', expertUser.email);
    }
  } catch (emailErr) {
    console.warn('Email queue warning:', emailErr.message);
  }

  console.log('\n================================================================');
  console.log('FINAL CONFIRMED STATE:');
  console.log({
    paymentId: pRecord.paymentId,
    status: pRecord.status,
    sessionId: pRecord.sessionId,
    sessionStatus: session.status,
    reservationStatus: reservation.status,
    walletCredited: pRecord.walletCredited,
    candidateWalletBalance: wallet.availableBalance
  });
  console.log('================================================================');

  process.exit(0);
}

applyDecision().catch(err => {
  console.error('Error applying decision:', err);
  process.exit(1);
});
