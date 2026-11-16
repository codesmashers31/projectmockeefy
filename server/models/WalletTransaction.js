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
    enum: ['Session', 'PayoutRequest', 'PaymentRecord', 'WalletTransaction'],
    required: false
  },
  paymentId: {
    type: String,
    default: null,
    trim: true,
    index: true
  },
  orderId: {
    type: String,
    default: null,
    trim: true,
    index: true
  },
  reason: {
    type: String,
    default: null,
    trim: true
  },
  idempotencyKey: {
    type: String,
    default: null,
    trim: true
  },
  sessionId: {
    type: String,
    default: null,
    trim: true,
    index: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  paymentMethod: {
    type: String,
    enum: ['MOCKEEFY_WALLET', 'RAZORPAY', 'COMBINED', null],
    default: null
  },
  totalBookingAmount: {
    type: Number,
    default: null
  },
  walletAmountUsed: {
    type: Number,
    default: null
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

// Performance Indexes (Phase C)
walletTransactionSchema.index({ userId: 1, createdAt: -1 });
walletTransactionSchema.index({ walletId: 1, createdAt: -1 });
walletTransactionSchema.index({ status: 1 });

// Idempotency: ensure at most ONE credit transaction per session reference
walletTransactionSchema.index(
  { referenceId: 1, referenceModel: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { referenceModel: 'Session', type: 'CREDIT' }
  }
);

// Idempotency: ensure at most ONE wallet credit per Razorpay payment ID
walletTransactionSchema.index(
  { paymentId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { paymentId: { $type: "string" }, type: 'CREDIT' }
  }
);

// Idempotency: ensure at most ONE transaction per idempotency key
walletTransactionSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } }
  }
);

export default mongoose.model("WalletTransaction", walletTransactionSchema);
