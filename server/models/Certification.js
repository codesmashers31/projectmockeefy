import mongoose from 'mongoose';

const certificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    certificateId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    // Permanent, immutable candidate identity snapshot at issuance
    candidateNameSnapshot: {
        type: String,
        required: true,
        trim: true
    },
    identityConfirmedAt: {
        type: Date,
        default: null
    },
    identityConfirmationReference: {
        type: String,
        trim: true,
        default: null
    },
    certificateStatus: {
        type: String,
        enum: ['ISSUED', 'REVOKED', 'PENDING'],
        default: 'ISSUED'
    },
    qualifyingSessionIds: [{
        type: String,
        trim: true
    }],
    issueDate: {
        type: Date,
        default: Date.now
    },
    type: {
        type: String, // 'completion', 'master', 'skill'
        default: 'completion'
    },
    metadata: {
        score: Number,
        sessionCount: Number,
        cycle: Number
    }
}, { timestamps: true });

// Index for fast lookups
certificationSchema.index({ userId: 1, name: 1 });

export default mongoose.model('Certification', certificationSchema);
