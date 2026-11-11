import Certification from '../models/Certification.js';
import Session from '../models/Session.js';
import User from '../models/User.js';
import ReviewDetails from '../models/reviewModel.js';
import Report from '../models/Report.js';
import Meeting from '../models/Meeting.js';
import Category from '../models/Category.js';
import ExpertDetails from '../models/expertModel.js';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * Authoritative helper to retrieve genuinely completed, attended, and evaluated sessions for a candidate.
 * Strictly excludes:
 * - Sessions with no-show status ('CANDIDATE_NO_SHOW' or 'no-show')
 * - Cancelled, pending, or unconfirmed sessions
 * - Sessions that ended without an expert evaluation (ReviewDetails or Report)
 * - Duplicate session IDs (ensures each session counts at most once)
 * Guarantees categoryId and categoryNameSnapshot are populated on every session.
 * Sorted chronologically ascending by startTime (oldest first so milestones consume interviews in sequence).
 */
export const getEligibleCompletedSessions = async (userId) => {
    try {
        const candidateOid = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;

        // Fetch candidate sessions that have completed or evaluated status
        const candidateSessions = await Session.find({
            candidateId: candidateOid,
            status: { $in: ['completed', 'evaluated'] }
        }).sort({ startTime: 1 });

        if (!candidateSessions || candidateSessions.length === 0) {
            return [];
        }

        const sessionIds = candidateSessions.map(s => s.sessionId);
        const mongoIds = candidateSessions.map(s => s._id);

        const [expertReviews, candidateReviews, submittedReports, meetingRecords] = await Promise.all([
            ReviewDetails.find({
                sessionId: { $in: sessionIds },
                reviewerRole: 'expert'
            }).select('sessionId').lean(),
            ReviewDetails.find({
                sessionId: { $in: sessionIds },
                reviewerRole: 'candidate'
            }).select('sessionId').lean(),
            Report.find({
                sessionId: { $in: mongoIds },
                status: 'Submitted'
            }).select('sessionId').lean(),
            Meeting.find({
                sessionId: { $in: sessionIds }
            }).select('sessionId candidateId expertId status activeUsers').lean()
        ]);

        const reviewedSessionIds = new Set(expertReviews.map(r => r.sessionId));
        const candidateReviewedSessionIds = new Set(candidateReviews.map(r => r.sessionId));
        const reportedSessionIds = new Set(submittedReports.map(r => r.sessionId?.toString()));
        const meetingMap = new Map();
        meetingRecords.forEach(m => {
            if (m.sessionId) meetingMap.set(m.sessionId, m);
        });

        // Filter: Must be genuinely evaluated by an expert or have a submitted evaluation report
        // AND strictly not a no-show, absent, or cancelled
        // AND requires positively verified candidate attendance using actual candidate-specific records
        const seenSessionIds = new Set();
        const eligibleSessions = [];

        for (const session of candidateSessions) {
            const st = (session.status || '').toLowerCase();
            // Disqualify no-shows and cancellations
            if (st === 'no-show' || st === 'candidate_no_show' || st === 'no_show' || st === 'cancelled') {
                continue;
            }
            if (session.attendanceStatus === 'absent' || session.attendanceStatus === 'no-show') {
                continue;
            }

            // Must have a genuine expert evaluation or submitted report
            // (Unless it was already allocated to an issued certificate)
            const hasReview = reviewedSessionIds.has(session.sessionId);
            const hasReport = reportedSessionIds.has(session._id?.toString());
            const hasExistingAllocation = Boolean(session.allocatedCertificateId);

            if (!hasReview && !hasReport && !hasExistingAllocation) {
                continue;
            }

            // Deduplicate: Each unique session counts at most once
            const sid = session.sessionId || session._id.toString();
            if (seenSessionIds.has(sid)) {
                continue;
            }
            seenSessionIds.add(sid);

            // Candidate-Specific Attendance Verification:
            const isExplicitlyAttended = session.attendanceStatus === 'attended';
            const hasCandidateJoinTimestamp = Boolean(session.candidateJoinedAt);
            const hasAdminAuditApproval = session.attendanceAudit?.decision === 'approved';
            const hasCandidateReview = candidateReviewedSessionIds.has(session.sessionId);

            const meetingDoc = meetingMap.get(session.sessionId);
            const hasMeetingWithCandidate = Boolean(
                meetingDoc &&
                String(meetingDoc.candidateId) === String(candidateOid) &&
                meetingDoc.status === 'finished' &&
                (
                    (Array.isArray(meetingDoc.activeUsers) && meetingDoc.activeUsers.map(String).includes(String(candidateOid))) ||
                    Boolean(session.candidateJoinedAt) ||
                    session.attendanceStatus === 'attended'
                )
            );

            if (isExplicitlyAttended || hasCandidateJoinTimestamp || hasAdminAuditApproval || hasCandidateReview || hasMeetingWithCandidate || hasExistingAllocation) {
                eligibleSessions.push(session);
            }
        }

        // Validate each session's category strictly against actual MongoDB Category collection (Part 4)
        // No defaulting to IT, no inferring from expert personal information, no fake category assignments
        const allDbCategories = await Category.find({}).lean();
        const catByIdMap = new Map();
        const catByNameMap = new Map();
        allDbCategories.forEach(c => {
            catByIdMap.set(c._id.toString(), c);
            if (c.name) catByNameMap.set(c.name.trim().toLowerCase(), c);
        });

        const validatedEligibleSessions = [];
        const unresolvableCategorySessions = [];

        for (const s of eligibleSessions) {
            let matchedCat = null;
            if (s.categoryId && catByIdMap.has(s.categoryId.toString())) {
                matchedCat = catByIdMap.get(s.categoryId.toString());
            } else if (s.categoryNameSnapshot && catByNameMap.has(s.categoryNameSnapshot.trim().toLowerCase())) {
                matchedCat = catByNameMap.get(s.categoryNameSnapshot.trim().toLowerCase());
            } else if (s.category && catByNameMap.has(s.category.trim().toLowerCase())) {
                matchedCat = catByNameMap.get(s.category.trim().toLowerCase());
            }

            if (matchedCat) {
                s.categoryId = matchedCat._id;
                s.categoryNameSnapshot = matchedCat.name;
                validatedEligibleSessions.push(s);
            } else {
                // PART 4: Flag for data reconciliation instead of inventing a category
                unresolvableCategorySessions.push(s);
                console.warn(`[getEligibleCompletedSessions] Session ${s.sessionId || s._id} missing authoritative category in MongoDB; flagged for reconciliation`);
            }
        }

        return validatedEligibleSessions;
    } catch (err) {
        console.error("[getEligibleCompletedSessions] Error:", err);
        return [];
    }
};

/**
 * Authoritative Domain-Specific Milestone Progress Calculation.
 * Groups eligible sessions and issued certificates strictly by categoryId.
 * Interviews in different categories are NEVER combined.
 * Works dynamically with every category in the database.
 */
export const getDomainMilestoneProgress = async (userId, targetCategoryId = null) => {
    try {
        const candidateOid = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;

        // 1. Fetch all active categories from MongoDB
        const activeCategories = await Category.find({ status: 'Active' }).sort({ name: 1 }).lean();

        // 2. Fetch eligible completed sessions for candidate
        const eligibleSessions = await getEligibleCompletedSessions(candidateOid);

        // 3. Fetch all issued certificates for candidate
        const issuedCerts = await Certification.find({
            userId: candidateOid,
            certificateStatus: 'ISSUED'
        }).sort({ milestoneNumber: 1, issueDate: 1 }).lean();

        // Include any categories present in candidate sessions or certs even if inactive
        const allKnownCategoryIds = new Set(activeCategories.map(c => c._id.toString()));
        const extraCategoryIds = new Set();
        eligibleSessions.forEach(s => {
            if (s.categoryId && !allKnownCategoryIds.has(s.categoryId.toString())) {
                extraCategoryIds.add(s.categoryId.toString());
            }
        });
        issuedCerts.forEach(c => {
            if (c.categoryId && !allKnownCategoryIds.has(c.categoryId.toString())) {
                extraCategoryIds.add(c.categoryId.toString());
            }
        });

        let allCategories = [...activeCategories];
        if (extraCategoryIds.size > 0) {
            const extraCats = await Category.find({ _id: { $in: Array.from(extraCategoryIds) } }).lean();
            allCategories = allCategories.concat(extraCats);
        }

        // Global allocated session IDs across all certificates
        const globalAllocatedSessionIds = new Set();
        issuedCerts.forEach(cert => {
            if (Array.isArray(cert.qualifyingSessionIds)) {
                cert.qualifyingSessionIds.forEach(sid => globalAllocatedSessionIds.add(sid));
            }
        });

        const allocatedDocs = await Session.find({
            candidateId: candidateOid,
            allocatedCertificateId: { $ne: null }
        }).select('sessionId').lean();
        allocatedDocs.forEach(s => {
            if (s.sessionId) globalAllocatedSessionIds.add(s.sessionId);
        });

        // 4. Calculate domain-specific progress for each category
        const categoryProgress = [];

        for (const cat of allCategories) {
            const catIdStr = cat._id.toString();

            // Eligible sessions strictly in this category
            const catEligibleSessions = eligibleSessions.filter(s =>
                s.categoryId && s.categoryId.toString() === catIdStr
            );

            // Issued certificates strictly in this category
            const catIssuedCerts = issuedCerts.filter(c =>
                c.categoryId && c.categoryId.toString() === catIdStr
            );

            // Allocated session IDs in this category
            const catAllocatedSessionIds = new Set();
            catIssuedCerts.forEach(cert => {
                if (Array.isArray(cert.qualifyingSessionIds)) {
                    cert.qualifyingSessionIds.forEach(sid => catAllocatedSessionIds.add(sid));
                }
            });

            // Unallocated sessions in this category
            const unallocatedSessions = catEligibleSessions.filter(s => {
                const sid = s.sessionId || s._id.toString();
                return !globalAllocatedSessionIds.has(sid) && !catAllocatedSessionIds.has(sid);
            });

            const unallocatedCount = unallocatedSessions.length;
            const totalIssuedInDomain = catIssuedCerts.length;
            const nextMilestoneNumber = totalIssuedInDomain + 1;
            const startIdx = (nextMilestoneNumber - 1) * 3 + 1;
            const endIdx = nextMilestoneNumber * 3;
            const nextMilestoneRange = `Interviews ${startIdx}–${endIdx}`;

            const isEligibleForNext = unallocatedCount >= 3;
            const progressInMilestone = isEligibleForNext ? 3 : (unallocatedCount % 3);
            const remainingForMilestone = isEligibleForNext ? 0 : (3 - progressInMilestone);

            categoryProgress.push({
                categoryId: catIdStr,
                categoryName: cat.name,
                categoryStatus: cat.status || 'Active',
                totalEligibleCount: catEligibleSessions.length,
                totalQualifyingCount: catEligibleSessions.length,
                totalIssuedCount: totalIssuedInDomain,
                unallocatedCount,
                nextMilestoneNumber,
                nextMilestoneRange,
                progressInMilestone,
                remainingForMilestone,
                isEligibleForNext,
                issuedCertificates: catIssuedCerts,
                unallocatedSessions
            });
        }

        // Sort: domains with eligibility or activity first, then by name
        categoryProgress.sort((a, b) => {
            if (a.isEligibleForNext !== b.isEligibleForNext) {
                return a.isEligibleForNext ? -1 : 1;
            }
            if (a.unallocatedCount !== b.unallocatedCount) {
                return b.unallocatedCount - a.unallocatedCount;
            }
            if (a.totalEligibleCount !== b.totalEligibleCount) {
                return b.totalEligibleCount - a.totalEligibleCount;
            }
            return a.categoryName.localeCompare(b.categoryName);
        });

        const anyEligible = categoryProgress.some(cp => cp.isEligibleForNext);
        const eligibleCategories = categoryProgress.filter(cp => cp.isEligibleForNext);
        const totalIssuedCount = issuedCerts.length;
        const totalEligibleCount = eligibleSessions.length;

        const targetProgress = targetCategoryId
            ? categoryProgress.find(cp => cp.categoryId === targetCategoryId.toString())
            : null;

        // Identify completed and evaluated sessions requiring admin review
        const allCompletedDocs = await Session.find({
            candidateId: candidateOid,
            status: { $in: ['completed', 'evaluated'] }
        }).select('sessionId _id attendanceStatus candidateJoinedAt status').lean();

        const eligibleSidSet = new Set(eligibleSessions.map(s => s.sessionId));
        const candidateSessionIds = allCompletedDocs.map(s => s.sessionId);
        const candidateMongoIds = allCompletedDocs.map(s => s._id);

        const [revs, reps] = await Promise.all([
            ReviewDetails.find({ sessionId: { $in: candidateSessionIds }, reviewerRole: 'expert' }).select('sessionId').lean(),
            Report.find({ sessionId: { $in: candidateMongoIds }, status: 'Submitted' }).select('sessionId').lean()
        ]);
        const revSet = new Set(revs.map(r => r.sessionId));
        const repSet = new Set(reps.map(r => r.sessionId?.toString()));

        const sessionsRequiringAdminReview = allCompletedDocs.filter(s => {
            if (eligibleSidSet.has(s.sessionId)) return false;
            const hasReview = revSet.has(s.sessionId) || repSet.has(s._id?.toString());
            return hasReview;
        }).map(s => s.sessionId);

        const activeCategoryProgress = categoryProgress.filter(
            cp => (cp.totalQualifyingCount || cp.totalEligibleCount) > 0 || cp.totalIssuedCount > 0
        );

        return {
            categoryProgress,
            activeCategoryProgress,
            eligibleCategories,
            anyEligible,
            totalIssuedCount,
            totalEligibleCount,
            allIssuedCertificates: issuedCerts,
            activeCategories: activeCategories.map(c => ({ _id: c._id, id: c._id.toString(), name: c.name })),
            targetProgress,
            allocatedSessionIds: Array.from(globalAllocatedSessionIds),
            sessionsRequiringAdminReview
        };
    } catch (err) {
        console.error("[getDomainMilestoneProgress] Error:", err);
        throw err;
    }
};

/**
 * Backward-compatible wrapper for getMilestoneProgress.
 */
export const getMilestoneProgress = async (userId, categoryId = null) => {
    const domainProgress = await getDomainMilestoneProgress(userId, categoryId);

    if (categoryId && domainProgress.targetProgress) {
        const tp = domainProgress.targetProgress;
        return {
            ...tp,
            totalIssuedCount: tp.totalIssuedCount,
            totalEligibleCount: tp.totalEligibleCount,
            unallocatedCount: tp.unallocatedCount,
            nextMilestoneNumber: tp.nextMilestoneNumber,
            nextMilestoneRange: tp.nextMilestoneRange,
            progressInCurrentMilestone: tp.progressInMilestone,
            remainingForNextMilestone: tp.remainingForMilestone,
            isNextMilestoneEligible: tp.isEligibleForNext,
            issuedCertificates: tp.issuedCertificates,
            allIssuedCertificates: domainProgress.allIssuedCertificates,
            categoryProgress: domainProgress.categoryProgress
        };
    }

    const primaryCat = domainProgress.eligibleCategories[0] ||
                       domainProgress.categoryProgress[0] ||
                       null;

    return {
        totalEligibleCount: domainProgress.totalEligibleCount,
        totalIssuedCount: domainProgress.totalIssuedCount,
        issuedCertificates: domainProgress.allIssuedCertificates,
        categoryProgress: domainProgress.categoryProgress,
        eligibleCategories: domainProgress.eligibleCategories,
        nextMilestoneNumber: primaryCat?.nextMilestoneNumber || 1,
        nextMilestoneRange: primaryCat?.nextMilestoneRange || 'Interviews 1–3',
        unallocatedCount: primaryCat?.unallocatedCount || 0,
        progressInCurrentMilestone: primaryCat?.progressInMilestone || 0,
        remainingForNextMilestone: primaryCat?.remainingForMilestone || 3,
        isNextMilestoneEligible: primaryCat?.isEligibleForNext || false,
        allocatedSessionIds: domainProgress.allocatedSessionIds || [],
        primaryCategory: primaryCat,
        unallocatedSessions: primaryCat?.unallocatedSessions || [],
        sessionsRequiringAdminReview: domainProgress.sessionsRequiringAdminReview || []
    };
};

const getReqUserId = (req) => req.user?.userId || req.user?._id || req.user?.id;

/**
 * GET /api/certifications/preview
 * Protected preview endpoint for the authenticated candidate:
 * - Returns stage: 'PREVIEW' (0 certs, <3 sessions in any domain) | 'PROGRESS' (>=1 cert, none ready) | 'ELIGIBLE' (>= 1 domain has 3 unallocated)
 * - Returns candidate name (neutral 'Your Name' for pre-milestone 1, profile name for eligible, frozen snapshot if issued)
 * - Returns domain-specific categoryProgress array and all active categories
 */
export const getCertificatePreview = async (req, res) => {
    try {
        const userId = getReqUserId(req);
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const domainProgress = await getDomainMilestoneProgress(userId);
        const cleanProfileName = (user.name || '').trim();

        const anyEligible = domainProgress.anyEligible;
        const totalIssuedCount = domainProgress.totalIssuedCount;

        let stage = 'PREVIEW';
        if (anyEligible) {
            stage = 'ELIGIBLE';
        } else if (totalIssuedCount > 0) {
            stage = 'ISSUED';
        }

        const latestIssued = domainProgress.allIssuedCertificates.length > 0
            ? domainProgress.allIssuedCertificates[domainProgress.allIssuedCertificates.length - 1]
            : null;

        let resolvedCandidateName = 'Your Name';
        if (totalIssuedCount > 0 && !anyEligible) {
            resolvedCandidateName = latestIssued?.candidateNameSnapshot || cleanProfileName || 'Your Name';
        } else if (anyEligible) {
            resolvedCandidateName = cleanProfileName || 'Your Name';
        } else {
            resolvedCandidateName = 'Your Name';
        }

        const confirmation = user.certificateIdentityConfirmation;
        const hasConfirmedIdentity = Boolean(
            confirmation &&
            confirmation.confirmedName &&
            confirmation.confirmedName.trim().toLowerCase() === cleanProfileName.toLowerCase()
        );

        const primaryCat = domainProgress.eligibleCategories[0] || domainProgress.categoryProgress[0];

        return res.json({
            success: true,
            data: {
                stage,
                candidateName: resolvedCandidateName,
                profileName: cleanProfileName || null,
                needsProfileCompletion: !cleanProfileName,
                completedCount: domainProgress.totalEligibleCount,
                unallocatedCount: primaryCat?.unallocatedCount || 0,
                targetCount: 3,
                isEligible: anyEligible,
                isIssued: totalIssuedCount > 0,
                hasConfirmedIdentity,
                confirmedName: confirmation?.confirmedName || null,
                categoryProgress: domainProgress.categoryProgress,
                activeCategoryProgress: domainProgress.activeCategoryProgress,
                activeDomains: domainProgress.activeCategoryProgress.map(c => ({
                    categoryId: c.categoryId,
                    categoryName: c.categoryName,
                    totalQualifyingInterviews: c.totalQualifyingCount,
                    totalIssuedCertificates: c.totalIssuedCount,
                    currentMilestoneNumber: c.nextMilestoneNumber,
                    currentMilestoneProgress: c.progressInMilestone,
                    remainingInterviews: c.remainingForMilestone,
                    isEligibleForNext: c.isEligibleForNext,
                    issuedCertificates: c.issuedCertificates,
                    qualifyingSessionIds: c.unallocatedSessions?.map(s => s.sessionId || s._id) || []
                })),
                eligibleCategories: domainProgress.eligibleCategories.map(c => ({
                    categoryId: c.categoryId,
                    categoryName: c.categoryName,
                    nextMilestoneNumber: c.nextMilestoneNumber,
                    nextMilestoneRange: c.nextMilestoneRange
                })),
                activeCategories: domainProgress.activeCategories,
                certificate: latestIssued ? {
                    certificateId: latestIssued.certificateId,
                    name: latestIssued.name,
                    categoryId: latestIssued.categoryId,
                    categoryNameSnapshot: latestIssued.categoryNameSnapshot,
                    milestoneNumber: latestIssued.milestoneNumber || 1,
                    milestoneRange: latestIssued.milestoneRange || 'Interviews 1–3',
                    candidateNameSnapshot: latestIssued.candidateNameSnapshot,
                    issueDate: latestIssued.issueDate,
                    certificateStatus: latestIssued.certificateStatus,
                    qualifyingSessionIds: latestIssued.qualifyingSessionIds,
                    type: latestIssued.type
                } : null,
                milestone: {
                    nextMilestoneNumber: primaryCat?.nextMilestoneNumber || 1,
                    nextMilestoneRange: primaryCat?.nextMilestoneRange || 'Interviews 1–3',
                    totalIssuedCount,
                    totalEligibleCount: domainProgress.totalEligibleCount,
                    unallocatedCount: primaryCat?.unallocatedCount || 0,
                    progressInMilestone: primaryCat?.progressInMilestone || 0,
                    remainingForMilestone: primaryCat?.remainingForMilestone || 3,
                    isEligibleForNext: anyEligible
                },
                certificates: domainProgress.allIssuedCertificates.map(c => ({
                    certificateId: c.certificateId,
                    name: c.name,
                    categoryId: c.categoryId,
                    categoryNameSnapshot: c.categoryNameSnapshot,
                    milestoneNumber: c.milestoneNumber || 1,
                    milestoneRange: c.milestoneRange || 'Interviews 1–3',
                    candidateNameSnapshot: c.candidateNameSnapshot,
                    issueDate: c.issueDate,
                    certificateStatus: c.certificateStatus,
                    qualifyingSessionIds: c.qualifyingSessionIds,
                    type: c.type
                })),
                latestCertificate: latestIssued ? {
                    certificateId: latestIssued.certificateId,
                    name: latestIssued.name,
                    categoryId: latestIssued.categoryId,
                    categoryNameSnapshot: latestIssued.categoryNameSnapshot,
                    milestoneNumber: latestIssued.milestoneNumber || 1,
                    milestoneRange: latestIssued.milestoneRange || 'Interviews 1–3',
                    candidateNameSnapshot: latestIssued.candidateNameSnapshot,
                    issueDate: latestIssued.issueDate,
                    certificateStatus: latestIssued.certificateStatus,
                    qualifyingSessionIds: latestIssued.qualifyingSessionIds,
                    type: latestIssued.type
                } : null
            }
        });
    } catch (error) {
        console.error("Get Certificate Preview Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/certifications/history
 * Protected endpoint returning all genuinely issued certificates for the logged-in candidate.
 * Each historical certificate returns its own permanent candidateNameSnapshot and categoryNameSnapshot.
 */
export const getCertificateHistory = async (req, res) => {
    try {
        const userId = getReqUserId(req);

        const certificates = await Certification.find({
            userId,
            certificateStatus: 'ISSUED'
        }).sort({ milestoneNumber: 1, issueDate: 1 }).lean();

        return res.json({
            success: true,
            data: certificates.map(c => ({
                certificateId: c.certificateId,
                name: c.name,
                categoryId: c.categoryId,
                categoryNameSnapshot: c.categoryNameSnapshot || 'IT',
                milestoneNumber: c.milestoneNumber || 1,
                milestoneRange: c.milestoneRange || 'Interviews 1–3',
                candidateNameSnapshot: c.candidateNameSnapshot,
                issueDate: c.issueDate,
                qualifyingSessionIds: c.qualifyingSessionIds || [],
                type: c.type || 'master',
                status: c.certificateStatus
            }))
        });
    } catch (error) {
        console.error("Get Certificate History Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/certifications/status/:userId
 * Returns domain progress and certifications list.
 */
export const getCertificationStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = getReqUserId(req);

        if (req.user && req.user.userType !== 'admin' && String(currentUserId) !== String(userId)) {
            return res.status(403).json({ success: false, message: "Forbidden: Access denied to another candidate's certificates" });
        }

        const domainProgress = await getDomainMilestoneProgress(userId);
        const primaryCat = domainProgress.eligibleCategories[0] || domainProgress.categoryProgress[0];

        res.json({
            success: true,
            data: {
                completedSessions: domainProgress.totalEligibleCount,
                unallocatedSessions: primaryCat?.unallocatedCount || 0,
                nextMilestoneNumber: primaryCat?.nextMilestoneNumber || 1,
                nextMilestoneRange: primaryCat?.nextMilestoneRange || 'Interviews 1–3',
                progressInMilestone: primaryCat?.progressInMilestone || 0,
                targetSessions: 3,
                isEligibleForCertificate: domainProgress.anyEligible,
                hasIssuedCertificate: domainProgress.totalIssuedCount > 0,
                categoryProgress: domainProgress.categoryProgress,
                certifications: domainProgress.allIssuedCertificates
            }
        });
    } catch (error) {
        console.error("Get Certification Status Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/certifications/verification-status
 * Protected route to check if identity confirmation is required for the upcoming certificate milestone.
 */
export const getVerificationStatus = async (req, res) => {
    try {
        const userId = getReqUserId(req);
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const domainProgress = await getDomainMilestoneProgress(userId);
        const cleanProfileName = (user.name || '').trim();

        const confirmation = user.certificateIdentityConfirmation;
        const hasConfirmed = Boolean(
            confirmation &&
            confirmation.confirmedName &&
            confirmation.confirmedName.trim().toLowerCase() === cleanProfileName.toLowerCase()
        );

        const primaryCat = domainProgress.eligibleCategories[0] || domainProgress.categoryProgress[0];
        const confirmationRequired = domainProgress.anyEligible && !hasConfirmed;

        return res.json({
            success: true,
            data: {
                nextMilestoneNumber: primaryCat?.nextMilestoneNumber || 1,
                nextMilestoneRange: primaryCat?.nextMilestoneRange || 'Interviews 1–3',
                unallocatedCount: primaryCat?.unallocatedCount || 0,
                isEligible: domainProgress.anyEligible,
                confirmationRequired,
                hasConfirmed,
                confirmedName: confirmation?.confirmedName || null,
                confirmedAt: confirmation?.confirmedAt || null,
                confirmationReference: confirmation?.confirmationReference || null,
                profileName: user.name,
                eligibleCategories: domainProgress.eligibleCategories
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
 * for their upcoming domain certificate milestone.
 * Accepts: { acknowledged, confirmedName, categoryId }
 */
export const confirmIdentity = async (req, res) => {
    try {
        const userId = getReqUserId(req);
        const { acknowledged, confirmedName, categoryId } = req.body || {};

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

        if (!user.name || !user.name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Please complete your profile name before confirming certificate identity."
            });
        }

        const domainProgress = await getDomainMilestoneProgress(userId);

        // Resolve target category
        let targetCategoryProgress = null;
        if (categoryId) {
            targetCategoryProgress = domainProgress.categoryProgress.find(
                cp => cp.categoryId.toString() === categoryId.toString()
            );
        } else if (domainProgress.eligibleCategories.length === 1) {
            targetCategoryProgress = domainProgress.eligibleCategories[0];
        } else if (domainProgress.eligibleCategories.length > 1) {
            return res.status(400).json({
                success: false,
                message: "Multiple domains are eligible. Please provide categoryId to confirm."
            });
        }

        if (!targetCategoryProgress || !targetCategoryProgress.isEligibleForNext) {
            const domainName = targetCategoryProgress?.categoryName || 'specified domain';
            const unalloc = targetCategoryProgress?.unallocatedCount || 0;
            return res.status(400).json({
                success: false,
                message: `Not eligible for Certificate ${targetCategoryProgress?.nextMilestoneNumber || 1} in ${domainName}. You have ${unalloc} of 3 required unallocated interviews in this domain.`
            });
        }

        // Confirmed name MUST match profile name
        if (confirmedName && typeof confirmedName === 'string') {
            if (confirmedName.trim().toLowerCase() !== user.name.trim().toLowerCase()) {
                return res.status(400).json({
                    success: false,
                    message: "Confirmed name does not match current profile name in database. Please update your profile first."
                });
            }
        }

        const targetMilestone = targetCategoryProgress.nextMilestoneNumber;
        const catSlug = targetCategoryProgress.categoryName.replace(/[^A-Za-z0-9]/g, '');
        const confirmationRef = `MCFY-IDCONF-${catSlug}-M${targetMilestone}-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`;

        user.certificateIdentityConfirmation = {
            confirmedName: user.name.trim(),
            confirmedAt: new Date(),
            confirmedForCycle: targetMilestone,
            confirmedForMilestone: targetMilestone,
            confirmedForCategoryId: new mongoose.Types.ObjectId(targetCategoryProgress.categoryId),
            confirmationReference: confirmationRef,
            ipAddress: req.ip || req.headers?.['x-forwarded-for'] || null,
            userAgent: req.headers?.['user-agent'] || null
        };

        await user.save();

        return res.json({
            success: true,
            message: `Certificate identity successfully confirmed for ${targetCategoryProgress.categoryName} Certificate ${targetMilestone}.`,
            data: {
                confirmedName: user.name.trim(),
                categoryId: targetCategoryProgress.categoryId,
                categoryName: targetCategoryProgress.categoryName,
                milestoneNumber: targetMilestone,
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
 * Protected route to officially issue a new domain-specific certificate milestone.
 * Concurrency-safe and idempotent.
 * Allocates exactly 3 unallocated eligible sessions strictly within categoryId.
 */
export const issueCertificate = async (req, res) => {
    try {
        const currentUserId = getReqUserId(req);
        const { categoryId } = req.body || {};
        const userId = (req.user?.userType === 'admin' && req.body?.userId) ? req.body.userId : currentUserId;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const domainProgress = await getDomainMilestoneProgress(userId);

        // Resolve target category
        let targetCategoryProgress = null;
        if (categoryId) {
            targetCategoryProgress = domainProgress.categoryProgress.find(
                cp => cp.categoryId.toString() === categoryId.toString()
            );
        } else if (domainProgress.eligibleCategories.length === 1) {
            targetCategoryProgress = domainProgress.eligibleCategories[0];
        } else if (domainProgress.eligibleCategories.length > 1) {
            return res.status(400).json({
                success: false,
                message: "Multiple domains are eligible. Please provide categoryId to specify which domain certificate to issue."
            });
        }

        if (!targetCategoryProgress || !targetCategoryProgress.isEligibleForNext) {
            const domainName = targetCategoryProgress?.categoryName || 'specified domain';
            const unalloc = targetCategoryProgress?.unallocatedCount || 0;
            return res.status(400).json({
                success: false,
                message: `Not eligible for certificate in ${domainName}. 3 unallocated completed and evaluated interviews required in this domain (currently ${unalloc}/3).`
            });
        }

        const targetMilestone = targetCategoryProgress.nextMilestoneNumber;
        const catOid = new mongoose.Types.ObjectId(targetCategoryProgress.categoryId);

        // Idempotency check: Has this category + milestone already been issued?
        const existingMilestoneCert = await Certification.findOne({
            userId,
            categoryId: catOid,
            milestoneNumber: targetMilestone,
            certificateStatus: 'ISSUED'
        });

        if (existingMilestoneCert) {
            return res.status(200).json({
                success: true,
                message: `Certificate ${targetMilestone} for ${targetCategoryProgress.categoryName} has already been issued.`,
                data: existingMilestoneCert
            });
        }

        // Security check: verify identity confirmation
        const confirmation = user.certificateIdentityConfirmation;
        const hasValidConfirmation = Boolean(
            confirmation &&
            confirmation.confirmedName &&
            confirmation.confirmedName.trim().toLowerCase() === (user.name || '').trim().toLowerCase() &&
            (
                !confirmation.confirmedForCategoryId ||
                confirmation.confirmedForCategoryId.toString() === catOid.toString()
            )
        );

        if (!hasValidConfirmation) {
            return res.status(400).json({
                success: false,
                message: `Identity confirmation required before ${targetCategoryProgress.categoryName} Certificate ${targetMilestone} issuance. If your profile name changed, please re-confirm.`
            });
        }

        // Select exactly 3 unallocated eligible sessions strictly for this category, chronologically
        const sortedUnallocated = [...targetCategoryProgress.unallocatedSessions].sort(
            (a, b) => new Date(a.startTime || 0) - new Date(b.startTime || 0)
        );
        const sessionsToAllocate = sortedUnallocated.slice(0, 3);
        const sessionIdsToAllocate = sessionsToAllocate.map(s => s.sessionId);

        if (sessionIdsToAllocate.length < 3) {
            return res.status(400).json({
                success: false,
                message: `Could not allocate 3 qualifying sessions for ${targetCategoryProgress.categoryName}. Found ${sessionIdsToAllocate.length}.`
            });
        }

        const userSuffix = user._id.toString().slice(-6).toUpperCase();
        const year = new Date().getFullYear();
        const catSlug = targetCategoryProgress.categoryName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'GEN';
        const certId = `MCFY-${catSlug}-${userSuffix}-${year}-M${targetMilestone}`;

        const snapshotName = confirmation.confirmedName.trim();

        try {
            const newCert = new Certification({
                userId,
                name: `Mockeefy Master Interview Excellence Credential — ${targetCategoryProgress.categoryName} Milestone ${targetMilestone}`,
                certificateId: certId,
                categoryId: catOid,
                categoryNameSnapshot: targetCategoryProgress.categoryName,
                milestoneNumber: targetMilestone,
                milestoneRange: targetCategoryProgress.nextMilestoneRange,
                candidateNameSnapshot: snapshotName,
                identityConfirmedAt: confirmation.confirmedAt || new Date(),
                identityConfirmationReference: confirmation.confirmationReference || `REF-ISSUE-${catSlug}-M${targetMilestone}-${Date.now()}`,
                certificateStatus: 'ISSUED',
                qualifyingSessionIds: sessionIdsToAllocate,
                issueDate: new Date(),
                type: 'master',
                metadata: {
                    sessionCount: 3,
                    cycle: targetMilestone,
                    milestoneNumber: targetMilestone,
                    milestoneRange: targetCategoryProgress.nextMilestoneRange,
                    categoryId: catOid,
                    categoryName: targetCategoryProgress.categoryName
                }
            });

            await newCert.save();

            // Atomically link allocated sessions in MongoDB
            await Session.updateMany(
                { sessionId: { $in: sessionIdsToAllocate } },
                {
                    $set: {
                        allocatedCertificateId: certId,
                        allocatedMilestone: targetMilestone,
                        certificateIssued: true,
                        categoryId: catOid,
                        categoryNameSnapshot: targetCategoryProgress.categoryName
                    }
                }
            );

            return res.status(201).json({
                success: true,
                message: `Official ${targetCategoryProgress.categoryName} Certificate ${targetMilestone} issued successfully!`,
                data: newCert
            });
        } catch (saveErr) {
            if (saveErr.code === 11000) {
                const dupCert = await Certification.findOne({
                    userId,
                    categoryId: catOid,
                    milestoneNumber: targetMilestone
                });
                return res.status(200).json({
                    success: true,
                    message: `Certificate ${targetMilestone} for ${targetCategoryProgress.categoryName} already issued.`,
                    data: dupCert
                });
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
 * Returns the latest issued certificate for a candidate.
 */
export const getMasterCertificate = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = getReqUserId(req);

        if (req.user && req.user.userType !== 'admin' && String(currentUserId) !== String(userId)) {
            return res.status(403).json({ success: false, message: "Forbidden: Access denied to another candidate's certificates" });
        }

        const cert = await Certification.findOne({
            userId,
            certificateStatus: 'ISSUED'
        }).sort({ milestoneNumber: -1, issueDate: -1 });

        if (!cert) {
            return res.status(404).json({
                success: false,
                message: "No master certificate issued yet."
            });
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

/**
 * GET /api/certifications/download/:certificateId
 * Protected route to verify download eligibility for ANY issued certificate by certificateId:
 * - Checks certificate exists and is ISSUED
 * - Checks candidate ownership
 * - Returns immutable snapshot, category snapshot, and certificate metadata
 * - Strictly rejects preview / unissued IDs
 */
export const verifyDownloadEligibility = async (req, res) => {
    try {
        const { certificateId } = req.params;
        const userId = getReqUserId(req);
        const isAdmin = req.user?.userType === 'admin';

        if (!certificateId || certificateId.startsWith('PREVIEW') || certificateId === 'NOT_ISSUED') {
            return res.status(400).json({
                success: false,
                authorized: false,
                message: "Cannot download an unissued certificate preview."
            });
        }

        const cert = await Certification.findOne({
            certificateId,
            certificateStatus: 'ISSUED'
        }).lean();

        if (!cert) {
            return res.status(404).json({
                success: false,
                authorized: false,
                message: "Certificate not found or not yet officially issued."
            });
        }

        // Ownership check
        if (!isAdmin && cert.userId.toString() !== String(userId)) {
            return res.status(403).json({
                success: false,
                authorized: false,
                message: "Forbidden: You do not own this certificate."
            });
        }

        return res.json({
            success: true,
            authorized: true,
            data: {
                certificateId: cert.certificateId,
                name: cert.name,
                candidateNameSnapshot: cert.candidateNameSnapshot,
                categoryId: cert.categoryId,
                categoryNameSnapshot: cert.categoryNameSnapshot || 'IT',
                milestoneNumber: cert.milestoneNumber || 1,
                milestoneRange: cert.milestoneRange || 'Interviews 1–3',
                issueDate: cert.issueDate,
                type: cert.type
            }
        });
    } catch (error) {
        console.error("Verify Download Eligibility Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/certifications/verify/:certificateId
 * Public route for third-party verification of ANY certificate:
 * - Returns verified credential details including categoryNameSnapshot and frozen candidateNameSnapshot
 * - Strictly rejects unissued or non-existent certificate IDs
 */
export const verifyCertificatePublic = async (req, res) => {
    try {
        const { certificateId } = req.params;

        if (!certificateId || certificateId.startsWith('PREVIEW')) {
            return res.status(400).json({
                success: false,
                valid: false,
                message: "Invalid certificate identifier."
            });
        }

        const cert = await Certification.findOne({
            certificateId,
            certificateStatus: 'ISSUED'
        }).lean();

        if (!cert) {
            return res.status(404).json({
                success: false,
                valid: false,
                message: "No valid issued certificate found with ID: " + certificateId
            });
        }

        return res.json({
            success: true,
            valid: true,
            data: {
                certificateId: cert.certificateId,
                name: cert.name,
                candidateName: cert.candidateNameSnapshot,
                candidateNameSnapshot: cert.candidateNameSnapshot,
                categoryId: cert.categoryId,
                categoryNameSnapshot: cert.categoryNameSnapshot || 'IT',
                milestoneNumber: cert.milestoneNumber || 1,
                milestoneRange: cert.milestoneRange || 'Interviews 1–3',
                issueDate: cert.issueDate,
                type: cert.type,
                status: cert.certificateStatus,
                qualifyingSessionCount: cert.qualifyingSessionIds?.length || 3
            }
        });
    } catch (error) {
        console.error("Public Verify Certificate Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/certifications/admin/review-attendance
 * Administrative endpoint to review sessions with missing/unknown attendance.
 */
export const adminReviewAttendance = async (req, res) => {
    try {
        const isAdmin = req.user?.userType === 'admin' || req.user?.role === 'admin';
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: Administrative attendance review requires an authorized administrator."
            });
        }

        const { sessionId, decision, notes } = req.body;
        if (!sessionId || !decision) {
            return res.status(400).json({
                success: false,
                message: "sessionId and decision ('approved' or 'rejected') are required."
            });
        }

        const cleanDecision = decision.toLowerCase().trim();
        if (cleanDecision !== 'approved' && cleanDecision !== 'rejected') {
            return res.status(400).json({
                success: false,
                message: "Invalid decision. Must be either 'approved' or 'rejected'."
            });
        }

        const session = await Session.findOne({ sessionId });
        if (!session) {
            return res.status(404).json({
                success: false,
                message: `Session ${sessionId} not found.`
            });
        }

        const adminId = getReqUserId(req);
        const auditRecord = {
            reviewedBy: adminId,
            reviewedAt: new Date(),
            decision: cleanDecision,
            notes: (notes || '').trim() || `Administrative attendance decision: ${cleanDecision}`
        };

        session.attendanceAudit = auditRecord;
        if (cleanDecision === 'approved') {
            session.attendanceStatus = 'attended';
            if (!session.candidateJoinedAt) {
                session.candidateJoinedAt = session.startTime || new Date();
            }
        } else {
            session.attendanceStatus = 'absent';
        }

        await session.save();

        return res.json({
            success: true,
            message: `Session ${sessionId} attendance successfully ${cleanDecision}.`,
            data: {
                sessionId: session.sessionId,
                attendanceStatus: session.attendanceStatus,
                attendanceAudit: session.attendanceAudit
            }
        });
    } catch (error) {
        console.error("Admin Review Attendance Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
