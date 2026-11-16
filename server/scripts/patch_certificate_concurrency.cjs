const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../controllers/sessionController.js');
let code = fs.readFileSync(targetFile, 'utf8');

// 1. Update lines 393-440 in completeSession
const oldFinalizedBlock = `        if (!updatedCompletedSession) {
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
        }`;

const newFinalizedBlock = `        if (!updatedCompletedSession) {
            // Already finalized! Check if requested outcome conflicts with committed outcome
            const existing = await Session.findOne({ sessionId: session.sessionId }).lean();
            const existingOutcome = existing?.attendanceOutcome || (existing?.status === 'CANDIDATE_NO_SHOW' ? 'DID_NOT_ATTEND' : 'ATTENDED_COMPLETED');
            if (attendanceOutcome && existingOutcome && existingOutcome !== attendanceOutcome) {
                return res.status(409).json({
                    success: false,
                    conflict: true,
                    message: \`Conflict: Session has already been finalized with outcome '\${existingOutcome}'. Requested outcome '\${attendanceOutcome}' was rejected.\`,
                    data: existing
                });
            }
            return res.status(200).json({ success: true, message: "Session already finalized", data: existing });
        }`;

if (!code.includes(oldFinalizedBlock)) {
  console.error("Could not find oldFinalizedBlock!");
  process.exit(1);
}

code = code.replace(oldFinalizedBlock, newFinalizedBlock);
console.log("Successfully replaced finalized block and removed premature certificateIssued: true");

// 2. Update markCandidateNoShow completed conflict response
const oldNoShowCompleted = `        if (sStatus === 'completed' || sStatus === 'evaluated') {
            return res.status(400).json({ success: false, message: "Completed sessions cannot be marked as a no-show." });
        }`;

const newNoShowCompleted = `        if (sStatus === 'completed' || sStatus === 'evaluated') {
            return res.status(409).json({
                success: false,
                conflict: true,
                message: \`Conflict: Session has already been finalized with status '\${session.status}' and outcome '\${session.attendanceOutcome || 'ATTENDED_COMPLETED'}'. Mark absent rejected.\`,
                data: session
            });
        }`;

if (code.includes(oldNoShowCompleted)) {
  code = code.replace(oldNoShowCompleted, newNoShowCompleted);
  console.log("Successfully updated markCandidateNoShow 409 conflict check");
}

fs.writeFileSync(targetFile, code, 'utf8');
console.log("sessionController.js saved successfully!");
