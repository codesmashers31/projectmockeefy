const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function fixPaymentRecord() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);

    const PaymentRecord = (await import('../models/PaymentRecord.js')).default;
    const Wallet = (await import('../models/Wallet.js')).default;
    const WalletTransaction = (await import('../models/WalletTransaction.js')).default;

    const paymentId = 'pay_TzDtaT67QJLJjg';

    const txn = await WalletTransaction.findOne({ paymentId, type: 'CREDIT' });
    console.log('Found credit txn:', txn ? txn._id : 'None');

    const updateRes = await PaymentRecord.updateOne(
      { paymentId },
      {
        $set: {
          status: 'verified',
          reconciliationStatus: 'reconciled',
          walletCredited: true,
          walletTransactionId: txn ? txn._id : null,
          cutoffExpired: true,
          timestampSource: 'RECONCILED_WALLET_CREDIT'
        }
      }
    );
    console.log('Update result:', updateRes);

    const updated = await PaymentRecord.findOne({ paymentId });
    console.log('Updated Payment Record:', {
      paymentId: updated.paymentId,
      status: updated.status,
      reconciliationStatus: updated.reconciliationStatus,
      walletCredited: updated.walletCredited,
      cutoffExpired: updated.cutoffExpired,
      timestampSource: updated.timestampSource,
      walletTransactionId: updated.walletTransactionId
    });

    const wallet = await Wallet.findOne({ userId: updated.userId });
    console.log('Candidate Wallet Balance: ₹' + wallet.availableBalance);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixPaymentRecord();
