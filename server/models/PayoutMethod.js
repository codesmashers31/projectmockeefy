import mongoose from "mongoose";

const payoutMethodSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['bank', 'upi', 'wallet'],
    required: true
  },
  details: {
    // Bank details
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, trim: true },
    accountName: { type: String, trim: true },
    bankName: { type: String, trim: true },
    
    // UPI details
    upiId: { type: String, trim: true },
    
    // Wallet details
    walletNumber: { type: String, trim: true },
    walletType: { type: String, trim: true }
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, { timestamps: true });

export default mongoose.model("PayoutMethod", payoutMethodSchema);
