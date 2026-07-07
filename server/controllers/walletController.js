import Wallet from '../models/Wallet.js';
import WalletTransaction from '../models/WalletTransaction.js';

export const getWalletBalance = async (req, res) => {
  try {
    const expertId = req.user.userId;

    // Ensure wallet exists
    let wallet = await Wallet.findOne({ userId: expertId });
    if (!wallet) {
      wallet = await Wallet.create({ userId: expertId });
    }

    res.status(200).json({
      success: true,
      data: {
        availableBalance: wallet.availableBalance,
        frozenBalance: wallet.frozenBalance,
        currency: wallet.currency
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching wallet balance' });
  }
};

export const getWalletTransactions = async (req, res) => {
  try {
    const expertId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const wallet = await Wallet.findOne({ userId: expertId });
    if (!wallet) {
      return res.status(200).json({ success: true, data: [], pagination: { total: 0, pages: 0, page } });
    }

    const total = await WalletTransaction.countDocuments({ walletId: wallet._id });
    const transactions = await WalletTransaction.find({ walletId: wallet._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('referenceId');

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
    res.status(500).json({ success: false, message: 'Server error fetching wallet transactions' });
  }
};
