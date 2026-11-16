const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function inspect() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(mongoUri);

  const PaymentRecord = (await import('../models/PaymentRecord.js')).default;
  const Wallet = (await import('../models/Wallet.js')).default;
  const WalletTransaction = (await import('../models/WalletTransaction.js')).default;
  const User = (await import('../models/User.js')).default;
  const Session = (await import('../models/Session.js')).default;

  console.log('Connected to MongoDB.');

  const awaiting = await PaymentRecord.find({ 
    $or: [
      { status: 'awaiting_reconciliation' },
      { reconciliationStatus: 'awaiting_capture_timestamp' }
    ] 
  }).lean();
  console.log('--- AWAITING RECONCILIATION RECORDS (' + awaiting.length + ') ---');
  console.log(JSON.stringify(awaiting, null, 2));

  const recentPayments = await PaymentRecord.find().sort({ createdAt: -1 }).limit(10).lean();
  console.log('\n--- 10 MOST RECENT PAYMENT RECORDS ---');
  for (const p of recentPayments) {
    const user = await User.findById(p.userId).select('name email userType').lean();
    const wallet = await Wallet.findOne({ userId: p.userId }).lean();
    const txns = await WalletTransaction.find({ paymentId: p.paymentId }).lean();
    console.log(`Payment: ${p.paymentId} | Order: ${p.orderId} | User: ${user?.name} (${user?.email}) | Status: ${p.status} | RecStatus: ${p.reconciliationStatus} | TimestampSource: ${p.timestampSource} | WalletCredited: ${p.walletCredited} | Amount: ₹${p.amount} | Created: ${p.createdAt}`);
    if (wallet) {
      console.log(`  -> Wallet Balance: ₹${wallet.availableBalance} | Txns count for payment: ${txns.length}`);
    } else {
      console.log(`  -> NO WALLET for user ${p.userId}`);
    }
  }

  process.exit(0);
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
