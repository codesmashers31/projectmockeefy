const fs = require('fs');
const path = require('path');

// 1. Update server/routes/sessionRoutes.js
{
  const file = path.join(__dirname, '../routes/sessionRoutes.js');
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes("router.post('/:sessionId/leave'")) {
    c = c.replace(
      "router.post('/:sessionId/join', protect, sessionController.joinSession);",
      "router.post('/:sessionId/join', protect, sessionController.joinSession);\nrouter.post('/:sessionId/leave', optionalProtect, sessionController.leaveSession);"
    );
    fs.writeFileSync(file, c, 'utf8');
    console.log('Added leave route to sessionRoutes.js');
  }
}

// 2. Update server/services/socketService.js
{
  const file = path.join(__dirname, '../services/socketService.js');
  let c = fs.readFileSync(file, 'utf8');
  const oldLeave = `        socket.on("leave-session", (sessionId) => {
            if (!sessionId) return;
            const sIdStr = sessionId.toString();
            socket.leave(sIdStr);
            socket.leave(\`session:\${sIdStr}\`);
        });`;
  const newLeave = `        socket.on("leave-session", async (sessionId) => {
            if (!sessionId) return;
            const sIdStr = sessionId.toString();
            socket.leave(sIdStr);
            socket.leave(\`session:\${sIdStr}\`);
            try {
                const s = await Session.findOne({
                    $or: [{ _id: sessionId }, { sessionId }]
                }).select("candidateId").lean();
                if (s && s.candidateId?.toString() === userId.toString()) {
                    await Session.updateOne(
                        { _id: s._id },
                        { $set: { candidateLeftAt: new Date(), candidateConnectionStatus: 'left' } }
                    );
                }
            } catch (_) {}
        });`;
  if (c.includes(oldLeave)) {
    c = c.replace(oldLeave, newLeave);
    fs.writeFileSync(file, c, 'utf8');
    console.log('Updated leave-session in socketService.js');
  }
}

// 3. Update server/controllers/sessionController.js
{
  const file = path.join(__dirname, '../controllers/sessionController.js');
  let c = fs.readFileSync(file, 'utf8');

  // Add leaveSession export
  if (!c.includes('export const leaveSession = async')) {
    c = c.replace(
      'export const joinSession = async (req, res) => {',
      `export const leaveSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user?.userId || req.headers?.userid;
        const SessionModel = (await import('../models/Session.js')).default;
        const session = await SessionModel.findOne({
            $or: [{ sessionId }, { _id: sessionId }]
        });
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

export const joinSession = async (req, res) => {`
    );
  }

  // In joinSession, ensure candidateJoinedAt preserves original timestamp across reconnects
  const oldJoinAtt = `            if (assignedRole === 'candidate') {
                await SessionModel.findOneAndUpdate(
                    { sessionId: session.sessionId, attendanceStatus: { $ne: 'attended' } },
                    { $set: { attendanceStatus: 'attended', candidateJoinedAt: new Date() } }
                );
            }`;
  const newJoinAtt = `            if (assignedRole === 'candidate') {
                // Preserve original candidateJoinedAt across reconnects and refreshes
                await SessionModel.findOneAndUpdate(
                    { sessionId: session.sessionId, candidateJoinedAt: null },
                    { $set: { attendanceStatus: 'attended', candidateJoinedAt: new Date(), candidateConnectionStatus: 'connected' } }
                );
                // If reconnecting, update candidateConnectionStatus to connected
                await SessionModel.updateOne(
                    { sessionId: session.sessionId, candidateJoinedAt: { $ne: null } },
                    { $set: { candidateConnectionStatus: 'connected' } }
                );
            }`;
  if (c.includes(oldJoinAtt)) {
    c = c.replace(oldJoinAtt, newJoinAtt);
  }

  // In completeSession, enforce completion evidence & duration check & atomic transition
  const oldCompleteStart = 'export const completeSession = async (req, res) => {';
  const cIdx = c.indexOf(oldCompleteStart);
  if (cIdx === -1) throw new Error('completeSession not found');
  const searchEndStr = 'message: "Session completed", data: payloadData });';
  const foundIdx = c.indexOf(searchEndStr, cIdx);
  if (foundIdx === -1) throw new Error('searchEndStr not found');
  const catchIdx = c.indexOf('} catch (error) {', foundIdx);
  if (catchIdx === -1) throw new Error('catch not found');

  const oldCompleteBlock = c.substring(cIdx, catchIdx + '} catch (error) {'.length);

  const newCompleteBlock = `export const completeSession = async (req, res) => {
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

        // 15-minute boundary check from session scheduled start
        const now = new Date();
        const startTime = new Date(session.startTime);
        if (!isNaN(startTime.getTime()) && now.getTime() < startTime.getTime() + 15 * 60 * 1000) {
            const remainingSeconds = Math.ceil((startTime.getTime() + 15 * 60 * 1000 - now.getTime()) / 1000);
            return res.status(400).json({
                success: false,
                message: \`Candidate attendance classification is locked for the first 15 minutes of the session. Available in \${remainingSeconds}s.\`
            });
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

        // Authoritative Proof of Completion Validation for ATTENDED_COMPLETED
        const candJoinMs = session.candidateJoinedAt ? new Date(session.candidateJoinedAt).getTime() : 0;
        const candLeftMs = session.candidateLeftAt ? new Date(session.candidateLeftAt).getTime() : now.getTime();
        const presenceDurationMs = candJoinMs > 0 ? Math.max(0, candLeftMs - candJoinMs) : 0;
        const minRequiredPresenceMs = 15 * 60 * 1000;

        if (attendanceOutcome === 'ATTENDED_COMPLETED') {
            // Must have spent minimum interview threshold
            if (presenceDurationMs < minRequiredPresenceMs) {
                const presenceMins = Math.round(presenceDurationMs / 60000);
                return res.status(400).json({
                    success: false,
                    message: \`Candidate presence duration (\${presenceMins} mins) was below the 15-minute interview threshold. Incomplete sessions must be classified as 'ATTENDED_INCOMPLETE'.\`
                });
            }

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

        await sessionService.completeSession(sessionId);
        try {
            await meetingService.updateMeetingStatus(sessionId, 'finished');
        } catch (_) { /* meeting may not exist */ }

        // Calculate eligible expert payout and set to pending_feedback (Change 2)
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
                pendingPayoutAmount = Math.max(1, Math.round(sessionPrice * 0.8 * 100) / 100);
                initialPayoutStatus = 'pending_feedback';
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
            // Already finalized! Return existing session (idempotent duplicate call safe)
            const existing = await Session.findOne({ sessionId: session.sessionId }).lean();
            return res.json({ success: true, message: "Session already finalized", data: existing });
        }

        // Snapshot candidate identity on session and check master certificate issuance ONLY for ATTENDED_COMPLETED
        if (attendanceOutcome === 'ATTENDED_COMPLETED') {
            try {
                const User = (await import('../models/User.js')).default;
                const candidateUser = await User.findById(session.candidateId);
                if (candidateUser) {
                    const isConfirmed = Boolean(
                        candidateUser.certificateIdentityConfirmation?.confirmedName &&
                        candidateUser.certificateIdentityConfirmation.confirmedName.trim().toLowerCase() === candidateUser.name.trim().toLowerCase()
                    );
                    const snapshotName = isConfirmed
                        ? candidateUser.certificateIdentityConfirmation.confirmedName.trim()
                        : null;

                    await Session.findOneAndUpdate(
                        { sessionId: session.sessionId },
                        {
                            $set: {
                                candidateNameSnapshot: snapshotName,
                                identityConfirmedAt: candidateUser.certificateIdentityConfirmation?.confirmedAt || new Date(),
                                certificateIssued: true,
                                certificateId: \`MCFY-\${(session._id || session.sessionId).toString().slice(-8).toUpperCase()}\`
                            }
                        }
                    );

                    // Auto-provision master credential if >= 3 completed sessions
                    const completedCount = await Session.countDocuments({
                        candidateId: candidateUser._id,
                        status: 'completed',
                        attendanceOutcome: 'ATTENDED_COMPLETED'
                    });

                    if (completedCount >= 3) {
                        const { ensureMasterCertification } = await import('./certificationController.js');
                        await ensureMasterCertification(candidateUser._id, candidateUser);
                    }
                }
            } catch (snapErr) {
                console.error("[completeSession] Error recording candidate identity snapshot:", snapErr);
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
                    message: \`Your mock interview on \${dt.dateStr} at \${dt.timeSlotStr} has been marked as attended & completed. Once the mentor submits their evaluation, you can request feedback and view your certificate progress.\`,
                    metadata: { sessionId: session.sessionId, link: '/my-sessions' }
                });

                if (candidateUser && candidateUser.email) {
                    await enqueueEmail({
                        sessionId: session.sessionId,
                        recipientType: 'candidate',
                        to: candidateUser.email,
                        subject: 'Mockeefy: Interview Session Completed',
                        template: 'session_completed',
                        html: \`<p>Hi \${candidateUser.name || 'Candidate'},</p><p>Your mock interview session on \${dt.dateStr} at \${dt.timeSlotStr} has concluded successfully. Once your expert submits your evaluation, you can view your scorecard and track your certificate progress.</p><p><a href="https://mockeefy.com/my-sessions">View My Sessions</a></p>\`,
                        metadata: { sessionId: session.sessionId, outcome: 'ATTENDED_COMPLETED' }
                    });
                }
            } else if (attendanceOutcome === 'ATTENDED_INCOMPLETE') {
                await createNotification({
                    userId: session.candidateId,
                    type: 'session_incomplete',
                    title: 'Interview Session Ended Before Completion',
                    message: \`Your mock interview on \${dt.dateStr} at \${dt.timeSlotStr} was classified as attended but left before completion. Under platform policy, incomplete sessions do not qualify for certificates.\`,
                    metadata: { sessionId: session.sessionId, link: '/my-sessions' }
                });

                if (candidateUser && candidateUser.email) {
                    await enqueueEmail({
                        sessionId: session.sessionId,
                        recipientType: 'candidate',
                        to: candidateUser.email,
                        subject: 'Mockeefy: Interview Session Ended Early',
                        template: 'session_incomplete',
                        html: \`<p>Hi \${candidateUser.name || 'Candidate'},</p><p>Your mock interview on \${dt.dateStr} at \${dt.timeSlotStr} ended before completion. Under platform policy, incomplete sessions do not qualify for completion certificates.</p><p><a href="https://mockeefy.com/my-sessions">View My Sessions</a></p>\`,
                        metadata: { sessionId: session.sessionId, outcome: 'ATTENDED_INCOMPLETE' }
                    });
                }
            }
        } catch (notifErr) {
            console.error("[completeSession] Outcome notification dispatch error:", notifErr);
        }

        const payloadData = updatedCompletedSession || { sessionId: session.sessionId, _id: session._id, status: 'completed', attendanceOutcome };

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

        return res.json({ success: true, message: "Session completed with verified attendance", data: payloadData });
    } catch (error) {`;

  c = c.replace(oldCompleteBlock, newCompleteBlock);
  fs.writeFileSync(file, c, 'utf8');
  console.log('Updated sessionController.js with verified completion proof & atomic finalization.');
}
