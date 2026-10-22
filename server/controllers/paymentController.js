import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
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
        const { amount, currency = 'INR', receipt } = req.body;

        if (!amount) {
            return res.status(400).json({ success: false, message: 'Amount is required' });
        }


        const options = {
            amount: amount * 100, // Razorpay works in paise
            currency,
            receipt,
        };

        const order = await razorpay.orders.create(options);

        res.status(200).json({
            success: true,
            order,
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
import Session from '../models/Session.js';
import { createNotification } from './notificationController.js';
import {
    sendBookingNotificationToExpert,
    sendBookingNotificationToCandidate,
    formatSessionDateTime
} from '../services/emailService.js';

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
        if (!bookingDetails) return;

        const startTime = new Date(bookingDetails.startTime);
        const endTime = new Date(bookingDetails.endTime);

        // 1. Fetch Candidate User
        let candidateUser = null;
        if (bookingDetails.candidateId && mongoose.Types.ObjectId.isValid(bookingDetails.candidateId)) {
            candidateUser = await User.findById(bookingDetails.candidateId).lean();
        }
        if (!candidateUser && candidateUserFallback) {
            candidateUser = candidateUserFallback;
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
        }

        if (expertDoc?.userId) {
            expertUser = typeof expertDoc.userId === 'object' ? expertDoc.userId : await User.findById(expertDoc.userId).lean();
        } else if (expertLookup && mongoose.Types.ObjectId.isValid(expertLookup)) {
            expertUser = await User.findById(expertLookup).lean();
        }

        const expertEmail = expertUser?.email;
        const expertName = expertDoc?.personalInformation?.userName || expertUser?.name || "Interview Expert";
        const candidateName = candidateUser?.name || "Candidate";
        const candidateEmail = candidateUser?.email || "Not specified";
        const candidatePhone = candidateUser?.personalInfo?.phone || candidateUser?.phone || candidateUser?.mobile || "Not provided";

        console.log(`[BookingPayment] Dispatching booking confirmation email to interview expert: ${expertEmail} (${expertName}) for session: ${sessionId}`);

        if (expertEmail) {
            await sendBookingNotificationToExpert({
                expertEmail,
                expertName,
                candidateName,
                candidateEmail,
                candidatePhone,
                startTime,
                endTime,
                duration: bookingDetails.duration || 60,
                topics: bookingDetails.topics,
                category: expertDoc?.personalInformation?.category || "Technical Interview",
                amountPaid: price !== undefined ? price : bookingDetails.price,
                paymentStatus,
                paymentId: paymentId || "N/A",
                orderId: orderId || "N/A",
                notes: bookingDetails.notes || "",
                meetingLink,
                sessionId,
            });
        } else {
            console.warn(`[BookingPayment] Warning: No email address found for interview expert: ${bookingDetails.expertId}`);
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
                duration: bookingDetails.duration || 60,
                topics: bookingDetails.topics,
                amountPaid: price !== undefined ? price : bookingDetails.price,
                paymentId: paymentId || "N/A",
                meetingLink,
                sessionId,
            }).catch((err) => console.error("[BookingPayment] Candidate notification email error:", err.message));
        }
    } catch (err) {
        console.error("[BookingPayment] Error in triggerBookingEmails:", err);
    }
};

export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingDetails, user } = req.body;

        let isVerified = false;

        // Remove Dummy bypass, enforce actual verification
        const sign = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest('hex');

        if (razorpay_signature === expectedSign) {
            isVerified = true;
        }

        if (isVerified) {
            // Handle Subscription Type
            if (req.body.paymentType === 'subscription') {
                const updatedUser = await User.findByIdAndUpdate(
                    user?.id || user?.userId,
                    {
                        isPremium: true,
                        freeInterviewsCount: 3,
                        premiumExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
                    },
                    { new: true }
                );
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

                const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                const sessionData = {
                    sessionId,
                    expertId: bookingDetails.expertId,
                    candidateId: bookingDetails.candidateId,
                    startTime,
                    endTime,
                    topics: bookingDetails.topics || ["General Mock Interview"],
                    price: bookingDetails.price,
                    status: 'confirmed',
                    duration: bookingDetails.duration || 60,
                    level: bookingDetails.level || "Rising Mentor",
                    notes: bookingDetails.notes || ""
                };

                try {
                    const expert = await ExpertDetails.findOne({ $or: [{ _id: bookingDetails.expertId }, { userId: bookingDetails.expertId }] });
                    sessionData.meetingLink = expert?.availability?.defaultMeetingLink || null;
                } catch (_) {}

                const session = await sessionService.createSession(sessionData);

                const dt = formatSessionDateTime(startTime, endTime);

                // Notify Expert
                await createNotification({
                    userId: bookingDetails.expertId,
                    type: 'booking_confirmed',
                    title: 'New Session Booked!',
                    message: `A candidate has booked a ${bookingDetails.duration || 60} min session with you on ${dt.dateStr} at ${dt.timeSlotStr}.`,
                    metadata: { sessionId: session.sessionId, link: '/expert/dashboard' }
                });

                // Notify User
                await createNotification({
                    userId: bookingDetails.candidateId,
                    type: 'booking_confirmed',
                    title: 'Meeting Scheduled Successfully! 🎉',
                    message: `Your meeting has been scheduled on ${dt.dateStr} at ${dt.timeSlotStr}.`,
                    metadata: { sessionId: session.sessionId, link: '/my-sessions' }
                });

                // Directly send professional email notification to the specified Interview Expert with all booking and payment details
                triggerBookingEmails({
                    bookingDetails,
                    sessionId: session.sessionId,
                    meetingLink: sessionData.meetingLink,
                    paymentId: razorpay_payment_id,
                    orderId: razorpay_order_id,
                    paymentStatus: "Paid & Verified",
                    price: bookingDetails.price,
                    candidateUserFallback: user
                });

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

        // Use pessimistic locking to prevent race conditions during concurrent clicks
        const user = await User.findById(userId).session(session);
        if (!user || !user.isPremium || user.freeInterviewsCount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient free credits or not a premium member.'
            });
        }

        // Decrement credit
        user.freeInterviewsCount -= 1;
        await user.save({ session });

        const startTime = new Date(bookingDetails.startTime);
        const endTime = new Date(bookingDetails.endTime);
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

        try {
            const expert = await ExpertDetails.findOne({ $or: [{ _id: bookingDetails.expertId }, { userId: bookingDetails.expertId }] });
            sessionData.meetingLink = expert?.availability?.defaultMeetingLink || null;
        } catch (_) {}

        const createdSession = await sessionService.createSession(sessionData, { session });
        
        await session.commitTransaction();

        const dt = formatSessionDateTime(sessionData.startTime, sessionData.endTime);

        await createNotification({
            userId: bookingDetails.expertId,
            type: 'booking_confirmed',
            title: 'New Session Booked!',
            message: `A candidate has booked a session with you using Premium Credit on ${dt.dateStr} at ${dt.timeSlotStr}.`,
            metadata: { sessionId: createdSession.sessionId, link: '/expert/dashboard' }
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
        triggerBookingEmails({
            bookingDetails,
            sessionId: createdSession.sessionId,
            meetingLink: sessionData.meetingLink,
            paymentId: "PREMIUM-CREDIT",
            orderId: "CREDIT-REDEEMED",
            paymentStatus: "Paid via Premium Credit",
            price: 0,
            candidateUserFallback: user
        });

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

        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
            status: 'confirmed',
            duration: bookingDetails.duration || 60,
            level: bookingDetails.level || "Rising Mentor",
            notes: bookingDetails.notes || 'Booked with free promo code',
        };

        try {
            const expert = await ExpertDetails.findOne({ $or: [{ _id: bookingDetails.expertId }, { userId: bookingDetails.expertId }] });
            sessionData.meetingLink = expert?.availability?.defaultMeetingLink || null;
        } catch (_) {}

        const session = await sessionService.createSession(sessionData);

        const dt = formatSessionDateTime(startTime, endTime);

        // Notify Expert
        await createNotification({
            userId: bookingDetails.expertId,
            type: 'booking_confirmed',
            title: 'New Session Booked!',
            message: `A candidate has booked a session with you on ${dt.dateStr} at ${dt.timeSlotStr}.`,
            metadata: { sessionId: session.sessionId, link: '/expert/dashboard' }
        });

        // Notify User
        await createNotification({
            userId: bookingDetails.candidateId,
            type: 'booking_confirmed',
            title: 'Meeting Scheduled Successfully! 🎉',
            message: `Your free mock interview meeting has been scheduled on ${dt.dateStr} at ${dt.timeSlotStr}.`,
            metadata: { sessionId: session.sessionId, link: '/my-sessions' }
        });

        // Directly send email notification to Interview Expert
        triggerBookingEmails({
            bookingDetails,
            sessionId: session.sessionId,
            meetingLink: sessionData.meetingLink,
            paymentId: "FREE-PROMO",
            orderId: "PROMO-APPLIED",
            paymentStatus: "100% Free Promo",
            price: 0,
        });

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
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                isPremium: true,
                freeInterviewsCount: 3,
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
