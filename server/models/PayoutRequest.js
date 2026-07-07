import mongoose from "mongoose";

const payoutRequestSchema = new mongoose.Schema({
  expertId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  methodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PayoutMethod',
    required: false
  },
  payoutMethodType: {
    type: String,
    enum: ['bank', 'upi']
  },
  accountHolderName: {
    type: String,
    trim: true
  },
  accountNumber: {
    type: String,
    trim: true
  },
  ifscCode: {
    type: String,
    trim: true
  },
  upiId: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'PAID', 'REJECTED', 'HOLD', 'FAILED', 'REVERSED', 'CANCELLED'],
    default: 'PENDING'
  },
  razorpayPayoutId: {
    type: String,
    trim: true
  },
  utrNumber: {
    type: String,
    trim: true
  },
  bankReference: {
    type: String,
    trim: true
  },
  failureReason: {
    type: String,
    trim: true
  },
  idempotencyKey: {
    type: String,
    trim: true
  },
  transactionId: {
    type: String,
    trim: true
  },
  adminRemarks: {
    type: String,
    trim: true
  },
  screenshotProof: {
    type: String,
    trim: true
  },
  paymentDate: {
    type: Date
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    trim: true
  }
}, { timestamps: true });

export default mongoose.model("PayoutRequest", payoutRequestSchema);
