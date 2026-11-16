const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

async function check() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const PaymentRecord = (await import('../models/PaymentRecord.js')).default;
  const Wallet = (await import('../models/Wallet.js')).default;
  const WalletTransaction = (await import('../models/WalletTransaction.js')).default;
  const Session = (await import('../models/Session.js')).default;
  const User = (await import('../models/User.js')).default;
  const SlotReservation = (await import('../models/SlotReservation.js')).default;

  const paymentId = 'pay_TzDtaT67QJLJjg';
  const record = await PaymentRecord.findOne({ paymentId });
  console.log('--- PaymentRecord ---');
  console.log(record ? {
    paymentId: record.paymentId,
    orderId: record.orderId,
    userId: record.userId,
    amount: record.amount,
    status: record.status,
    reconciliationStatus: record.reconciliationStatus,
    walletCredited: record.walletCredited,
    cutoffExpired: record.cutoffExpired,
    timestampSource: record.timestampSource,
    walletTransactionId: record.walletTransactionId,
    sessionId: record.sessionId
  } : 'Not found');

  if (record) {
    const user = await User.findById(record.userId);
    console.log('Candidate:', user ? `${user.name} (${user.email})` : 'Not found');
    const wallet = await Wallet.findOne({ userId: record.userId });
    console.log('Wallet:', wallet ? { availableBalance: wallet.availableBalance, currency: wallet.currency } : 'None');
    const txns = await WalletTransaction.find({ userId: record.userId });
    console.log('Wallet Transactions count:', txns.length);
    console.log('Transactions:', txns.map(t => ({
      id: t._id,
      type: t.type,
      amount: t.amount,
      reason: t.reason,
      paymentId: t.paymentId,
      balanceAfter: t.balanceAfter
    })));

    const reservation = await SlotReservation.findOne({ orderId: record.orderId });
    console.log('SlotReservation:', reservation ? {
      status: reservation.status,
      slotKey: reservation.slotKey,
      expiresAt: reservation.expiresAt
    } : 'None');
  }
  process.exit(0);
}
check();
