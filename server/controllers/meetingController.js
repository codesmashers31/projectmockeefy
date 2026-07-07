import * as meetingService from '../services/meetingService.js';
import * as timeCheck from '../utils/timeCheck.js';
import * as authUtils from '../utils/authorization.js';

export const joinMeeting = async (req, res) => {
    try {
        const { sessionId } = req.body;
        const userId = req.user.userId;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: Access token required" });
        }

        // 1. Get or Create Meeting
        const meeting = await meetingService.getOrCreateMeeting(sessionId);

        // 2. Authorization Check (Await the async check)
        const authorized = await authUtils.canJoinMeeting(meeting, userId);
        if (!authorized) {
            return res.status(403).json({ message: "You are not authorized to join this meeting." });
        }

        // 3. Time Check
        // If finished, block
        if (meeting.status === 'finished') {
            return res.status(400).json({ message: "Meeting has finished." });
        }

        // Check time constraints (optional strictness: allow join 5 min early?)
        // Requirement (4): Current time < session.endTime. 
        // We'll allow joining slightly early if needed, but strictly enforce end time logic for creation?
        // Actually Req (4) says "Disabled until time >= start && time < end".
        // But if persistent, and time is active, we allow.

        if (timeCheck.hasSessionEnded(meeting.endTime) && meeting.status !== 'live') {
            return res.status(400).json({ message: "Session time has expired." });
        }

        // 4. Update Active Users
        await meetingService.addUserToMeeting(meeting.meetingId, userId);

        res.status(200).json({
            success: true,
            meetingId: meeting.meetingId,
            status: meeting.status
        });

    } catch (error) {
        console.error("Join Error", error);
        res.status(500).json({ message: error.message });
    }
};

export const endMeeting = async (req, res) => {
    try {
        const { meetingId } = req.body;
        const userId = req.user.userId;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: Access token required" });
        }

        const meeting = await meetingService.getMeeting(meetingId);
        if (!meeting) return res.status(404).json({ message: "Meeting not found" });

        // Only Expert (Host) can end
        const Expert = (await import('../models/expertModel.js')).default;
        const expertDoc = await Expert.findOne({ userId: userId });
        
        const isExpert = String(meeting.expertId) === String(userId) || 
                         (expertDoc && (String(expertDoc._id) === String(meeting.expertId) || String(expertDoc.userId) === String(meeting.expertId)));

        if (!isExpert) {
            return res.status(403).json({ message: "Only the expert can end the meeting." });
        }

        const updated = await meetingService.updateMeetingStatus(meetingId, 'finished');
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ICE servers: STUN (always) + optional self-hosted TURN (Coturn only – no 3rd party)
function buildIceServers() {
    const servers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
    ];

    const turnHost = process.env.TURN_HOST || process.env.COTURN_HOST;
    const turnPort = process.env.TURN_PORT || process.env.COTURN_PORT || '3478';
    const turnUser = process.env.TURN_USERNAME || process.env.COTURN_USERNAME;
    const turnCred = process.env.TURN_CREDENTIAL || process.env.COTURN_CREDENTIAL;

    if (turnHost && turnUser && turnCred) {
        const hostPort = `${turnHost}${turnPort ? ':' + turnPort : ''}`;
        servers.push({
            urls: [`turn:${hostPort}?transport=udp`, `turn:${hostPort}?transport=tcp`],
            username: turnUser,
            credential: turnCred,
        });
        console.log("[TURN] Self-hosted TURN at", hostPort, "- required for mobile / different network");
    } else {
        console.warn("[TURN] Not configured. Set TURN_HOST, TURN_USERNAME, TURN_CREDENTIAL on Render for calls from mobile or different WiFi.");
    }

    return servers;
}

export const getTurnCredentials = async (req, res) => {
    try {
        res.json(buildIceServers());
    } catch (error) {
        console.error("Error building ICE servers:", error);
        res.json([
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
        ]);
    }
};
