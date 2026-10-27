import Session from '../models/Session.js';
import User from '../models/User.js';

export const getSessionsForUser = async (userId, role) => {
    const mongoose = (await import('mongoose')).default;
    const Expert = (await import('../models/expertModel.js')).default;

    let query = {};

    if (role === 'expert') {
        // Find the expert profile associated with this user
        const expertDoc = await Expert.findOne({ userId: userId });
        const possibleIds = [userId];
        if (expertDoc) {
            possibleIds.push(expertDoc._id);
        }
        query = { expertId: { $in: possibleIds } };
    } else {
        query = { candidateId: userId };
    }

    // 1. Fetch raw sessions
    const sessions = await Session.find({
        ...query,
        status: { $in: ['upcoming', 'confirmed', 'live', 'completed', 'cancelled'] }
    }).sort({ startTime: -1 }).lean();

    // 2. Enrich
    const enrichedSessions = await Promise.all(sessions.map(async (session) => {
        try {
            let expert = null;
            let candidate = null;
            const lookupId = session.expertId;

            // Fetch Expert Info
            if (mongoose.Types.ObjectId.isValid(lookupId)) {
                const oid = new mongoose.Types.ObjectId(lookupId);
                expert = await Expert.findOne({ userId: oid }).populate('userId');
                if (!expert) expert = await Expert.findById(oid).populate('userId');
                if (!expert) expert = await Expert.findOne({ userId: lookupId.toString() }).populate('userId');
            } else if (typeof lookupId === 'string' && lookupId.includes('@')) {
                const userByEmail = await User.findOne({ email: lookupId.toLowerCase() });
                if (userByEmail) {
                    expert = await Expert.findOne({ userId: userByEmail._id }).populate('userId');
                }
            }

            // Fetch Candidate Info
            if (mongoose.Types.ObjectId.isValid(session.candidateId)) {
                candidate = await User.findById(session.candidateId);
            } else if (typeof session.candidateId === 'string' && session.candidateId.includes('@')) {
                candidate = await User.findOne({ email: session.candidateId.toLowerCase() });
            }

            // Resilient Names
            let expertName = 'Unknown Expert';
            if (expert) {
                expertName = expert.personalInformation?.userName || expert.userId?.name || 'Expert';
            } else {
                // User fallback
                const u = await User.findById(lookupId).catch(() => null);
                if (u) {
                    expertName = u.name;
                } else if (typeof lookupId === 'string' && !mongoose.Types.ObjectId.isValid(lookupId)) {
                    expertName = lookupId;
                } else {
                    expertName = lookupId || 'Unknown Expert'; // Fallback to ID
                }
            }

            const isObjectId = (str) => /^[0-9a-fA-F]{24}$/.test(String(str));
            if (expertName === 'Unknown Expert' || isObjectId(expertName)) {
                expertName = 'Expert';
            }

            const candidateName = candidate?.name || (typeof session.candidateId === 'string' ? session.candidateId : 'Candidate');

            let expertReview = null;
            if (role === 'expert') {
                const ReviewDetails = (await import('../models/reviewModel.js')).default;
                const review = await ReviewDetails.findOne({ sessionId: session.sessionId, reviewerRole: 'expert' });
                if (review) {
                    expertReview = {
                        overallRating: review.overallRating,
                        technicalRating: review.technicalRating,
                        communicationRating: review.communicationRating,
                        problemSolvingRating: review.problemSolvingRating,
                        designRating: review.designRating,
                        behavioralRating: review.behavioralRating,
                        hiringDecision: review.hiringDecision || 'Hire',
                        recommendation: review.recommendation || '',
                        feedback: review.feedback,
                        suggestions: review.suggestions,
                        strengths: review.strengths,
                        weaknesses: review.weaknesses
                    };
                }
            }

            let candidateResume = null;
            if (candidate?._id) {
                try {
                    const Resume = (await import('../models/Resume.js')).default;
                    candidateResume = await Resume.findOne({ userId: candidate._id, isDefault: true }).lean();
                    if (!candidateResume) {
                        candidateResume = await Resume.findOne({ userId: candidate._id }).sort({ updatedAt: -1 }).lean();
                    }
                } catch (resErr) {
                    console.error("Resume lookup failed:", resErr);
                }
            }

            const candidatePhone = candidate?.personalInfo?.phone || "";
            const candidateLocation = [candidate?.personalInfo?.city, candidate?.personalInfo?.state, candidate?.personalInfo?.country].filter(Boolean).join(', ');
            const candidateSkills = [
                ...(candidate?.skills?.technical || []),
                ...(candidate?.skills?.soft || [])
            ];
            const candidateEducation = candidate?.education || [];
            const candidateExperience = candidate?.experience || [];
            const candidateResumeUrl = `/api/sessions/${session.sessionId}/resume`;
            const candidateRawResumeUrl = candidateResume?.fileUrl || null;
            const candidateResumeName = candidateResume?.fileName || (candidateName ? `${candidateName.replace(/\s+/g, '_')}_Resume.pdf` : 'Resume.pdf');

            return {
                ...session,
                expertName,
                candidateName,
                expertReview,
                expertDetails: {
                    name: expertName,
                    role: expert?.professionalDetails?.title || 'Expert',
                    company: expert?.professionalDetails?.company || 'N/A',
                    profileImage: expert?.profileImage || expert?.userId?.profileImage || null
                },
                candidateDetails: candidate ? {
                    name: candidateName,
                    email: candidate.email,
                    phone: candidatePhone,
                    location: candidateLocation,
                    profileImage: candidate.profileImage,
                    skills: candidateSkills,
                    education: candidateEducation,
                    experience: candidateExperience,
                    resumeUrl: candidateResumeUrl,
                    rawResumeUrl: candidateRawResumeUrl,
                    resumeName: candidateResumeName,
                    resumeData: candidateResume || null
                } : null
            };
        } catch (err) {
            console.error(`Error enriching session ${session.sessionId}:`, err);
            return session;
        }
    }));

    return enrichedSessions;
};

export const createRestrictedTestSession = async (expertEmail, candidateEmail, customStartTime, customEndTime) => {
    const expert = await User.findOne({ email: expertEmail });
    if (!expert) throw new Error(`Expert not found: ${expertEmail}`);

    const candidate = await User.findOne({ email: candidateEmail });
    if (!candidate) throw new Error(`Candidate not found: ${candidateEmail}`);

    let nextStart;
    const now = new Date();

    if (customStartTime) {
        if (customStartTime === 'NOW') {
            nextStart = new Date(now.getTime() + 2 * 60 * 1000); // 2 mins
        } else {
            nextStart = new Date(customStartTime);
        }
    } else {
        nextStart = new Date(now);
        nextStart.setUTCHours(10, 0, 0, 0);
        if (nextStart <= now) nextStart.setDate(nextStart.getDate() + 1);
    }

    let endTime;
    if (customEndTime) {
        endTime = new Date(customEndTime);
    } else {
        endTime = new Date(nextStart.getTime() + 60 * 60 * 1000);
    }

    const sessionId = `test-restricted-${expert._id}-${candidate._id}`;
    let session = await Session.findOne({ sessionId });

    if (!session) {
        session = new Session({
            sessionId,
            expertId: expert._id.toString(),
            candidateId: candidate._id.toString(),
            startTime: nextStart,
            endTime: endTime,
            topics: ["Restricted Test", "Strict Auth"],
            status: "confirmed"
        });
        await session.save();
    } else {
        session.startTime = nextStart;
        session.endTime = endTime;
        session.status = "confirmed";
        await session.save();
    }

    return {
        session,
        expertId: expert._id,
        candidateId: candidate._id
    };
};

export const getSessionById = async (sessionId) => {
    return await Session.findOne({ sessionId });
};

export const updateSessionMeetingLink = async (sessionId, meetingLink) => {
    return await Session.findOneAndUpdate(
        { sessionId },
        { $set: { meetingLink: meetingLink || null } },
        { new: true }
    );
};

export const completeSession = async (sessionId) => {
    return await Session.findOneAndUpdate(
        { sessionId },
        { $set: { status: 'completed' } },
        { new: true }
    );
};

export const createSession = async (sessionData) => {
    const session = new Session(sessionData);
    return await session.save();
};

export const getSessionsByExpertId = async (expertId) => {
    if (!expertId) return [];
    let expertIds = [expertId, expertId.toString()];
    try {
        const ExpertDetails = (await import('../models/expertModel.js')).default;
        const User = (await import('../models/User.js')).default;
        const mongoose = (await import('mongoose')).default;

        let expert = null;
        if (mongoose.Types.ObjectId.isValid(expertId)) {
            const oid = new mongoose.Types.ObjectId(expertId);
            expert = await ExpertDetails.findOne({ $or: [{ _id: oid }, { userId: oid }] }).lean();
        } else {
            expert = await ExpertDetails.findOne({
                $or: [
                    { expertID: expertId },
                    { "personalInformation.expertID": expertId },
                    { "personalInformation.userName": expertId }
                ]
            }).lean();
            if (!expert) {
                const user = await User.findOne({
                    $or: [
                        { email: String(expertId).toLowerCase() },
                        { name: expertId }
                    ]
                }).lean();
                if (user) {
                    expert = await ExpertDetails.findOne({ userId: user._id }).lean();
                    expertIds.push(user._id, user._id.toString());
                }
            }
        }

        if (expert) {
            if (expert._id) {
                expertIds.push(expert._id, expert._id.toString());
            }
            if (expert.userId) {
                expertIds.push(expert.userId, expert.userId.toString());
            }
        }
    } catch (err) {
        console.error("Error resolving expert in getSessionsByExpertId:", err);
    }

    const mongoose = (await import('mongoose')).default;
    const queryIds = [];
    for (const id of expertIds) {
        if (id) {
            queryIds.push(id);
            if (mongoose.Types.ObjectId.isValid(id) && typeof id === 'string') {
                try {
                    queryIds.push(new mongoose.Types.ObjectId(id));
                } catch (_) { }
            }
        }
    }

    return await Session.find({
        $or: [
            { expertId: { $in: queryIds } },
            { "expert.id": { $in: queryIds } }
        ],
        status: { $nin: ['cancelled', 'Cancelled', 'CANCELLED'] }
    }).lean();
};

export const getSessionsByCandidateId = async (candidateId) => {
    return await Session.find({ candidateId });
};

export const seedTestSession = async () => {
    // Legacy seeding disabled in favor of dummySeed.js
    console.log("Skipping legacy seedTestSession");
    return [];
};

export const getAllSessions = async () => {
    const Expert = (await import('../models/expertModel.js')).default;
    const User = (await import('../models/User.js')).default;
    const mongoose = (await import('mongoose')).default;

    const sessions = await Session.find().sort({ startTime: -1 }).lean();

    const enrichedSessions = await Promise.all(
        sessions.map(async (session) => {
            let expert = null;
            let candidate = null;
            const lookupId = session.expertId;

            if (mongoose.Types.ObjectId.isValid(lookupId)) {
                const oid = new mongoose.Types.ObjectId(lookupId);
                expert = await Expert.findOne({ userId: oid }).populate('userId');
                if (!expert) expert = await Expert.findById(oid).populate('userId');
                if (!expert) expert = await Expert.findOne({ userId: lookupId.toString() }).populate('userId');
            } else if (typeof lookupId === 'string' && lookupId.includes('@')) {
                const userByEmail = await User.findOne({ email: lookupId.toLowerCase() });
                if (userByEmail) {
                    expert = await Expert.findOne({ userId: userByEmail._id }).populate('userId');
                }
            }

            if (mongoose.Types.ObjectId.isValid(session.candidateId)) {
                candidate = await User.findById(session.candidateId);
            } else if (typeof session.candidateId === 'string' && session.candidateId.includes('@')) {
                candidate = await User.findOne({ email: session.candidateId.toLowerCase() });
            }

            let expertName = 'Unknown Expert';
            if (expert) {
                expertName = expert.personalInformation?.userName || expert.userId?.name || 'Expert';
            } else {
                const u = await User.findById(lookupId).catch(() => null);
                if (u) {
                    expertName = u.name;
                } else if (typeof lookupId === 'string' && !mongoose.Types.ObjectId.isValid(lookupId)) {
                    expertName = lookupId;
                } else {
                    expertName = lookupId || 'Unknown Expert';
                }
            }

            const isObjectId = (str) => /^[0-9a-fA-F]{24}$/.test(String(str));
            if (expertName === 'Unknown Expert' || isObjectId(expertName)) {
                expertName = 'Expert';
            }

            const candidateName = candidate?.name || (typeof session.candidateId === 'string' ? session.candidateId : 'Candidate');

            const candidateDetails = candidate ? {
                name: candidate.name,
                email: candidate.email,
                profileImage: candidate.profileImage,
                phone: candidate.phone
            } : null;

            return {
                ...session,
                expertName,
                candidateName,
                candidateDetails,
                topic: session.topics?.[0] || "General Consultation",
                status: session.status,
                amount: session.price,
                date: session.startTime,
                duration: session.duration || "N/A"
            };
        })
    );

    return enrichedSessions;
};
