import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { syncDataChange } from '../services/socketService.js';
dotenv.config();

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error("CRITICAL ERROR: Razorpay keys are missing from environment variables!");
}

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createOrder = async (req, res) => {
    try {
        const { amount, currency = 'INR', receipt, planId, bookingDetails } = req.body;

        const numAmount = Number(amount);
        if (!amount || isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ success: false, message: 'A valid positive amount is required' });
        }

        // Authoritative validation for subscription plans (supports test prices 1 & 2 and standard 219 & 419)
        const targetPlan = planId || (receipt && receipt.includes('pro-219') ? 'pro-219' : (receipt && receipt.includes('ultimate-419') ? 'ultimate-419' : null));
        if (targetPlan === 'pro-219' && ![1, 219].includes(numAmount)) {
            return res.status(400).json({ success: false, message: 'Invalid price for Pro plan' });
        }
        if (targetPlan === 'ultimate-419' && ![2, 419].includes(numAmount)) {
            return res.status(400).json({ success: false, message: 'Invalid price for Ultimate plan' });
        }

        // Pre-validate interview booking slot if bookingDetails is provided
        if (bookingDetails) {
            const { expertId, startTime, endTime, duration } = bookingDetails;
            if (expertId && startTime) {
                const slotValidation = await validateBookingSlot({
                    expertId,
                    startTime,
                    endTime,
                    duration
                });
                if (!slotValidation.valid) {
                    return res.status(slotValidation.status || 400).json({
                        success: false,
                        cutoffExpired: Boolean(slotValidation.cutoffExpired),
                        message: slotValidation.error || 'This interview slot is no longer available for booking.',
                        reason: slotValidation.error
                    });
                }
            }
        }

        // Check Candidate Wallet balance if useWallet is requested
        let walletDeduction = 0;
        let payableAmount = numAmount;
        const candidateId = bookingDetails?.candidateId || req.user?._id || req.user?.id || req.user?.userId;

        if (req.body.useWallet && candidateId) {
            try {
                const Wallet = (await import('../models/Wallet.js')).default;
                const userWallet = await Wallet.findOne({ userId: candidateId });
                console.log('[CreateOrder Debug]', { candidateId, userWallet });
                const available = userWallet?.availableBalance || 0;
                if (available > 0) {
                    walletDeduction = Math.min(available, numAmount);
                    payableAmount = numAmount - walletDeduction;
                }
            } catch (wErr) {
                console.warn('[CreateOrder] Error fetching candidate wallet:', wErr.message);
            }
        }

        // Sub-case 1: Full Wallet Payment (payableAmount === 0)
        if (req.body.useWallet && walletDeduction === numAmount && payableAmount === 0) {
            const walletOrderId = `wallet_ord_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

            if (bookingDetails?.expertId && bookingDetails?.startTime && bookingDetails?.endTime) {
                const resResult = await acquireSlotReservation({
                    expertId: bookingDetails.expertId,
                    candidateId,
                    startTime: bookingDetails.startTime,
                    endTime: bookingDetails.endTime,
                    orderId: walletOrderId,
                    ttlMinutes: 15
                });

                if (!resResult.acquired) {
                    return res.status(409).json({
                        success: false,
                        slotConflict: true,
                        message: resResult.reason || 'This slot is currently reserved or already booked.',
                        conflictType: resResult.conflictType
                    });
                }
            }

            return res.status(200).json({
                success: true,
                fullWalletPayment: true,
                walletDeduction,
                payableAmount: 0,
                order: {
                    id: walletOrderId,
                    amount: 0,
                    currency,
                    receipt: receipt || `rcpt_wallet_${Date.now()}`
                }
            });
        }

        // Sub-case 2: External payment (or partial wallet payment)
        const chosenPaymentMethod = req.body.paymentMethod || (req.body.useWallet && walletDeduction > 0 ? 'COMBINED' : 'RAZORPAY');
        const bookingId = bookingDetails?.bookingId || bookingDetails?.slotLockKey || `bk_${Date.now()}`;
        const options = {
            amount: Math.round(payableAmount * 100), // Razorpay works in paise
            currency,
            receipt: receipt || `rcpt_${Date.now()}`,
            notes: {
                bookingId: String(bookingId),
                candidateId: String(candidateId || ''),
                totalBookingAmount: String(numAmount),
                walletContribution: String(walletDeduction),
                razorpayPayableAmount: String(payableAmount),
                paymentMethod: String(chosenPaymentMethod),
                walletDeduction: String(walletDeduction),
                fullAmount: String(numAmount)
            }
        };

        const order = await razorpay.orders.create(options);

        // Reserve / debit partial wallet deduction upfront so it cannot be double-spent while Razorpay checkout is open
        let walletDebitTxnId = null;
        if (req.body.useWallet && walletDeduction > 0 && payableAmount > 0 && candidateId) {
            try {
                const debitRes = await debitWallet({
                    userId: candidateId,
                    amount: walletDeduction,
                    orderId: order.id,
                    paymentMethod: 'COMBINED',
                    totalBookingAmount: numAmount,
                    walletAmountUsed: walletDeduction,
                    reason: 'INTERVIEW_BOOKING_DEBIT',
                    description: `Partial wallet payment of ₹${walletDeduction} reserved for order ${order.id}`
                });
                if (debitRes.success) {
                    walletDebitTxnId = debitRes.transaction?._id;
                } else {
                    console.warn('[CreateOrder] Failed to reserve wallet deduction:', debitRes.message);
                    walletDeduction = 0;
                    payableAmount = numAmount;
                }
            } catch (dErr) {
                console.warn('[CreateOrder] Exception reserving wallet deduction:', dErr.message);
                walletDeduction = 0;
                payableAmount = numAmount;
            }
        }

        // Atomic reservation: Reserve the slot for this candidate while they complete payment
        if (bookingDetails?.expertId && bookingDetails?.startTime && bookingDetails?.endTime) {
            const resResult = await acquireSlotReservation({
                expertId: bookingDetails.expertId,
                candidateId,
                startTime: bookingDetails.startTime,
                endTime: bookingDetails.endTime,
                orderId: order.id,
                ttlMinutes: 15
            });

            if (!resResult.acquired) {
                // If wallet was debited, roll it back immediately!
                if (walletDebitTxnId) {
                    await restoreWalletDebit({
                        userId: candidateId,
                        amount: walletDeduction,
                        originalTransactionId: walletDebitTxnId,
                        reason: 'SLOT_RESERVATION_FAILED_RESTORE',
                        description: `Restored ₹${walletDeduction} because slot reservation could not be acquired for order ${order.id}`
                    });
                }
                return res.status(409).json({
                    success: false,
                    slotConflict: true,
                    message: resResult.reason || 'This slot is currently reserved or already booked.',
                    conflictType: resResult.conflictType
                });
            }
        }

        res.status(200).json({
            success: true,
            order,
            walletDeduction,
            walletDebitTxnId,
            payableAmount
        });
    } catch (error) {
        console.error('Razorpay Create Order Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create Razorpay order',
            error: error.message,
        });
    }
};

import * as sessionService from '../services/sessionService.js';
import ExpertDetails from '../models/expertModel.js';
import User from '../models/User.js';
import PaymentRecord from '../models/PaymentRecord.js';
import Session from '../models/Session.js';
import Wallet from '../models/Wallet.js';
import { validateBookingSlot } from '../utils/availabilityValidator.js';
import { createNotification } from './notificationController.js';
import {
    sendBookingNotificationToExpert,
    sendBookingNotificationToCandidate,
    formatSessionDateTime
} from '../services/emailService.js';
import { acquireSlotReservation, confirmSlotReservation, releaseSlotReservation, buildSlotKey } from '../services/slotReservationService.js';
import { getRazorpayClient, executeRefund } from '../services/refundService.js';
import { enqueueEmail, processOutbox } from '../services/emailOutboxService.js';
import { getAppBaseUrl, getMeetingUrl, getCandidateSessionsUrl, getExpertSessionsUrl } from '../utils/appUrl.js';
import { getOrCreateWallet, creditWallet, debitWallet, restoreWalletDebit } from '../services/walletService.js';

/**
 * Authoritative payment capture evidence extractor.
 * Strictly adheres to Razorpay entity specifications and signed webhooks.
 * NEVER uses payment.created_at or order.created_at as capture time proof.
 */
export const getAuthoritativeCaptureEvidence = ({ payment, webhookPayload = null, bookingCutoff = null, gatewayCaptureVerificationReceivedAt = null }) => {
    const serverReceiptTimestamp = new Date();
    const verificationReceivedAt = gatewayCaptureVerificationReceivedAt || serverReceiptTimestamp;

    // 1. Webhook Payload: Only 'payment.captured' event represents capture
    if (webhookPayload && webhookPayload.event === 'payment.captured') {
        const pEntity = webhookPayload.payload?.payment?.entity;
        // In Razorpay webhooks: pEntity.captured_at is authoritative capture time if present
        if (typeof pEntity?.captured_at === 'number' && pEntity.captured_at > 0) {
            const providerEventTimestamp = new Date(pEntity.captured_at * 1000);
            return {
                hasAuthoritativeTimestamp: true,
                capturedAt: providerEventTimestamp,
                timestampSource: 'RAZORPAY_PAYMENT_CAPTURED_AT',
                providerEventTimestamp,
                serverReceiptTimestamp,
                gatewayCaptureVerificationReceivedAt: verificationReceivedAt,
                awaitingReconciliation: false
            };
        }

        // Webhook event.created_at represents event creation time, not exact payment capture time.
        // A verified payment.captured event proves capture occurred no later than the event timestamp.
        // If event timestamp is before cutoff, capture was guaranteed before cutoff!
        const eventEpoch = typeof webhookPayload.created_at === 'number' ? webhookPayload.created_at : null;
        if (eventEpoch && bookingCutoff) {
            const eventTime = new Date(eventEpoch * 1000);
            if (eventTime.getTime() < bookingCutoff.getTime()) {
                return {
                    hasAuthoritativeTimestamp: true,
                    capturedAt: eventTime,
                    timestampSource: 'WEBHOOK_PROVEN_BEFORE_CUTOFF',
                    providerEventTimestamp: eventTime,
                    serverReceiptTimestamp,
                    gatewayCaptureVerificationReceivedAt: verificationReceivedAt,
                    awaitingReconciliation: false
                };
            }
            // If event timestamp is at or after cutoff and captured_at is unavailable:
            // The event alone cannot establish whether capture was before or after cutoff.
            // Do NOT assume it was captured after cutoff! Preserve for reconciliation.
        }
    }

    // 2. Authoritative Razorpay Payment Entity
    if (payment) {
        // Razorpay returns payment.captured_at as numeric epoch in seconds when captured
        if (typeof payment.captured_at === 'number' && payment.captured_at > 0) {
            const providerTime = new Date(payment.captured_at * 1000);
            // Determine eligibility relative to cutoff using epoch seconds for exact comparison
            if (bookingCutoff) {
                const cutoffSec = Math.floor(bookingCutoff.getTime() / 1000);
                if (payment.captured_at >= cutoffSec) {
                    return {
                        hasAuthoritativeTimestamp: true,
                        capturedAt: providerTime,
                        timestampSource: 'RAZORPAY_PAYMENT_CAPTURED_AT_AFTER_CUTOFF',
                        providerEventTimestamp: providerTime,
                        serverReceiptTimestamp,
                        gatewayCaptureVerificationReceivedAt: verificationReceivedAt,
                        awaitingReconciliation: false
                    };
                }
            }
            return {
                hasAuthoritativeTimestamp: true,
                capturedAt: providerTime,
                timestampSource: 'RAZORPAY_PAYMENT_CAPTURED_AT',
                providerEventTimestamp: providerTime,
                serverReceiptTimestamp,
                gatewayCaptureVerificationReceivedAt: verificationReceivedAt,
                awaitingReconciliation: false
            };
        }

        // 3. Scenario 4: If payment entity was initialized or captured at/after cutoff
        if (bookingCutoff) {
            const rawTime = payment.captured_at || payment.created_at;
            if (rawTime) {
                const ts = new Date(rawTime * 1000);
                if (ts.getTime() >= bookingCutoff.getTime()) {
                    return {
                        hasAuthoritativeTimestamp: true,
                        capturedAt: ts,
                        timestampSource: payment.captured_at ? 'RAZORPAY_PAYMENT_CAPTURED_AT_AFTER_CUTOFF' : 'CREATED_AFTER_CUTOFF',
                        providerEventTimestamp: ts,
                        serverReceiptTimestamp,
                        gatewayCaptureVerificationReceivedAt: verificationReceivedAt,
                        awaitingReconciliation: false,
                        isCreatedAfterCutoff: true
                    };
                }
            }
        }

        // 2b. Mathematical & Physical Rule:
        // captureTime <= gatewayCaptureVerificationReceivedAt < bookingCutoff
        // If the Razorpay API response confirms captured status strictly before cutoff,
        // this establishes that capture occurred no later than the response receipt time.
        // Do NOT use payment.created_at as the exact capture timestamp.
        if (payment.status === 'captured' && (payment.captured === true || payment.captured === 'true') && bookingCutoff) {
            if (verificationReceivedAt.getTime() < bookingCutoff.getTime()) {
                return {
                    hasAuthoritativeTimestamp: true,
                    capturedAt: verificationReceivedAt, // Exact response receipt boundary
                    timestampSource: 'VERIFIED_BEFORE_CUTOFF',
                    gatewayCaptureVerificationReceivedAt: verificationReceivedAt,
                    providerEventTimestamp: verificationReceivedAt,
                    serverReceiptTimestamp,
                    awaitingReconciliation: false
                };
            }
        }
    }

    // 4. Fallback: Payment created before cutoff but captured_at is unavailable
    // and gateway verification response arrived at or after cutoff.
    // NEVER guess that it was captured before cutoff!
    return {
        hasAuthoritativeTimestamp: false,
        capturedAt: null,
        timestampSource: 'RECONCILIATION_PENDING',
        providerEventTimestamp: null,
        serverReceiptTimestamp,
        gatewayCaptureVerificationReceivedAt: verificationReceivedAt,
        awaitingReconciliation: true
    };
};

export const getAuthoritativeCaptureTimestamp = (payment, webhookPayload = null, bookingCutoff = null) => {
    const evidence = getAuthoritativeCaptureEvidence({ payment, webhookPayload, bookingCutoff });
    return evidence.capturedAt;
};

/**
 * Helper to dispatch rich professional confirmation emails to the Interview Expert (and Candidate).
 */
export const triggerBookingEmails = async ({
    bookingDetails,
    sessionId,
    meetingLink,
    paymentId,
    orderId,
    paymentStatus = "Paid & Verified",
    price,
    candidateUserFallback = null
}) => {
    try {
        if (!bookingDetails) {
            console.warn("[BookingPayment] triggerBookingEmails called without bookingDetails.");
            return;
        }

        const startTime = new Date(bookingDetails.startTime);
        const endTime = new Date(bookingDetails.endTime);

        // 1. Fetch Candidate User
        let candidateUser = null;
        const candidateLookup = bookingDetails.candidateId || bookingDetails.userId;

        if (candidateLookup && mongoose.Types.ObjectId.isValid(candidateLookup)) {
            candidateUser = await User.findById(candidateLookup).lean();
        }
        if (!candidateUser && bookingDetails.candidateEmail) {
            candidateUser = await User.findOne({ email: bookingDetails.candidateEmail.toLowerCase() }).lean();
        }
        if (!candidateUser && candidateUserFallback) {
            candidateUser = typeof candidateUserFallback === 'object' ? candidateUserFallback : await User.findById(candidateUserFallback).lean().catch(() => null);
        }

        // 2. Fetch Expert & Expert User
        let expertDoc = null;
        let expertUser = null;
        const expertLookup = bookingDetails.expertId;

        if (expertLookup && mongoose.Types.ObjectId.isValid(expertLookup)) {
            expertDoc = await ExpertDetails.findById(expertLookup).populate('userId').lean();
            if (!expertDoc) {
                expertDoc = await ExpertDetails.findOne({ userId: expertLookup }).populate('userId').lean();
            }
        } else if (typeof expertLookup === 'string' && expertLookup.includes('@')) {
            expertUser = await User.findOne({ email: expertLookup.toLowerCase() }).lean();
            if (expertUser) {
                expertDoc = await ExpertDetails.findOne({ userId: expertUser._id }).populate('userId').lean();
            }
        }

        if (expertDoc?.userId) {
            expertUser = typeof expertDoc.userId === 'object' ? expertDoc.userId : await User.findById(expertDoc.userId).lean();
        } else if (expertLookup && mongoose.Types.ObjectId.isValid(expertLookup) && !expertUser) {
            expertUser = await User.findById(expertLookup).lean();
            if (expertUser && !expertDoc) {
                expertDoc = await ExpertDetails.findOne({ userId: expertUser._id }).lean();
            }
        }

        // Candidate extracted fields
        const candidateName = candidateUser?.name || bookingDetails.candidateName || candidateUserFallback?.name || "Candidate";
        const candidateEmail = candidateUser?.email || bookingDetails.candidateEmail || candidateUserFallback?.email || "Not specified";
        const candidatePhone = candidateUser?.personalInfo?.phone || candidateUser?.phone || candidateUser?.mobile || bookingDetails.candidatePhone || candidateUserFallback?.personalInfo?.phone || candidateUserFallback?.phone || "Not provided";
        const candidateCity = candidateUser?.personalInfo?.city || candidateUser?.city || "";
        const candidateCountry = candidateUser?.personalInfo?.country || candidateUser?.country || "";
        const candidateLocation = [candidateCity, candidateCountry].filter(Boolean).join(", ");

        // Expert extracted fields
        const expertEmail = expertUser?.email || expertDoc?.email || expertDoc?.personalInformation?.email || bookingDetails.expertEmail;
        const expertName = expertUser?.name || expertDoc?.personalInformation?.userName || expertDoc?.userDetails?.name || bookingDetails.expertName || "Interview Expert";

        // Meeting link resolution using authoritative central URL resolver
        const resolvedMeetingLink = getMeetingUrl(sessionId, meetingLink || expertDoc?.availability?.defaultMeetingLink);

        const duration = Number(bookingDetails.duration) || 30;
        const amountPaid = price !== undefined ? price : bookingDetails.price;
        const level = bookingDetails.level || expertDoc?.professionalDetails?.level || "Rising Mentor";
        const category = expertDoc?.personalInformation?.category || bookingDetails.category || "Technical Interview";
        const topics = bookingDetails.topics || [category];

        console.log(`[BookingPayment] 🚀 Sending meeting allocation email to Expert: ${expertEmail} (${expertName}) for Candidate: ${candidateName} (${candidateEmail})`);

        if (expertEmail) {
            await sendBookingNotificationToExpert({
                expertEmail,
                expertName,
                candidateName,
                candidateEmail,
                candidatePhone,
                candidateLocation,
                startTime,
                endTime,
                duration,
                topics,
                level,
                category,
                amountPaid,
                paymentStatus,
                paymentId: paymentId || "N/A",
                orderId: orderId || "N/A",
                notes: bookingDetails.notes || "",
                meetingLink: resolvedMeetingLink,
                sessionId,
            });
        } else {
            console.warn(`[BookingPayment] ⚠️ Warning: No email address found for interview expert lookup: ${bookingDetails.expertId}`);
        }

        // Send confirmation copy to candidate as well
        if (candidateEmail && candidateEmail !== "Not specified") {
            const dt = formatSessionDateTime(startTime, endTime);
            sendBookingNotificationToCandidate({
                candidateEmail,
                candidateName,
                expertName,
                date: dt.dateStr,
                timeSlot: dt.timeSlotStr,
                duration,
                topics,
                category,
                amountPaid,
                paymentId: paymentId || "N/A",
                meetingLink: resolvedMeetingLink,
                sessionId,
            }).catch((err) => console.error("[BookingPayment] Candidate notification email error:", err.message));
        }
    } catch (err) {
        console.error("[BookingPayment] Error in triggerBookingEmails:", err);
    }
};

export const verifyPayment = async (req, res) => {
    let candidateUserId = null;
    let authoritativeAmountINR = 0;
    let walletDeduction = 0;
    let walletDebitTxnId = null;
    let sessionConfirmed = false;
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingDetails, user } = req.body;

        let isVerified = false;

        // Security: Razorpay signature verification
        const sign = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest('hex');

        if (razorpay_signature === expectedSign) {
            isVerified = true;
        }

        // Security Hardening & Idempotency: Anti-Replay Check
        const existingPayment = await PaymentRecord.findOne({ paymentId: razorpay_payment_id });
        if (existingPayment) {
            // Idempotent retry: If this payment already created a session, return the existing confirmed session cleanly
            if (existingPayment.sessionId) {
                const existingSession = await Session.findOne({ sessionId: existingPayment.sessionId });
                if (existingSession) {
                    return res.status(200).json({
                        success: true,
                        message: "Payment verified and session retrieved successfully (idempotent)",
                        data: existingSession,
                        sessionId: existingSession.sessionId,
                        alreadyProcessed: true
                    });
                }
            }
            if (existingPayment.walletCredited) {
                const Wallet = (await import('../models/Wallet.js')).default;
                const wallet = await Wallet.findOne({ userId: existingPayment.userId });
                return res.status(200).json({
                    success: true,
                    walletCredited: true,
                    alreadyCredited: true,
                    cutoffExpired: true,
                    amountCredited: existingPayment.amount,
                    updatedBalance: wallet?.availableBalance || existingPayment.amount,
                    walletTransactionRef: existingPayment.walletTransactionId,
                    title: "Payment Added to Your Mockeefy Wallet",
                    message: "Your payment was successfully received, but the booking cutoff for this interview slot had passed before payment capture. Your payment amount has been safely credited to your Mockeefy wallet. You can use this balance to book another interview."
                });
            }
            if (existingPayment.status === 'refunded') {
                return res.status(200).json({
                    success: false,
                    cutoffExpired: Boolean(existingPayment.cutoffExpired),
                    alreadyRefunded: true,
                    refundId: existingPayment.refundId,
                    refundStatus: existingPayment.refundStatus,
                    message: "This payment was already refunded because the 10-minute booking cutoff was reached."
                });
            }
            console.warn(`[Payment Security] Blocked replayed payment attempt: ${razorpay_payment_id}`);
            return res.status(400).json({
                success: false,
                message: "Security Alert: This payment transaction has already been verified and processed."
            });
        }

        if (isVerified) {
            // Handle Subscription Type
            if (req.body.paymentType === 'subscription') {
                const planId = req.body.planId;
                const freeCount = (planId === 'ultimate-419' || planId === '419' || req.body.freeInterviews === 6 || (req.body.price === 419 || req.body.price === 2)) ? 6 : 3;
                const updatedUser = await User.findByIdAndUpdate(
                    user?.id || user?.userId,
                    {
                        isPremium: true,
                        freeInterviewsCount: freeCount,
                        premiumPlan: planId || (freeCount === 6 ? 'ultimate-419' : 'pro-219'),
                        premiumExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
                    },
                    { new: true }
                );
                // Record transaction to prevent replay
                try {
                    await PaymentRecord.create({
                        paymentId: razorpay_payment_id,
                        orderId: razorpay_order_id,
                        userId: user?.id || user?.userId || updatedUser._id,
                        paymentType: 'subscription',
                        planId: planId || (freeCount === 6 ? 'ultimate-419' : 'pro-219'),
                        amount: req.body.price || (freeCount === 6 ? 2 : 1),
                        status: 'verified'
                    });
                } catch (recErr) {
                    console.warn("[PaymentRecord] Failed to record subscription payment:", recErr.message);
                }

                return res.status(200).json({
                    success: true,
                    message: 'Subscription successful! You are now a Premium Member.',
                    user: updatedUser
                });
            }

            // Create Session Context (Regular Payment)
            if (bookingDetails) {
                const startTime = new Date(bookingDetails.startTime);
                const endTime = new Date(bookingDetails.endTime);
                const duration = Number(bookingDetails.duration) || Math.round((endTime.getTime() - startTime.getTime()) / (60 * 1000));
                const now = new Date();
                const bookingCutoff = new Date(endTime.getTime() - 10 * 60 * 1000);

                // PHASE 3: AUTHORITATIVE PAYMENT INSPECTION & CAPTURE TIMESTAMP CHECK
                const razorpay = getRazorpayClient();
                let payment = null;
                let gatewayCaptureVerificationReceivedAt = null;
                try {
                    payment = await razorpay.payments.fetch(razorpay_payment_id);
                    gatewayCaptureVerificationReceivedAt = new Date();
                } catch (fetchErr) {
                    console.warn(`[PaymentVerification] Could not fetch payment from Razorpay: ${fetchErr.message}`);
                }

                // Security & Integrity: verify matching payment ID and order ID
                if (payment) {
                    if (payment.id !== razorpay_payment_id || payment.order_id !== razorpay_order_id) {
                        return res.status(400).json({
                            success: false,
                            message: 'Security Alert: Gateway payment or order ID mismatch.'
                        });
                    }
                }

                // Case C: Payment not captured / failed
                if (payment && payment.status !== 'captured' && payment.captured === false) {
                    return res.status(400).json({
                        success: false,
                        paymentCaptured: false,
                        status: payment.status || 'failed',
                        message: `Payment has not been captured by the gateway (status: ${payment.status || 'unverified'}). No booking or wallet credit has been issued.`
                    });
                }

                authoritativeAmountINR = payment?.amount ? (payment.amount / 100) : (Number(bookingDetails.price) || 0);
                candidateUserId = bookingDetails.candidateId || user?.id || user?.userId;

                // Extract authoritative evidence with exact gateway response receipt timestamp
                const evidence = getAuthoritativeCaptureEvidence({
                    payment,
                    webhookPayload: req.body.webhookPayload,
                    bookingCutoff,
                    gatewayCaptureVerificationReceivedAt
                });

                // Scenario 3: If capture timestamp cannot be authoritatively established,
                // do NOT guess that it was captured before cutoff! Mark as awaiting reconciliation.
                if (evidence.awaitingReconciliation) {
                    console.warn(`[PaymentVerification] Authoritative capture timestamp unavailable for payment ${razorpay_payment_id}. Marking as awaiting reconciliation.`);

                    // Preserve slot reservation so reconciliation worker can confirm session if capture is verified!

                    try {
                        await PaymentRecord.create({
                            paymentId: razorpay_payment_id,
                            orderId: razorpay_order_id,
                            userId: candidateUserId,
                            paymentType: 'booking',
                            amount: authoritativeAmountINR,
                            status: 'awaiting_reconciliation',
                            reconciliationStatus: 'awaiting_capture_timestamp',
                            timestampSource: 'RECONCILIATION_PENDING',
                            serverReceiptTimestamp: now,
                            gatewayCaptureVerificationReceivedAt,
                            providerEventTimestamp: null,
                            metadata: {
                                bookingDetails,
                                serverVerificationTime: now,
                                bookingCutoff,
                                clientPrice: bookingDetails.price,
                                reason: 'Capture timestamp unavailable; held for webhook reconciliation'
                            }
                        });
                    } catch (recErr) {
                        console.warn('[PaymentRecord] Error saving reconciliation record:', recErr.message);
                    }

                    return res.status(202).json({
                        success: false,
                        status: 'awaiting_reconciliation',
                        awaitingReconciliation: true,
                        message: 'Payment capture timestamp is awaiting authoritative reconciliation from Razorpay. Booking is held until capture time is verified.',
                        paymentId: razorpay_payment_id,
                        orderId: razorpay_order_id
                    });
                }

                const capturedAt = evidence.capturedAt;
                const isCutoffExpired = capturedAt.getTime() >= bookingCutoff.getTime();

                // Case B: Payment captured at or after cutoff -> Credit to Candidate Wallet
                if (isCutoffExpired) {
                    console.warn(`[PaymentCutoff] Payment ${razorpay_payment_id} was captured at ${capturedAt.toISOString()} (Source: ${evidence.timestampSource}) which is AT OR AFTER the booking cutoff (${bookingCutoff.toISOString()}). Converting to wallet credit.`);

                    const creditRes = await creditWallet({
                        userId: candidateUserId,
                        amount: authoritativeAmountINR,
                        paymentId: razorpay_payment_id,
                        orderId: razorpay_order_id,
                        reason: 'CUTOFF_EXPIRED_CREDIT',
                        description: `Booking cutoff passed prior to payment capture for interview slot ending at ${endTime.toISOString()}`
                    });

                    await releaseSlotReservation({ orderId: razorpay_order_id });

                    try {
                        await PaymentRecord.create({
                            paymentId: razorpay_payment_id,
                            orderId: razorpay_order_id,
                            userId: candidateUserId,
                            paymentType: 'booking',
                            amount: authoritativeAmountINR,
                            status: 'verified',
                            walletCredited: true,
                            walletTransactionId: creditRes.transaction?._id,
                            paymentCapturedAt: capturedAt,
                            timestampSource: evidence.timestampSource,
                            providerEventTimestamp: evidence.providerEventTimestamp,
                            serverReceiptTimestamp: evidence.serverReceiptTimestamp,
                            reconciliationStatus: 'verified',
                            cutoffExpired: true,
                            metadata: {
                                capturedAt,
                                bookingCutoff,
                                timestampSource: evidence.timestampSource,
                                serverVerificationTime: now,
                                reason: 'Booking cutoff reached before payment capture'
                            }
                        });
                    } catch (pRecErr) {
                        console.warn('[PaymentRecord] Error saving wallet credit record:', pRecErr.message);
                    }

                    return res.status(200).json({
                        success: true,
                        walletCredited: true,
                        cutoffExpired: true,
                        amountCredited: authoritativeAmountINR,
                        updatedBalance: creditRes.balanceAfter,
                        walletTransactionRef: creditRes.transaction?._id,
                        title: "Payment Added to Your Mockeefy Wallet",
                        message: "Your payment was successfully received, but the booking cutoff for this interview slot had passed before payment capture. Your payment amount has been safely credited to your Mockeefy wallet. You can use this balance to book another interview."
                    });
                }

                // Case A: Payment was captured strictly before cutoff -> Eligible for Booking!
                walletDeduction = Number(req.body.walletDeduction || payment?.notes?.walletDeduction || 0);
                walletDebitTxnId = null;

                if (walletDeduction > 0 && candidateUserId) {
                    const WalletTransaction = (await import('../models/WalletTransaction.js')).default;
                    const existingDebit = await WalletTransaction.findOne({
                        userId: candidateUserId,
                        orderId: razorpay_order_id,
                        type: 'DEBIT',
                        reason: 'INTERVIEW_BOOKING_DEBIT'
                    });

                    let isDebitActive = false;
                    if (existingDebit) {
                        const isRestored = await WalletTransaction.findOne({
                            userId: candidateUserId,
                            $or: [
                                { referenceId: existingDebit._id },
                                { relatedTransactionId: existingDebit._id }
                            ],
                            type: 'CREDIT',
                            reason: { $regex: /RESTORE/i }
                        });
                        if (!isRestored) {
                            isDebitActive = true;
                            walletDebitTxnId = existingDebit._id;
                        }
                    }

                    if (!isDebitActive) {
                        const debitRes = await debitWallet({
                            userId: candidateUserId,
                            amount: walletDeduction,
                            orderId: razorpay_order_id,
                            reason: 'INTERVIEW_BOOKING_DEBIT',
                            description: `Partial wallet payment of ₹${walletDeduction} for interview booking`
                        });

                        if (!debitRes.success) {
                            console.warn(`[PaymentVerification] Wallet debit failed during hybrid checkout: ${debitRes.message}. Crediting captured external payment to candidate wallet.`);
                            const creditRes = await creditWallet({
                                userId: candidateUserId,
                                amount: authoritativeAmountINR,
                                paymentId: razorpay_payment_id,
                                orderId: razorpay_order_id,
                                reason: 'HYBRID_WALLET_DEBIT_FAILED_CREDIT',
                                description: `Wallet credited: Secondary wallet deduction could not be completed. ₹${authoritativeAmountINR} credited for immediate re-booking.`
                            });
                            await releaseSlotReservation({ orderId: razorpay_order_id });

                            try {
                                await PaymentRecord.create({
                                    paymentId: razorpay_payment_id,
                                    orderId: razorpay_order_id,
                                    userId: candidateUserId,
                                    paymentType: 'booking',
                                    amount: authoritativeAmountINR,
                                    status: 'verified',
                                    walletCredited: true,
                                    walletTransactionId: creditRes.transaction?._id,
                                    paymentCapturedAt: capturedAt,
                                    timestampSource: evidence.timestampSource,
                                    providerEventTimestamp: evidence.providerEventTimestamp,
                                    serverReceiptTimestamp: evidence.serverReceiptTimestamp,
                                    reconciliationStatus: 'verified',
                                    metadata: {
                                        capturedAt,
                                        bookingCutoff,
                                        reason: 'Wallet balance insufficient during hybrid checkout - amount credited to wallet'
                                    }
                                });
                            } catch (_) {}

                            return res.status(200).json({
                                success: false,
                                walletCredited: true,
                                amountCredited: authoritativeAmountINR,
                                updatedBalance: creditRes.balanceAfter,
                                walletTransactionRef: creditRes.transaction?._id,
                                title: "Payment Added to Your Mockeefy Wallet",
                                message: `Your payment of ₹${authoritativeAmountINR} has been automatically credited to your Mockeefy wallet for immediate re-booking.`
                            });
                        }
                        walletDebitTxnId = debitRes.transaction?._id;
                    }
                }

                let expertDoc = null;
                let expertUserId = bookingDetails.expertId;
                try {
                    expertDoc = await ExpertDetails.findOne({ $or: [{ _id: bookingDetails.expertId }, { userId: bookingDetails.expertId }] }).populate('userId');
                    if (expertDoc?.userId) {
                        expertUserId = expertDoc.userId?._id || expertDoc.userId;
                    }
                } catch (_) {}

                // Comprehensive authoritative backend slot validation (using verified capture timestamp for cutoff evaluation)
                const slotValidation = await validateBookingSlot({
                    expertId: bookingDetails.expertId,
                    startTime,
                    endTime,
                    duration,
                    currentTime: capturedAt || now
                });

                if (!slotValidation.valid) {
                    let restoredAmount = 0;
                    if (walletDeduction > 0) {
                        const restoreRes = await restoreWalletDebit({
                            userId: candidateUserId,
                            amount: walletDeduction,
                            originalTransactionId: walletDebitTxnId,
                            reason: 'SLOT_INVALID_RESTORE',
                            description: 'Restored wallet funds due to slot validation failure'
                        });
                        if (restoreRes?.success) restoredAmount = walletDeduction;
                    }

                    // Immediately and automatically credit captured payment to candidate wallet for instant re-booking
                    const creditRes = await creditWallet({
                        userId: candidateUserId,
                        amount: authoritativeAmountINR,
                        paymentId: razorpay_payment_id,
                        orderId: razorpay_order_id,
                        reason: 'BOOKING_FAILED_CREDIT',
                        description: `Wallet credited: Slot no longer available (${slotValidation.error || 'Validation failed'}). ₹${authoritativeAmountINR} credited for immediate re-booking.`
                    });

                    await releaseSlotReservation({ orderId: razorpay_order_id });

                    try {
                        await PaymentRecord.create({
                            paymentId: razorpay_payment_id,
                            orderId: razorpay_order_id,
                            userId: candidateUserId,
                            paymentType: walletDeduction > 0 ? 'hybrid' : 'booking',
                            amount: authoritativeAmountINR + walletDeduction,
                            walletAmountDeducted: walletDeduction,
                            status: 'verified',
                            walletCredited: true,
                            walletTransactionId: creditRes.transaction?._id,
                            paymentCapturedAt: capturedAt,
                            timestampSource: evidence.timestampSource,
                            providerEventTimestamp: evidence.providerEventTimestamp,
                            serverReceiptTimestamp: evidence.serverReceiptTimestamp,
                            reconciliationStatus: 'verified',
                            cutoffExpired: Boolean(slotValidation.cutoffExpired),
                            metadata: {
                                capturedAt,
                                bookingCutoff,
                                reason: slotValidation.error || 'Slot validation failed'
                            }
                        });
                    } catch (_) {}

                    const totalCreditedBack = authoritativeAmountINR + restoredAmount;
                    return res.status(200).json({
                        success: false,
                        slotConflict: true,
                        walletCredited: true,
                        amountCredited: totalCreditedBack,
                        updatedBalance: creditRes.balanceAfter,
                        walletTransactionRef: creditRes.transaction?._id,
                        title: "Payment Added to Your Mockeefy Wallet",
                        message: slotValidation.error
                            ? `${slotValidation.error} Your payment of ₹${totalCreditedBack} has been immediately credited to your Mockeefy wallet for instant re-booking!`
                            : `This interview slot is no longer available. Your payment of ₹${totalCreditedBack} has been immediately credited to your Mockeefy wallet for instant re-booking!`,
                        reason: slotValidation.reason
                    });
                }

                // ATOMIC CONCURRENCY PROTECTION:
                // Construct authoritative database slotLockKey
                const expertIds = [bookingDetails.expertId, expertDoc?._id, expertDoc?.userId].filter(Boolean);
                const slotLockKey = buildSlotKey(expertUserId, startTime, endTime);

                const concurrentConflict = await Session.findOne({
                    $or: [
                        { slotLockKey, status: { $nin: ['cancelled', 'Cancelled', 'CANCELLED', 'rejected', 'Rejected', 'REJECTED', 'declined', 'Declined', 'DECLINED', 'failed', 'Failed', 'FAILED', 'expired', 'Expired', 'EXPIRED'] } },
                        {
                            expertId: { $in: expertIds },
                            status: { $in: ['confirmed', 'live', 'upcoming', 'Upcoming', 'pending'] },
                            startTime: { $lt: endTime },
                            endTime: { $gt: startTime }
                        }
                    ]
                });

                if (concurrentConflict) {
                    console.warn(`[ConcurrencyProtection] Concurrent booking conflict detected for expert ${bookingDetails.expertId} at ${startTime.toISOString()}. Crediting candidate wallet for instant re-booking.`);

                    let restoredAmount = 0;
                    if (walletDeduction > 0) {
                        const restoreRes = await restoreWalletDebit({
                            userId: candidateUserId,
                            amount: walletDeduction,
                            originalTransactionId: walletDebitTxnId,
                            reason: 'SLOT_CONFLICT_RESTORE',
                            description: 'Restored wallet funds due to slot collision'
                        });
                        if (restoreRes?.success) restoredAmount = walletDeduction;
                    }

                    // Automatically and immediately credit external captured payment to candidate wallet
                    const creditRes = await creditWallet({
                        userId: candidateUserId,
                        amount: authoritativeAmountINR,
                        paymentId: razorpay_payment_id,
                        orderId: razorpay_order_id,
                        reason: 'SLOT_CONFLICT_CREDIT',
                        description: `Wallet credited: Slot booked concurrently by another candidate. ₹${authoritativeAmountINR} credited for immediate re-booking.`
                    });

                    await releaseSlotReservation({ orderId: razorpay_order_id });

                    try {
                        await PaymentRecord.create({
                            paymentId: razorpay_payment_id,
                            orderId: razorpay_order_id,
                            userId: candidateUserId,
                            paymentType: walletDeduction > 0 ? 'hybrid' : 'booking',
                            amount: authoritativeAmountINR + walletDeduction,
                            walletAmountDeducted: walletDeduction,
                            status: 'verified',
                            walletCredited: true,
                            walletTransactionId: creditRes.transaction?._id,
                            paymentCapturedAt: capturedAt,
                            timestampSource: evidence.timestampSource,
                            providerEventTimestamp: evidence.providerEventTimestamp,
                            serverReceiptTimestamp: evidence.serverReceiptTimestamp,
                            reconciliationStatus: 'verified',
                            metadata: {
                                capturedAt,
                                bookingCutoff,
                                reason: 'Slot conflict: Booked concurrently by another candidate'
                            }
                        });
                    } catch (_) {}

                    const totalCreditedBack = authoritativeAmountINR + restoredAmount;
                    return res.status(200).json({
                        success: false,
                        slotConflict: true,
                        walletCredited: true,
                        amountCredited: totalCreditedBack,
                        updatedBalance: creditRes.balanceAfter,
                        walletTransactionRef: creditRes.transaction?._id,
                        title: "Payment Added to Your Mockeefy Wallet",
                        message: `This interview slot was just booked by another candidate. Your payment of ₹${totalCreditedBack} has been immediately credited to your Mockeefy wallet for instant re-booking!`
                    });
                }

                const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const sessionStatus = 'confirmed';

                const sessionData = {
                    sessionId,
                    expertId: bookingDetails.expertId,
                    candidateId: candidateUserId,
                    startTime,
                    endTime,
                    slotLockKey,
                    paymentId: razorpay_payment_id,
                    orderId: razorpay_order_id,
                    topics: bookingDetails.topics || ["General Mock Interview"],
                    price: authoritativeAmountINR + walletDeduction,
                    status: sessionStatus,
                    meetingLink: (expertDoc?.availability?.defaultMeetingLink && /^https?:\/\/meet\.google\.com\/[a-z0-9-]+/i.test(expertDoc.availability.defaultMeetingLink.trim())) ? expertDoc.availability.defaultMeetingLink.trim() : null,
                    duration,
                    level: bookingDetails.level || "Rising Mentor",
                    notes: bookingDetails.notes || ""
                };

                let session = null;
                try {
                    session = await sessionService.createSession(sessionData);
                } catch (sessionErr) {
                    if (sessionErr.code === 11000 || sessionErr.message?.includes('duplicate key') || sessionErr.message?.includes('slotLockKey')) {
                        console.warn(`[ConcurrencyProtection] Caught duplicate key error (E11000) for slotLockKey: ${slotLockKey}. Crediting candidate wallet for instant re-booking.`);

                        let restoredAmount = 0;
                        if (walletDeduction > 0) {
                            const restoreRes = await restoreWalletDebit({
                                userId: candidateUserId,
                                amount: walletDeduction,
                                originalTransactionId: walletDebitTxnId,
                                reason: 'SLOT_CONFLICT_RESTORE',
                                description: 'Restored wallet funds due to slot collision'
                            });
                            if (restoreRes?.success) restoredAmount = walletDeduction;
                        }

                        // Automatically and immediately credit external captured payment to candidate wallet
                        const creditRes = await creditWallet({
                            userId: candidateUserId,
                            amount: authoritativeAmountINR,
                            paymentId: razorpay_payment_id,
                            orderId: razorpay_order_id,
                            reason: 'SLOT_CONFLICT_CREDIT',
                            description: `Wallet credited: Slot race condition caught by database unique index. ₹${authoritativeAmountINR} credited for immediate re-booking.`
                        });

                        await releaseSlotReservation({ orderId: razorpay_order_id });

                        try {
                            await PaymentRecord.create({
                                paymentId: razorpay_payment_id,
                                orderId: razorpay_order_id,
                                userId: candidateUserId,
                                paymentType: walletDeduction > 0 ? 'hybrid' : 'booking',
                                amount: authoritativeAmountINR + walletDeduction,
                                walletAmountDeducted: walletDeduction,
                                status: 'verified',
                                walletCredited: true,
                                walletTransactionId: creditRes.transaction?._id,
                                paymentCapturedAt: capturedAt,
                                timestampSource: evidence.timestampSource,
                                providerEventTimestamp: evidence.providerEventTimestamp,
                                serverReceiptTimestamp: evidence.serverReceiptTimestamp,
                                reconciliationStatus: 'verified',
                                metadata: {
                                    capturedAt,
                                    bookingCutoff,
                                    reason: 'Slot conflict: Race condition caught by database unique index'
                                }
                            });
                        } catch (_) {}

                        const totalCreditedBack = authoritativeAmountINR + restoredAmount;
                        return res.status(200).json({
                            success: false,
                            slotConflict: true,
                            walletCredited: true,
                            amountCredited: totalCreditedBack,
                            updatedBalance: creditRes.balanceAfter,
                            walletTransactionRef: creditRes.transaction?._id,
                            title: "Payment Added to Your Mockeefy Wallet",
                            message: `This interview slot was just booked by another candidate. Your payment of ₹${totalCreditedBack} has been immediately credited to your Mockeefy wallet for instant re-booking!`
                        });
                    }
                    throw sessionErr;
                }

                // Confirm slot reservation on successful session confirmation
                await confirmSlotReservation({
                    orderId: razorpay_order_id,
                    sessionId: session.sessionId,
                    paymentId: razorpay_payment_id
                }).catch(() => {});

                // Record booking payment to permanently prevent replay attacks
                try {
                    await PaymentRecord.create({
                        paymentId: razorpay_payment_id,
                        orderId: razorpay_order_id,
                        userId: candidateUserId,
                        paymentType: walletDeduction > 0 ? 'hybrid' : 'booking',
                        amount: authoritativeAmountINR + walletDeduction,
                        walletAmountDeducted: walletDeduction,
                        paymentCapturedAt: capturedAt,
                        timestampSource: evidence.timestampSource,
                        providerEventTimestamp: evidence.providerEventTimestamp,
                        serverReceiptTimestamp: evidence.serverReceiptTimestamp,
                        gatewayCaptureVerificationReceivedAt: evidence.gatewayCaptureVerificationReceivedAt || gatewayCaptureVerificationReceivedAt,
                        reconciliationStatus: 'verified',
                        sessionId: session.sessionId,
                        status: 'verified',
                        cutoffExpired: false,
                        metadata: {
                            capturedAt,
                            bookingCutoff,
                            timestampSource: evidence.timestampSource,
                            serverVerificationTime: now,
                            bookingId: session.sessionId,
                            candidateId: String(candidateUserId),
                            totalBookingAmount: authoritativeAmountINR + walletDeduction,
                            walletContribution: walletDeduction,
                            razorpayPayableAmount: authoritativeAmountINR,
                            paymentMethod: walletDeduction > 0 ? 'COMBINED' : 'RAZORPAY'
                        }
                    });
                    if (walletDeduction > 0) {
                        const WalletTransaction = (await import('../models/WalletTransaction.js')).default;
                        await WalletTransaction.updateMany(
                            { orderId: razorpay_order_id, type: 'DEBIT' },
                            {
                                $set: {
                                    sessionId: session.sessionId,
                                    referenceId: session._id,
                                    referenceModel: 'Session',
                                    paymentMethod: 'COMBINED',
                                    totalBookingAmount: authoritativeAmountINR + walletDeduction,
                                    walletAmountUsed: walletDeduction
                                }
                            }
                        );
                    }
                } catch (recErr) {
                    console.warn("[PaymentRecord] Failed to record booking payment:", recErr.message);
                }

                syncDataChange({
                    type: "SESSION_CREATED",
                    userId: session.candidateId,
                    sessionId: session.sessionId,
                    data: session,
                    toAdmin: true
                });
                if (expertUserId) {
                    syncDataChange({
                        type: "SESSION_CREATED",
                        userId: expertUserId,
                        sessionId: session.sessionId,
                        data: session
                    });
                }

                const dt = formatSessionDateTime(startTime, endTime);
                const domainName = expertDoc?.personalInformation?.category || expertDoc?.category || (bookingDetails.topics && bookingDetails.topics[0]) || "Technical Interview";
                const expertTitle = expertDoc?.professionalDetails?.title || expertDoc?.title || "Interview Expert";
                const candidateName = bookingDetails.candidateName || user?.name || "Candidate";
                const expertName = expertDoc?.personalInformation?.userName || bookingDetails.expertName || "Interview Expert";

                // PHASE 4: Automatic In-App Notifications
                // 1. Candidate In-App Notification
                await createNotification({
                    userId: bookingDetails.candidateId,
                    type: 'booking_confirmed',
                    title: 'Interview Booking Confirmed 🎉',
                    message: `Your ${duration}-min ${domainName} interview with ${expertName} (${expertTitle}) is confirmed for ${dt.dateStr} from ${dt.timeSlotStr}.`,
                    metadata: {
                        sessionId: session.sessionId,
                        link: '/my-sessions',
                        meetingLink: sessionData.meetingLink,
                        domain: domainName,
                        duration
                    }
                });

                // 2. Expert In-App Notification
                if (expertUserId) {
                    await createNotification({
                        userId: expertUserId,
                        type: 'booking_confirmed',
                        title: sessionData.meetingLink ? 'New Interview Booking 🎯' : 'Action Required: Add Google Meet Link ⚠️',
                        message: sessionData.meetingLink
                            ? `New booking: ${candidateName} has booked a ${duration}-min ${domainName} interview with you on ${dt.dateStr} at ${dt.timeSlotStr}.`
                            : `New booking: ${candidateName} booked a ${duration}-min ${domainName} interview with you on ${dt.dateStr} at ${dt.timeSlotStr}. Please add your Google Meet link so the candidate can join!`,
                        metadata: {
                            sessionId: session.sessionId,
                            link: '/dashboard/sessions',
                            meetingLink: sessionData.meetingLink,
                            domain: domainName,
                            candidateName,
                            duration
                        }
                    });
                }

                // PHASE 5: Automatic Confirmation Emails (Asynchronously & Safe)
                triggerBookingEmails({
                    bookingDetails: {
                        ...bookingDetails,
                        category: domainName
                    },
                    sessionId: session.sessionId,
                    meetingLink: sessionData.meetingLink,
                    paymentId: razorpay_payment_id,
                    orderId: razorpay_order_id,
                    paymentStatus: "Paid & Verified",
                    price: bookingDetails.price,
                    candidateUserFallback: user
                }).catch((emailErr) => {
                    console.error("[BookingPayment] Error in asynchronous triggerBookingEmails:", emailErr);
                });

                sessionConfirmed = true;
                return res.status(200).json({
                    success: true,
                    message: 'Payment verified and session created successfully',
                    data: session,
                    sessionId: session.sessionId
                });
            }

            res.status(200).json({
                success: true,
                message: 'Payment verified successfully (No booking details provided)',
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Invalid signature sent!',
            });
        }
    } catch (error) {
        console.error('Razorpay Verify Payment Error:', error);

        // Fail-safe protection: if external payment was captured on Razorpay, guarantee candidate funds are safely credited to wallet
        if (!sessionConfirmed && candidateUserId && req.body?.razorpay_payment_id && authoritativeAmountINR > 0) {
            try {
                if (walletDeduction > 0 && walletDebitTxnId) {
                    await restoreWalletDebit({
                        userId: candidateUserId,
                        amount: walletDeduction,
                        originalTransactionId: walletDebitTxnId,
                        reason: 'SYSTEM_ERROR_RESTORE',
                        description: 'Restored wallet funds due to server error during booking'
                    }).catch(() => {});
                }

                const creditRes = await creditWallet({
                    userId: candidateUserId,
                    amount: authoritativeAmountINR,
                    paymentId: req.body.razorpay_payment_id,
                    orderId: req.body.razorpay_order_id,
                    reason: 'BOOKING_FAILED_CREDIT',
                    description: `Wallet credited: Server error encountered during booking. ₹${authoritativeAmountINR} credited for immediate re-booking.`
                });

                if (req.body.razorpay_order_id) {
                    await releaseSlotReservation({ orderId: req.body.razorpay_order_id }).catch(() => {});
                }

                return res.status(200).json({
                    success: false,
                    slotConflict: true,
                    walletCredited: true,
                    amountCredited: authoritativeAmountINR + (walletDeduction > 0 ? walletDeduction : 0),
                    updatedBalance: creditRes.balanceAfter,
                    walletTransactionRef: creditRes.transaction?._id,
                    title: "Payment Added to Your Mockeefy Wallet",
                    message: "Your payment was successfully received, but a server error occurred while confirming your interview slot. The full amount has been credited to your Mockeefy wallet for instant re-booking."
                });
            } catch (emergencyErr) {
                console.error('[VerifyPayment] Emergency wallet credit failed:', emergencyErr);
            }
        }

        res.status(500).json({
            success: false,
            message: 'Failed to verify payment',
            error: error.message,
        });
    }
};

/**
 * Premium members booking with their free credits.
 */
export const usePremiumCredit = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { bookingDetails } = req.body;
        const userId = bookingDetails.candidateId;

        const startTime = new Date(bookingDetails.startTime);
        const endTime = new Date(bookingDetails.endTime);
        const duration = Number(bookingDetails.duration) || Math.round((endTime.getTime() - startTime.getTime()) / (60 * 1000));

        // Authoritative validation of slot & 10-minute universal cutoff
        const slotValidation = await validateBookingSlot({
            expertId: bookingDetails.expertId,
            startTime,
            endTime,
            duration
        });

        if (!slotValidation.valid) {
            await session.abortTransaction();
            session.endSession();
            return res.status(slotValidation.status || 400).json({
                success: false,
                cutoffExpired: Boolean(slotValidation.cutoffExpired),
                message: slotValidation.error || 'This slot is no longer available.',
                reason: slotValidation.reason
            });
        }

        // Use pessimistic locking to prevent race conditions during concurrent clicks
        const user = await User.findById(userId).session(session);
        if (!user || !user.isPremium || user.freeInterviewsCount <= 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'Insufficient free credits or not a premium member.'
            });
        }

        // Decrement credit
        user.freeInterviewsCount -= 1;
        await user.save({ session });

        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const sessionData = {
            sessionId,
            expertId: bookingDetails.expertId,
            candidateId: bookingDetails.candidateId,
            startTime,
            endTime,
            topics: Array.isArray(bookingDetails.topics) ? bookingDetails.topics : ["Mock Interview"],
            price: 0,
            status: 'confirmed',
            duration: bookingDetails.duration || 60,
            level: bookingDetails.level || "Rising Mentor",
            notes: "Premium Free Credit Used",
        };

        let expertUserId = bookingDetails.expertId;
        let expertDoc = null;
        try {
            expertDoc = await ExpertDetails.findOne({ $or: [{ _id: bookingDetails.expertId }, { userId: bookingDetails.expertId }] });
            if (expertDoc?.userId) {
                expertUserId = expertDoc.userId;
            }
        } catch (_) {}

        const autoAccept = expertDoc?.settings?.autoAccept === true;
        sessionData.status = autoAccept ? 'confirmed' : 'pending';
        sessionData.meetingLink = (expertDoc?.availability?.defaultMeetingLink && /^https?:\/\/meet\.google\.com\/[a-z0-9-]+/i.test(expertDoc.availability.defaultMeetingLink.trim())) ? expertDoc.availability.defaultMeetingLink.trim() : null;

        const createdSession = await sessionService.createSession(sessionData, { session });
        
        await session.commitTransaction();

        const dt = formatSessionDateTime(sessionData.startTime, sessionData.endTime);

        await createNotification({
            userId: expertUserId,
            type: 'booking_confirmed',
            title: sessionData.meetingLink ? 'New Session Booked!' : 'Action Required: Add Google Meet Link ⚠️',
            message: sessionData.meetingLink
                ? `A candidate (${bookingDetails.candidateName || user?.name || "Candidate"}) has booked a session with you using Premium Credit on ${dt.dateStr} at ${dt.timeSlotStr}.`
                : `A candidate (${bookingDetails.candidateName || user?.name || "Candidate"}) booked a session on ${dt.dateStr} at ${dt.timeSlotStr}. Please add your Google Meet link so the candidate can join!`,
            metadata: { sessionId: createdSession.sessionId, link: '/dashboard/sessions' }
        });

        // Notify User
        await createNotification({
            userId: bookingDetails.candidateId,
            type: 'booking_confirmed',
            title: 'Meeting Scheduled Successfully! 🎉',
            message: `Your premium mock interview meeting has been scheduled on ${dt.dateStr} at ${dt.timeSlotStr}.`,
            metadata: { sessionId: createdSession.sessionId, link: '/my-sessions' }
        });

        // Directly send email notification to Interview Expert
        await triggerBookingEmails({
            bookingDetails,
            sessionId: createdSession.sessionId,
            meetingLink: sessionData.meetingLink,
            paymentId: "PREMIUM-CREDIT",
            orderId: "CREDIT-REDEEMED",
            paymentStatus: "Paid via Premium Credit",
            price: 0,
            candidateUserFallback: user
        });

        syncDataChange({
            type: "SESSION_CREATED",
            userId: createdSession.candidateId,
            sessionId: createdSession.sessionId,
            data: createdSession,
            toAdmin: true
        });
        if (expertUserId) {
            syncDataChange({
                type: "SESSION_CREATED",
                userId: expertUserId,
                sessionId: createdSession.sessionId,
                data: createdSession
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Session booked successfully using premium credit!',
            data: createdSession,
            sessionId: createdSession.sessionId,
            remainingCredits: user.freeInterviewsCount
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Use Premium Credit Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to book session with credit',
            error: error.message
        });
    } finally {
        session.endSession();
    }
};

/**
 * Create a session without payment when a valid free promo code is applied.
 * Expects same bookingDetails shape as verify-payment (startTime, endTime, expertId, candidateId, topics, duration, etc.).
 */
export const createFreeBooking = async (req, res) => {
    try {
        const rawBooking = req.body.bookingDetails || req.body;
        const candidateId = rawBooking.candidateId || req.user?.userId || req.user?.id || req.body.userId;
        const bookingDetails = {
            ...rawBooking,
            candidateId
        };

        if (!bookingDetails?.expertId || !bookingDetails?.candidateId || !bookingDetails?.startTime || !bookingDetails?.endTime) {
            return res.status(400).json({
                success: false,
                message: 'Missing required booking details (expertId, candidateId, startTime, endTime)',
            });
        }

        const notes = bookingDetails.notes || '';
        if (notes.toUpperCase().includes('FREEMU001')) {
            // Check if this candidate has already used this promo code
            const alreadyUsed = await Session.findOne({
                candidateId: bookingDetails.candidateId,
                notes: { $regex: /FREEMU001/i }
            });
            if (alreadyUsed) {
                return res.status(400).json({
                    success: false,
                    message: 'You have already used the FREEMU001 promo code. It can only be used once.'
                });
            }
        }

        const startTime = new Date(bookingDetails.startTime);
        const endTime = new Date(bookingDetails.endTime);

        // Comprehensive authoritative backend slot validation
        const slotValidation = await validateBookingSlot({
            expertId: bookingDetails.expertId,
            startTime,
            endTime,
            duration: bookingDetails.duration || Math.round((endTime.getTime() - startTime.getTime()) / (60 * 1000))
        });

        if (!slotValidation.valid) {
            return res.status(slotValidation.status || 400).json({
                success: false,
                message: slotValidation.message,
                reason: slotValidation.reason
            });
        }

        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        let expertDoc = null;
        let expertUserId = bookingDetails.expertId;
        try {
            expertDoc = await ExpertDetails.findOne({ $or: [{ _id: bookingDetails.expertId }, { userId: bookingDetails.expertId }] });
            if (expertDoc?.userId) {
                expertUserId = expertDoc.userId;
            }
        } catch (_) {}

        const autoAccept = expertDoc?.settings?.autoAccept === true;
        const sessionStatus = autoAccept ? 'confirmed' : 'pending';

        const sessionData = {
            sessionId,
            expertId: bookingDetails.expertId,
            candidateId: bookingDetails.candidateId,
            startTime,
            endTime,
            topics: Array.isArray(bookingDetails.topics) && bookingDetails.topics.length
                ? bookingDetails.topics
                : [bookingDetails?.skill || bookingDetails?.category || 'General Mock Interview'],
            price: 0,
            status: sessionStatus,
            meetingLink: (expertDoc?.availability?.defaultMeetingLink && /^https?:\/\/meet\.google\.com\/[a-z0-9-]+/i.test(expertDoc.availability.defaultMeetingLink.trim())) ? expertDoc.availability.defaultMeetingLink.trim() : null,
            duration: bookingDetails.duration || 60,
            level: bookingDetails.level || "Rising Mentor",
            notes: bookingDetails.notes || 'Booked with free promo code',
        };

        const session = await sessionService.createSession(sessionData);

        const dt = formatSessionDateTime(startTime, endTime);

        if (autoAccept) {
            // Notify Expert
            await createNotification({
                userId: expertUserId,
                type: 'booking_confirmed',
                title: sessionData.meetingLink ? 'New Session Booked!' : 'Action Required: Add Google Meet Link ⚠️',
                message: sessionData.meetingLink
                    ? `A candidate (${bookingDetails.candidateName || 'Candidate'}) has booked a session with you on ${dt.dateStr} at ${dt.timeSlotStr}.`
                    : `A candidate (${bookingDetails.candidateName || 'Candidate'}) booked a session on ${dt.dateStr} at ${dt.timeSlotStr}. Please add your Google Meet link so the candidate can join!`,
                metadata: { sessionId: session.sessionId, link: '/dashboard/sessions' }
            });

            // Notify User
            await createNotification({
                userId: bookingDetails.candidateId,
                type: 'booking_confirmed',
                title: 'Meeting Scheduled Successfully! 🎉',
                message: `Your free mock interview meeting has been scheduled on ${dt.dateStr} at ${dt.timeSlotStr}.`,
                metadata: { sessionId: session.sessionId, link: '/my-sessions' }
            });
        } else {
            // Notify Expert of Pending Request
            await createNotification({
                userId: expertUserId,
                type: 'booking_request',
                title: 'New Booking Request Pending Review! 🔔',
                message: `A candidate (${bookingDetails.candidateName || 'Candidate'}) has requested a free session on ${dt.dateStr} at ${dt.timeSlotStr}. Please review and confirm.`,
                metadata: { sessionId: session.sessionId, link: '/expert/sessions' }
            });

            // Notify User of Pending Status
            await createNotification({
                userId: bookingDetails.candidateId,
                type: 'booking_pending',
                title: 'Booking Request Submitted! ⏳',
                message: `Your booking request for ${dt.dateStr} at ${dt.timeSlotStr} has been submitted. Awaiting mentor confirmation.`,
                metadata: { sessionId: session.sessionId, link: '/my-sessions' }
            });
        }

        // Directly send email notification to Interview Expert
        await triggerBookingEmails({
            bookingDetails,
            sessionId: session.sessionId,
            meetingLink: sessionData.meetingLink,
            paymentId: "FREE-PROMO",
            orderId: "PROMO-APPLIED",
            paymentStatus: "100% Free Promo",
            price: 0,
            candidateUserFallback: req.user
        });

        syncDataChange({
            type: "SESSION_CREATED",
            userId: session.candidateId,
            sessionId: session.sessionId,
            data: session,
            toAdmin: true
        });
        if (expertUserId) {
            syncDataChange({
                type: "SESSION_CREATED",
                userId: expertUserId,
                sessionId: session.sessionId,
                data: session
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Free booking created successfully',
            data: session,
            sessionId: session.sessionId,
        });
    } catch (error) {
        console.error('Create Free Booking Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create free booking',
            error: error.message,
        });
    }
};

/**
 * Handle 100% free premium subscriptions (e.g. 100% promo codes).
 */
export const createFreeSubscription = async (req, res) => {
    try {
        const { userId, planId, freeInterviews } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        const freeCount = (planId === 'ultimate-419' || planId === '419' || freeInterviews === 6) ? 6 : 3;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                isPremium: true,
                freeInterviewsCount: freeCount,
                premiumPlan: planId || (freeCount === 6 ? 'ultimate-419' : 'pro-219'),
                premiumExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
            },
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: 'Free Premium Subscription Activated!',
            user: updatedUser
        });
    } catch (error) {
        console.error('Create Free Subscription Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create free subscription',
            error: error.message,
        });
    }
};

/**
 * Handle 100% Mockeefy Wallet interview bookings.
 * Deducts wallet funds atomically, enforces slot lock, and issues notifications/emails.
 */
export const bookWithWallet = async (req, res) => {
    let candidateId = null;
    let sessionFee = 0;
    let debitRes = null;
    let session = null;
    try {
        const rawBooking = req.body.bookingDetails || req.body;
        candidateId = rawBooking.candidateId || req.user?.userId || req.user?.id || req.body.userId;
        const bookingDetails = { ...rawBooking, candidateId };

        if (!bookingDetails?.expertId || !bookingDetails?.candidateId || !bookingDetails?.startTime || !bookingDetails?.endTime) {
            return res.status(400).json({
                success: false,
                message: 'Missing required booking details (expertId, candidateId, startTime, endTime)'
            });
        }

        const startTime = new Date(bookingDetails.startTime);
        const endTime = new Date(bookingDetails.endTime);
        const duration = Number(bookingDetails.duration) || Math.round((endTime.getTime() - startTime.getTime()) / (60 * 1000));
        sessionFee = Number(bookingDetails.price || req.body.price || 0);

        if (sessionFee <= 0) {
            return res.status(400).json({
                success: false,
                message: 'A positive session fee is required for wallet booking'
            });
        }

        // 1. Cutoff check: booking permitted until 10 minutes before scheduled end time
        const bookingCutoff = new Date(endTime.getTime() - 10 * 60 * 1000);
        const now = new Date();
        if (now.getTime() >= bookingCutoff.getTime()) {
            return res.status(400).json({
                success: false,
                cutoffExpired: true,
                message: 'The 10-minute booking cutoff for this interview slot has passed.'
            });
        }

        // 2. Validate slot
        const slotValidation = await validateBookingSlot({
            expertId: bookingDetails.expertId,
            startTime,
            endTime,
            duration
        });

        if (!slotValidation.valid) {
            return res.status(slotValidation.status || 400).json({
                success: false,
                message: slotValidation.error || 'This slot is no longer available.',
                reason: slotValidation.reason
            });
        }

        // 3. Atomically debit candidate's wallet
        debitRes = await debitWallet({
            userId: candidateId,
            amount: sessionFee,
            paymentMethod: 'MOCKEEFY_WALLET',
            totalBookingAmount: sessionFee,
            walletAmountUsed: sessionFee,
            reason: 'INTERVIEW_BOOKING_DEBIT',
            description: `Full wallet payment of ₹${sessionFee} for mock interview`
        });

        if (!debitRes.success) {
            return res.status(400).json({
                success: false,
                message: debitRes.message || 'Insufficient wallet balance',
                currentBalance: debitRes.currentBalance
            });
        }

        // 4. Resolve expert user
        let expertDoc = null;
        let expertUserId = bookingDetails.expertId;
        try {
            expertDoc = await ExpertDetails.findOne({ $or: [{ _id: bookingDetails.expertId }, { userId: bookingDetails.expertId }] }).populate('userId');
            if (expertDoc?.userId) {
                expertUserId = expertDoc.userId?._id || expertDoc.userId;
            }
        } catch (_) {}

        // 5. Concurrency check & create session with slotLockKey
        const expertIds = [bookingDetails.expertId, expertDoc?._id, expertDoc?.userId].filter(Boolean);
        const slotLockKey = buildSlotKey(expertUserId, startTime, endTime);

        const concurrentConflict = await Session.findOne({
            $or: [
                { slotLockKey, status: { $nin: ['cancelled', 'Cancelled', 'CANCELLED', 'rejected', 'Rejected', 'REJECTED', 'declined', 'Declined', 'DECLINED', 'failed', 'Failed', 'FAILED', 'expired', 'Expired', 'EXPIRED'] } },
                {
                    expertId: { $in: expertIds },
                    status: { $in: ['confirmed', 'live', 'upcoming', 'Upcoming', 'pending'] },
                    startTime: { $lt: endTime },
                    endTime: { $gt: startTime }
                }
            ]
        });

        if (concurrentConflict) {
            // Restore wallet funds immediately
            await restoreWalletDebit({
                userId: candidateId,
                amount: sessionFee,
                originalTransactionId: debitRes.transaction?._id,
                reason: 'SLOT_CONFLICT_RESTORE',
                description: 'Restored wallet funds due to slot booking conflict'
            });

            return res.status(409).json({
                success: false,
                slotConflict: true,
                message: 'This interview slot was just booked by another candidate. Your wallet funds have been restored.'
            });
        }

        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const sessionData = {
            sessionId,
            expertId: bookingDetails.expertId,
            candidateId,
            startTime,
            endTime,
            slotLockKey,
            topics: bookingDetails.topics || ["General Mock Interview"],
            price: sessionFee,
            status: 'confirmed',
            meetingLink: (expertDoc?.availability?.defaultMeetingLink && /^https?:\/\/meet\.google\.com\/[a-z0-9-]+/i.test(expertDoc.availability.defaultMeetingLink.trim())) ? expertDoc.availability.defaultMeetingLink.trim() : null,
            duration,
            level: bookingDetails.level || "Rising Mentor",
            notes: bookingDetails.notes || "Booked with Mockeefy Wallet"
        };

        session = null;
        try {
            session = await sessionService.createSession(sessionData);
        } catch (createErr) {
            // If duplicate key error: restore wallet
            await restoreWalletDebit({
                userId: candidateId,
                amount: sessionFee,
                originalTransactionId: debitRes?.transaction?._id,
                reason: 'SLOT_CONFLICT_RESTORE',
                description: 'Restored wallet funds due to slot booking race condition'
            });

            return res.status(409).json({
                success: false,
                slotConflict: true,
                message: 'This interview slot was just booked by another candidate. Your wallet funds have been restored.'
            });
        }

        // 6. Record payment record
        const walletPaymentId = `wallet_pay_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        try {
            await PaymentRecord.create({
                paymentId: walletPaymentId,
                orderId: req.body.orderId || `wallet_ord_${Date.now()}`,
                userId: candidateId,
                paymentType: 'wallet',
                amount: sessionFee,
                walletAmountDeducted: sessionFee,
                sessionId: session.sessionId,
                status: 'verified',
                paymentCapturedAt: now,
                metadata: {
                    bookingId: session.sessionId,
                    candidateId: String(candidateId),
                    totalBookingAmount: sessionFee,
                    walletContribution: sessionFee,
                    razorpayPayableAmount: 0,
                    paymentMethod: 'MOCKEEFY_WALLET'
                }
            });
            if (debitRes.transaction?._id) {
                const WalletTransaction = (await import('../models/WalletTransaction.js')).default;
                await WalletTransaction.findByIdAndUpdate(debitRes.transaction._id, {
                    sessionId: session.sessionId,
                    referenceId: session._id,
                    referenceModel: 'Session',
                    paymentMethod: 'MOCKEEFY_WALLET',
                    totalBookingAmount: sessionFee,
                    walletAmountUsed: sessionFee
                });
            }
        } catch (recErr) {
            console.warn('[PaymentRecord] Error saving wallet payment record:', recErr.message);
        }

        // 7. Dispatches notifications & emails
        const dt = formatSessionDateTime(startTime, endTime);
        const domainName = expertDoc?.personalInformation?.category || expertDoc?.category || (bookingDetails.topics && bookingDetails.topics[0]) || "Technical Interview";
        const expertTitle = expertDoc?.professionalDetails?.title || expertDoc?.title || "Interview Expert";
        const candidateName = bookingDetails.candidateName || req.user?.name || "Candidate";
        const expertName = expertDoc?.personalInformation?.userName || bookingDetails.expertName || "Interview Expert";

        await createNotification({
            userId: candidateId,
            type: 'booking_confirmed',
            title: 'Interview Booking Confirmed 🎉',
            message: `Your ${duration}-min ${domainName} interview with ${expertName} (${expertTitle}) is confirmed for ${dt.dateStr} from ${dt.timeSlotStr}. Paid ₹${sessionFee} via Mockeefy Wallet.`,
            metadata: { sessionId: session.sessionId, link: '/my-sessions', domain: domainName, duration }
        });

        if (expertUserId) {
            await createNotification({
                userId: expertUserId,
                type: 'booking_confirmed',
                title: 'New Interview Booking 🎯',
                message: `New booking: ${candidateName} has booked a ${duration}-min ${domainName} interview with you on ${dt.dateStr} at ${dt.timeSlotStr}.`,
                metadata: { sessionId: session.sessionId, link: '/dashboard/sessions', domain: domainName, candidateName, duration }
            });
        }

        triggerBookingEmails({
            bookingDetails: { ...bookingDetails, category: domainName },
            sessionId: session.sessionId,
            meetingLink: sessionData.meetingLink,
            paymentId: walletPaymentId,
            orderId: "WALLET-DEBIT",
            paymentStatus: "Paid via Mockeefy Wallet",
            price: sessionFee,
            candidateUserFallback: req.user
        }).catch((err) => console.error('[WalletBooking] Email error:', err.message));

        return res.status(200).json({
            success: true,
            walletDebited: true,
            amountDebited: sessionFee,
            remainingBalance: debitRes.balanceAfter,
            message: 'Session booked successfully using Mockeefy Wallet',
            data: session,
            sessionId: session.sessionId
        });
    } catch (error) {
        console.error('Book With Wallet Error:', error);

        // Emergency safety: ensure debited wallet funds are safely restored if unexpected exception occurs after debit
        if (debitRes?.success && !session && candidateId && sessionFee > 0) {
            try {
                await restoreWalletDebit({
                    userId: candidateId,
                    amount: sessionFee,
                    originalTransactionId: debitRes.transaction?._id,
                    reason: 'BOOKING_FAILED_RESTORE',
                    description: 'Restored wallet funds due to server error during booking'
                });
            } catch (restErr) {
                console.error('[BookWithWallet] Failed to restore wallet funds:', restErr);
            }
        }

        res.status(500).json({
            success: false,
            message: 'Failed to book session with wallet',
            error: error.message
        });
    }
};

/* -------------------- Cancel Partial Booking (Restore Wallet Debit) -------------------- */
export const cancelPartialBooking = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.userId || req.user?.id;
        const { orderId, walletDebitTxnId } = req.body;
        if (!orderId && !walletDebitTxnId) {
            return res.status(400).json({ success: false, message: 'Missing orderId or walletDebitTxnId' });
        }

        const WalletTransaction = (await import('../models/WalletTransaction.js')).default;
        const Session = (await import('../models/Session.js')).default;
        const PaymentRecord = (await import('../models/PaymentRecord.js')).default;

        // 1. Race Protection: If session already confirmed for this order, CANNOT cancel!
        if (orderId) {
            const confirmedSession = await Session.findOne({
                $or: [
                    { 'paymentDetails.orderId': orderId },
                    { notes: { $regex: orderId } }
                ],
                status: { $nin: ['cancelled'] }
            });
            if (confirmedSession) {
                return res.status(409).json({
                    success: false,
                    paymentCaptured: true,
                    message: 'Cannot cancel: session has already been confirmed for this booking.'
                });
            }

            // 2. Race Protection: If PaymentRecord already verified or awaiting reconciliation
            const existingPayment = await PaymentRecord.findOne({
                orderId,
                status: { $in: ['verified', 'captured', 'awaiting_reconciliation'] }
            });
            if (existingPayment) {
                return res.status(409).json({
                    success: false,
                    paymentCaptured: true,
                    message: 'Cannot cancel: payment was captured or is awaiting reconciliation.'
                });
            }

            // 3. Authoritative gateway check on Razorpay order
            if (!orderId.startsWith('dummy') && !orderId.startsWith('test')) {
                try {
                    const rzClient = getRazorpayClient();
                    const payments = await rzClient.orders.fetchPayments(orderId);
                    const capturedPayment = payments.items?.find(p => p.status === 'captured' || p.status === 'authorized');
                    if (capturedPayment) {
                        return res.status(409).json({
                            success: false,
                            paymentCaptured: true,
                            paymentId: capturedPayment.id,
                            message: 'Cannot cancel: payment has been captured by the gateway.'
                        });
                    }
                } catch (rzErr) {
                    // Gateway error or order not found, continue
                }
            }
        }

        // Find existing debit transaction for this order
        const debitTxn = await WalletTransaction.findOne({
            userId,
            $or: [
                ...(orderId ? [{ orderId }] : []),
                ...(walletDebitTxnId ? [{ _id: walletDebitTxnId }] : [])
            ],
            type: 'DEBIT',
            reason: 'INTERVIEW_BOOKING_DEBIT'
        });

        if (!debitTxn) {
            return res.status(200).json({
                success: true,
                restored: false,
                message: 'No wallet debit found to restore for this order.'
            });
        }

        // Idempotency: Check if already restored
        const alreadyRestored = await WalletTransaction.findOne({
            userId,
            $or: [
                { referenceId: debitTxn._id },
                { relatedTransactionId: debitTxn._id }
            ],
            type: 'CREDIT',
            reason: { $regex: /RESTORE/i }
        });

        if (alreadyRestored) {
            return res.status(200).json({
                success: true,
                alreadyRestored: true,
                restored: false,
                message: 'Wallet debit has already been restored.'
            });
        }

        // Release slot reservation lock if any
        if (orderId) {
            await releaseSlotReservation({ orderId });
        }

        const restoreRes = await restoreWalletDebit({
            userId,
            amount: debitTxn.amount,
            originalTransactionId: debitTxn._id,
            reason: 'SLOT_CANCELLED_RESTORE',
            description: `Restored ₹${debitTxn.amount} wallet funds due to cancelled or failed checkout for order ${orderId || debitTxn._id}`
        });

        if (restoreRes?.alreadyRestored) {
            return res.status(200).json({
                success: true,
                alreadyRestored: true,
                restored: false,
                message: 'Wallet debit has already been restored.'
            });
        }

        return res.status(200).json({
            success: true,
            restored: true,
            restoredAmount: debitTxn.amount,
            balanceAfter: restoreRes.balanceAfter,
            message: `Restored ₹${debitTxn.amount} to your Mockeefy wallet.`
        });
    } catch (err) {
        console.error('Cancel partial booking error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

/* -------------------- Trigger Abandoned Wallet Checkout Reconciliation -------------------- */
export const triggerAbandonedReconciliation = async (req, res) => {
    try {
        const { reconcileAbandonedWalletCheckouts } = await import('../services/paymentReconciliationService.js');
        const results = await reconcileAbandonedWalletCheckouts({ maxAgeMs: 0 });
        return res.status(200).json({ success: true, results });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
