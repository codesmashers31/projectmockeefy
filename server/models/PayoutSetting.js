import mongoose from 'mongoose';

const payoutSettingSchema = new mongoose.Schema({
  minWithdrawalAmount: {
    type: Number,
    required: true,
    default: 5,
    min: 1
  },
  payoutDayDescription: {
    type: String,
    default: "Wednesday"
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

export default mongoose.model('PayoutSetting', payoutSettingSchema);

