import Wallet from '../models/Wallet.js';
import WalletTransaction from '../models/WalletTransaction.js';
import { getOrCreateWallet, debitWallet, restoreWalletDebit } from '../services/walletService.js';
import { executeRefund } from '../services/refundService.js';
import PaymentRecord from '../models/PaymentRecord.js';

export const getWalletBalance = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const wallet = await getOrCreateWallet(userId);

    // Compute aggregated wallet stats
    const transactions = await WalletTransaction.find({
      $or: [{ walletId: wallet._id }, { userId }]
    }).lean();

    let totalCredited = 0;
    let totalSpent = 0;
    let totalRefunded = 0;
    let pendingCredits = 0;

    for (const t of transactions) {
      if (t.status === 'COMPLETED') {
        if (t.type === 'CREDIT') {
          totalCredited += Number(t.amount) || 0;
        } else if (t.type === 'DEBIT') {
          if (t.reason === 'CASH_REFUND_REQUEST' || t.reason?.includes('REFUND')) {
            totalRefunded += Number(t.amount) || 0;
          } else {
            totalSpent += Number(t.amount) || 0;
          }
        }
      } else if (t.status === 'PENDING' && t.type === 'CREDIT') {
        pendingCredits += Number(t.amount) || 0;
      }
    }

    res.status(200).json({
      success: true,
      availableBalance: wallet.availableBalance,
      balance: wallet.availableBalance,
      data: {
        availableBalance: wallet.availableBalance,
        frozenBalance: wallet.frozenBalance,
        currency: wallet.currency || 'INR',
        totalCredited,
        totalSpent,
        totalRefunded,
        pendingCredits,
        transactionCount: transactions.length
      }
    });
  } catch (error) {
    console.error('[WalletController] getWalletBalance error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching wallet balance' });
  }
};

export const getWalletTransactions = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: { total: 0, pages: 0, page, limit }
      });
    }

    const total = await WalletTransaction.countDocuments({ walletId: wallet._id });
    const transactions = await WalletTransaction.find({ walletId: wallet._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit
      }
    });
  } catch (error) {
    console.error('[WalletController] getWalletTransactions error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching wallet transactions' });
  }
};

/**
 * User-initiated cash refund requests are disabled.
 * Wallet funds are strictly reserved for interview bookings across Mockeefy.
 * Note: Platform automatic payment-gateway refunds (e.g. cutoff expirations, duplicate captures)
 * handled by refundService / paymentController are strictly preserved.
 */
export const requestCashRefund = async (req, res) => {
  return res.status(400).json({
    success: false,
    message: 'User-initiated cash refunds are disabled. Wallet funds are strictly reserved for interview bookings across Mockeefy.'
  });
};

export default {
  getWalletBalance,
  getWalletTransactions,
  requestCashRefund
};
