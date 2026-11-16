import * as sessionService from '../services/sessionService.js';
import Session from '../models/Session.js';
import * as meetingService from '../services/meetingService.js';
import PricingRule from '../models/PricingRule.js';
import ExpertDetails from '../models/expertModel.js';
import { v4 as uuidv4 } from 'uuid';
import { triggerBookingEmails } from './paymentController.js';
import { syncDataChange } from '../services/socketService.js';
import { validateBookingSlot } from '../utils/availabilityValidator.js';

export const createSession = async (req, res) => {
    try {
        const { expertId, candidateId, userId, startTime, endTime, topics, level, status, skill } = req.body;

        // Secure candidateId: Normal users can only book sessions for themselves
        const requesterId = req.user.userId;
        const finalCandidateId = req.user.userType === 'admin' ? (candidateId || userId || requesterId) : requesterId;

        // Use provided ID or generate one
        const sessionId = req.body.sessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Calculate Duration
        const start = new Date(startTime);
        let end = new Date(endTime);
        if (end <= start) {
            const fallbackDuration = Number(req.body.duration || req.body.sessionDuration) || 30;
            end = new Date(start.getTime() + fallbackDuration * 60 * 1000);
        }
        const durationMinutes = Math.round((end - start) / (1000 * 60));

        // Fetch Expert to get Category
        let expert = await ExpertDetails.findOne({ $or: [{ _id: expertId }, { userId: expertId }] });
        if (!expert) {
            return res.status(404).json({ success: false, message: "Expert not found" });
        }

        // Comprehensive authoritative backend slot validation
        const slotValidation = await validateBookingSlot({
            expertId: expert._id,
            startTime: start,
            endTime: end,
            duration: durationMinutes
        });

        if (!slotValidation.valid) {
            return res.status(slotValidation.status || 400).json({
                success: false,
                message: slotValidation.message,
                reason: slotValidation.reason
            });
        }

        // --- PRICING: category-based only (no skill). Uses PricingRule: category + level + duration ---
        const categoryName = expert.personalInformation?.category || "IT";
        const selectedLevel = level || expert.professionalDetails?.level || "Intermediate";

        const Category = (await import('../models/Category.js')).default;
        const catDoc = await Category.findOne({ name: categoryName });
        if (!catDoc) {
            return res.status(400).json({ success: false, message: `Category '${categoryName}' not configured in system.` });
        }

        let finalPrice = null;
        const pricingRule = await PricingRule.findOne({
            categoryId: catDoc._id,
            skillId: null,
            level: selectedLevel,
            duration: Number(durationMinutes),
        });
        if (pricingRule) {
            finalPrice = pricingRule.price;
        } else if (catDoc.amount != null && catDoc.amount >= 0) {
            finalPrice = durationMinutes === 30 ? catDoc.amount : Math.round(catDoc.amount * 1.8);
        }
        if (finalPrice == null) {
            return res.status(400).json({
                success: false,
                message: `Pricing not configured for ${categoryName} - ${selectedLevel} - ${durationMinutes} mins. Set base in Admin → Categories or rules in Admin → Pricing.`,
            });
        }

        // Enforce expert's autoAccept setting (explicit confirmed or autoAccept=true yields confirmed)
        const autoAccept = expert?.settings?.autoAccept === true;
        const isExplicitConfirmed = status === 'confirmed';
        const initialStatus = (autoAccept || isExplicitConfirmed) ? 'confirmed' : 'pending';

        const sessionData = {
            sessionId,
            expertId,
            candidateId: finalCandidateId, // Enforced secure candidate ID
            categoryId: catDoc._id,
            categoryNameSnapshot: catDoc.name,
            startTime: start,
            endTime: end,
            topics: topics || [],
            price: finalPrice, // ALWAYS use server-calculated price
            status: initialStatus,
            meetingLink: (expert?.availability?.defaultMeetingLink && /^https?:\/\/meet\.google\.com\/[a-z0-9-]+/i.test(expert.availability.defaultMeetingLink.trim())) ? expert.availability.defaultMeetingLink.trim() : null,
        };

        const session = await sessionService.createSession(sessionData);

        const { formatSessionDateTime } = await import('../services/emailService.js');
        const { createNotification } = await import('./notificationController.js');
        const dt = formatSessionDateTime(start, end);

        const expertUserId = expert.userId || expertId;
        if (autoAccept) {
            // Notify User
            await createNotification({
                userId: finalCandidateId,
                type: 'booking_confirmed',
                title: 'Meeting Scheduled Successfully! 🎉',
                message: `Your meeting has been scheduled on ${dt.dateStr} at ${dt.timeSlotStr}.`,
                metadata: { sessionId: session.sessionId, link: '/my-sessions' }
            });

            // Notify Expert
            await createNotification({
                userId: expertUserId,
                type: 'booking_confirmed',
                title: 'New Session Booked & Payment Received! 🎉',
                message: `A candidate has booked a session with you on ${dt.dateStr} at ${dt.timeSlotStr}.`,
                metadata: { sessionId: session.sessionId, link: '/expert/dashboard' }
            });
        } else {
            // Notify User: Request Pending Mentor Review
            await createNotification({
                userId: finalCandidateId,
                type: 'booking_pending',
                title: 'Booking Request Submitted! ⏳',
                message: `Your booking request for ${dt.dateStr} at ${dt.timeSlotStr} has been submitted. Awaiting mentor confirmation.`,
                metadata: { sessionId: session.sessionId, link: '/my-sessions' }
            });

            // Notify Expert: Review Required
            await createNotification({
                userId: expertUserId,
                type: 'booking_request',
                title: 'New Booking Request Pending Review! 🔔',
                message: `A candidate has requested a session on ${dt.dateStr} at ${dt.timeSlotStr}. Please review and accept or decline.`,
                metadata: { sessionId: session.sessionId, link: '/expert/sessions' }
            });
        }

        // Send email notification to Interview Expert
        await triggerBookingEmails({
            bookingDetails: {
                expertId,
                candidateId: finalCandidateId,
                startTime: start,
                endTime: end,
                topics: topics || [],
                duration: durationMinutes,
                notes: req.body.notes || "",
                level: selectedLevel,
            },
            sessionId: session.sessionId,
            meetingLink: sessionData.meetingLink,
            paymentId: "DIRECT-BOOKING",
            orderId: "DIRECT",
            paymentStatus: "Confirmed",
            price: finalPrice,
        });

        syncDataChange({
            type: "SESSION_CREATED",
            userId: session.candidateId,
            sessionId: session.sessionId,
            data: session,
            toAdmin: true
        });
        if (expert?.userId) {
            syncDataChange({
                type: "SESSION_CREATED",
                userId: expert.userId,
                expertId: expert._id,
                sessionId: session.sessionId,
                data: session
            });
        }

        res.status(201).json({ success: true, message: "Session created successfully", data: session });
    } catch (error) {
        console.error("Create Session Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};


export const updateMeetingLink = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { meetingLink } = req.body;
        const session = await sessionService.getSessionById(sessionId);
        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        // Authorization check: Only the session's expert or admin can update meeting link
        const expertProfile = await ExpertDetails.findOne({ $or: [{ _id: session.expertId }, { userId: session.expertId }] });
        const isAuthorized = req.user.userType === 'admin' ||
            String(session.expertId) === String(req.user.userId) ||
            (expertProfile && String(expertProfile.userId) === String(req.user.userId));

        if (!isAuthorized) {
            return res.status(403).json({ message: "Forbidden: Access denied" });
        }

        const rawLink = typeof meetingLink === 'string' ? meetingLink.trim() : '';
        if (!rawLink || !/^https?:\/\/meet\.google\.com\/[a-z0-9-]+/i.test(rawLink)) {
            return res.status(400).json({ success: false, message: "Invalid Google Meet link. Use a meet.google.com URL." });
        }

        const updated = await sessionService.updateSessionMeetingLink(sessionId, rawLink, true);

        syncDataChange({
            type: "SESSION_UPDATED",
            userId: session.candidateId,
            sessionId: session.sessionId,
            data: updated,
            toAdmin: true
        });
        if (expertProfile?.userId) {
            syncDataChange({
                type: "SESSION_UPDATED",
                userId: expertProfile.userId,
                expertId: expertProfile._id,
                sessionId: session.sessionId,
                data: updated
            });
        }

        return res.json({ success: true, data: updated });
    } catch (error) {
        console.error("Update meeting link error:", error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * Authoritative, atomic, and idempotent expert payout settlement engine.
 * Settles payouts for:
 * - ATTENDED_COMPLETED (when qualifying feedback is submitted)
 * - DID_NOT_ATTEND (immediate settlement upon marking candidate absent)
 * - ATTENDED_INCOMPLETE (immediate settlement upon ending incomplete session)
 * 
 * Strict Financial Invariants:
 * 1. 80% expert share, 20% platform commission, min 1 INR (Math.max(1, Math.round(sessionPrice * 0.8 * 100) / 100)).
 * 2. Never credit unverified, failed, or refunded sessions.
 * 3. Never credit a session more than once (atomic claim, WalletTransaction unique indexes, idempotencyKey).
 * 4. Multi-document transaction with safe atomic fallback.
 * 5. Emits WALLET_UPDATED, wallet_updated, SESSION_UPDATED, and persistent in-app notifications.
 */
export const settleExpertSessionPayout = async ({ session, outcome, reason = '', actorUserId = null }) => {
    try {
        const mongoose = (await import('mongoose')).default;
        const SessionModel = (await import('../models/Session.js')).default;
        const User = (await import('../models/User.js')).default;
        const ExpertDetails = (await import('../models/expertModel.js')).default;
        const Wallet = (await import('../models/Wallet.js')).default;
        const WalletTransaction = (await import('../models/WalletTransaction.js')).default;
        const PaymentRecord = (await import('../models/PaymentRecord.js')).default;
        const { emitToUser: emitUserEvt } = await import('../services/socketService.js');
        const { createNotification } = await import('./notificationController.js');

        const now = new Date();
        const sessionId = session.sessionId;
        const sessionMongoId = session._id;
        const sessionPrice = Number(session.price || 0);

        // 1. Idempotency check: Already credited?
        if (session.payoutCredited) {
            return {
                credited: false,
                amount: Number(session.payoutAmount || 0),
                alreadyCredited: true,
                reason: 'Session payout has already been credited'
            };
        }

        const existingTxn = await WalletTransaction.findOne({
            referenceId: sessionMongoId,
            referenceModel: 'Session',
            type: 'CREDIT'
        });

        if (existingTxn) {
            await SessionModel.updateOne(
                { _id: sessionMongoId, payoutCredited: { $ne: true } },
                { $set: { payoutCredited: true, payoutAmount: existingTxn.amount, payoutStatus: 'credited', payoutCreditedAt: existingTxn.createdAt } }
            );
            return {
                credited: false,
                amount: existingTxn.amount,
                alreadyCredited: true,
                reason: 'Wallet ledger transaction already exists for this session'
            };
        }

        // 2. Non-billable or free promo check
        if (sessionPrice <= 0) {
            await SessionModel.updateOne(
                { _id: sessionMongoId },
                { $set: { payoutStatus: 'not_applicable', payoutAmount: 0, payoutCredited: false } }
            );
            return {
                credited: false,
                amount: 0,
                alreadyCredited: false,
                reason: 'Free promotional or non-billable session (price is 0)'
            };
        }

        // 3. Payment Record Verification
        const payRecord = await PaymentRecord.findOne({
            sessionId: sessionId,
            status: 'verified'
        });

        if (!payRecord) {
            await SessionModel.updateOne(
                { _id: sessionMongoId },
                { $set: { payoutStatus: 'not_applicable', payoutAmount: 0, payoutCredited: false } }
            );
            return {
                credited: false,
                amount: 0,
                alreadyCredited: false,
                reason: 'No verified payment record found for this session'
            };
        }

        // Ensure payment wasn't refunded or disputed
        if (payRecord.status === 'refunded' || payRecord.refundRequested || (payRecord.amountRefunded && payRecord.amountRefunded >= payRecord.amount)) {
            await SessionModel.updateOne(
                { _id: sessionMongoId },
                { $set: { payoutStatus: 'not_applicable', payoutAmount: 0, payoutCredited: false } }
            );
            return {
                credited: false,
                amount: 0,
                alreadyCredited: false,
                reason: 'Payment record was refunded or has an active refund request'
            };
        }

        // 4. Exact Payout Calculation (80% net expert share, 20% platform commission using exact paise)
        const totalPaise = Math.round(sessionPrice * 100);
        const expertPaise = Math.min(totalPaise, Math.round(totalPaise * 0.80));
        const payoutAmount = expertPaise / 100;

        // 5. Resolve Expert User
        let expertUser = null;
        const rawExpertId = session.expertId;
        if (rawExpertId) {
            if (typeof rawExpertId === 'string' && rawExpertId.includes('@')) {
                expertUser = await User.findOne({ email: rawExpertId.toLowerCase() });
            } else if (mongoose.Types.ObjectId.isValid(rawExpertId)) {
                expertUser = await User.findById(rawExpertId);
                if (!expertUser) {
                    const profile = await ExpertDetails.findById(rawExpertId);
                    if (profile && profile.userId) {
                        expertUser = await User.findById(profile.userId);
                    }
                }
            }
        }
        if (!expertUser && actorUserId && mongoose.Types.ObjectId.isValid(actorUserId)) {
            expertUser = await User.findById(actorUserId);
        }

        if (!expertUser) {
            return {
                credited: false,
                amount: 0,
                alreadyCredited: false,
                reason: 'Expert user record could not be resolved'
            };
        }

        // Stable Idempotency Key
        const keyPrefix = outcome === 'DID_NOT_ATTEND'
            ? 'SESSION_NO_SHOW_PAYOUT'
            : (outcome === 'ATTENDED_INCOMPLETE' ? 'SESSION_INCOMPLETE_PAYOUT' : 'SESSION_COMPLETED_PAYOUT');
        const idempotencyKey = `${keyPrefix}:${sessionId}`;

        const existingKeyTxn = await WalletTransaction.findOne({ idempotencyKey });
        if (existingKeyTxn) {
            await SessionModel.updateOne(
                { _id: sessionMongoId, payoutCredited: { $ne: true } },
                { $set: { payoutCredited: true, payoutAmount: existingKeyTxn.amount, payoutStatus: 'credited', payoutCreditedAt: existingKeyTxn.createdAt } }
            );
            return {
                credited: false,
                amount: existingKeyTxn.amount,
                alreadyCredited: true,
                reason: 'Transaction already committed with idempotency key'
            };
        }

        const description = outcome === 'DID_NOT_ATTEND'
            ? `Payout for candidate no-show session ${sessionId}`
            : (outcome === 'ATTENDED_INCOMPLETE'
                ? `Payout for session ${sessionId} (candidate left before completion)`
                : `Payout for completed session ${sessionId}`);

        // 6. Multi-Document Transaction Execution (with Safe Atomic Fallback)
        let sessionTxn = null;
        let useTxn = false;
        try {
            sessionTxn = await mongoose.startSession();
            sessionTxn.startTransaction();
            useTxn = true;
        } catch (_) {
            sessionTxn = null;
            useTxn = false;
        }

        let creditSuccess = false;
        let finalBalance = 0;

        if (useTxn && sessionTxn) {
            try {
                // Atomic claim on session
                const claimedSession = await SessionModel.findOneAndUpdate(
                    { _id: sessionMongoId, payoutCredited: { $ne: true } },
                    {
                        $set: {
                            payoutCredited: true,
                            payoutCreditedAt: now,
                            payoutProcessedAt: now,
                            payoutAmount: payoutAmount,
                            payoutStatus: 'credited',
                            payoutReference: payRecord.paymentId,
                            ...(outcome === 'DID_NOT_ATTEND' ? { noShowSettled: true } : {})
                        }
                    },
                    { new: true, session: sessionTxn }
                );

                if (!claimedSession) {
                    await sessionTxn.abortTransaction();
                    return { credited: false, amount: payoutAmount, alreadyCredited: true, reason: 'Session concurrently claimed or already credited' };
                }

                let wallet = await Wallet.findOne({ userId: expertUser._id }, null, { session: sessionTxn });
                if (!wallet) {
                    wallet = new Wallet({ userId: expertUser._id, availableBalance: 0 });
                }
                wallet.availableBalance = Math.round((Number(wallet.availableBalance || 0) + payoutAmount) * 100) / 100;
                await wallet.save({ session: sessionTxn });

                const userDoc = await User.findById(expertUser._id, null, { session: sessionTxn });
                if (userDoc) {
                    userDoc.walletBalance = Math.round((Number(userDoc.walletBalance || 0) + payoutAmount) * 100) / 100;
                    await userDoc.save({ session: sessionTxn });
                }

                await WalletTransaction.create([{
                    walletId: wallet._id,
                    userId: expertUser._id,
                    type: 'CREDIT',
                    amount: payoutAmount,
                    referenceId: sessionMongoId,
                    referenceModel: 'Session',
                    sessionId: sessionId,
                    paymentId: payRecord.paymentId,
                    idempotencyKey: idempotencyKey,
                    status: 'COMPLETED',
                    description: description,
                    balanceAfter: wallet.availableBalance
                }], { session: sessionTxn });

                await sessionTxn.commitTransaction();
                creditSuccess = true;
                finalBalance = wallet.availableBalance;
            } catch (txnErr) {
                await sessionTxn.abortTransaction().catch(() => {});
                console.error("[settleExpertSessionPayout] Transaction aborted:", txnErr);
                if (txnErr.code === 11000) {
                    return { credited: false, amount: payoutAmount, alreadyCredited: true, reason: 'Concurrent settlement race won by another process' };
                }
            } finally {
                await sessionTxn.endSession().catch(() => {});
            }
        }

        // Atomic Fallback for environments without replica sets
        if (!creditSuccess) {
            try {
                const claimedSession = await SessionModel.findOneAndUpdate(
                    { _id: sessionMongoId, payoutCredited: { $ne: true } },
                    {
                        $set: {
                            payoutCredited: true,
                            payoutCreditedAt: now,
                            payoutProcessedAt: now,
                            payoutAmount: payoutAmount,
                            payoutStatus: 'credited',
                            payoutReference: payRecord.paymentId,
                            ...(outcome === 'DID_NOT_ATTEND' ? { noShowSettled: true } : {})
                        }
                    },
                    { new: true }
                );

                if (!claimedSession) {
                    return { credited: false, amount: payoutAmount, alreadyCredited: true, reason: 'Session concurrently claimed or already credited' };
                }

                let wallet = await Wallet.findOne({ userId: expertUser._id });
                if (!wallet) {
                    wallet = new Wallet({ userId: expertUser._id, availableBalance: 0 });
                }
                wallet.availableBalance = Math.round((Number(wallet.availableBalance || 0) + payoutAmount) * 100) / 100;
                await wallet.save();

                await User.updateOne(
                    { _id: expertUser._id },
                    { $set: { walletBalance: wallet.availableBalance } }
                );

                await WalletTransaction.create([{
                    walletId: wallet._id,
                    userId: expertUser._id,
                    type: 'CREDIT',
                    amount: payoutAmount,
                    referenceId: sessionMongoId,
                    referenceModel: 'Session',
                    sessionId: sessionId,
                    paymentId: payRecord.paymentId,
                    idempotencyKey: idempotencyKey,
                    status: 'COMPLETED',
                    description: description,
                    balanceAfter: wallet.availableBalance
                }]);

                creditSuccess = true;
                finalBalance = wallet.availableBalance;
            } catch (fallbackErr) {
                console.error("[settleExpertSessionPayout] Fallback settlement error:", fallbackErr);
                if (fallbackErr.code === 11000) {
                    return { credited: false, amount: payoutAmount, alreadyCredited: true, reason: 'Ledger unique constraint preserved single credit' };
                }
                await SessionModel.updateOne({ _id: sessionMongoId }, { $set: { payoutStatus: 'failed' } });
                return { credited: false, amount: 0, reason: fallbackErr.message };
            }
        }

        // 7. Real-Time Broadcast & Notification
        if (creditSuccess) {
            syncDataChange({
                type: "WALLET_UPDATED",
                userId: expertUser._id,
                data: {
                    balance: finalBalance,
                    availableBalance: finalBalance,
                    walletBalance: finalBalance,
                    creditedAmount: payoutAmount,
                    sessionId: sessionId
                }
            });

            emitUserEvt(expertUser._id, 'wallet_updated', {
                balance: finalBalance,
                availableBalance: finalBalance,
                creditedAmount: payoutAmount
            });

            const notifTitle = outcome === 'DID_NOT_ATTEND'
                ? 'Candidate No-Show Payout Credited'
                : (outcome === 'ATTENDED_INCOMPLETE' ? 'Incomplete Session Payout Credited' : 'Session Payout Credited');
            const notifMsg = `₹${payoutAmount} has been credited to your wallet for session ${sessionId}.`;

            await createNotification({
                userId: expertUser._id,
                type: 'wallet_credit',
                title: notifTitle,
                message: notifMsg,
                metadata: {
                    sessionId: sessionId,
                    amount: payoutAmount,
                    link: '/expert/sessions'
                }
            }).catch(err => console.error("Notification dispatch error:", err));

            return {
                credited: true,
                amount: payoutAmount,
                alreadyCredited: false,
                balanceAfter: finalBalance
            };
        }

        return { credited: false, amount: 0, reason: 'Settlement could not be completed' };
    } catch (err) {
        console.error("settleExpertSessionPayout error:", err);
        return { credited: false, amount: 0, reason: err.message };
    }
};

export const completeSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { attendanceOutcome, completionEvidence } = req.body;

        if (!attendanceOutcome || !['ATTENDED_COMPLETED', 'DID_NOT_ATTEND', 'ATTENDED_INCOMPLETE'].includes(attendanceOutcome)) {
            return res.status(400).json({
                success: false,
                message: "Attendance outcome is required to end the session. Must be one of: ATTENDED_COMPLETED, DID_NOT_ATTEND, ATTENDED_INCOMPLETE."
            });
        }

        const session = await sessionService.getSessionById(sessionId);
        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        const sStatus = (session.status || '').toLowerCase();
        if (sStatus === 'no-show' || sStatus === 'candidate_no_show' || sStatus === 'no_show') {
            return res.status(400).json({ success: false, message: "A no-show session cannot be marked as completed." });
        }
        if (sStatus === 'cancelled') {
            return res.status(400).json({ success: false, message: "A cancelled session cannot be marked as completed." });
        }

        // Authorization check: Only the session's expert or admin can mark session completed
        const expertProfile = await ExpertDetails.findOne({ $or: [{ _id: session.expertId }, { userId: session.expertId }] });
        const isAuthorized = req.user.userType === 'admin' ||
            String(session.expertId) === String(req.user.userId) ||
            (expertProfile && String(expertProfile.userId) === String(req.user.userId));

        if (!isAuthorized) {
            return res.status(403).json({ message: "Forbidden: Access denied" });
        }

        // 15-minute join grace period check applies strictly to DID_NOT_ATTEND (Mark Absent / No-Show)
        const now = new Date();
        const startTime = new Date(session.startTime);
        if (attendanceOutcome === 'DID_NOT_ATTEND') {
            if (!isNaN(startTime.getTime()) && now.getTime() < startTime.getTime() + 15 * 60 * 1000) {
                const remainingSeconds = Math.ceil((startTime.getTime() + 15 * 60 * 1000 - now.getTime()) / 1000);
                return res.status(400).json({
                    success: false,
                    message: `Mark Absent is locked for the first 15 minutes of the session (Candidate join grace period). Available in ${remainingSeconds}s.`
                });
            }
        }

        // Validate candidate join truth
        if (!session.candidateJoinedAt) {
            if (attendanceOutcome !== 'DID_NOT_ATTEND') {
                return res.status(400).json({
                    success: false,
                    message: "Candidate has not joined this session. Only 'DID_NOT_ATTEND' outcome is allowed."
                });
            }
        } else {
            if (attendanceOutcome === 'DID_NOT_ATTEND') {
                return res.status(400).json({
                    success: false,
                    message: "Candidate joined this session. 'DID_NOT_ATTEND' cannot be selected for an attended candidate."
                });
            }
        }

        // If outcome is DID_NOT_ATTEND, delegate directly to markCandidateNoShow
        if (attendanceOutcome === 'DID_NOT_ATTEND') {
            req.body.reason = req.body.reason || 'Candidate did not attend within 15-minute grace period';
            return markCandidateNoShow(req, res);
        }

        // Authoritative Proof of Completion Validation
        // If Candidate is still connected, use authoritative session-ending timestamp (now) for interval calculation
        // Do NOT invent a leave timestamp when candidate did not leave
        const candJoinMs = session.candidateJoinedAt ? new Date(session.candidateJoinedAt).getTime() : 0;
        const candEndMs = session.candidateLeftAt ? new Date(session.candidateLeftAt).getTime() : now.getTime();
        const presenceDurationMs = candJoinMs > 0 ? Math.max(0, candEndMs - candJoinMs) : 0;

        if (attendanceOutcome === 'ATTENDED_COMPLETED') {
            // Must have expert completion confirmation
            if (!completionEvidence || completionEvidence.interviewConducted === false) {
                return res.status(400).json({
                    success: false,
                    message: "Proof of interview completion is required. Expert must confirm interview was conducted."
                });
            }
        }

        const isEarlyEnded = attendanceOutcome === 'ATTENDED_INCOMPLETE';
        const recordedEvidence = {
            verified: attendanceOutcome === 'ATTENDED_COMPLETED',
            verifiedAt: now,
            durationMinutes: Math.round(presenceDurationMs / 60000),
            candidateJoinedConfirmed: Boolean(session.candidateJoinedAt),
            interviewConducted: attendanceOutcome === 'ATTENDED_COMPLETED',
            summary: completionEvidence?.summary || (attendanceOutcome === 'ATTENDED_COMPLETED' ? 'Full interview conducted and verified' : 'Session ended before completion'),
            confirmedBy: req.user.userId
        };

        // Atomic completion handles status transition directly below
        try {
            await meetingService.updateMeetingStatus(sessionId, 'finished');
        } catch (_) { /* meeting may not exist */ }

        // Calculate eligible expert payout
        const PaymentRecord = (await import('../models/PaymentRecord.js')).default;
        
        let pendingPayoutAmount = 0;
        let initialPayoutStatus = 'not_applicable';
        const sessionPrice = Number(session.price || 0);

        if (sessionPrice > 0) {
            const payRecord = await PaymentRecord.findOne({
                sessionId: session.sessionId,
                status: 'verified'
            });
            if (payRecord) {
                const totalPaise = Math.round(sessionPrice * 100);
                pendingPayoutAmount = Math.min(totalPaise, Math.round(totalPaise * 0.80)) / 100;
                initialPayoutStatus = attendanceOutcome === 'ATTENDED_INCOMPLETE' ? 'credited' : 'pending_feedback';
            } else {
                initialPayoutStatus = 'not_applicable';
            }
        } else {
            initialPayoutStatus = 'not_applicable';
        }

        // Atomic state transition: ensures idempotent transition and eliminates race conditions
        const updatedCompletedSession = await Session.findOneAndUpdate(
            {
                sessionId: session.sessionId,
                status: { $in: ['confirmed', 'live', 'Upcoming'] }
            },
            {
                $set: {
                    status: 'completed',
                    actualEndTime: now,
                    attendanceStatus: 'attended',
                    attendanceOutcome: attendanceOutcome,
                    attendanceClassifiedAt: now,
                    attendanceClassifiedBy: req.user.userId,
                    completionEvidence: recordedEvidence,
                    earlyEnded: isEarlyEnded,
                    earlyEndReason: isEarlyEnded ? (req.body.earlyEndReason || 'Candidate left before completion') : null,
                    endedEarlyBy: isEarlyEnded ? req.user.userId : null,
                    payoutStatus: initialPayoutStatus,
                    payoutAmount: pendingPayoutAmount,
                    payoutCredited: false
                }
            },
            { new: true }
        );

        if (!updatedCompletedSession) {
            // Already finalized! Check if requested outcome conflicts with committed outcome
            const existing = await Session.findOne({ sessionId: session.sessionId }).lean();
            const existingOutcome = existing?.attendanceOutcome || (existing?.status === 'CANDIDATE_NO_SHOW' ? 'DID_NOT_ATTEND' : 'ATTENDED_COMPLETED');
            if (attendanceOutcome && existingOutcome && existingOutcome !== attendanceOutcome) {
                return res.status(409).json({
                    success: false,
                    conflict: true,
                    message: `Conflict: Session has already been finalized with outcome '${existingOutcome}'. Requested outcome '${attendanceOutcome}' was rejected.`,
                    data: existing
                });
            }
            return res.status(200).json({ success: true, message: "Session already finalized", data: existing });
        }

        // Settle Payout Immediately for Incomplete Sessions (or if review already exists)
        let walletCreditResult = null;
        if (attendanceOutcome === 'ATTENDED_INCOMPLETE') {
            walletCreditResult = await settleExpertSessionPayout({
                session: updatedCompletedSession,
                outcome: 'ATTENDED_INCOMPLETE',
                reason: req.body.earlyEndReason || 'Candidate left before completion',
                actorUserId: req.user.userId
            });
        } else if (attendanceOutcome === 'ATTENDED_COMPLETED') {
            const ReviewDetails = (await import('../models/reviewModel.js')).default;
            const existingReview = await ReviewDetails.findOne({ sessionId: session.sessionId, reviewerRole: 'expert' });
            if (existingReview) {
                walletCreditResult = await settleExpertSessionPayout({
                    session: updatedCompletedSession,
                    outcome: 'ATTENDED_COMPLETED',
                    reason: 'Review already submitted',
                    actorUserId: req.user.userId
                });
            }
        }

        // Outcome-specific notifications and emails (dispatched idempotently once)
        try {
            const { createNotification } = await import('./notificationController.js');
            const { formatSessionDateTime } = await import('../services/emailService.js');
            const { enqueueEmail } = await import('../services/emailOutboxService.js');
            const User = (await import('../models/User.js')).default;
            const candidateUser = await User.findById(session.candidateId).lean();
            const dt = formatSessionDateTime(session.startTime, session.endTime);

            if (attendanceOutcome === 'ATTENDED_COMPLETED') {
                await createNotification({
                    userId: session.candidateId,
                    type: 'session_completed',
                    title: 'Interview Session Completed',
                    message: `Your mock interview on ${dt.dateStr} at ${dt.timeSlotStr} has been marked as attended & completed. Once the mentor submits their evaluation, you can request feedback and view your certificate progress.`,
                    metadata: { sessionId: session.sessionId, link: '/my-sessions' }
                });

                if (candidateUser && candidateUser.email) {
                    await enqueueEmail({
                        sessionId: session.sessionId,
                        recipientType: 'candidate',
                        to: candidateUser.email,
                        subject: 'Mockeefy: Interview Session Completed',
                        template: 'session_completed',
                        html: `<p>Hi ${candidateUser.name || 'Candidate'},</p><p>Your mock interview session on ${dt.dateStr} at ${dt.timeSlotStr} has concluded successfully. Once your expert submits your evaluation, you can view your scorecard and track your certificate progress.</p><p><a href="https://mockeefy.com/my-sessions">View My Sessions</a></p>`,
                        metadata: { sessionId: session.sessionId, outcome: 'ATTENDED_COMPLETED' }
                    });
                }
            } else if (attendanceOutcome === 'ATTENDED_INCOMPLETE') {
                await createNotification({
                    userId: session.candidateId,
                    type: 'session_incomplete',
                    title: 'Interview Session Ended Before Completion',
                    message: `Your mock interview on ${dt.dateStr} at ${dt.timeSlotStr} was classified as attended but left before completion. Under platform policy, incomplete sessions do not qualify for certificates.`,
                    metadata: { sessionId: session.sessionId, link: '/my-sessions' }
                });

                if (candidateUser && candidateUser.email) {
                    await enqueueEmail({
                        sessionId: session.sessionId,
                        recipientType: 'candidate',
                        to: candidateUser.email,
                        subject: 'Mockeefy: Interview Session Ended Early',
                        template: 'session_incomplete',
                        html: `<p>Hi ${candidateUser.name || 'Candidate'},</p><p>Your mock interview on ${dt.dateStr} at ${dt.timeSlotStr} ended before completion. Under platform policy, incomplete sessions do not qualify for completion certificates.</p><p><a href="https://mockeefy.com/my-sessions">View My Sessions</a></p>`,
                        metadata: { sessionId: session.sessionId, outcome: 'ATTENDED_INCOMPLETE' }
                    });
                }
            }
        } catch (notifErr) {
            console.error("[completeSession] Outcome notification dispatch error:", notifErr);
        }

        const finalCompletedDoc = await Session.findOne({ sessionId: session.sessionId }).lean() || updatedCompletedSession;
        const payloadData = finalCompletedDoc || { sessionId: session.sessionId, _id: session._id, status: 'completed', attendanceOutcome };

        syncDataChange({
            type: "SESSION_UPDATED",
            userId: session.candidateId,
            sessionId: session.sessionId,
            data: payloadData,
            toAdmin: true
        });
        if (expertProfile?.userId) {
            syncDataChange({
                type: "SESSION_UPDATED",
                userId: expertProfile.userId,
                expertId: expertProfile._id,
                sessionId: session.sessionId,
                data: payloadData
            });
        }

        return res.json({
            success: true,
            message: "Session completed with verified attendance",
            data: payloadData,
            walletCredit: walletCreditResult
        });
    } catch (error) {
        console.error("Complete session error:", error);
        return res.status(500).json({ message: error.message });
    }
};

export const endSession = completeSession;

/**
 * POST /api/sessions/:sessionId/no-show
 * Marks a confirmed session as candidate no-show after the 10-minute grace period has passed.
 * Automatically processes expert payout according to platform no-show policy (if paid).
 * Excludes session from certificate eligibility.
 */
export const markCandidateNoShow = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { reason } = req.body;
        const userId = req.user.userId;

        const mongoose = (await import('mongoose')).default;
        const SessionModel = (await import('../models/Session.js')).default;
        const session = await SessionModel.findOne({
            $or: [{ sessionId }, { _id: mongoose.Types.ObjectId.isValid(sessionId) ? sessionId : null }].filter(Boolean)
        });

        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }

        // Authorization check: Only the session's assigned expert or admin can mark candidate absent
        const Expert = (await import('../models/expertModel.js')).default;
        const expertProfile = await Expert.findOne({ $or: [{ _id: session.expertId }, { userId: session.expertId }] });
        const isAuthorized = req.user.userType === 'admin' ||
            String(session.expertId) === String(userId) ||
            (expertProfile && String(expertProfile.userId) === String(userId));

        if (!isAuthorized) {
            return res.status(403).json({ success: false, message: "Forbidden: Only the assigned expert can mark candidate absent." });
        }

        // Terminal state & conflict checks
        const sStatus = (session.status || '').toLowerCase();
        if (sStatus === 'completed' || sStatus === 'evaluated') {
            return res.status(409).json({
                success: false,
                conflict: true,
                message: `Conflict: Session has already been finalized with status '${session.status}' and outcome '${session.attendanceOutcome || 'ATTENDED_COMPLETED'}'. Mark absent rejected.`,
                data: session
            });
        }
        if (sStatus === 'cancelled') {
            return res.status(400).json({ success: false, message: "Cancelled sessions cannot be marked as a no-show." });
        }
        if (sStatus === 'no-show' || sStatus === 'candidate_no_show' || sStatus === 'no_show') {
            return res.status(400).json({ success: false, message: "This session has already been marked as a candidate no-show." });
        }

        // Attendance check: If candidate actually attended/joined the meeting, prevent no-show marking
        if (session.candidateJoinedAt || (session.attendanceStatus && session.attendanceStatus === 'attended')) {
            return res.status(400).json({
                success: false,
                message: "Candidate has already attended this session. An attended session cannot be marked as a no-show."
            });
        }

        // Time and Configurable Grace Period Enforcement (Default: 15 minutes)
        const gracePeriodMinutes = parseInt(process.env.NO_SHOW_GRACE_MINUTES, 10) || 15;
        const gracePeriodMs = gracePeriodMinutes * 60 * 1000;
        const now = new Date();
        const startTime = new Date(session.startTime);
        const gracePeriodEnd = new Date(startTime.getTime() + gracePeriodMs);

        if (now.getTime() < gracePeriodEnd.getTime()) {
            const remainingMinutes = Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / 60000);
            return res.status(400).json({
                success: false,
                message: `No-show cannot be reported yet. The candidate has a ${gracePeriodMinutes}-minute grace period to join (${remainingMinutes} min remaining).`
            });
        }

        // Check if session has already been evaluated (ReviewDetails or Report)
        const ReviewDetails = (await import('../models/reviewModel.js')).default;
        const existingReview = await ReviewDetails.findOne({ sessionId: session.sessionId, reviewerRole: 'expert' });
        if (existingReview) {
            return res.status(400).json({ success: false, message: "This session has already been evaluated and cannot be marked as a no-show." });
        }

        const Report = (await import('../models/Report.js')).default;
        const existingReport = await Report.findOne({ sessionId: session._id });
        if (existingReport) {
            return res.status(400).json({ success: false, message: "This session has an evaluation report and cannot be marked as a no-show." });
        }

        // Atomic status transition
        const updatedSession = await SessionModel.findOneAndUpdate(
            {
                _id: session._id,
                status: { $nin: ['completed', 'evaluated', 'cancelled', 'no-show', 'candidate_no_show', 'CANDIDATE_NO_SHOW', 'no_show', 'NO_SHOW'] },
                candidateJoinedAt: null,
                attendanceStatus: { $ne: 'attended' }
            },
            {
                $set: {
                    status: 'CANDIDATE_NO_SHOW',
                    attendanceStatus: 'no-show',
                    attendanceOutcome: 'DID_NOT_ATTEND',
                    attendanceClassifiedAt: now,
                    attendanceClassifiedBy: userId,
                    noShowMarkedBy: userId,
                    noShowReportedBy: userId,
                    noShowMarkedAt: now,
                    noShowReportedAt: now,
                    noShowReason: reason?.trim() || `Candidate did not attend within ${gracePeriodMinutes}-minute grace period`,
                    noShowSettled: false,
                    payoutStatus: 'unprocessed'
                }
            },
            { new: true }
        );

        if (!updatedSession) {
            return res.status(409).json({ success: false, message: "Session state conflict: The session was modified concurrently or attendance was recorded." });
        }

        // Expert Payout Settlement (Idempotent, Atomic & Protected)
        const walletCreditResult = await settleExpertSessionPayout({
            session: updatedSession,
            outcome: 'DID_NOT_ATTEND',
            reason: updatedSession.noShowReason,
            actorUserId: userId
        });

        // Fetch authoritative session state after settlement
        const finalSession = await SessionModel.findById(updatedSession._id).lean() || updatedSession;

        // Notify Candidate of absence and platform policy (non-refundable, ineligible for certificates)
        try {
            const { createNotification } = await import('./notificationController.js');
            const { formatSessionDateTime } = await import('../services/emailService.js');
            const dt = formatSessionDateTime(updatedSession.startTime, updatedSession.endTime);

            await createNotification({
                userId: updatedSession.candidateId,
                type: 'session_no_show',
                title: 'Marked Absent for Scheduled Interview',
                message: `You were marked as absent for your scheduled mock interview on ${dt.dateStr} at ${dt.timeSlotStr}. Under platform policy, missed sessions are non-refundable and do not count toward certificate eligibility.`,
                metadata: { sessionId: updatedSession.sessionId, link: '/my-sessions' }
            });

            // Enqueue durable Candidate No-Show notification into EmailOutbox
            const { enqueueEmail } = await import('../services/emailOutboxService.js');
            const User = (await import('../models/User.js')).default;
            const candidateUser = await User.findById(updatedSession.candidateId).lean();
            if (candidateUser && candidateUser.email) {
                await enqueueEmail({
                    sessionId: updatedSession.sessionId,
                    recipientType: 'candidate',
                    to: candidateUser.email,
                    subject: 'Mockeefy: Marked Absent for Scheduled Interview',
                    template: 'session_no_show',
                    html: `<p>Hi ${candidateUser.name || 'Candidate'},</p><p>You were marked as absent for your scheduled mock interview on ${dt.dateStr} at ${dt.timeSlotStr}. Under platform policy, missed sessions are non-refundable and do not count toward certificate eligibility.</p><p><a href="https://mockeefy.com/my-sessions">View My Sessions</a></p>`,
                    metadata: {
                        sessionId: updatedSession.sessionId,
                        reason: reason || 'Candidate did not join within grace period'
                    }
                });
            }
        } catch (notifErr) {
            console.error("[markCandidateNoShow] Candidate notification/outbox error:", notifErr);
        }

        // Real-time synchronization
        syncDataChange({
            type: "SESSION_UPDATED",
            userId: finalSession.candidateId,
            sessionId: finalSession.sessionId,
            data: finalSession,
            toAdmin: true
        });

        if (expertProfile?.userId) {
            syncDataChange({
                type: "SESSION_UPDATED",
                userId: expertProfile.userId,
                expertId: expertProfile._id,
                sessionId: finalSession.sessionId,
                data: finalSession
            });
        }

        return res.status(200).json({
            success: true,
            message: "Candidate marked as no-show successfully.",
            data: finalSession,
            payoutCredited: Boolean(finalSession.payoutCredited),
            payoutAmount: finalSession.payoutAmount || 0,
            walletCredit: walletCreditResult
        });
    } catch (error) {
        console.error("Mark candidate no-show error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/sessions/:sessionId/no-show-dispute/resolve
 * Admin-only endpoint to resolve candidate no-show dispute with audit history.
 */
export const resolveCandidateNoShowDispute = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { resolution, action } = req.body;

        if (req.user?.userType !== 'admin') {
            return res.status(403).json({ success: false, message: "Forbidden: Only administrators can resolve disputes." });
        }

        const SessionModel = (await import('../models/Session.js')).default;
        const session = await SessionModel.findOne({
            $or: [{ sessionId }, { _id: (await import('mongoose')).default.Types.ObjectId.isValid(sessionId) ? sessionId : null }].filter(Boolean)
        });
        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }

        if (session.noShowDispute?.status !== 'disputed') {
            return res.status(400).json({ success: false, message: "No active dispute found on this session." });
        }

        session.noShowDispute.status = 'resolved';
        session.noShowDispute.resolvedAt = new Date();
        session.noShowDispute.resolution = (resolution || `Dispute resolved as ${action || 'upheld'}`).trim();

        await session.save();

        syncDataChange({
            type: "SESSION_UPDATED",
            userId: session.candidateId,
            sessionId: session.sessionId,
            data: session,
            toAdmin: true
        });

        return res.status(200).json({
            success: true,
            message: "Dispute resolved successfully.",
            data: session
        });
    } catch (error) {
        console.error("Resolve dispute error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const disputeCandidateNoShow = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { notes } = req.body;
        const userId = req.user.userId;

        const SessionModel = (await import('../models/Session.js')).default;
        const session = await SessionModel.findOne({ sessionId });
        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }

        if (String(session.candidateId) !== String(userId)) {
            return res.status(403).json({ success: false, message: "Forbidden: Access denied" });
        }

        const sStatus = (session.status || '').toLowerCase();
        if (sStatus !== 'no-show' && sStatus !== 'candidate_no_show') {
            return res.status(400).json({ success: false, message: "Only no-show sessions can be disputed." });
        }

        session.noShowDispute = {
            status: 'disputed',
            candidateNotes: (notes || '').trim(),
            disputedAt: new Date()
        };

        await session.save();

        syncDataChange({
            type: "SESSION_UPDATED",
            userId: session.candidateId,
            sessionId: session.sessionId,
            data: session,
            toAdmin: true
        });

        return res.status(200).json({
            success: true,
            message: "Dispute submitted successfully for administrative review.",
            data: session
        });
    } catch (error) {
        console.error("Dispute no-show error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await sessionService.getSessionById(sessionId);
        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        // Authorization check: Only the candidate, the expert, or admin can view this session
        const expertProfile = await ExpertDetails.findOne({ $or: [{ _id: session.expertId }, { userId: session.expertId }] });
        const isAuthorized = req.user.userType === 'admin' ||
            String(session.candidateId) === String(req.user.userId) ||
            String(session.expertId) === String(req.user.userId) ||
            (expertProfile && String(expertProfile.userId) === String(req.user.userId));

        if (!isAuthorized) {
            return res.status(403).json({ message: "Forbidden: Access denied" });
        }

        // --- ENRICHMENT LOGIC (Single Session) ---
        const Expert = (await import('../models/expertModel.js')).default;
        const User = (await import('../models/User.js')).default;
        const mongoose = (await import('mongoose')).default;

        let expert = null;
        let expertUser = null;
        let candidate = null;
        const lookupId = session.expertId;

        try {
            if (mongoose.Types.ObjectId.isValid(lookupId)) {
                const oid = new mongoose.Types.ObjectId(lookupId);
                expert = await Expert.findOne({ userId: oid }).populate('userId').lean();
                if (!expert) expert = await Expert.findById(oid).populate('userId').lean();
                if (!expert) expert = await Expert.findOne({ userId: lookupId.toString() }).populate('userId').lean();
            } else if (typeof lookupId === 'string' && lookupId.includes('@')) {
                const userByEmail = await User.findOne({ email: lookupId.toLowerCase() }).lean();
                if (userByEmail) {
                    expert = await Expert.findOne({ userId: userByEmail._id }).populate('userId').lean();
                }
            }

            if (expert && expert.userId && typeof expert.userId === 'object' && expert.userId.name) {
                expertUser = expert.userId;
            } else if (expert && expert.userId && mongoose.Types.ObjectId.isValid(expert.userId)) {
                expertUser = await User.findById(expert.userId).lean();
            } else if (mongoose.Types.ObjectId.isValid(lookupId)) {
                expertUser = await User.findById(lookupId).lean();
                if (expertUser && !expert) {
                    expert = await Expert.findOne({ userId: expertUser._id }).lean();
                }
            }
        } catch (e) {
            console.error("Expert lookup failed", e);
        }

        // Candidate Lookup
        try {
            if (mongoose.Types.ObjectId.isValid(session.candidateId)) {
                candidate = await User.findById(session.candidateId).lean();
            } else if (typeof session.candidateId === 'string' && session.candidateId.includes('@')) {
                candidate = await User.findOne({ email: session.candidateId.toLowerCase() }).lean();
            }
        } catch (e) {
            console.error("Candidate lookup failed", e);
        }

        let expertName = 'Unknown Expert';
        if (expert) {
            expertName = expert.personalInformation?.userName || expertUser?.name || 'Expert';
        } else if (expertUser) {
            expertName = expertUser.name || 'Expert';
        } else if (typeof lookupId === 'string' && !mongoose.Types.ObjectId.isValid(lookupId)) {
            expertName = lookupId;
        } else {
            expertName = lookupId || 'Unknown Expert';
        }

        const isObjectId = (str) => /^[0-9a-fA-F]{24}$/.test(String(str));
        if (expertName === 'Unknown Expert' || isObjectId(expertName)) {
            expertName = expertUser?.name || 'Expert';
        }

        const candidateName = candidate?.name || (typeof session.candidateId === 'string' ? session.candidateId : 'Candidate');

        const expertDetails = {
            id: expert?._id ? expert._id.toString() : null,
            userId: expertUser?._id ? expertUser._id.toString() : (session.expertId ? session.expertId.toString() : null),
            name: expertName,
            email: expertUser?.email || (typeof lookupId === 'string' && lookupId.includes('@') ? lookupId : null),
            phone: expertUser?.personalInfo?.phone || expertUser?.phone || null,
            profileImage: expert?.profileImage || expertUser?.profileImage || null,
            title: expert?.professionalDetails?.title || expertUser?.experience?.[0]?.position || 'Domain Expert',
            company: expert?.professionalDetails?.company || expertUser?.experience?.[0]?.company || 'Mockeefy Mentor',
            category: expert?.personalInformation?.category || null,
            level: expert?.professionalDetails?.level || session.level || 'Rising Mentor',
            totalExperience: expert?.professionalDetails?.totalExperience ?? null,
            domains: expert?.skillsAndExpertise?.domains || [],
            tools: expert?.skillsAndExpertise?.tools || [],
            languages: expert?.skillsAndExpertise?.languages || [],
            linkedin: expert?.verification?.linkedin || null,
            status: expert?.status || expertUser?.status || 'Active',
            avgRating: expert?.metrics?.avgRating || null,
            totalSessions: expert?.metrics?.totalSessions || 0,
            city: expertUser?.personalInfo?.city || null,
            state: expertUser?.personalInfo?.state || null,
            country: expertUser?.personalInfo?.country || null,
            bio: expertUser?.personalInfo?.bio || null,
        };

        const candidateDetails = candidate ? {
            id: candidate._id ? candidate._id.toString() : (session.candidateId ? session.candidateId.toString() : null),
            name: candidate.name || candidateName,
            email: candidate.email || (typeof session.candidateId === 'string' && session.candidateId.includes('@') ? session.candidateId : null),
            phone: candidate.personalInfo?.phone || candidate.phone || null,
            profileImage: candidate.profileImage || null,
            city: candidate.personalInfo?.city || null,
            state: candidate.personalInfo?.state || null,
            country: candidate.personalInfo?.country || null,
            gender: candidate.personalInfo?.gender || null,
            title: candidate.experience?.[0]?.position || null,
            company: candidate.experience?.[0]?.company || null,
            education: candidate.education?.[0]
                ? `${candidate.education[0].degree || ''}${candidate.education[0].institution ? ' (' + candidate.education[0].institution + ')' : ''}`.trim()
                : null,
            experienceLevel: candidate.preferences?.preferences?.experienceLevel || candidate.preferences?.experienceLevel || null,
            jobType: candidate.preferences?.jobType || null,
            technicalSkills: candidate.skills?.technical || [],
            userType: candidate.userType || 'candidate',
            status: candidate.status || 'Active',
            bio: candidate.personalInfo?.bio || null,
        } : {
            id: session.candidateId ? session.candidateId.toString() : null,
            name: candidateName,
            email: typeof session.candidateId === 'string' && session.candidateId.includes('@') ? session.candidateId : null,
            phone: null,
            profileImage: null,
            status: 'Active'
        };

        const sessionObj = typeof session.toObject === 'function' ? session.toObject() : session;
        const defaultMeet = expert?.availability?.defaultMeetingLink || expertProfile?.availability?.defaultMeetingLink;
        const isValidMeet = defaultMeet && /^https?:\/\/meet\.google\.com\/[a-z0-9-]+/i.test(defaultMeet.trim());
        if (!sessionObj.meetingLink && isValidMeet && session.status !== 'completed' && session.status !== 'cancelled') {
            const inheritedLink = defaultMeet.trim();
            sessionObj.meetingLink = inheritedLink;
            try {
                const SessionModel = (await import('../models/Session.js')).default;
                await SessionModel.updateOne({ sessionId: session.sessionId }, { $set: { meetingLink: inheritedLink } });
            } catch (err) {
                console.error("Failed to persist inherited meeting link in getSession:", err);
            }
        }
        if (sessionObj.status === 'pending' && Number(sessionObj.price) > 0) {
            try {
                const PaymentRecord = (await import('../models/PaymentRecord.js')).default;
                const payRecord = await PaymentRecord.findOne({ sessionId: session.sessionId, status: 'verified' });
                if (payRecord) {
                    sessionObj.status = 'confirmed';
                    const SessionModel = (await import('../models/Session.js')).default;
                    await SessionModel.updateOne({ sessionId: session.sessionId }, { $set: { status: 'confirmed' } });
                }
            } catch (err) {
                console.error("Auto-confirm check failed in getSession:", err);
            }
        }

        const enrichedSession = {
            ...sessionObj,
            expertName,
            candidateName,
            expertDetails,
            candidateDetails
        };
        res.json(enrichedSession);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getSessionsByExpert = async (req, res) => {
    try {
        const { expertId } = req.params;

        // Authorization check: Only the expert themselves or admin can see their sessions
        const Expert = (await import('../models/expertModel.js')).default;
        const expertProfile = await Expert.findOne({ $or: [{ _id: expertId }, { userId: expertId }] });
        const isAuthorized = req.user && (
            req.user.userType === 'admin' ||
            String(expertId) === String(req.user.userId) ||
            (expertProfile && String(expertProfile.userId) === String(req.user.userId))
        );

        const sessions = await sessionService.getSessionsByExpertId(expertId);

        // If not the expert themselves and not admin (e.g. a candidate booking), return only time ranges to prevent PII exposure
        if (!isAuthorized) {
            const sanitized = sessions.map(session => ({
                startTime: session.startTime,
                endTime: session.endTime,
                status: session.status
            }));
            return res.json(sanitized);
        }

        res.json(sessions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getSessionsByCandidate = async (req, res) => {
    try {
        const { candidateId } = req.params;

        // Authorization check: Only the candidate themselves or admin can see their sessions
        if (req.user.userType !== 'admin' && String(req.user.userId) !== String(candidateId)) {
            return res.status(403).json({ message: "Forbidden: Access denied" });
        }

        const sessions = await sessionService.getSessionsByCandidateId(candidateId);

        // Import Expert, User, ReviewDetails and mongoose
        const Expert = (await import('../models/expertModel.js')).default;
        const User = (await import('../models/User.js')).default;
        const ReviewDetails = (await import('../models/reviewModel.js')).default;
        const SessionModel = (await import('../models/Session.js')).default;
        const mongoose = (await import('mongoose')).default;

        const candidateUser = await User.findById(candidateId).lean();

        // High-Performance Batch Prefetching (Eliminates N+1 queries)
        const allSessionIds = sessions.map(s => s.sessionId).filter(Boolean);
        const allMongoIds = sessions.map(s => s._id?.toString()).filter(Boolean);
        const combinedSessionKeys = [...new Set([...allSessionIds, ...allMongoIds])];

        const rawExpertIds = [...new Set(sessions.map(s => s.expertId).filter(Boolean))];
        const validExpertOids = rawExpertIds.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
        const emailExpertLookups = rawExpertIds.filter(id => typeof id === 'string' && id.includes('@')).map(id => id.toLowerCase());

        const [allReviews, expertDocs, usersByEmail, userFallbackDocs] = await Promise.all([
            combinedSessionKeys.length > 0
                ? ReviewDetails.find({ sessionId: { $in: combinedSessionKeys } }).lean()
                : [],
            validExpertOids.length > 0
                ? Expert.find({ $or: [{ userId: { $in: validExpertOids } }, { _id: { $in: validExpertOids } }] }).populate('userId').lean()
                : [],
            emailExpertLookups.length > 0
                ? User.find({ email: { $in: emailExpertLookups } }).lean()
                : [],
            validExpertOids.length > 0
                ? User.find({ _id: { $in: validExpertOids } }).lean()
                : []
        ]);

        const reviewMap = new Map();
        allReviews.forEach(r => {
            const sid = String(r.sessionId);
            const role = String(r.reviewerRole);
            reviewMap.set(`${sid}_${role}`, r);
        });

        const expertMap = new Map();
        expertDocs.forEach(e => {
            if (e._id) expertMap.set(e._id.toString(), e);
            if (e.userId?._id) expertMap.set(e.userId._id.toString(), e);
            else if (e.userId) expertMap.set(e.userId.toString(), e);
        });

        const userFallbackMap = new Map();
        userFallbackDocs.forEach(u => {
            if (u._id) userFallbackMap.set(u._id.toString(), u);
        });
        usersByEmail.forEach(u => {
            if (u.email) userFallbackMap.set(u.email.toLowerCase(), u);
        });

        if (usersByEmail.length > 0) {
            const emailUserIds = usersByEmail.map(u => u._id);
            const extraExperts = await Expert.find({ userId: { $in: emailUserIds } }).populate('userId').lean();
            extraExperts.forEach(e => {
                const uid = e.userId?._id?.toString() || e.userId?.toString();
                const matchedUser = usersByEmail.find(u => u._id.toString() === uid);
                if (matchedUser) {
                    expertMap.set(matchedUser.email.toLowerCase(), e);
                }
            });
        }

        // Enrichment
        const enrichedSessions = sessions.map((session) => {
            const lookupId = session.expertId ? session.expertId.toString() : '';
            const lookupIdLower = lookupId.toLowerCase();

            const expert = expertMap.get(lookupId) || expertMap.get(lookupIdLower) || null;

            // --- NAME RESOLUTION ---
            let expertName = 'Unknown Expert';
            let expertRole = 'Expert';
            let expertCompany = 'N/A';
            let expertImage = null;

            if (expert) {
                expertName = expert.personalInformation?.userName || expert.userId?.name || 'Expert';
                expertRole = expert.professionalDetails?.title || 'Expert';
                expertCompany = expert.professionalDetails?.company || 'N/A';
                expertImage = expert.profileImage || expert.userId?.profileImage || null;
            } else {
                const userFallback = userFallbackMap.get(lookupId) || userFallbackMap.get(lookupIdLower) || null;
                if (userFallback) {
                    expertName = userFallback.name || expertName;
                    expertImage = userFallback.profileImage || null;
                } else if (lookupId && !mongoose.Types.ObjectId.isValid(lookupId)) {
                    expertName = lookupId;
                }
            }

            const isObjectId = (str) => /^[0-9a-fA-F]{24}$/.test(String(str));
            if (expertName === 'Unknown Expert' || isObjectId(expertName)) {
                expertName = 'Expert';
            }

            // In-Memory Review Matching
            const sid = session.sessionId || session._id?.toString();
            const expertReview = reviewMap.get(`${sid}_expert`) || reviewMap.get(`${session._id?.toString()}_expert`) || null;
            const candidateReview = reviewMap.get(`${sid}_candidate`) || reviewMap.get(`${session._id?.toString()}_candidate`) || null;

            const isCompleted = (session.status || '').toLowerCase() === 'completed';
            const candidateSnapshot = session.candidateNameSnapshot || 
                candidateUser?.certificateIdentityConfirmation?.confirmedName || 
                candidateUser?.name || 
                'Candidate';

            // Asynchronously backfill legacy completed sessions without snapshot
            if (isCompleted && !session.candidateNameSnapshot) {
                SessionModel.updateOne(
                    { _id: session._id },
                    {
                        $set: {
                            candidateNameSnapshot: candidateSnapshot,
                            certificateIssued: true,
                            certificateId: `MCFY-${(session._id || session.sessionId).toString().slice(-8).toUpperCase()}`
                        }
                    }
                ).exec().catch(() => {});
            }

            return {
                ...session.toObject(),
                candidateNameSnapshot: candidateSnapshot,
                expertReview: expertReview ? {
                    overallRating: (
                        expertReview.technicalRating != null &&
                        expertReview.communicationRating != null &&
                        expertReview.problemSolvingRating != null &&
                        expertReview.designRating != null &&
                        expertReview.behavioralRating != null
                    ) ? Number(((
                        Number(expertReview.technicalRating) +
                        Number(expertReview.communicationRating) +
                        Number(expertReview.problemSolvingRating) +
                        Number(expertReview.designRating) +
                        Number(expertReview.behavioralRating)
                    ) / 5).toFixed(1)) : expertReview.overallRating,
                    technicalRating: expertReview.technicalRating,
                    communicationRating: expertReview.communicationRating,
                    problemSolvingRating: expertReview.problemSolvingRating,
                    designRating: expertReview.designRating,
                    behavioralRating: expertReview.behavioralRating,
                    hiringDecision: expertReview.hiringDecision || expertReview.recommendation || null,
                    recommendation: expertReview.recommendation || expertReview.hiringDecision || null,
                    strengths: expertReview.strengths,
                    weaknesses: expertReview.weaknesses,
                    feedback: expertReview.feedback,
                    suggestions: expertReview.suggestions,
                    createdAt: expertReview.createdAt
                } : null,
                candidateReview: candidateReview ? {
                    overallRating: candidateReview.overallRating,
                    technicalRating: candidateReview.technicalRating,
                    communicationRating: candidateReview.communicationRating,
                    problemSolvingRating: candidateReview.problemSolvingRating,
                    designRating: candidateReview.designRating,
                    behavioralRating: candidateReview.behavioralRating,
                    strengths: candidateReview.strengths,
                    weaknesses: candidateReview.weaknesses,
                    feedback: candidateReview.feedback,
                    createdAt: candidateReview.createdAt
                } : null,
                expertDetails: {
                    name: expertName,
                    role: expertRole,
                    company: expertCompany,
                    category: expert?.personalInformation?.category || 'General',
                    profileImage: expertImage,
                    rating: expert?.metrics?.avgRating || 4.8,
                    reviews: expert?.metrics?.totalReviews || 0,
                    expertise: expert?.skillsAndExpertise?.domains || []
                }
            };
        });

        res.json(enrichedSessions);
    } catch (error) {
        console.error('Get Sessions By Candidate Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Seed restricted test session (Dev only)
export const devSeedSession = async (req, res) => {
    // Check dev flag if needed. For now assuming route protection or local env.
    const { expertEmail, candidateEmail, startTime, endTime } = req.body;

    if (!expertEmail || !candidateEmail) {
        return res.status(400).json({ message: "Expert and Candidate emails required" });
    }

    try {
        const result = await sessionService.createRestrictedTestSession(expertEmail, candidateEmail, startTime, endTime);
        res.status(201).json({
            message: "Restricted test session created",
            ...result
        });
    } catch (error) {
        console.error("Seed Error:", error);
        res.status(404).json({ message: error.message });
    }
};

export const getUserSessions = async (req, res) => {
    try {
        const { userId, role } = req.params;

        // Authorization check: Only the user themselves or admin can see their sessions
        if (req.user.userType !== 'admin' && String(req.user.userId) !== String(userId)) {
            return res.status(403).json({ message: "Forbidden: Access denied" });
        }

        const sessions = await sessionService.getSessionsForUser(userId, role);
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const leaveSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user?.userId || req.headers?.userid;
        const SessionModel = (await import('../models/Session.js')).default;
        const mongoose = (await import('mongoose')).default;
        const query = mongoose.Types.ObjectId.isValid(sessionId)
            ? { $or: [{ sessionId }, { _id: sessionId }] }
            : { sessionId };
        const session = await SessionModel.findOne(query);
        if (!session) return res.status(404).json({ message: "Session not found" });

        const isCandidate = userId && String(session.candidateId) === String(userId);
        if (isCandidate) {
            await SessionModel.updateOne(
                { _id: session._id },
                { $set: { candidateLeftAt: new Date(), candidateConnectionStatus: 'left' } }
            );
        }
        return res.json({ success: true, message: "Leave recorded" });
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
};

export const joinSession = async (req, res) => {
    const { sessionId } = req.params;
    const userId = req.user.userId; // Secure: retrieve userId from authenticated token payload

    if (!userId) return res.status(401).json({ message: "Unauthorized: User ID required" });

    try {
        const session = await sessionService.getSessionById(sessionId);
        if (!session) return res.status(404).json({ message: "Session not found" });

        // Check 0: Terminal session status check
        const sessionStatus = (session.status || '').toLowerCase();
        if (sessionStatus === 'completed') {
            return res.status(400).json({ 
                success: false, 
                permitted: false, 
                message: "This interview has concluded and is already marked completed. The meeting room is closed." 
            });
        }
        if (sessionStatus === 'cancelled') {
            return res.status(400).json({ 
                success: false, 
                permitted: false, 
                message: "This session has been cancelled." 
            });
        }
        if (sessionStatus === 'no-show' || sessionStatus === 'candidate_no_show' || sessionStatus === 'no_show') {
            return res.status(400).json({ 
                success: false, 
                permitted: false, 
                message: "This session has been marked as a candidate no-show. The meeting room is closed." 
            });
        }
        if (sessionStatus === 'pending') {
            return res.status(400).json({ 
                success: false, 
                permitted: false, 
                message: "This session is pending expert approval and cannot be joined yet." 
            });
        }

        // 1. Validate Identity (Resilient check for ID or Email or Expert Profile)
        const mongoose = (await import('mongoose')).default;
        const User = (await import('../models/User.js')).default;
        const Expert = (await import('../models/expertModel.js')).default;

        let isParticipant = false;
        let isExpert = false;
        let isCandidate = false;

        // Convert session IDs to strings for comparison
        const sExpert = session.expertId?.toString() || "";
        const sCandidate = session.candidateId?.toString() || "";
        const uId = userId.toString();

        // Check 1: Direct ID Match
        if (sExpert === uId) {
            isParticipant = true;
            isExpert = true;
        } else if (sCandidate === uId) {
            isParticipant = true;
            isCandidate = true;
        }

        // Check 2: Expert Profile Match (if user is expert but session has ExpertDoc ID)
        if (!isParticipant || !isExpert) {
            const expertDoc = await Expert.findOne({ $or: [{ userId: userId }, { _id: userId }] });
            if (expertDoc && (expertDoc._id.toString() === sExpert || expertDoc.userId.toString() === sExpert || expertDoc._id.toString() === uId || expertDoc.userId.toString() === uId)) {
                isParticipant = true;
                isExpert = true;
            }
        }

        // Check 3: Role from token/auth
        if (req.user?.userType === 'expert' && isParticipant) {
            isExpert = true;
        } else if (req.user?.userType === 'candidate' && isParticipant) {
            isCandidate = true;
        }

        // Check 4: Email Fallback (Legacy/Dev)
        if (!isParticipant) {
            const user = await User.findById(userId);
            if (user && user.email) {
                const uEmail = user.email.toLowerCase();
                if (sExpert.toLowerCase() === uEmail) {
                    isParticipant = true;
                    isExpert = true;
                } else if (sCandidate.toLowerCase() === uEmail) {
                    isParticipant = true;
                    isCandidate = true;
                }
            }
        }

        if (!isParticipant) {
            return res.status(403).json({ message: "Access Denied: You are not a participant of this session." });
        }

        // 2. Validate Time
        const now = new Date();
        const start = new Date(session.startTime);
        const end = new Date(session.endTime);

        // Allow joining 10 mins early
        const bufferStart = new Date(start.getTime() - 10 * 60 * 1000);

        if (now < bufferStart) {
            return res.status(400).json({
                message: "Session has not started yet.",
                startTime: start
            });
        }

        if (now > end) {
            // Buffer: Allow joining for up to 30 mins after end time just in case
            const bufferEnd = new Date(end.getTime() + 30 * 60 * 1000);
            if (now > bufferEnd) {
                return res.status(400).json({ message: "Session has ended.", endTime: end });
            }
        }

        // 3. Success -> Return Meeting Data
        await meetingService.getOrCreateMeeting(session.sessionId); // Ensure Meeting doc exists

        const assignedRole = isExpert ? 'expert' : 'candidate';
        try {
            const SessionModel = (await import('../models/Session.js')).default;
            if (assignedRole === 'candidate') {
                await SessionModel.findOneAndUpdate(
                    { sessionId: session.sessionId, candidateJoinedAt: null },
                    { $set: { attendanceStatus: 'attended', candidateJoinedAt: new Date(), candidateConnectionStatus: 'connected' } }
                );
                await SessionModel.updateOne(
                    { sessionId: session.sessionId, candidateJoinedAt: { $ne: null } },
                    { $set: { candidateConnectionStatus: 'connected' } }
                );
            } else {
                await SessionModel.findOneAndUpdate(
                    { sessionId: session.sessionId, expertJoinedAt: null },
                    { $set: { expertJoinedAt: new Date() } }
                );
            }
        } catch (attErr) {
            console.error('[joinSession] Attendance recording error:', attErr);
        }

        res.json({
            permitted: true,
            meetingId: session.sessionId, // Using sessionId as meetingId
            role: assignedRole
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Seed endpoint (optional, but good for manual trigger)
export const seedSession = async (req, res) => {
    try {
        const session = await sessionService.seedTestSession();
        res.json(session);
    } catch (error) {
    }
};

/* -------------------- ADMIN: Get All Sessions -------------------- */
export const getAllSessions = async (req, res) => {
    try {
        const sessions = await sessionService.getAllSessions();
        res.json({ success: true, data: sessions });
    } catch (error) {
        console.error("Get All Sessions Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/* -------------------- Submit Review -------------------- */
export const submitReview = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const {
            overallRating,
            technicalRating,
            communicationRating,
            problemSolvingRating,
            designRating,
            behavioralRating,
            feedback,
            suggestions,
            strengths,
            weaknesses,
            hiringDecision,
            recommendation,
            reviewerRole = 'candidate'
        } = req.body;

        // Authoritative backend calculation for evaluation ratings
        let computedOverall = overallRating;

        if (reviewerRole === 'expert') {
            const hasSubRatings = technicalRating !== undefined || communicationRating !== undefined ||
                problemSolvingRating !== undefined || designRating !== undefined || behavioralRating !== undefined;

            if (hasSubRatings) {
                // If expert evaluation includes rubric criteria, validate all provided are valid numbers 1-5
                const rubricKeys = [
                    { name: 'Technical', val: technicalRating },
                    { name: 'Communication', val: communicationRating },
                    { name: 'Problem Solving', val: problemSolvingRating },
                    { name: 'System Design', val: designRating },
                    { name: 'Behavioral', val: behavioralRating }
                ];

                const validNumbers = [];
                for (const item of rubricKeys) {
                    if (item.val !== undefined && item.val !== null && item.val !== '') {
                        const num = Number(item.val);
                        if (isNaN(num) || !isFinite(num) || num < 1 || num > 5) {
                            return res.status(400).json({
                                success: false,
                                message: `Invalid score for ${item.name}: must be a number between 1 and 5.`
                            });
                        }
                        validNumbers.push(num);
                    }
                }

                if (validNumbers.length > 0) {
                    // Authoritative equal-weight calculation rounded to 1 decimal place (e.g. 2.4)
                    const sum = validNumbers.reduce((a, b) => a + b, 0);
                    computedOverall = Number((sum / validNumbers.length).toFixed(1));
                }
            }
        }

        const ratingNum = Number(computedOverall);
        if (!sessionId || isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            return res.status(400).json({ 
                success: false, 
                message: "A valid overall rating between 1 and 5 is required." 
            });
        }

        if (reviewerRole !== 'expert' && reviewerRole !== 'candidate') {
            return res.status(400).json({ success: false, message: "Invalid reviewer role" });
        }

        // Dynamically import models and services
        const ReviewDetails = (await import('../models/reviewModel.js')).default;
        const User = (await import('../models/User.js')).default;
        const ExpertDetails = (await import('../models/expertModel.js')).default;
        const sessionService = (await import('../services/sessionService.js'));
        const emailService = (await import('../services/emailService.js'));

        // Fetch Session first to validate identity
        const session = await sessionService.getSessionById(sessionId);
        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }

        // Ensure session has concluded before evaluation/payout can be submitted
        const sStatus = (session.status || '').toLowerCase();
        if (sStatus === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: "This session was cancelled and cannot be evaluated."
            });
        }
        if (sStatus === 'no-show' || sStatus === 'candidate_no_show') {
            return res.status(400).json({
                success: false,
                message: "This session was marked as a candidate no-show and cannot be evaluated."
            });
        }
        if (sStatus === 'pending') {
            return res.status(400).json({
                success: false,
                message: "This session is pending expert approval and cannot be evaluated."
            });
        }
        const now = new Date();
        const isTimeConcluded = session.endTime && now >= new Date(session.endTime);
        const isSessionFinished = sStatus === 'completed' || isTimeConcluded;
        if (!isSessionFinished && session.startTime && now < new Date(session.startTime)) {
            return res.status(400).json({ 
                success: false, 
                message: "This session has not taken place yet. Evaluations unlock after the meeting concludes." 
            });
        }

        // Enforce review role authorization checks
        if (reviewerRole === 'expert') {
            const expertProfile = await ExpertDetails.findOne({ $or: [{ _id: session.expertId }, { userId: session.expertId }] });
            const isAuthorized = String(session.expertId) === String(req.user.userId) ||
                (expertProfile && String(expertProfile.userId) === String(req.user.userId));
            if (!isAuthorized) {
                return res.status(403).json({ success: false, message: "Forbidden: You are not authorized as the expert for this session" });
            }
        } else if (reviewerRole === 'candidate') {
            const isAuthorized = String(session.candidateId) === String(req.user.userId);
            if (!isAuthorized) {
                return res.status(403).json({ success: false, message: "Forbidden: You are not authorized as the candidate for this session" });
            }
        }

        // Enforce one review per eligible user/session combination (prevent duplicate submissions / idempotent retry)
        const existingReview = await ReviewDetails.findOne({ sessionId, reviewerRole });
        if (existingReview) {
            const isCredited = Boolean(session.payoutCredited);
            // If already credited or not eligible for expert payout: return idempotent response immediately
            if (isCredited || reviewerRole !== 'expert') {
                return res.status(200).json({ 
                    success: true, 
                    message: "Review already submitted.",
                    data: existingReview,
                    session,
                    walletCredit: {
                        credited: false,
                        amount: session.payoutAmount || 0,
                        alreadyCredited: isCredited,
                        reason: isCredited ? 'Already credited' : 'Session payout has not been credited'
                    }
                });
            }
            // If reviewerRole === 'expert' and !isCredited:
            // Allow execution to flow down to complete the pending payout!
        }

        const newDocData = {
            sessionId,
            expertId: session.expertId, // Use verified ID from DB session
            candidateId: session.candidateId, // Use verified ID from DB session
            reviewerRole,
            overallRating: ratingNum,
            feedback: (feedback || '').trim(),
            suggestions: (suggestions || '').trim(),
            strengths: Array.isArray(strengths) ? strengths : [],
            weaknesses: Array.isArray(weaknesses) ? weaknesses : [],
            hiringDecision: hiringDecision || 'Hire',
            recommendation: recommendation || ''
        };

        // Only attach sub-ratings if explicitly provided as valid 1-5 integers
        if (problemSolvingRating && Number(problemSolvingRating) >= 1 && Number(problemSolvingRating) <= 5) {
            newDocData.problemSolvingRating = Number(problemSolvingRating);
        }
        if (designRating && Number(designRating) >= 1 && Number(designRating) <= 5) {
            newDocData.designRating = Number(designRating);
        }
        if (behavioralRating && Number(behavioralRating) >= 1 && Number(behavioralRating) <= 5) {
            newDocData.behavioralRating = Number(behavioralRating);
        }
        if (technicalRating && Number(technicalRating) >= 1 && Number(technicalRating) <= 5) {
            newDocData.technicalRating = Number(technicalRating);
        }
        if (communicationRating && Number(communicationRating) >= 1 && Number(communicationRating) <= 5) {
            newDocData.communicationRating = Number(communicationRating);
        }

        let newReview = existingReview;
        if (!existingReview) {
            let reviewDoc;
            try {
                reviewDoc = new ReviewDetails(newDocData);
                await reviewDoc.save();
            } catch (saveErr) {
                if (saveErr.code === 11000) {
                    // Idempotent recovery for concurrent submissions
                    const dupReview = await ReviewDetails.findOne({ sessionId, reviewerRole });
                    let currentSession = await Session.findOne({ sessionId });
                    
                    // If concurrent winning thread is currently committing payout, poll briefly
                    if (reviewerRole === 'expert' && !currentSession?.payoutCredited) {
                        for (let attempt = 0; attempt < 10; attempt++) {
                            await new Promise(r => setTimeout(r, 150));
                            currentSession = await Session.findOne({ sessionId });
                            if (currentSession?.payoutCredited) break;
                        }
                    }

                    const WalletTransaction = (await import("../models/WalletTransaction.js")).default;
                    const existingTxn = await WalletTransaction.findOne({
                        referenceId: session._id,
                        referenceModel: 'Session',
                        type: 'CREDIT'
                    });

                    const wasCredited = Boolean(currentSession?.payoutCredited || existingTxn);
                    const finalAmount = currentSession?.payoutAmount || existingTxn?.amount || (reviewerRole === 'expert' ? (Number(session.price || 0) * 0.8) : 0);
                    return res.status(200).json({
                        success: true,
                        message: "Review already submitted.",
                        data: dupReview,
                        session: currentSession || session,
                        walletCredit: {
                            credited: false,
                            amount: finalAmount,
                            alreadyCredited: wasCredited,
                            reason: wasCredited ? 'Already credited' : 'Session payout has not been credited'
                        }
                    });
                }
                throw saveErr;
            }
            newReview = reviewDoc;
        }

        // Recalculate expert metrics if candidate submitted review
        if (reviewerRole === 'candidate') {
            try {
                const candidateReviews = await ReviewDetails.find({ expertId: session.expertId, reviewerRole: 'candidate' });
                if (candidateReviews.length > 0) {
                    const sumRating = candidateReviews.reduce((acc, curr) => acc + (curr.overallRating || 0), 0);
                    const avg = Number((sumRating / candidateReviews.length).toFixed(1));
                    await ExpertDetails.findOneAndUpdate(
                        { $or: [{ _id: session.expertId }, { userId: session.expertId }] },
                        {
                            $set: {
                                'metrics.avgRating': avg,
                                'metrics.totalReviews': candidateReviews.length
                            }
                        }
                    );
                }
            } catch (metricErr) {
                console.error("Failed to update expert review metrics:", metricErr);
            }
        }

        // Update Session status
        let walletCreditResult = null;
        let expertUser = null;
        if (session) {
            if (session.status !== 'completed') {
                session.status = 'completed'; // Ensure it's marked completed
                await session.save();
            }

            if (reviewerRole === 'expert') {
                try {
                    walletCreditResult = await settleExpertSessionPayout({
                        session: session,
                        outcome: 'ATTENDED_COMPLETED',
                        reason: 'Expert evaluation submitted',
                        actorUserId: req.user?.userId
                    });
                    if (walletCreditResult?.credited || walletCreditResult?.alreadyCredited) {
                        session.payoutCredited = true;
                        session.payoutStatus = 'credited';
                        session.payoutAmount = walletCreditResult.amount;
                        session.payoutCreditedAt = new Date();
                    }
                } catch (walletErr) {
                    console.error("Wallet credit failed:", walletErr);
                    walletCreditResult = { credited: false, amount: 0, reason: walletErr.message };
                }
            }

            // --- SEND EMAIL NOTIFICATION ---
            if (reviewerRole === 'expert') {
                try {
                    let candidateEmail = null;
                    let candidateUserId = null;
                    const candIdStr = String(session.candidateId || req.body?.candidateId || '');

                    if (candIdStr.includes('@')) {
                        candidateEmail = candIdStr;
                        const user = await User.findOne({ email: candIdStr.toLowerCase() });
                        if (user) candidateUserId = user._id;
                    } else if (candIdStr) {
                        const candidate = await User.findById(candIdStr).catch(() => null);
                        if (candidate) {
                            candidateEmail = candidate.email;
                            candidateUserId = candidate._id;
                        }
                    }

                    if (candidateEmail) {
                        let expertName = "An Expert";
                        await emailService.notifyReviewReceived(
                            expertName,
                            candidateEmail,
                            session.topics?.[0] || "Mock Interview",
                            { overallRating, technicalRating, communicationRating, feedback }
                        );
                    }

                    if (candidateUserId) {
                        const { createNotification } = await import('../controllers/notificationController.js');
                        await createNotification({
                            userId: candidateUserId,
                            type: 'review_received',
                            title: 'New Feedback Received',
                            message: `Your expert has submitted feedback for the session on ${session.topics?.[0] || 'Mock Interview'}. Rating: ${overallRating}/5.`,
                            metadata: {
                                sessionId: sessionId,
                                link: `/my-sessions`
                            }
                        });
                    }
                } catch (emailErr) {
                    console.error("Failed to send review email/notification:", emailErr);
                }
            }
        }

        const sessionUpdateData = {
            status: session.status,
            payoutCredited: session.payoutCredited,
            payoutStatus: session.payoutStatus,
            payoutAmount: session.payoutAmount,
            payoutCreditedAt: session.payoutCreditedAt,
            review: newReview
        };

        syncDataChange({
            type: "SESSION_UPDATED",
            sessionId: session.sessionId,
            data: sessionUpdateData,
            toAdmin: true
        });
        if (session.candidateId) {
            syncDataChange({
                type: "SESSION_UPDATED",
                userId: session.candidateId,
                sessionId: session.sessionId,
                data: sessionUpdateData
            });
        }
        if (session.expertId) {
            syncDataChange({
                type: "SESSION_UPDATED",
                userId: session.expertId,
                sessionId: session.sessionId,
                data: sessionUpdateData
            });
        }
        if (expertUser && String(expertUser._id) !== String(session.expertId)) {
            syncDataChange({
                type: "SESSION_UPDATED",
                userId: expertUser._id,
                sessionId: session.sessionId,
                data: sessionUpdateData
            });
        }

        res.status(existingReview ? 200 : 201).json({
            success: true,
            message: existingReview ? "Review already submitted. Session payout processed successfully." : "Review submitted successfully",
            data: newReview,
            session: {
                sessionId: session.sessionId,
                status: session.status,
                payoutCredited: session.payoutCredited,
                payoutStatus: session.payoutStatus,
                payoutAmount: session.payoutAmount,
                payoutCreditedAt: session.payoutCreditedAt
            },
            walletCredit: walletCreditResult
        });
    } catch (error) {
        console.error("Submit Review Error:", error);
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A review has already been submitted for this session."
            });
        }
        res.status(500).json({ success: false, message: error.message || "Server Error" });
    }
};

/* -------------------- Get Session Reviews -------------------- */
export const getSessionReviews = async (req, res) => {
    try {
        const { sessionId } = req.params;

        // Find session to check authorization
        const Session = (await import('../models/Session.js')).default;
        const session = await Session.findOne({ sessionId });
        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }

        // Authorization check: Only participant or admin
        const Expert = (await import('../models/expertModel.js')).default;
        const expertProfile = await Expert.findOne({ $or: [{ _id: session.expertId }, { userId: session.expertId }] });
        const isAuthorized = req.user.userType === 'admin' ||
            String(session.candidateId) === String(req.user.userId) ||
            String(session.expertId) === String(req.user.userId) ||
            (expertProfile && String(expertProfile.userId) === String(req.user.userId));

        if (!isAuthorized) {
            return res.status(403).json({ success: false, message: "Forbidden: Access denied" });
        }

        const Review = (await import('../models/reviewModel.js')).default;
        const reviews = await Review.find({ sessionId });

        const expertReview = reviews.find(r => r.reviewerRole === 'expert') || null;
        const candidateReview = reviews.find(r => r.reviewerRole === 'candidate') || null;

        res.json({
            success: true,
            data: {
                expertReview,
                candidateReview
            }
        });
    } catch (error) {
        console.error("Get Reviews Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/* -------------------- Request Feedback -------------------- */
export const requestFeedback = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const Session = (await import('../models/Session.js')).default;
        const User = (await import('../models/User.js')).default;
        const ReviewDetails = (await import('../models/reviewModel.js')).default;
        const ExpertDetails = (await import('../models/expertModel.js')).default;
        const { createNotification } = await import('./notificationController.js');
        const { emitToUser, syncDataChange } = await import('../services/socketService.js');

        const session = await Session.findOne({ sessionId });
        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }

        // Authorization check: Only candidate or admin can request feedback
        if (req.user.userType !== 'admin' && String(session.candidateId) !== String(req.user.userId)) {
            return res.status(403).json({ success: false, message: "Forbidden: Access denied" });
        }

        // Eligibility check: session must be completed / concluded
        const sStatus = (session.status || '').toLowerCase();
        if (sStatus !== 'completed' && sStatus !== 'evaluated') {
            return res.status(400).json({
                success: false,
                message: "Feedback can only be requested for completed interview sessions."
            });
        }

        // Check if expert has already submitted review
        const existingExpertReview = await ReviewDetails.findOne({
            sessionId: session.sessionId,
            reviewerRole: 'expert'
        });
        if (existingExpertReview) {
            return res.status(400).json({
                success: false,
                message: "The expert has already submitted feedback for this session."
            });
        }

        // Atomic check & update: Immediate 1st request allowed post-session; 2nd request (reminder) allowed after 12h; max 2 per 24h
        const now = new Date();
        const currentCount = session.feedbackRequestCount || (session.feedbackRequested ? 1 : 0);
        const firstRequestedAt = session.firstFeedbackRequestedAt || session.feedbackRequestedAt;
        const lastRequestedAt = session.lastFeedbackRequestedAt || session.feedbackRequestedAt;

        const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
        const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

        let updatedSession = null;
        let isReminder = false;

        if (currentCount >= 2) {
            // Check if 24 hours have elapsed since the start of this 24h rolling cycle
            if (firstRequestedAt && (now.getTime() - new Date(firstRequestedAt).getTime() < TWENTY_FOUR_HOURS_MS)) {
                const remMs = TWENTY_FOUR_HOURS_MS - (now.getTime() - new Date(firstRequestedAt).getTime());
                const totalRemMinutes = Math.max(0, Math.ceil(remMs / 60000));
                const remH = Math.floor(totalRemMinutes / 60);
                const remM = totalRemMinutes % 60;
                return res.status(400).json({
                    success: false,
                    message: `Maximum of 2 feedback requests allowed per 24 hours. You can request again in ${remH}h ${remM}m.`
                });
            }
            // 24 hours have elapsed -> start new 24h cycle
            updatedSession = await Session.findOneAndUpdate(
                {
                    sessionId: session.sessionId,
                    feedbackRequestCount: currentCount
                },
                {
                    $set: {
                        feedbackRequested: true,
                        feedbackRequestedAt: now,
                        feedbackRequestCount: 1,
                        firstFeedbackRequestedAt: now,
                        lastFeedbackRequestedAt: now
                    },
                    $push: { feedbackReminderHistory: now }
                },
                { new: true }
            );
            isReminder = false;
        } else if (currentCount === 1) {
            // Second request: Check if at least 12 hours have elapsed since the first request
            const elapsedSinceLast = lastRequestedAt ? (now.getTime() - new Date(lastRequestedAt).getTime()) : TWELVE_HOURS_MS;
            if (elapsedSinceLast < TWELVE_HOURS_MS) {
                const remMs = TWELVE_HOURS_MS - elapsedSinceLast;
                const totalRemMinutes = Math.max(0, Math.ceil(remMs / 60000));
                const remH = Math.floor(totalRemMinutes / 60);
                const remM = totalRemMinutes % 60;
                return res.status(400).json({
                    success: false,
                    message: `You can send another reminder in ${remH}h ${remM}m.`
                });
            }
            // 12 hours have elapsed -> allow 2nd request (reminder)
            updatedSession = await Session.findOneAndUpdate(
                {
                    sessionId: session.sessionId,
                    feedbackRequestCount: 1,
                    $or: [
                        { lastFeedbackRequestedAt: { $lte: new Date(now.getTime() - TWELVE_HOURS_MS) } },
                        { lastFeedbackRequestedAt: null }
                    ]
                },
                {
                    $set: {
                        feedbackRequested: true,
                        feedbackRequestCount: 2,
                        lastFeedbackRequestedAt: now
                    },
                    $push: { feedbackReminderHistory: now }
                },
                { new: true }
            );
            isReminder = true;
        } else {
            // First request (immediately post-session)
            updatedSession = await Session.findOneAndUpdate(
                {
                    sessionId: session.sessionId,
                    $or: [
                        { feedbackRequestCount: { $in: [0, null] } },
                        { feedbackRequested: { $ne: true } }
                    ]
                },
                {
                    $set: {
                        feedbackRequested: true,
                        feedbackRequestedAt: now,
                        feedbackRequestCount: 1,
                        firstFeedbackRequestedAt: now,
                        lastFeedbackRequestedAt: now
                    },
                    $push: { feedbackReminderHistory: now }
                },
                { new: true }
            );
            isReminder = false;
        }

        if (!updatedSession) {
            return res.status(400).json({
                success: false,
                message: "Unable to process feedback request at this time. Please try again."
            });
        }

        // Get candidate name
        const candidate = await User.findById(session.candidateId);
        const candidateName = candidate?.name || "Candidate";

        // Format Date and Time in Asia/Kolkata
        const start = new Date(session.startTime);
        const formattedDate = session.startTime
            ? start.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", year: "numeric" })
            : "Recent Session";
        const formattedTimeSlot = session.startTime
            ? start.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })
            : "";

        // Resolve Expert user ID (handle both User._id and ExpertDetails._id)
        let expertUserId = session.expertId;
        const expertProfile = await ExpertDetails.findOne({
            $or: [{ _id: session.expertId }, { userId: session.expertId }]
        });
        if (expertProfile?.userId) {
            expertUserId = expertProfile.userId;
        }

        const notificationTitle = isReminder ? "Feedback Reminder" : "Feedback Requested";
        const notificationMessage = isReminder
            ? `Reminder: ${candidateName} is waiting for evaluation and feedback for your mock interview on ${formattedDate} (${formattedTimeSlot}).`
            : `${candidateName} has requested evaluation and feedback for your mock interview on ${formattedDate} (${formattedTimeSlot}).`;
        const actionLink = `/dashboard/sessions?sessionId=${session.sessionId}&action=feedback`;

        // Create persistent notification for expert
        const notifDoc = await createNotification({
            userId: expertUserId,
            type: isReminder ? 'feedback_reminder' : 'feedback_request',
            title: notificationTitle,
            message: notificationMessage,
            metadata: {
                sessionId: session.sessionId,
                candidateName,
                candidateId: session.candidateId,
                sessionDate: formattedDate,
                sessionTime: formattedTimeSlot,
                action: 'submit_feedback',
                link: actionLink,
                isReminder,
                feedbackRequestCount: updatedSession.feedbackRequestCount
            }
        });

        // Real-time notification & feedback event directly to authenticated expert
        emitToUser(expertUserId, 'feedback_requested', {
            sessionId: session.sessionId,
            candidateName,
            candidateId: session.candidateId,
            formattedDate,
            formattedTimeSlot,
            message: notificationMessage,
            link: actionLink,
            notification: notifDoc,
            isReminder,
            feedbackRequestCount: updatedSession.feedbackRequestCount
        });

        syncDataChange({
            type: "SESSION_UPDATED",
            userId: expertUserId,
            sessionId: session.sessionId,
            data: updatedSession
        });

        syncDataChange({
            type: "SESSION_UPDATED",
            userId: session.candidateId,
            sessionId: session.sessionId,
            data: updatedSession
        });

        res.json({
            success: true,
            message: isReminder ? "Feedback reminder sent successfully." : "Feedback requested successfully.",
            session: {
                sessionId: updatedSession.sessionId,
                feedbackRequested: true,
                feedbackRequestedAt: updatedSession.feedbackRequestedAt,
                feedbackRequestCount: updatedSession.feedbackRequestCount,
                firstFeedbackRequestedAt: updatedSession.firstFeedbackRequestedAt,
                lastFeedbackRequestedAt: updatedSession.lastFeedbackRequestedAt
            }
        });
    } catch (error) {
        console.error("Request Feedback Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/* -------------------- Get Candidate Resume (Secure Delivery) -------------------- */
export const getCandidateResume = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const mode = (req.query.mode || 'view').toLowerCase(); // 'view' or 'download'
        const jwt = (await import('jsonwebtoken')).default;
        const JWT_SECRET = process.env.JWT_SECRET || 'fallback_jwt_secret';
        let user = req.user;
        if (!user) {
            const token = req.query.token || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]) || req.cookies?.jwt;
            if (token) {
                try {
                    user = jwt.verify(token, JWT_SECRET);
                } catch (e) {}
            }
        }
        if (!user) {
            return res.status(401).json({ success: false, message: "Authentication required to access candidate resume" });
        }

        const Session = (await import('../models/Session.js')).default;
        const User = (await import('../models/User.js')).default;
        const Resume = (await import('../models/Resume.js')).default;
        const { fetchResumeBuffer, generatePrintableResumeHtml } = await import('../services/resumeService.js');

        const session = await Session.findOne({
            $or: [
                { sessionId },
                { _id: sessionId && sessionId.match(/^[0-9a-fA-F]{24}$/) ? sessionId : null }
            ]
        }).lean();

        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }

        const requesterId = String(user.userId || user.id || user._id || '');
        const isAdmin = user.userType === 'admin' || user.role === 'admin';
        const Expert = (await import('../models/expertModel.js')).default;
        const expertDoc = await Expert.findOne({
            $or: [{ userId: requesterId }, { _id: requesterId.match(/^[0-9a-fA-F]{24}$/) ? requesterId : null }]
        }).lean();

        const isCandidate = String(session.candidateId) === requesterId;
        const isExpert = (expertDoc && (String(expertDoc._id) === String(session.expertId) || String(expertDoc.userId) === String(session.expertId))) ||
                         String(session.expertId) === requesterId;

        if (!isAdmin && !isCandidate && !isExpert) {
            return res.status(403).json({ success: false, message: "Forbidden: You are not authorized to view this candidate's resume" });
        }

        const candidateId = session.candidateId;
        const candidate = await User.findById(candidateId).lean();
        const candidateName = candidate?.name || session.candidateName || "Candidate";

        // Find candidate resume
        let resume = await Resume.findOne({ userId: candidateId, isDefault: true }).lean();
        if (!resume) {
            resume = await Resume.findOne({ userId: candidateId }).sort({ updatedAt: -1 }).lean();
        }

        const fileName = resume?.fileName || `${candidateName.replace(/\s+/g, '_')}_Resume.pdf`;
        const disposition = mode === 'download' ? 'attachment' : 'inline';

        // Try to fetch binary PDF buffer
        if (resume?.fileUrl) {
            const buffer = await fetchResumeBuffer(resume.fileUrl);
            if (buffer && buffer.length > 0) {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(fileName)}"`);
                return res.send(buffer);
            }
        }

        // Fallback: Generate printable ATS HTML resume
        const html = generatePrintableResumeHtml({ candidate, resume, session });
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
    } catch (error) {
        console.error("Get Candidate Resume Error:", error);
        res.status(500).send("Error loading resume: " + error.message);
    }
};



/* -------------------- Expert Session Approval & Rescheduling Endpoints -------------------- */

export const acceptSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const requesterId = req.user.userId;
        const isAdmin = req.user.userType === 'admin';

        const mongoose = (await import('mongoose')).default;
        const sessionQuery = mongoose.Types.ObjectId.isValid(sessionId)
            ? { $or: [{ sessionId }, { _id: sessionId }] }
            : { sessionId };
        const session = await Session.findOne(sessionQuery);

        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }

        const expertDoc = await ExpertDetails.findOne({
            $or: [{ _id: session.expertId }, { userId: session.expertId }]
        });
        const isAuthorizedExpert = expertDoc && (expertDoc.userId.toString() === requesterId || expertDoc._id.toString() === requesterId);

        if (!isAuthorizedExpert && !isAdmin) {
            return res.status(403).json({ success: false, message: "Unauthorized: Only the assigned expert can accept this session" });
        }

        if (session.status?.toLowerCase() !== 'pending') {
            return res.status(400).json({ success: false, message: `Cannot accept session with status '${session.status}'` });
        }

        // Check for availability conflicts: any other confirmed/live session for this expert overlapping this time window
        const conflictingSession = await Session.findOne({
            _id: { $ne: session._id },
            expertId: session.expertId,
            status: { $in: ['confirmed', 'live', 'Upcoming'] },
            startTime: { $lt: session.endTime },
            endTime: { $gt: session.startTime }
        });

        if (conflictingSession) {
            return res.status(409).json({
                success: false,
                message: "Availability conflict: You already have another confirmed interview during this time slot."
            });
        }

        const defaultLink = expertDoc?.availability?.defaultMeetingLink;
        const validMeetLink = defaultLink && /^https?:\/\/meet\.google\.com\/[a-z0-9-]+/i.test(defaultLink.trim()) ? defaultLink.trim() : null;
        const meetingLinkToSet = session.meetingLink || validMeetLink || undefined;
        const updateData = { status: 'confirmed' };
        if (meetingLinkToSet && !session.meetingLink) {
            updateData.meetingLink = meetingLinkToSet;
        }

        const updatedSession = await Session.findOneAndUpdate(
            { _id: session._id, status: session.status },
            { $set: updateData },
            { new: true }
        );

        if (!updatedSession) {
            return res.status(409).json({ success: false, message: "Session was already accepted or is no longer pending." });
        }



        const { formatSessionDateTime } = await import('../services/emailService.js');
        const { createNotification } = await import('./notificationController.js');
        const dt = formatSessionDateTime(session.startTime, session.endTime);

        await createNotification({
            userId: session.candidateId,
            type: 'booking_confirmed',
            title: 'Booking Request Confirmed! 🎉',
            message: `Your interview session on ${dt.dateStr} at ${dt.timeSlotStr} has been accepted by the mentor.`,
            metadata: { sessionId: session.sessionId, link: '/my-sessions' }
        });

        syncDataChange({
            type: "SESSION_UPDATED",
            userId: session.candidateId,
            expertId: expertDoc?._id,
            sessionId: session.sessionId,
            data: updatedSession,
            toAdmin: true
        });

        return res.json({ success: true, message: "Session accepted successfully", session: updatedSession });
    } catch (err) {
        console.error("acceptSession error:", err);
        return res.status(500).json({ success: false, message: "Error accepting session: " + err.message });
    }
};

export const rejectSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const requesterId = req.user.userId;
        const isAdmin = req.user.userType === 'admin';
        const { reason } = req.body || {};

        const mongoose = (await import('mongoose')).default;
        const sessionQuery = mongoose.Types.ObjectId.isValid(sessionId)
            ? { $or: [{ sessionId }, { _id: sessionId }] }
            : { sessionId };
        const session = await Session.findOne(sessionQuery);

        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }

        const expertDoc = await ExpertDetails.findOne({
            $or: [{ _id: session.expertId }, { userId: session.expertId }]
        });
        const isAuthorizedExpert = expertDoc && (expertDoc.userId.toString() === requesterId || expertDoc._id.toString() === requesterId);

        if (!isAuthorizedExpert && !isAdmin) {
            return res.status(403).json({ success: false, message: "Unauthorized: Only the assigned expert can decline this session" });
        }

        if (session.status === 'completed' || session.status === 'cancelled') {
            return res.status(400).json({ success: false, message: `Cannot decline session with status '${session.status}'` });
        }

        const updatedSession = await Session.findOneAndUpdate(
            { _id: session._id, status: { $nin: ['completed', 'cancelled'] } },
            { $set: { status: 'cancelled' } },
            { new: true }
        );

        if (!updatedSession) {
            return res.status(400).json({ success: false, message: `Cannot decline session with status '${session.status}'` });
        }

        // Restore free credit if this was a free credit booking
        if (session.notes?.includes("Premium Free Credit Used")) {
            const User = (await import('../models/User.js')).default;
            await User.findByIdAndUpdate(session.candidateId, { $inc: { freeInterviewsCount: 1 } });
        }

        // Restore wallet funds if session was paid via wallet (idempotent, exactly once)
        const WalletTransaction = (await import('../models/WalletTransaction.js')).default;
        const debitTxn = await WalletTransaction.findOne({
            sessionId: session.sessionId,
            type: 'DEBIT',
            status: 'COMPLETED'
        });
        if (debitTxn && debitTxn.amount > 0) {
            const alreadyRefunded = await WalletTransaction.findOne({
                sessionId: session.sessionId,
                type: 'CREDIT',
                reason: 'SESSION_CANCELLED_REFUND'
            });
            if (!alreadyRefunded) {
                const { creditWallet } = await import('../services/walletService.js');
                await creditWallet({
                    userId: session.candidateId,
                    amount: debitTxn.amount,
                    reason: 'SESSION_CANCELLED_REFUND',
                    description: `Refund of ₹${debitTxn.amount} for cancelled interview session ${session.sessionId}`,
                    sessionId: session.sessionId
                });
            }
        }

        const { formatSessionDateTime } = await import('../services/emailService.js');
        const { createNotification } = await import('./notificationController.js');
        const dt = formatSessionDateTime(session.startTime, session.endTime);

        await createNotification({
            userId: session.candidateId,
            type: 'booking_declined',
            title: 'Booking Request Declined',
            message: `Your booking request for ${dt.dateStr} at ${dt.timeSlotStr} was declined.${reason ? ' Reason: ' + reason : ''}`,
            metadata: { sessionId: session.sessionId, link: '/my-sessions' }
        });

        syncDataChange({
            type: "SESSION_UPDATED",
            userId: session.candidateId,
            expertId: expertDoc?._id,
            sessionId: session.sessionId,
            data: updatedSession,
            toAdmin: true
        });

        return res.json({ success: true, message: "Session declined successfully", session: updatedSession });
    } catch (err) {
        console.error("rejectSession error:", err);
        return res.status(500).json({ success: false, message: "Error declining session: " + err.message });
    }
};

export const rescheduleSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { newStartTime, newEndTime } = req.body;
        const requesterId = req.user.userId;
        const isAdmin = req.user.userType === 'admin';

        if (!newStartTime || !newEndTime) {
            return res.status(400).json({ success: false, message: "New start time and end time are required" });
        }

        const newStart = new Date(newStartTime);
        const newEnd = new Date(newEndTime);

        if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime()) || newEnd <= newStart) {
            return res.status(400).json({ success: false, message: "Invalid session start or end time" });
        }

        const mongoose = (await import('mongoose')).default;
        const sessionQuery = mongoose.Types.ObjectId.isValid(sessionId)
            ? { $or: [{ sessionId }, { _id: sessionId }] }
            : { sessionId };
        const session = await Session.findOne(sessionQuery);

        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }

        if (session.status === 'completed' || session.status === 'cancelled') {
            return res.status(400).json({ success: false, message: `Cannot reschedule a ${session.status} session` });
        }

        const isCandidate = session.candidateId.toString() === requesterId;
        const expertDoc = await ExpertDetails.findOne({
            $or: [{ _id: session.expertId }, { userId: session.expertId }]
        });
        const isExpert = expertDoc && (expertDoc.userId.toString() === requesterId || expertDoc._id.toString() === requesterId);

        if (!isCandidate && !isExpert && !isAdmin) {
            return res.status(403).json({ success: false, message: "Unauthorized to reschedule this session" });
        }

        // ENFORCE EXPERT PREFERENCE: Allow Rescheduling
        if (isCandidate && !isAdmin) {
            if (expertDoc && expertDoc.settings?.allowRescheduling === false) {
                return res.status(403).json({
                    success: false,
                    message: "This expert does not allow session rescheduling. Please contact support or book a new session."
                });
            }
        }

        // Check for conflicting session for candidate or expert
        const conflict = await Session.findOne({
            _id: { $ne: session._id },
            status: { $in: ['confirmed', 'Upcoming', 'live', 'pending'] },
            $or: [
                { expertId: session.expertId },
                { candidateId: session.candidateId }
            ],
            startTime: { $lt: newEnd },
            endTime: { $gt: newStart }
        });

        if (conflict) {
            return res.status(409).json({ success: false, message: "The selected time slot conflicts with an existing booking" });
        }

        session.startTime = newStart;
        session.endTime = newEnd;
        await session.save();

        const { formatSessionDateTime } = await import('../services/emailService.js');
        const { createNotification } = await import('./notificationController.js');
        const dt = formatSessionDateTime(newStart, newEnd);

        // Notify both parties
        await createNotification({
            userId: session.candidateId,
            type: 'session_rescheduled',
            title: 'Session Rescheduled Successfully',
            message: `Your session has been rescheduled to ${dt.dateStr} at ${dt.timeSlotStr}.`,
            metadata: { sessionId: session.sessionId, link: '/my-sessions' }
        });

        const expertUserId = expertDoc?.userId || session.expertId;
        await createNotification({
            userId: expertUserId,
            type: 'session_rescheduled',
            title: 'Session Rescheduled',
            message: `Session has been moved to ${dt.dateStr} at ${dt.timeSlotStr}.`,
            metadata: { sessionId: session.sessionId, link: '/expert/sessions' }
        });

        syncDataChange({
            type: "SESSION_UPDATED",
            userId: session.candidateId,
            expertId: expertDoc?._id,
            sessionId: session.sessionId,
            data: session,
            toAdmin: true
        });

        return res.json({ success: true, message: "Session rescheduled successfully", session });
    } catch (err) {
        console.error("rescheduleSession error:", err);
        return res.status(500).json({ success: false, message: "Error rescheduling session: " + err.message });
    }
};
