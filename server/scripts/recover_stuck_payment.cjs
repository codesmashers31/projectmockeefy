const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function recoverStuckPayment() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully');

    const paymentId = 'pay_TzDtaT67QJLJjg';

    const PaymentRecord = mongoose.model('PaymentRecord', new mongoose.Schema({}, { strict: false }));
    const Wallet = mongoose.model('Wallet', new mongoose.Schema({}, { strict: false }));
    const WalletTransaction = mongoose.model('WalletTransaction', new mongoose.Schema({}, { strict: false }));
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const Session = mongoose.model('Session', new mongoose.Schema({}, { strict: false }));

    const record = await PaymentRecord.findOne({ paymentId });
    if (!record) {
      console.error('Payment record not found:', paymentId);
      process.exit(1);
    }

    console.log('--- Current Payment Record ---');
    console.log({
      paymentId: record.paymentId,
      orderId: record.orderId,
      userId: record.userId,
      amount: record.amount,
      status: record.status,
      reconciliationStatus: record.reconciliationStatus,
      walletCredited: record.walletCredited,
      timestampSource: record.timestampSource,
      sessionId: record.sessionId
    });

    const user = await User.findById(record.userId);
    console.log('Candidate user:', user ? `${user.name} (${user.email})` : 'Not found');

    // Check if slot has already passed or session exists
    let session = null;
    if (record.sessionId) {
      session = await Session.findOne({ sessionId: record.sessionId });
      console.log('Associated session:', session ? session.status : 'None');
    }

    // Check existing wallet & transactions
    let wallet = await Wallet.findOne({ userId: record.userId });
    if (!wallet) {
      wallet = await Wallet.create({
        userId: record.userId,
        availableBalance: 0,
        frozenBalance: 0,
        currency: 'INR'
      });
      console.log('Created new wallet for user');
    }

    console.log('Initial wallet balance:', wallet.availableBalance);

    // Check if already credited in WalletTransaction
    const existingTxn = await WalletTransaction.findOne({ paymentId, type: 'CREDIT' });
    if (existingTxn) {
      console.log('WalletTransaction already exists for this payment:', existingTxn._id);
    } else {
      // Amount in rupees: record.amount is 1 (in INR)
      const creditAmount = record.amount || 1;
      
      const updatedWallet = await Wallet.findByIdAndUpdate(
        wallet._id,
        { $inc: { availableBalance: creditAmount } },
        { new: true }
      );

      const txn = await WalletTransaction.create({
        walletId: updatedWallet._id,
        userId: record.userId,
        type: 'CREDIT',
        amount: creditAmount,
        referenceId: record._id,
        referenceModel: 'PaymentRecord',
        paymentId: record.paymentId,
        orderId: record.orderId,
        reason: 'CUTOFF_EXPIRED_CREDIT',
        currency: 'INR',
        status: 'COMPLETED',
        description: `Wallet credited: Slot booking window elapsed for payment ${record.paymentId}`,
        balanceAfter: updatedWallet.availableBalance
      });

      console.log('Created WalletTransaction:', txn._id, 'New balance:', updatedWallet.availableBalance);

      // Update PaymentRecord
      record.status = 'verified';
      record.reconciliationStatus = 'reconciled';
      record.walletCredited = true;
      record.walletTransactionId = txn._id;
      record.cutoffExpired = true;
      record.timestampSource = 'RECONCILED_WALLET_CREDIT';
      await record.save();

      console.log('Updated PaymentRecord successfully');
    }

    // Print final state
    const finalRecord = await PaymentRecord.findOne({ paymentId });
    const finalWallet = await Wallet.findOne({ userId: record.userId });
    const finalTxns = await WalletTransaction.find({ userId: record.userId });

    console.log('=== Final Verification ===');
    console.log('Payment status:', finalRecord.status);
    console.log('Payment reconciliationStatus:', finalRecord.reconciliationStatus);
    console.log('Payment walletCredited:', finalRecord.walletCredited);
    console.log('Wallet availableBalance:', finalWallet.availableBalance);
    console.log('Wallet transaction count:', finalTxns.length);
    console.log('Wallet transactions:', finalTxns.map(t => ({
      id: t._id,
      type: t.type,
      amount: t.amount,
      reason: t.reason,
      balanceAfter: t.balanceAfter
    })));

    process.exit(0);
  } catch (err) {
    console.error('Error recovering payment:', err);
    process.exit(1);
  }
}

recoverStuckPayment();
