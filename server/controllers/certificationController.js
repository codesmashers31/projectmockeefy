import Certification from '../models/Certification.js';
import Session from '../models/Session.js';
import User from '../models/User.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Helper to ensure a user has their Master Certificate record provisioned
 * ONLY IF they have completed >= 3 sessions AND have valid identity confirmation.
 */
export const ensureMasterCertification = async (userId, userDoc = null) => {
    try {
        const user = userDoc || await User.findById(userId);
        if (!user) return null;

        const completedSessions = await Session.find({
            candidateId: user._id,
            status: 'completed'
        }).sort({ startTime: -1 });

        if (completedSessions.length < 3) return null;

        const masterCertId = `MCFY-MST-${user._id.toString().slice(-6).toUpperCase()}-${new Date().getFullYear()}`;

        let cert = await Certification.findOne({
            userId: user._id,
            $or: [
                { name: 'Mockeefy Master Interview Excellence Credential' },
                { certificateId: masterCertId }
            ]
        });

        if (!cert) {
            // Check legacy completion cert
            cert = await Certification.findOne({
                userId: user._id,
                name: 'Mock Interview Completion'
            });
        }

        // If certificate already exists, return it (and backfill legacy snapshot if missing)
        if (cert) {
            if (!cert.candidateNameSnapshot) {
                const snapshotName = user.certificateIdentityConfirmation?.confirmedName ||
                    user.name ||
                    'Candidate';
                cert.candidateNameSnapshot = snapshotName;
                await cert.save();
            }
            return cert;
        }

        // CRITICAL SECURITY ENFORCEMENT:
        // A NEW certificate MUST NOT be provisioned without valid identity confirmation
        // for the current milestone cycle!
        const currentCycle = Math.floor(completedSessions.length / 3);
        const confirmation = user.certificateIdentityConfirmation;
        const hasValidConfirmation = Boolean(
            confirmation &&
            confirmation.confirmedName &&
            confirmation.confirmedName.trim().toLowerCase() === user.name.trim().toLowerCase() &&
            (confirmation.confirmedForCycle || 0) >= currentCycle
        );

        if (!hasValidConfirmation) {
            // Confirmation is pending or stale! Cannot issue certificate.
            return null;
        }

        const snapshotName = confirmation.confirmedName.trim();

        try {
            cert = await Certification.create({
                userId: user._id,
                name: 'Mockeefy Master Interview Excellence Credential',
                certificateId: masterCertId,
                candidateNameSnapshot: snapshotName,
                identityConfirmedAt: confirmation.confirmedAt || new Date(),
                identityConfirmationReference: confirmation.confirmationReference || `REF-INIT-${Date.now()}`,
                certificateStatus: 'ISSUED',
                qualifyingSessionIds: completedSessions.slice(0, 3).map(s => s.sessionId),
                issueDate: new Date(),
                type: 'master',
                metadata: {
                    sessionCount: completedSessions.length,
                    cycle: currentCycle
                }
            });
            return cert;
        } catch (createErr) {
            // Concurrency protection: If concurrent request created the cert, return the existing one
            if (createErr.code === 11000) {
                return await Certification.findOne({ certificateId: masterCertId });
            }
            throw createErr;
        }
    } catch (err) {
        console.error("[ensureMasterCertification] Error:", err);
        return null;
    }
};

/**
 * GET /api/certifications/status/:userId
 * Returns total completed sessions, target sessions, eligibility, and list of issued certifications with snapshots.
 * Enforces ownership validation: user can only view their own certificates (unless admin).
 */
export const getCertificationStatus = async (req, res) => {
    try {
        const { userId } = req.params;

        // Authorization check
        if (req.user && req.user.userType !== 'admin' && String(req.user.userId) !== String(userId)) {
            return res.status(403).json({ success: false, message: "Forbidden: Access denied to another candidate's certificates" });
        }

        // 1. Calculate Progress (Completed Sessions)
        const completedSessionsCount = await Session.countDocuments({
            candidateId: userId,
            status: 'completed'
        });

        const user = await User.findById(userId);

        // Auto-provision master credential ONLY if confirmed and eligible
        if (completedSessionsCount >= 3 && user) {
            await ensureMasterCertification(userId, user);
        }

        // 2. Fetch Issued Certifications
        const certifications = await Certification.find({ userId }).sort({ issueDate: -1 }).lean();

        // 3. Determine Eligibility for next milestone
        const isEligible = completedSessionsCount >= 3;

        res.json({
            success: true,
            data: {
                completedSessions: completedSessionsCount,
                targetSessions: 3,
                isEligibleForCertificate: isEligible,
                certifications,
                nextMilestone: completedSessionsCount >= 3 ? "Advanced Master Credential" : "Mock Interview Completion"
            }
        });

    } catch (error) {
        console.error("Get Certification Status Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/certifications/verification-status
 * Protected route to check if the candidate needs to confirm their identity
 * before their 3rd qualifying interview.
 */
export const getVerificationStatus = async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const completedCount = await Session.countDocuments({
            candidateId: userId,
            status: 'completed'
        });

        const currentCycle = Math.floor(completedCount / 3) + 1;

        // User is approaching eligible if completedCount % 3 === 2 (approaching 3rd interview)
        // OR completedCount >= 3 and hasn't confirmed for this milestone yet.
        const isApproachingEligible = (completedCount % 3 === 2) || (completedCount >= 3);

        const confirmation = user.certificateIdentityConfirmation;
        const hasConfirmed = Boolean(
            confirmation &&
            confirmation.confirmedName &&
            confirmation.confirmedName.trim().toLowerCase() === user.name.trim().toLowerCase() &&
            (confirmation.confirmedForCycle || 0) >= currentCycle
        );

        const confirmationRequired = isApproachingEligible && !hasConfirmed;

        return res.json({
            success: true,
            data: {
                completedCount,
                currentCycle,
                isApproachingEligible,
                confirmationRequired,
                hasConfirmed,
                confirmedName: confirmation?.confirmedName || null,
                confirmedAt: confirmation?.confirmedAt || null,
                confirmationReference: confirmation?.confirmationReference || null,
                profileName: user.name
            }
        });
    } catch (error) {
        console.error("Get Verification Status Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/certifications/confirm-identity
 * Protected route for the candidate to confirm their certificate name
 * before proceeding with the 3rd qualifying interview.
 */
export const confirmIdentity = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { acknowledged, confirmedName } = req.body;

        if (!acknowledged) {
            return res.status(400).json({
                success: false,
                message: "You must explicitly confirm that this is your correct name for your certificate."
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Security Validation (Section 4):
        // If client passes confirmedName, it MUST match the user's actual profile name in the DB.
        // The client cannot submit an arbitrary candidate name to overwrite a certificate.
        if (confirmedName && typeof confirmedName === 'string') {
            if (confirmedName.trim().toLowerCase() !== user.name.trim().toLowerCase()) {
                return res.status(400).json({
                    success: false,
                    message: "Confirmed name does not match current profile name. Please update your profile first."
                });
            }
        }

        const completedCount = await Session.countDocuments({
            candidateId: userId,
            status: 'completed'
        });

        const currentCycle = Math.floor(completedCount / 3) + 1;
        const confirmationRef = `MCFY-IDCONF-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`;

        user.certificateIdentityConfirmation = {
            confirmedName: user.name.trim(),
            confirmedAt: new Date(),
            confirmedForCycle: currentCycle,
            confirmationReference: confirmationRef,
            ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
            userAgent: req.headers['user-agent'] || null
        };

        await user.save();

        // Stamp any completed sessions without snapshot
        await Session.updateMany(
            { candidateId: user._id, status: 'completed', candidateNameSnapshot: null },
            { $set: { candidateNameSnapshot: user.name.trim(), identityConfirmedAt: new Date() } }
        );

        // If user already has >= 3 completed sessions, ensure Master Certification is provisioned with confirmed identity
        if (completedCount >= 3) {
            await ensureMasterCertification(userId, user);
        }

        return res.json({
            success: true,
            message: "Certificate identity successfully confirmed.",
            data: {
                confirmedName: user.name.trim(),
                confirmedAt: user.certificateIdentityConfirmation.confirmedAt,
                confirmationReference: confirmationRef
            }
        });
    } catch (error) {
        console.error("Confirm Identity Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/certifications/issue
 * Protected route to issue a certificate.
 */
export const issueCertificate = async (req, res) => {
    try {
        const userId = req.body.userId || req.user.userId;

        // Security check: only own certificate or admin
        if (req.user.userType !== 'admin' && String(req.user.userId) !== String(userId)) {
            return res.status(403).json({ success: false, message: "Forbidden: Cannot issue certificate for another user" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Re-verify eligibility server-side
        const completedSessions = await Session.find({
            candidateId: userId,
            status: 'completed'
        }).sort({ startTime: -1 });

        if (completedSessions.length < 3) {
            return res.status(400).json({ success: false, message: "Not eligible yet. Complete 3 sessions." });
        }

        const masterCertId = `MCFY-MST-${user._id.toString().slice(-6).toUpperCase()}-${new Date().getFullYear()}`;

        // Check if already exists (Prevent duplicate issuance)
        const existing = await Certification.findOne({
            userId,
            $or: [
                { name: 'Mockeefy Master Interview Excellence Credential' },
                { certificateId: masterCertId }
            ]
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Certificate already issued.",
                data: existing
            });
        }

        // Security check: verify valid identity confirmation before manual issuance
        const currentCycle = Math.floor(completedSessions.length / 3);
        const confirmation = user.certificateIdentityConfirmation;
        const hasValidConfirmation = Boolean(
            confirmation &&
            confirmation.confirmedName &&
            confirmation.confirmedName.trim().toLowerCase() === user.name.trim().toLowerCase() &&
            (confirmation.confirmedForCycle || 0) >= currentCycle
        );

        if (!hasValidConfirmation) {
            return res.status(400).json({
                success: false,
                message: "Identity confirmation required before certificate issuance."
            });
        }

        // Use confirmed candidate identity snapshot
        const snapshotName = confirmation.confirmedName.trim();

        // Issue
        try {
            const newCert = new Certification({
                userId,
                name: 'Mockeefy Master Interview Excellence Credential',
                certificateId: masterCertId,
                candidateNameSnapshot: snapshotName,
                identityConfirmedAt: confirmation.confirmedAt || new Date(),
                identityConfirmationReference: confirmation.confirmationReference || `REF-ISSUE-${Date.now()}`,
                certificateStatus: 'ISSUED',
                qualifyingSessionIds: completedSessions.slice(0, 3).map(s => s.sessionId),
                issueDate: new Date(),
                type: 'master',
                metadata: {
                    sessionCount: completedSessions.length,
                    cycle: currentCycle
                }
            });

            await newCert.save();
            return res.status(201).json({ success: true, message: "Certificate issued!", data: newCert });
        } catch (saveErr) {
            if (saveErr.code === 11000) {
                const dupCert = await Certification.findOne({ certificateId: masterCertId });
                return res.status(400).json({ success: false, message: "Certificate already issued.", data: dupCert });
            }
            throw saveErr;
        }

    } catch (error) {
        console.error("Issue Certificate Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/certifications/master/:userId
 * Returns the Master Credential record containing the permanent candidateNameSnapshot.
 * Enforces ownership validation: user can only view their own certificate (unless admin).
 */
export const getMasterCertificate = async (req, res) => {
    try {
        const { userId } = req.params;

        // Authorization check
        if (req.user && req.user.userType !== 'admin' && String(req.user.userId) !== String(userId)) {
            return res.status(403).json({ success: false, message: "Forbidden: Access denied to another candidate's certificates" });
        }

        const cert = await ensureMasterCertification(userId);

        if (!cert) {
            return res.status(404).json({ success: false, message: "Master certificate not unlocked yet or awaiting identity confirmation" });
        }

        res.json({
            success: true,
            data: cert
        });
    } catch (error) {
        console.error("Get Master Certificate Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
