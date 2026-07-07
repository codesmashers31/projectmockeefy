import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema({
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['CREDIT', 'DEBIT', 'FREEZE', 'UNFREEZE'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'referenceModel',
    required: false
  },
  referenceModel: {
    type: String,
    enum: ['Session', 'PayoutRequest'],
    required: false
  },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'],
    default: 'COMPLETED'
  },
  description: {
    type: String,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  }
}, { timestamps: true });

export default mongoose.model("WalletTransaction", walletTransactionSchema);
