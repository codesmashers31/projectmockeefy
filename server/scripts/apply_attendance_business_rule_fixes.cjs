const fs = require('fs');
const path = require('path');

// 1. Update server/controllers/sessionController.js
{
  const filePath = path.join(__dirname, '../controllers/sessionController.js');
  let c = fs.readFileSync(filePath, 'utf8');
  c = c.replace(/\r\n/g, '\n');

  // Change boundary check
  const oldBoundary = `        // 15-minute boundary check from session scheduled start
        const now = new Date();
        const startTime = new Date(session.startTime);
        if (!isNaN(startTime.getTime()) && now.getTime() < startTime.getTime() + 15 * 60 * 1000) {
            const remainingSeconds = Math.ceil((startTime.getTime() + 15 * 60 * 1000 - now.getTime()) / 1000);
            return res.status(400).json({
                success: false,
                message: \`Candidate attendance classification is locked for the first 15 minutes of the session. Available in \${remainingSeconds}s.\`
            });
        }`;

  const newBoundary = `        // 15-minute join grace period check applies strictly to DID_NOT_ATTEND (Mark Absent / No-Show)
        const now = new Date();
        const startTime = new Date(session.startTime);
        if (attendanceOutcome === 'DID_NOT_ATTEND') {
            if (!isNaN(startTime.getTime()) && now.getTime() < startTime.getTime() + 15 * 60 * 1000) {
                const remainingSeconds = Math.ceil((startTime.getTime() + 15 * 60 * 1000 - now.getTime()) / 1000);
                return res.status(400).json({
                    success: false,
                    message: \`Mark Absent is locked for the first 15 minutes of the session (Candidate join grace period). Available in \${remainingSeconds}s.\`
                });
            }
        }`;

  if (c.includes(oldBoundary)) {
    c = c.replace(oldBoundary, newBoundary);
    console.log('Fixed 15-minute boundary in sessionController.js');
  }

  // Remove minimum 15-min presence duration check
  const oldDurationCheck = `        // Authoritative Proof of Completion Validation for ATTENDED_COMPLETED
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
        }`;

  const newDurationCheck = `        // Authoritative Proof of Completion Validation
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
        }`;

  if (c.includes(oldDurationCheck)) {
    c = c.replace(oldDurationCheck, newDurationCheck);
    console.log('Removed minimum 15-min duration check in sessionController.js');
  }

  fs.writeFileSync(filePath, c, 'utf8');
}

// 2. Update client/src/pages/LiveMeeting.tsx
{
  const filePath = path.join(__dirname, '../../client/src/pages/LiveMeeting.tsx');
  let c = fs.readFileSync(filePath, 'utf8');
  c = c.replace(/\r\n/g, '\n');

  // Change isLocked to isNoShowLocked
  const oldLockDef = `        const hasCandidateJoined = Boolean(resolvedSession?.candidateJoinedAt || resolvedSession?.attendanceStatus === 'attended');
        const isLocked = startMs > 0 && nowMs < lockEndMs;`;
  const newLockDef = `        const hasCandidateJoined = Boolean(resolvedSession?.candidateJoinedAt || resolvedSession?.attendanceStatus === 'attended');
        const isNoShowLocked = startMs > 0 && nowMs < lockEndMs;`;

  if (c.includes(oldLockDef)) {
    c = c.replace(oldLockDef, newLockDef);
  }

  // Change badge display
  const oldBadge = `                {isLocked ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    Available in \${lockCountdownStr}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#0755E8] text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0755E8]" />
                    Unlocked (Action Required)
                  </span>
                )}`;

  const newBadge = `                {isNoShowLocked && !hasCandidateJoined ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    Mark Absent in \${lockCountdownStr}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#0755E8] text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0755E8]" />
                    Unlocked (Action Required)
                  </span>
                )}`;

  if (c.includes(oldBadge)) {
    c = c.replace(oldBadge, newBadge);
  }

  // Change content condition
  const oldContent = `            {/* Locked vs Unlocked Content */}
            {isLocked ? (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200/70 flex items-center justify-center text-slate-500 shrink-0">
                    <Lock className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                      Outcome Classification Unlocks at 15-Minute Mark
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                      Under platform policy, attendance classification is locked for the first 15 minutes of the session to ensure adequate evaluation time.
                    </p>
                  </div>
                </div>
                <div className="px-3.5 py-1.5 bg-slate-200 text-slate-700 font-mono text-xs font-bold rounded-lg shrink-0">
                  \${lockCountdownStr} remaining
                </div>
              </div>
            ) : (`;

  const newContent = `            {/* Locked vs Unlocked Content */}
            {isNoShowLocked && !hasCandidateJoined ? (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200/70 flex items-center justify-center text-slate-500 shrink-0">
                    <Lock className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                      Candidate Join Grace Period Active (15 Minutes)
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                      Under platform policy, experts must wait for the 15-minute join grace period before marking a candidate absent. Mark Absent unlocks at 15:00.
                    </p>
                  </div>
                </div>
                <div className="px-3.5 py-1.5 bg-slate-200 text-slate-700 font-mono text-xs font-bold rounded-lg shrink-0">
                  \${lockCountdownStr} remaining
                </div>
              </div>
            ) : (`;

  if (c.includes(oldContent)) {
    c = c.replace(oldContent, newContent);
  }

  // Update Option 2 disabled condition in card
  const oldOption2 = `                  {/* Option 2: DID_NOT_ATTEND */}
                  <label
                    className={\`relative p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2 cursor-pointer \${
                      hasCandidateJoined
                        ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200'
                        : selectedOutcome === 'DID_NOT_ATTEND'
                        ? 'bg-rose-50/70 border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }\`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        name="attendanceOutcome"
                        value="DID_NOT_ATTEND"
                        disabled={hasCandidateJoined}
                        checked={selectedOutcome === 'DID_NOT_ATTEND'}
                        onChange={() => setSelectedOutcome('DID_NOT_ATTEND')}
                        className="mt-1 text-rose-600 focus:ring-rose-500"
                      />
                      <div>
                        <span className="block text-xs font-bold text-slate-900">
                          Did Not Attend (No-Show)
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          Candidate did not enter within grace period. Excluded from certificates, non-refundable.
                        </p>
                      </div>
                    </div>
                    {hasCandidateJoined && (`;

  const newOption2 = `                  {/* Option 2: DID_NOT_ATTEND */}
                  <label
                    className={\`relative p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2 cursor-pointer \${
                      hasCandidateJoined || isNoShowLocked
                        ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200'
                        : selectedOutcome === 'DID_NOT_ATTEND'
                        ? 'bg-rose-50/70 border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }\`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        name="attendanceOutcome"
                        value="DID_NOT_ATTEND"
                        disabled={hasCandidateJoined || isNoShowLocked}
                        checked={selectedOutcome === 'DID_NOT_ATTEND'}
                        onChange={() => setSelectedOutcome('DID_NOT_ATTEND')}
                        className="mt-1 text-rose-600 focus:ring-rose-500"
                      />
                      <div>
                        <span className="block text-xs font-bold text-slate-900">
                          Did Not Attend (No-Show)
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {isNoShowLocked ? \`Locked during join grace period (unlocks in \${lockCountdownStr}).\` : 'Candidate did not enter within grace period. Excluded from certificates, non-refundable.'}
                        </p>
                      </div>
                    </div>
                    {hasCandidateJoined ? (
                      <span className="text-[10px] text-slate-400 font-medium">Candidate joined this session</span>
                    ) : isNoShowLocked ? (
                      <span className="text-[10px] text-amber-600 font-medium">Grace period active (\${lockCountdownStr})</span>
                    ) : null}
                  </label>`;

  if (c.includes(oldOption2)) {
    // replace till opening tag of next option
    const idx1 = c.indexOf(oldOption2);
    const idx2 = c.indexOf('{/* Option 3: ATTENDED_INCOMPLETE */}', idx1);
    c = c.substring(0, idx1) + newOption2 + '\n\n                  ' + c.substring(idx2);
  }

  // Update modal lock condition (lines 934-948)
  const oldModalLock = `            <div className="p-5 space-y-4">
              {startAt && nowTick < startAt.getTime() + 15 * 60 * 1000 ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <Lock className="w-4 h-4 text-amber-700" />
                    Attendance Classification Locked (15-Minute Requirement)
                  </div>
                  <p>
                    Platform policy requires experts to remain available for the first 15 minutes of the scheduled session. You may classify attendance and end the session in{' '}
                    <span className="font-mono font-bold">
                      {Math.floor(Math.max(0, startAt.getTime() + 15 * 60 * 1000 - nowTick) / 60000)}m{' '}
                      {Math.floor((Math.max(0, startAt.getTime() + 15 * 60 * 1000 - nowTick) % 60000) / 1000).toString().padStart(2, '0')}s
                    </span>.
                  </p>
                </div>
              ) : (`;

  const newModalLock = `            <div className="p-5 space-y-4">
              {selectedOutcome === 'DID_NOT_ATTEND' && (startAt && nowTick < startAt.getTime() + 15 * 60 * 1000) ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <Lock className="w-4 h-4 text-amber-700" />
                    Mark Absent Locked (15-Minute Join Grace Period)
                  </div>
                  <p>
                    Platform policy requires experts to remain available for the first 15 minutes of the scheduled session. Mark Absent becomes available in{' '}
                    <span className="font-mono font-bold">
                      {Math.floor(Math.max(0, startAt.getTime() + 15 * 60 * 1000 - nowTick) / 60000)}m{' '}
                      {Math.floor((Math.max(0, startAt.getTime() + 15 * 60 * 1000 - nowTick) % 60000) / 1000).toString().padStart(2, '0')}s
                    </span>.
                  </p>
                </div>
              ) : (`;

  if (c.includes(oldModalLock)) {
    c = c.replace(oldModalLock, newModalLock);
  }

  // Update modal confirm button condition (line 1054)
  const oldModalBtn = `              {!(startAt && nowTick < startAt.getTime() + 15 * 60 * 1000) && (
                <button
                  type="button"
                  onClick={handleConfirmEndSession}
                  disabled={!selectedOutcome || completing}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {completing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PhoneOff className="w-3.5 h-3.5" />}
                  <span>Confirm & End Session</span>
                </button>
              )}`;

  const newModalBtn = `              {!(selectedOutcome === 'DID_NOT_ATTEND' && (startAt && nowTick < startAt.getTime() + 15 * 60 * 1000)) && (
                <button
                  type="button"
                  onClick={handleConfirmEndSession}
                  disabled={!selectedOutcome || completing}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {completing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PhoneOff className="w-3.5 h-3.5" />}
                  <span>Confirm & End Session</span>
                </button>
              )}`;

  if (c.includes(oldModalBtn)) {
    c = c.replace(oldModalBtn, newModalBtn);
  }

  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Updated LiveMeeting.tsx with separated 15-minute grace period');
}
