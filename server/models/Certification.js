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
    milestoneNumber: {
        type: Number,
        default: 1
    },
    milestoneRange: {
        type: String,
        trim: true,
        default: 'Interviews 1–3'
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    categoryNameSnapshot: {
        type: String,
        required: true,
        trim: true
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
        cycle: Number,
        milestoneNumber: Number,
        milestoneRange: String
    }
}, { timestamps: true });

// Index for fast lookups
certificationSchema.index({ userId: 1, name: 1 });
certificationSchema.index({ userId: 1, categoryId: 1, milestoneNumber: 1 }, { unique: true, sparse: true });
certificationSchema.index({ categoryId: 1 });

export default mongoose.model('Certification', certificationSchema);
