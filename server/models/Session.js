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
  candidateLeftAt: { type: Date, default: null },
  candidateConnectionStatus: {
    type: String,
    enum: ['not_joined', 'connected', 'disconnected', 'left'],
    default: 'not_joined'
  },
  expertJoinedAt: { type: Date, default: null },
  attendanceOutcome: {
    type: String,
    enum: ['ATTENDED_COMPLETED', 'DID_NOT_ATTEND', 'ATTENDED_INCOMPLETE', null],
    default: null
  },
  attendanceClassifiedAt: { type: Date, default: null },
  attendanceClassifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  completionEvidence: {
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },
    durationMinutes: { type: Number, default: null },
    candidateJoinedConfirmed: { type: Boolean, default: false },
    interviewConducted: { type: Boolean, default: false },
    summary: { type: String, trim: true, default: null },
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  // Early termination & actual session timeline
  actualEndTime: { type: Date, default: null },
  earlyEnded: { type: Boolean, default: false },
  endedEarlyBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  earlyEndReason: { type: String, trim: true, maxlength: 500, default: null },
  // Payout tracking
  payoutStatus: {
    type: String,
    enum: ['unprocessed', 'credited', 'completed', 'failed', 'not_applicable', 'pending', 'pending_feedback'],
    default: 'unprocessed'
  },
  payoutReference: { type: String, trim: true, default: null },
  payoutProcessedAt: { type: Date, default: null },
  feedbackRequested: { type: Boolean, default: false },
  feedbackRequestedAt: { type: Date, default: null },
  feedbackRequestCount: { type: Number, default: 0 },
  firstFeedbackRequestedAt: { type: Date, default: null },
  lastFeedbackRequestedAt: { type: Date, default: null },
  feedbackReminderHistory: [{ type: Date }],
  // Permanent immutable candidate identity snapshot for the session certificate
  candidateNameSnapshot: { type: String, trim: true, default: null },
  identityConfirmedAt: { type: Date, default: null },
  certificateIssued: { type: Boolean, default: false },
  certificateId: { type: String, trim: true, default: null },
  // Atomic slot lock key to prevent concurrent double-booking: format `${expertId}_${startTime.getTime()}_${endTime.getTime()}`
  slotLockKey: { type: String, trim: true },
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
  // Unique Payment / Order link to guarantee at database level that one payment creates at most one session
  paymentId: { type: String, trim: true },
  orderId: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now }
});

// Performance Indexes for frequent queries
sessionSchema.index({ expertId: 1, status: 1 });
sessionSchema.index({ candidateId: 1, status: 1 });
sessionSchema.index({ candidateId: 1, status: 1, startTime: 1 });
sessionSchema.index({ candidateId: 1, allocatedCertificateId: 1 });
sessionSchema.index({ candidateId: 1, categoryId: 1, allocatedCertificateId: 1 });
sessionSchema.index({ startTime: 1, status: 1 });
sessionSchema.index({ slotLockKey: 1 }, { unique: true, partialFilterExpression: { slotLockKey: { $type: "string" } } });
sessionSchema.index({ paymentId: 1 }, { unique: true, partialFilterExpression: { paymentId: { $type: "string" } } });
sessionSchema.index({ orderId: 1 }, { unique: true, partialFilterExpression: { orderId: { $type: "string" } } });

const Session = mongoose.model('Session', sessionSchema);
export default Session;
