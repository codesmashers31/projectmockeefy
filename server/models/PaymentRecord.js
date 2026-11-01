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
    enum: ['subscription', 'booking', 'free_credit', 'free_promo'],
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
  },
  status: {
    type: String,
    enum: ['verified', 'refunded', 'failed'],
    default: 'verified',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const PaymentRecord = mongoose.model('PaymentRecord', paymentRecordSchema);
export default PaymentRecord;
