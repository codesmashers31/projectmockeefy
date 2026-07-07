import mongoose from 'mongoose';

const pricingHistorySchema = new mongoose.Schema({
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    categoryName: {
        type: String,
        required: true
    },
    level: {
        type: String,
        required: true
    },
    oldPrice: {
        type: Number,
        required: true
    },
    newPrice: {
        type: Number,
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

export default mongoose.model('PricingHistory', pricingHistorySchema);
