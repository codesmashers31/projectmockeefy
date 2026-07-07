import mongoose from "mongoose";

const webhookLogSchema = new mongoose.Schema({
  razorpayEventId: {
    type: String,
    required: true,
    unique: true // Ensures idempotency (processed once)
  },
  event: {
    type: String,
    required: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  processedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED'],
    default: 'SUCCESS'
  },
  error: {
    type: String
  }
}, { timestamps: true });

export default mongoose.model("WebhookLog", webhookLogSchema);
