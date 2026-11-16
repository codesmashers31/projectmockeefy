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
  const ExpertDetails = (await import('../models/expertModel.js')).default;

  const paymentId = 'pay_TzDtaT67QJLJjg';

  console.log('================================================================');
  console.log('       INVESTIGATING AMOUNT DISCREPANCY (₹499 vs ₹1)            ');
  console.log('================================================================\n');

  // 1. Fetch live Razorpay payment
  const payment = await rz.payments.fetch(paymentId);
  console.log('1. RAZORPAY PAYMENT ENTITY:');
  console.log({
    id: payment.id,
    order_id: payment.order_id,
    amount_in_paise: payment.amount,
    amount_in_inr: payment.amount / 100,
    currency: payment.currency,
    status: payment.status,
    method: payment.method,
    description: payment.description,
    notes: payment.notes
  });

  // 2. Fetch live Razorpay order
  const order = await rz.orders.fetch(payment.order_id);
  console.log('\n2. RAZORPAY ORDER ENTITY:');
  console.log({
    id: order.id,
    amount_in_paise: order.amount,
    amount_in_inr: order.amount / 100,
    amount_paid_paise: order.amount_paid,
    amount_due_paise: order.amount_due,
    currency: order.currency,
    status: order.status,
    notes: order.notes
  });

  // 3. Inspect PaymentRecord in MongoDB
  const record = await PaymentRecord.findOne({ paymentId });
  console.log('\n3. MONGODB PaymentRecord:');
  console.log({
    paymentId: record.paymentId,
    orderId: record.orderId,
    userId: record.userId,
    paymentType: record.paymentType,
    amount: record.amount,
    currency: record.currency,
    status: record.status,
    walletCredited: record.walletCredited,
    cutoffExpired: record.cutoffExpired,
    metadata: record.metadata
  });

  // 4. Inspect Expert Details & pricing
  if (record.metadata?.bookingDetails?.expertId) {
    const expert = await ExpertDetails.findOne({
      $or: [
        { _id: record.metadata.bookingDetails.expertId },
        { userId: record.metadata.bookingDetails.expertId }
      ]
    });
    console.log('\n4. EXPERT PROFILE & PRICING:');
    if (expert) {
      console.log({
        expertId: expert._id,
        name: expert.personalInformation?.userName,
        basePrice: expert.pricing?.basePrice,
        level: expert.professionalDetails?.level,
        rates: expert.pricing?.rates
      });
    } else {
      console.log('Expert profile not found for id:', record.metadata.bookingDetails.expertId);
    }
  }

  // 5. Inspect Wallet and all WalletTransactions for Joel
  const wallet = await Wallet.findOne({ userId: record.userId });
  const txns = await WalletTransaction.find({ userId: record.userId }).sort({ createdAt: 1 });
  console.log('\n5. CANDIDATE WALLET & TRANSACTIONS:');
  console.log('Available Balance: ₹' + (wallet ? wallet.availableBalance : 0));
  console.log('Transaction Count:', txns.length);
  txns.forEach((t, i) => {
    console.log(`\n  [Transaction ${i + 1}]`);
    console.log({
      id: t._id,
      type: t.type,
      amount: t.amount,
      balanceAfter: t.balanceAfter,
      paymentId: t.paymentId,
      orderId: t.orderId,
      reason: t.reason,
      status: t.status,
      description: t.description,
      createdAt: t.createdAt
    });
  });

  process.exit(0);
}

trace().catch(err => {
  console.error('Trace error:', err);
  process.exit(1);
});
