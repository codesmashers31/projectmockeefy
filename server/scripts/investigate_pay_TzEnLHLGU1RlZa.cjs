const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '../.env') });
const Razorpay = require('razorpay');

const rz = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

async function trace() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(uri);

  const PaymentRecord = (await import('../models/PaymentRecord.js')).default;
  const Wallet = (await import('../models/Wallet.js')).default;
  const WalletTransaction = (await import('../models/WalletTransaction.js')).default;
  const Session = (await import('../models/Session.js')).default;
  const SlotReservation = (await import('../models/SlotReservation.js')).default;
  const User = (await import('../models/User.js')).default;

  const paymentId = 'pay_TzEnLHLGU1RlZa';

  console.log('================================================================');
  console.log(`INVESTIGATING EXACT PAYMENT: ${paymentId}`);
  console.log('================================================================\n');

  // 1. Fetch live Razorpay payment
  let payment = null;
  try {
    payment = await rz.payments.fetch(paymentId);
    console.log('1. RAZORPAY PAYMENT ENTITY:');
    console.log({
      id: payment.id,
      order_id: payment.order_id,
      amount: payment.amount / 100,
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      captured: payment.captured,
      captured_at: payment.captured_at,
      captured_at_iso: payment.captured_at ? new Date(payment.captured_at * 1000).toISOString() : null,
      created_at: payment.created_at,
      created_at_iso: payment.created_at ? new Date(payment.created_at * 1000).toISOString() : null,
      description: payment.description,
      notes: payment.notes
    });
  } catch (err) {
    console.error('Error fetching Razorpay payment:', err.message);
  }

  // 2. Fetch live Razorpay order
  let order = null;
  if (payment?.order_id) {
    try {
      order = await rz.orders.fetch(payment.order_id);
      console.log('\n2. RAZORPAY ORDER ENTITY:');
      console.log({
        id: order.id,
        amount: order.amount / 100,
        amount_paid: order.amount_paid / 100,
        status: order.status,
        created_at: new Date(order.created_at * 1000).toISOString(),
        notes: order.notes
      });
    } catch (err) {
      console.error('Error fetching Razorpay order:', err.message);
    }
  }

  // 3. MongoDB PaymentRecord
  const record = await PaymentRecord.findOne({ paymentId });
  console.log('\n3. MONGODB PaymentRecord:');
  console.log(record ? {
    paymentId: record.paymentId,
    orderId: record.orderId,
    userId: record.userId,
    amount: record.amount,
    status: record.status,
    reconciliationStatus: record.reconciliationStatus,
    timestampSource: record.timestampSource,
    walletCredited: record.walletCredited,
    cutoffExpired: record.cutoffExpired,
    paymentCapturedAt: record.paymentCapturedAt,
    providerEventTimestamp: record.providerEventTimestamp,
    serverReceiptTimestamp: record.serverReceiptTimestamp,
    sessionId: record.sessionId,
    metadata: record.metadata
  } : 'PaymentRecord NOT FOUND in MongoDB');

  // 4. SlotReservation
  const orderIdToSearch = payment?.order_id || record?.orderId;
  if (orderIdToSearch) {
    const reservation = await SlotReservation.findOne({ orderId: orderIdToSearch });
    console.log('\n4. MONGODB SlotReservation:');
    console.log(reservation ? {
      orderId: reservation.orderId,
      expertId: reservation.expertId,
      candidateId: reservation.candidateId,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      status: reservation.status,
      expiresAt: reservation.expiresAt,
      paymentId: reservation.paymentId
    } : 'SlotReservation NOT FOUND for order ' + orderIdToSearch);
  }

  // 5. Existing Session
  const session = await Session.findOne({
    $or: [
      { paymentId },
      { sessionId: record?.sessionId }
    ].filter(Boolean)
  });
  console.log('\n5. MONGODB Session:');
  console.log(session ? {
    sessionId: session.sessionId,
    status: session.status,
    expertId: session.expertId,
    candidateId: session.candidateId,
    startTime: session.startTime,
    endTime: session.endTime,
    price: session.price,
    paymentStatus: session.paymentStatus
  } : 'Session NOT FOUND');

  // 6. Wallet & WalletTransaction
  if (record?.userId) {
    const user = await User.findById(record.userId);
    console.log('\n6. CANDIDATE USER:');
    console.log(user ? `${user.name} (${user.email}) [ID: ${user._id}]` : 'User NOT FOUND');

    const wallet = await Wallet.findOne({ userId: record.userId });
    console.log('Wallet availableBalance: ₹' + (wallet ? wallet.availableBalance : 'No wallet'));

    const txns = await WalletTransaction.find({ paymentId });
    console.log('WalletTransaction for this paymentId count:', txns.length);
    console.log(txns);
  }

  process.exit(0);
}

trace().catch(err => {
  console.error('Fatal error in trace:', err);
  process.exit(1);
});
