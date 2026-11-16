import mongoose from 'mongoose';

const slotReservationSchema = new mongoose.Schema({
  expertId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  startTime: {
    type: Date,
    required: true,
    index: true,
  },
  endTime: {
    type: Date,
    required: true,
    index: true,
  },
  slotKey: {
    type: String,
    required: true,
    index: true,
  },
  orderId: {
    type: String,
    required: true,
    index: true,
  },
  paymentId: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ['reserved', 'confirmed', 'released', 'expired'],
    default: 'reserved',
    index: true,
  },
  reservedUntil: {
    type: Date,
    required: true,
    index: true,
  },
  confirmedSessionId: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to quickly find active reservations for an expert
slotReservationSchema.index({ expertId: 1, startTime: 1, endTime: 1, status: 1 });
slotReservationSchema.index({ reservedUntil: 1, status: 1 });

const SlotReservation = mongoose.model('SlotReservation', slotReservationSchema);
export default SlotReservation;
