const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });
const Razorpay = require('razorpay');

const rz = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

async function inspectSecondPayment() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const PaymentRecord = (await import('../models/PaymentRecord.js')).default;

  const paymentId = 'pay_TzE6i6slTLugYO';
  const record = await PaymentRecord.findOne({ paymentId });
  console.log('--- Second PaymentRecord in DB ---');
  console.log(record ? {
    paymentId: record.paymentId,
    orderId: record.orderId,
    userId: record.userId,
    amount: record.amount,
    status: record.status,
    walletCredited: record.walletCredited,
    reconciliationStatus: record.reconciliationStatus,
    timestampSource: record.timestampSource
  } : 'Not found');

  try {
    const rzPay = await rz.payments.fetch(paymentId);
    console.log('--- Razorpay Payment Entity ---');
    console.log({
      id: rzPay.id,
      order_id: rzPay.order_id,
      amount: rzPay.amount / 100,
      status: rzPay.status,
      created_at: new Date(rzPay.created_at * 1000).toISOString()
    });
  } catch (err) {
    console.log('Razorpay fetch error:', err.message);
  }

  process.exit(0);
}

inspectSecondPayment();
