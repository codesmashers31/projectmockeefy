import mongoose from 'mongoose';

const paymentRecordSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  orderId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  paymentType: {
    type: String,
    enum: ['subscription', 'booking', 'free_credit', 'free_promo', 'wallet', 'hybrid'],
    required: true,
  },
  planId: {
    type: String,
    default: null,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  sessionId: {
    type: String,
    default: null,
    index: true,
  },
  status: {
    type: String,
    enum: ['verified', 'refunded', 'failed', 'awaiting_reconciliation'],
    default: 'verified',
  },
  timestampSource: {
    type: String,
    enum: [
      'RAZORPAY_PAYMENT_CAPTURED_AT',
      'RAZORPAY_PAYMENT_CAPTURED_AT_AFTER_CUTOFF',
      'WEBHOOK_PAYMENT_CAPTURED_EVENT',
      'WEBHOOK_PROVEN_BEFORE_CUTOFF',
      'VERIFIED_BEFORE_CUTOFF',
      'RECONCILIATION_PENDING',
      'CREATED_AFTER_CUTOFF',
      'MOCK_TEST_CAPTURE',
      'RECONCILED_WALLET_CREDIT',
      'RECONCILED_SESSION_CONFIRMED',
      null
    ],
    default: null,
  },
  providerEventTimestamp: {
    type: Date,
    default: null,
  },
  serverReceiptTimestamp: {
    type: Date,
    default: null,
  },
  gatewayCaptureVerificationReceivedAt: {
    type: Date,
    default: null,
  },
  reconciliationStatus: {
    type: String,
    enum: ['none', 'awaiting_capture_timestamp', 'reconciled', 'verified'],
    default: 'none',
  },
  amountRefunded: {
    type: Number,
    default: 0,
  },
  refundRequested: {
    type: Boolean,
    default: false,
  },
  walletCredited: {
    type: Boolean,
    default: false,
  },
  walletTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WalletTransaction',
    default: null,
  },
  walletAmountDeducted: {
    type: Number,
    default: 0,
  },
  paymentCapturedAt: {
    type: Date,
    default: null,
  },
  refundId: {
    type: String,
    default: null,
  },
  refundStatus: {
    type: String,
    default: null,
  },
  refundReason: {
    type: String,
    default: null,
  },
  refundAmount: {
    type: Number,
    default: 0,
  },
  refundedAt: {
    type: Date,
    default: null,
  },
  cutoffExpired: {
    type: Boolean,
    default: false,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const PaymentRecord = mongoose.model('PaymentRecord', paymentRecordSchema);
export default PaymentRecord;
