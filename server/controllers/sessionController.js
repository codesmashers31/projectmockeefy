import * as sessionService from '../services/sessionService.js';
import Session from '../models/Session.js';
import * as meetingService from '../services/meetingService.js';
import PricingRule from '../models/PricingRule.js';
import ExpertDetails from '../models/expertModel.js';
import { v4 as uuidv4 } from 'uuid';
import { triggerBookingEmails } from './paymentController.js';
import { syncDataChange } from '../services/socketService.js';

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

export const completeSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await sessionService.getSessionById(sessionId);
        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        // Authorization check: Only the session's expert or admin can mark session completed
        const expertProfile = await ExpertDetails.findOne({ $or: [{ _id: session.expertId }, { userId: session.expertId }] });
        const isAuthorized = req.user.userType === 'admin' ||
            String(session.expertId) === String(req.user.userId) ||
            (expertProfile && String(expertProfile.userId) === String(req.user.userId));

        if (!isAuthorized) {
            return res.status(403).json({ message: "Forbidden: Access denied" });
        }

        await sessionService.completeSession(sessionId);
        try {
            await meetingService.updateMeetingStatus(sessionId, 'finished');
        } catch (_) { /* meeting may not exist */ }

        // Snapshot candidate identity on session and check master certificate issuance
        try {
            const User = (await import('../models/User.js')).default;
            const SessionModel = (await import('../models/Session.js')).default;
            const candidateUser = await User.findById(session.candidateId);
            if (candidateUser) {
                const isConfirmed = Boolean(
                    candidateUser.certificateIdentityConfirmation?.confirmedName &&
                    candidateUser.certificateIdentityConfirmation.confirmedName.trim().toLowerCase() === candidateUser.name.trim().toLowerCase()
                );
                const snapshotName = isConfirmed
                    ? candidateUser.certificateIdentityConfirmation.confirmedName.trim()
                    : null;

                await SessionModel.findOneAndUpdate(
                    { sessionId: session.sessionId },
                    {
                        $set: {
                            candidateNameSnapshot: snapshotName,
                            identityConfirmedAt: candidateUser.certificateIdentityConfirmation?.confirmedAt || new Date(),
                            certificateIssued: true,
                            certificateId: `MCFY-${(session._id || session.sessionId).toString().slice(-8).toUpperCase()}`
                        }
                    }
                );

                // Auto-provision master credential if >= 3 completed sessions
                const completedCount = await SessionModel.countDocuments({
                    candidateId: candidateUser._id,
                    status: 'completed'
                });

                if (completedCount >= 3) {
                    const { ensureMasterCertification } = await import('./certificationController.js');
                    await ensureMasterCertification(candidateUser._id, candidateUser);
                }
            }
        } catch (snapErr) {
            console.error("[completeSession] Error recording candidate identity snapshot:", snapErr);
        }

        const SessionModel = (await import('../models/Session.js')).default;
        const updatedCompletedSession = await SessionModel.findOne({ sessionId: session.sessionId }).lean();
        const payloadData = updatedCompletedSession || { sessionId: session.sessionId, _id: session._id, status: 'completed' };

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

        return res.json({ success: true, message: "Session completed", data: payloadData });
    } catch (error) {
        console.error("Complete session error:", error);
        return res.status(500).json({ message: error.message });
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

        // Import Expert, User and mongoose
        const Expert = (await import('../models/expertModel.js')).default;
        const User = (await import('../models/User.js')).default;
        const mongoose = (await import('mongoose')).default;

        const candidateUser = await User.findById(candidateId).lean();

        // Enrichment
        const enrichedSessions = await Promise.all(
            sessions.map(async (session) => {
                let expert = null;
                const lookupId = session.expertId;

                try {
                    // Logic: expertId could be a User ObjectId, an ExpertDetails ObjectId, or an Email
                    if (mongoose.Types.ObjectId.isValid(lookupId)) {
                        const oid = new mongoose.Types.ObjectId(lookupId);

                        // 1. Try finding ExpertDetails by userId
                        expert = await Expert.findOne({ userId: oid }).populate('userId');

                        // 2. Try finding ExpertDetails by its own _id
                        if (!expert) {
                            expert = await Expert.findById(oid).populate('userId');
                        }
                    }

                    // 3. Email fallback
                    if (!expert && typeof lookupId === 'string' && lookupId.includes('@')) {
                        const userByEmail = await User.findOne({ email: lookupId.toLowerCase() });
                        if (userByEmail) {
                            expert = await Expert.findOne({ userId: userByEmail._id }).populate('userId');
                        }
                    }
                } catch (lookupErr) {
                    console.error(`[SessionController] Expert lookup error for ${lookupId}:`, lookupErr);
                }

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
                    // Failover: Try to find the USER directly if Expert doc is missing
                    try {
                        let userFallback = null;
                        if (mongoose.Types.ObjectId.isValid(lookupId)) {
                            userFallback = await User.findById(lookupId);
                            if (!userFallback) {
                                // One last aggressive try: check if it's stored as string _id
                                userFallback = await User.findOne({ _id: lookupId.toString() });
                            }
                        } else if (typeof lookupId === 'string' && lookupId.includes('@')) {
                            userFallback = await User.findOne({ email: lookupId.toLowerCase() });
                        }

                        if (userFallback) {
                            expertName = userFallback.name || expertName;
                            expertImage = userFallback.profileImage || null;
                        } else {
                            // If it's a non-ID string (email/name), use it. 
                            // If it's an ID we can't find, it'll still be "Unknown Expert" -> we will fix that below.
                            if (lookupId && !mongoose.Types.ObjectId.isValid(lookupId)) {
                                expertName = lookupId;
                            }
                        }
                    } catch (e) { }
                }

                // ULTIMATE FALLBACK: If we still have "Unknown Expert" or a raw ObjectId,
                // fall back to a user-friendly name "Expert".
                const isObjectId = (str) => /^[0-9a-fA-F]{24}$/.test(String(str));
                if (expertName === 'Unknown Expert' || isObjectId(expertName)) {
                    expertName = 'Expert';
                }

                // Match Review - Expert's review (marks/feedback for candidate) and Candidate's review
                const ReviewDetails = (await import('../models/reviewModel.js')).default;
                const [expertReview, candidateReview] = await Promise.all([
                    ReviewDetails.findOne({ sessionId: session.sessionId, reviewerRole: 'expert' }),
                    ReviewDetails.findOne({ sessionId: session.sessionId, reviewerRole: 'candidate' })
                ]);

                const isCompleted = (session.status || '').toLowerCase() === 'completed';
                const candidateSnapshot = session.candidateNameSnapshot || 
                    candidateUser?.certificateIdentityConfirmation?.confirmedName || 
                    candidateUser?.name || 
                    'Candidate';

                // Asynchronously backfill legacy completed sessions without snapshot
                if (isCompleted && !session.candidateNameSnapshot) {
                    const SessionModel = (await import('../models/Session.js')).default;
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
                        overallRating: expertReview.overallRating,
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
            })
        );

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

        // Convert session IDs to strings for comparison
        const sExpert = session.expertId?.toString() || "";
        const sCandidate = session.candidateId?.toString() || "";
        const uId = userId.toString();

        // Check 1: Direct ID Match
        if (sExpert === uId || sCandidate === uId) {
            isParticipant = true;
        }

        // Check 2: Expert Profile Match (if user is expert but session has ExpertDoc ID)
        if (!isParticipant) {
            const expertDoc = await Expert.findOne({ userId: userId });
            if (expertDoc && (expertDoc._id.toString() === sExpert || expertDoc.userId.toString() === sExpert)) {
                isParticipant = true;
            }
        }

        // Check 3: Email Fallback (Legacy/Dev)
        if (!isParticipant) {
            const user = await User.findById(userId);
            if (user && user.email) {
                const uEmail = user.email.toLowerCase();
                if (sExpert.toLowerCase() === uEmail || sCandidate.toLowerCase() === uEmail) {
                    isParticipant = true;
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

        res.json({
            permitted: true,
            meetingId: session.sessionId, // Using sessionId as meetingId
            role: (sExpert === uId || (isParticipant && sExpert.includes('@'))) ? 'expert' : 'candidate'
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

        // Auto-calculate overallRating if missing but sub-ratings are present (e.g. expert evaluations)
        let computedOverall = overallRating;
        if (!computedOverall && (problemSolvingRating || designRating || behavioralRating || technicalRating || communicationRating)) {
            const ratings = [problemSolvingRating, designRating, behavioralRating, technicalRating, communicationRating]
                .filter(r => r !== undefined && r !== null && Number(r) > 0)
                .map(Number);
            if (ratings.length > 0) {
                computedOverall = Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length);
            }
        }

        const ratingNum = Number(computedOverall);
        if (!sessionId || !ratingNum || ratingNum < 1 || ratingNum > 5 || !Number.isInteger(ratingNum)) {
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
                    let payoutAmount = Number(session.price || 0) * 0.8;
                    if (payoutAmount <= 0) {
                        payoutAmount = Number(session.payoutAmount || 0) || 500;
                    }
                    // Minimum ₹1 payout for nominal bookings, rounded cleanly to 2 decimal places
                    payoutAmount = Math.max(1, Math.round(payoutAmount * 100) / 100);

                    if (session.payoutCredited) {
                        walletCreditResult = {
                            credited: false,
                            amount: Number(session.payoutAmount || payoutAmount),
                            alreadyCredited: true,
                            reason: 'Already credited'
                        };
                    } else {
                        const rawExpertId = session.expertId || expertId;
                        if (rawExpertId) {
                            if (typeof rawExpertId === 'string' && rawExpertId.includes('@')) {
                                expertUser = await User.findOne({ email: rawExpertId.toLowerCase() });
                            } else {
                                expertUser = await User.findById(rawExpertId).catch(() => null);
                                if (!expertUser) {
                                    const ExpertDetails = (await import('../models/expertModel.js')).default;
                                    const expertProfile = await ExpertDetails.findById(rawExpertId).catch(() => null);
                                    if (expertProfile && expertProfile.userId) {
                                        expertUser = await User.findById(expertProfile.userId).catch(() => null);
                                    }
                                }
                            }
                        }

                        if (!expertUser && req.user?.userId) {
                            expertUser = await User.findById(req.user.userId).catch(() => null);
                        }

                        if (!expertUser) {
                            walletCreditResult = { credited: false, amount: 0, reason: 'Expert user not found' };
                        } else {
                            const Wallet = (await import("../models/Wallet.js")).default;
                            const WalletTransaction = (await import("../models/WalletTransaction.js")).default;
                            const mongoose = (await import('mongoose')).default;

                            // 1. Double-check if a ledger transaction already exists for this session
                            const existingTxn = await WalletTransaction.findOne({
                                referenceId: session._id,
                                referenceModel: 'Session',
                                type: 'CREDIT'
                            });

                            if (existingTxn) {
                                await Session.updateOne(
                                    { _id: session._id, payoutCredited: { $ne: true } },
                                    { $set: { payoutCredited: true, payoutAmount: existingTxn.amount, payoutCreditedAt: existingTxn.createdAt, status: 'completed' } }
                                );
                                session.payoutCredited = true;
                                session.payoutAmount = existingTxn.amount;
                                walletCreditResult = { credited: false, amount: existingTxn.amount, alreadyCredited: true };
                            } else {
                                // 2. Determine multi-document transaction capability
                                let sessionTxn = null;
                                let useMongooseTxn = false;
                                try {
                                    sessionTxn = await mongoose.startSession();
                                    sessionTxn.startTransaction();
                                    useMongooseTxn = true;
                                } catch (startErr) {
                                    console.warn("MongoDB transactions not supported or startSession failed:", startErr.message);
                                    sessionTxn = null;
                                    useMongooseTxn = false;
                                }

                                // Strict transaction safety: if transactions are unavailable, fail safely without issuing payout
                                if (!useMongooseTxn || !sessionTxn) {
                                    walletCreditResult = {
                                        credited: false,
                                        amount: 0,
                                        alreadyCredited: false,
                                        reason: 'MongoDB multi-document transactions unavailable. Payout deferred safely.',
                                        retryable: true
                                    };
                                } else {
                                    const claimFilter = {
                                        _id: session._id,
                                        $or: [
                                            { payoutCredited: false },
                                            { payoutCredited: { $exists: false } },
                                            { payoutCredited: null }
                                        ]
                                    };
                                    const claimUpdate = {
                                        $set: {
                                            payoutCredited: true,
                                            payoutCreditedAt: new Date(),
                                            payoutAmount: payoutAmount,
                                            status: 'completed'
                                        }
                                    };

                                    try {
                                        // Atomic claim: locks the payout so concurrent requests fail here
                                        const claimedSession = await Session.findOneAndUpdate(
                                            claimFilter,
                                            claimUpdate,
                                            { new: true, session: sessionTxn }
                                        );

                                        if (!claimedSession) {
                                            // Concurrently claimed by another thread or already credited
                                            await sessionTxn.abortTransaction();
                                            walletCreditResult = { credited: false, amount: payoutAmount, alreadyCredited: true, reason: 'Already credited' };
                                        } else {
                                            // Update Wallet
                                            let wallet = await Wallet.findOne(
                                                { userId: expertUser._id },
                                                null,
                                                { session: sessionTxn }
                                            );
                                            if (!wallet) {
                                                wallet = new Wallet({
                                                    userId: expertUser._id,
                                                    availableBalance: 0
                                                });
                                            }
                                            wallet.availableBalance = Math.round((Number(wallet.availableBalance || 0) + payoutAmount) * 100) / 100;
                                            await wallet.save({ session: sessionTxn });

                                            // Update User balance inside transaction
                                            const userDoc = await User.findById(expertUser._id, null, { session: sessionTxn });
                                            if (userDoc) {
                                                userDoc.walletBalance = Math.round((Number(userDoc.walletBalance || 0) + payoutAmount) * 100) / 100;
                                                await userDoc.save({ session: sessionTxn });
                                                expertUser.walletBalance = userDoc.walletBalance;
                                            }

                                            // Record Ledger Transaction
                                            const txnData = {
                                                walletId: wallet._id,
                                                userId: expertUser._id,
                                                type: 'CREDIT',
                                                amount: payoutAmount,
                                                referenceId: session._id,
                                                referenceModel: 'Session',
                                                status: 'COMPLETED',
                                                description: `Payout for completed session ${session.sessionId}`,
                                                balanceAfter: wallet.availableBalance
                                            };

                                            await WalletTransaction.create([txnData], { session: sessionTxn });
                                            await sessionTxn.commitTransaction();

                                            session.payoutCredited = true;
                                            session.payoutCreditedAt = claimUpdate.$set.payoutCreditedAt;
                                            session.payoutAmount = payoutAmount;
                                            session.status = 'completed';

                                            walletCreditResult = { credited: true, amount: payoutAmount, alreadyCredited: false };

                                            const { createNotification } = await import('../controllers/notificationController.js');
                                            await createNotification({
                                                userId: expertUser._id,
                                                type: 'wallet_credit',
                                                title: 'Session payout credited',
                                                message: `₹${payoutAmount} has been credited to your wallet for session ${session.sessionId}.`,
                                                metadata: {
                                                    sessionId: session.sessionId,
                                                    amount: payoutAmount,
                                                    link: '/dashboard/sessions'
                                                }
                                            }).catch(err => console.error("Notification dispatch error:", err));
                                        }
                                    } catch (payoutErr) {
                                        if (sessionTxn) {
                                            await sessionTxn.abortTransaction().catch(() => {});
                                        }

                                        // Concurrency conflict handler: write conflicts, transient transaction errors, duplicate keys
                                        const isConflict = payoutErr.code === 11000 ||
                                                           payoutErr.code === 112 ||
                                                           payoutErr.codeName === 'WriteConflict' ||
                                                           (payoutErr.errorLabels && payoutErr.errorLabels.includes('TransientTransactionError'));

                                        if (isConflict) {
                                            // Poll briefly for the concurrent winning transaction to finalize
                                            let existingTxn = null;
                                            let currentSession = null;
                                            for (let attempt = 0; attempt < 10; attempt++) {
                                                await new Promise(r => setTimeout(r, 150));
                                                existingTxn = await WalletTransaction.findOne({
                                                    referenceId: session._id,
                                                    referenceModel: 'Session',
                                                    type: 'CREDIT'
                                                });
                                                if (existingTxn) break;
                                                currentSession = await Session.findById(session._id);
                                                if (currentSession?.payoutCredited) break;
                                            }

                                            if (existingTxn || currentSession?.payoutCredited) {
                                                const resolvedAmount = existingTxn?.amount || currentSession?.payoutAmount || payoutAmount;
                                                session.payoutCredited = true;
                                                session.payoutAmount = resolvedAmount;
                                                walletCreditResult = { credited: false, amount: resolvedAmount, alreadyCredited: true, reason: 'Already credited' };
                                            } else {
                                                throw payoutErr;
                                            }
                                        } else if (payoutErr.message && payoutErr.message.includes('Transaction numbers are only allowed')) {
                                            // If MongoDB throws transaction numbers not allowed (standalone deployment)
                                            walletCreditResult = {
                                                credited: false,
                                                amount: 0,
                                                alreadyCredited: false,
                                                reason: 'MongoDB multi-document transactions unavailable. Payout deferred safely.',
                                                retryable: true
                                            };
                                        } else {
                                            throw payoutErr;
                                        }
                                    } finally {
                                        if (sessionTxn) {
                                            await sessionTxn.endSession().catch(() => {});
                                        }
                                    }
                                }
                            }
                        }
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
        const { createNotification } = await import('./notificationController.js');

        const session = await Session.findOne({ sessionId });
        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }

        // Authorization check: Only candidate or admin can request feedback
        if (req.user.userType !== 'admin' && String(session.candidateId) !== String(req.user.userId)) {
            return res.status(403).json({ success: false, message: "Forbidden: Access denied" });
        }

        if (session.feedbackRequested) {
            return res.status(400).json({ success: false, message: "Feedback already requested for this session" });
        }

        session.feedbackRequested = true;
        await session.save();

        // Get candidate name
        const candidate = await User.findById(session.candidateId);
        const candidateName = candidate?.name || "A candidate";

        // Create notification for expert
        await createNotification({
            userId: session.expertId,
            type: 'feedback_request',
            title: 'Feedback Requested',
            message: `${candidateName} has requested feedback/review for your completed session on ${session.startTime ? new Date(session.startTime).toLocaleDateString() : ""}.`,
            metadata: {
                sessionId: session.sessionId
            }
        });

        res.json({ success: true, message: "Feedback request sent to the expert dashboard successfully" });
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
