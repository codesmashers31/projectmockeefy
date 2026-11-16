import mongoose from 'mongoose';

const emailOutboxSchema = new mongoose.Schema({
  idempotencyKey: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  recipientType: {
    type: String,
    enum: ['candidate', 'expert', 'admin'],
    required: true,
    index: true,
  },
  to: {
    type: String,
    required: true,
    trim: true,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
  },
  html: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'sent', 'failed'],
    default: 'pending',
    index: true,
  },
  retryCount: {
    type: Number,
    default: 0,
  },
  maxRetries: {
    type: Number,
    default: 5,
  },
  lastError: {
    type: String,
    default: null,
  },
  nextRetryAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  sentAt: {
    type: Date,
    default: null,
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

emailOutboxSchema.index({ status: 1, nextRetryAt: 1 });
emailOutboxSchema.index({ sessionId: 1, recipientType: 1 });

const EmailOutbox = mongoose.model('EmailOutbox', emailOutboxSchema);
export default EmailOutbox;
