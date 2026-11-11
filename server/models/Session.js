import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  expertId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  categoryNameSnapshot: { type: String, trim: true, default: null },
  level: { type: String, enum: ['Rising Mentor', 'Professional Mentor', 'Senior Mentor', 'Elite Mentor', 'FAANG Mentor', 'Beginner', 'Intermediate', 'Advanced'], default: 'Rising Mentor' },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  topics: [{ type: String }],
  price: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  duration: { type: Number, default: 30 }, // in minutes
  notes: { type: String, trim: true, maxlength: 500 },
  meetingLink: { type: String, trim: true },
  isCustomMeetingLink: { type: Boolean, default: false },
  payoutCredited: { type: Boolean, default: false },
  payoutCreditedAt: { type: Date, default: null },
  payoutAmount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'Upcoming', 'no-show', 'CANDIDATE_NO_SHOW', 'NO_SHOW', 'live', 'evaluated'],
    default: 'confirmed'
  },
  // Attendance tracking
  attendanceStatus: {
    type: String,
    enum: ['scheduled', 'attended', 'absent', 'no-show'],
    default: 'scheduled'
  },
  candidateJoinedAt: { type: Date, default: null },
  expertJoinedAt: { type: Date, default: null },
  // Payout tracking
  payoutStatus: {
    type: String,
    enum: ['unprocessed', 'credited', 'failed', 'not_applicable', 'pending'],
    default: 'unprocessed'
  },
  payoutReference: { type: String, trim: true, default: null },
  payoutProcessedAt: { type: Date, default: null },
  // Permanent immutable candidate identity snapshot for the session certificate
  candidateNameSnapshot: { type: String, trim: true, default: null },
  identityConfirmedAt: { type: Date, default: null },
  certificateIssued: { type: Boolean, default: false },
  certificateId: { type: String, trim: true, default: null },
  // Certificate Milestone Allocation (ensures each session belongs to at most one milestone)
  allocatedCertificateId: { type: String, trim: true, default: null },
  allocatedMilestone: { type: Number, default: null },
  // No-Show Audit & Dispute Records
  noShowMarkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  noShowReportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  noShowMarkedAt: { type: Date, default: null },
  noShowReportedAt: { type: Date, default: null },
  noShowReason: { type: String, trim: true, maxlength: 500, default: null },
  noShowSettled: { type: Boolean, default: false },
  // Administrative Attendance Review Audit
  attendanceAudit: {
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    decision: { type: String, enum: ['unreviewed', 'approved', 'rejected'], default: 'unreviewed' },
    notes: { type: String, trim: true, default: null }
  },
  noShowDispute: {
    status: { type: String, enum: ['none', 'disputed', 'resolved'], default: 'none' },
    candidateNotes: { type: String, trim: true, default: null },
    disputedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    resolution: { type: String, trim: true, default: null }
  },
  createdAt: { type: Date, default: Date.now }
});

// Performance Indexes for frequent queries
sessionSchema.index({ expertId: 1, status: 1 });
sessionSchema.index({ candidateId: 1, status: 1 });
sessionSchema.index({ candidateId: 1, allocatedCertificateId: 1 });
sessionSchema.index({ candidateId: 1, categoryId: 1, allocatedCertificateId: 1 });
sessionSchema.index({ startTime: 1, status: 1 });

const Session = mongoose.model('Session', sessionSchema);
export default Session;
