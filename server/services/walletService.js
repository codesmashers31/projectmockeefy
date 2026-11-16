import mongoose from 'mongoose';
import Wallet from '../models/Wallet.js';
import WalletTransaction from '../models/WalletTransaction.js';
import User from '../models/User.js';

/**
 * Get or create a wallet for any user (Candidate or Expert).
 */
export async function getOrCreateWallet(userId, session = null) {
  if (!userId) throw new Error('userId is required for wallet operations');
  const uId = userId?._id || userId?.id || userId;

  let wallet = await Wallet.findOne({ userId: uId }).session(session);
  if (!wallet) {
    try {
      const created = await Wallet.create([{ userId: uId, availableBalance: 0, frozenBalance: 0 }], { session });
      wallet = created[0];
    } catch (err) {
      if (err.code === 11000) {
        wallet = await Wallet.findOne({ userId: uId }).session(session);
      } else {
        throw err;
      }
    }
  }
  return wallet;
}

/**
 * Atomically credit a candidate's wallet.
 * Idempotent: One Razorpay paymentId can produce at most ONE credit transaction.
 */
export async function creditWallet({
  userId,
  amount,
  referenceId = null,
  referenceModel = 'PaymentRecord',
  paymentId = null,
  orderId = null,
  sessionId = null,
  reason = 'PAYMENT_CREDIT',
  description = 'Wallet credited',
  session = null
}) {
  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('A valid positive amount is required for wallet credit');
  }
  const uId = userId?._id || userId?.id || userId;

  // 1. Idempotency Check: prevent duplicate credits for the same payment
  if (paymentId) {
    const existingTxn = await WalletTransaction.findOne({
      paymentId,
      type: 'CREDIT'
    }).session(session);

    if (existingTxn) {
      const wallet = await getOrCreateWallet(uId, session);
      return {
        success: true,
        alreadyCredited: true,
        transaction: existingTxn,
        wallet,
        balanceAfter: existingTxn.balanceAfter
      };
    }
  }

  // 2. Ensure wallet exists safely, then atomically increment availableBalance
  const existingWallet = await getOrCreateWallet(uId, session);
  const wallet = await Wallet.findByIdAndUpdate(
    existingWallet._id,
    { $inc: { availableBalance: numAmount } },
    { new: true, session }
  );

  // 3. Create permanent immutable ledger entry
  try {
    const txnData = {
      walletId: wallet._id,
      userId: uId,
      type: 'CREDIT',
      amount: numAmount,
      referenceId,
      referenceModel,
      paymentId,
      orderId,
      sessionId,
      reason,
      currency: wallet.currency || 'INR',
      status: 'COMPLETED',
      description,
      balanceAfter: wallet.availableBalance
    };

    let txn;
    if (session) {
      const created = await WalletTransaction.create([txnData], { session });
      txn = created[0];
    } else {
      txn = await WalletTransaction.create(txnData);
    }

    await User.findByIdAndUpdate(uId, { $set: { walletBalance: wallet.availableBalance } }, { session }).catch(() => {});

    return {
      success: true,
      wallet,
      transaction: txn,
      balanceAfter: wallet.availableBalance
    };
  } catch (err) {
    // If unique index on paymentId caught a race condition:
    if (err.code === 11000 && paymentId) {
      console.warn(`[WalletService] Duplicate credit race condition caught for payment ${paymentId}`);
      // Revert the increment since the duplicate txn wasn't saved
      if (!session) {
        await Wallet.findOneAndUpdate({ userId: uId }, { $inc: { availableBalance: -numAmount } });
      }
      const existingTxn = await WalletTransaction.findOne({ paymentId, type: 'CREDIT' });
      return {
        success: true,
        alreadyCredited: true,
        transaction: existingTxn,
        wallet,
        balanceAfter: existingTxn?.balanceAfter ?? wallet.availableBalance
      };
    }
    throw err;
  }
}

/**
 * Atomically debit a candidate's wallet.
 * Enforces that availableBalance >= amount; prevents negative balance and race conditions.
 */
export async function debitWallet({
  userId,
  amount,
  referenceId = null,
  referenceModel = 'Session',
  sessionId = null,
  orderId = null,
  paymentMethod = null,
  totalBookingAmount = null,
  walletAmountUsed = null,
  reason = 'INTERVIEW_BOOKING_DEBIT',
  description = 'Wallet debited for interview booking',
  session = null
}) {
  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('A valid positive amount is required for wallet debit');
  }
  const uId = userId?._id || userId?.id || userId;

  // Atomically decrement ONLY IF availableBalance >= numAmount
  const wallet = await Wallet.findOneAndUpdate(
    { userId: uId, availableBalance: { $gte: numAmount } },
    { $inc: { availableBalance: -numAmount } },
    { new: true, session }
  );

  if (!wallet) {
    const current = await Wallet.findOne({ userId: uId }).session(session);
    return {
      success: false,
      reason: 'INSUFFICIENT_BALANCE',
      message: `Insufficient wallet balance. Available: ₹${current?.availableBalance || 0}, Required: ₹${numAmount}`,
      currentBalance: current?.availableBalance || 0
    };
  }

  // Record DEBIT in permanent ledger
  const txnData = {
    walletId: wallet._id,
    userId: uId,
    type: 'DEBIT',
    amount: numAmount,
    referenceId,
    referenceModel,
    sessionId,
    orderId,
    paymentMethod,
    totalBookingAmount: totalBookingAmount != null ? Number(totalBookingAmount) : numAmount,
    walletAmountUsed: walletAmountUsed != null ? Number(walletAmountUsed) : numAmount,
    reason,
    currency: wallet.currency || 'INR',
    status: 'COMPLETED',
    description,
    balanceAfter: wallet.availableBalance
  };

  let txn;
  if (session) {
    const created = await WalletTransaction.create([txnData], { session });
    txn = created[0];
  } else {
    txn = await WalletTransaction.create(txnData);
  }

  await User.findByIdAndUpdate(uId, { $set: { walletBalance: wallet.availableBalance } }, { session }).catch(() => {});

  return {
    success: true,
    wallet,
    transaction: txn,
    balanceAfter: wallet.availableBalance
  };
}

/**
 * Safely restore debited wallet funds if a booking attempt fails or is rolled back.
 */
export async function restoreWalletDebit({
  userId,
  amount,
  originalTransactionId = null,
  sessionId = null,
  reason = 'BOOKING_FAILED_RESTORE',
  description = 'Restored wallet funds after booking failure',
  session = null
}) {
  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) return null;
  const uId = userId?._id || userId?.id || userId;

  // Idempotency: prevent restoring the same debit more than once
  if (originalTransactionId) {
    const existingRestore = await WalletTransaction.findOne({
      referenceId: originalTransactionId,
      type: 'CREDIT',
      reason: { $regex: /RESTORE/i }
    }).session(session);

    if (existingRestore) {
      const existingWallet = await Wallet.findOne({ userId: uId }).session(session);
      return {
        success: true,
        alreadyRestored: true,
        wallet: existingWallet,
        transaction: existingRestore,
        balanceAfter: existingRestore.balanceAfter
      };
    }
  }

  const existingWallet = await getOrCreateWallet(uId, session);
  const wallet = await Wallet.findByIdAndUpdate(
    existingWallet._id,
    { $inc: { availableBalance: numAmount } },
    { new: true, session }
  );

  const txnData = {
    walletId: wallet._id,
    userId: uId,
    type: 'CREDIT',
    amount: numAmount,
    referenceId: originalTransactionId,
    referenceModel: 'WalletTransaction',
    sessionId,
    reason,
    currency: wallet.currency || 'INR',
    status: 'COMPLETED',
    description,
    balanceAfter: wallet.availableBalance
  };

  let txn;
  if (session) {
    const created = await WalletTransaction.create([txnData], { session });
    txn = created[0];
  } else {
    txn = await WalletTransaction.create(txnData);
  }

  await User.findByIdAndUpdate(uId, { $set: { walletBalance: wallet.availableBalance } }, { session }).catch(() => {});

  return {
    success: true,
    wallet,
    transaction: txn,
    balanceAfter: wallet.availableBalance
  };
}

export default {
  getOrCreateWallet,
  creditWallet,
  debitWallet,
  restoreWalletDebit
};
