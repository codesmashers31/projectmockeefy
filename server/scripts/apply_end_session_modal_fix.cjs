const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../../client/src/pages/LiveMeeting.tsx');
let code = fs.readFileSync(targetFile, 'utf8');

// 1. Ensure polling is set to 5000ms for fast multi-tab reactivity
code = code.replace(
  'const interval = setInterval(fetchSession, 20000);',
  'const interval = setInterval(fetchSession, 5000);'
);

// 2. Ensure auto-close checks for all concluded states
const oldAutoClose = `  // Auto-alert + auto-close when the session is completed by expert
  useEffect(() => {
    if (!meetingId) return;
    if (autoClosed) return;
    const status = resolvedSession?.status?.toLowerCase();
    if (status === 'completed') {
      setAutoClosed(true);
      playCompletionAlarm();
      toast.info('Interview completed. Returning to sessions...');
      window.setTimeout(() => onLeaveRef.current(), 1500);
    }
  }, [meetingId, resolvedSession?.status, autoClosed]);`;

const newAutoClose = `  // Auto-alert + auto-close when the session is completed by expert
  useEffect(() => {
    if (!meetingId) return;
    if (autoClosed) return;
    const status = resolvedSession?.status?.toLowerCase();
    if (status === 'completed' || status === 'candidate_no_show' || status === 'no-show' || status === 'cancelled') {
      setAutoClosed(true);
      playCompletionAlarm();
      toast.info('Interview session concluded. Returning to sessions...');
      window.setTimeout(() => onLeaveRef.current(), 1500);
    }
  }, [meetingId, resolvedSession?.status, autoClosed]);`;

if (code.includes(oldAutoClose)) {
  code = code.replace(oldAutoClose, newAutoClose);
  console.log('Updated autoClose effect');
}

// 3. Update handleConfirmEndSession to strictly validate and preserve modal on errors
const oldConfirm = `  const handleConfirmEndSession = async () => {
    if (!selectedOutcome) {
      toast.error('Please select an attendance outcome before ending the session.');
      return;
    }
    setCompleting(true);
    try {
      const payload: any = {
        attendanceOutcome: selectedOutcome,
        reason: selectedOutcome === 'DID_NOT_ATTEND' ? noShowReason || undefined : undefined
      };
      if (selectedOutcome === 'ATTENDED_COMPLETED') {
        payload.completionEvidence = {
          interviewConducted: true,
          summary: 'Full interview conducted and verified'
        };
      }
      const res = await axios.post(\`/api/sessions/\${meetingId}/complete\`, payload);
      if (res.data?.success) {
        setResolvedSession((prev: any) => ({
          ...prev,
          status: selectedOutcome === 'DID_NOT_ATTEND' ? 'CANDIDATE_NO_SHOW' : 'completed',
          attendanceOutcome: selectedOutcome
        }));
        toast.success(\`Session ended (\${selectedOutcome === 'ATTENDED_COMPLETED' ? 'Attended & Completed' : selectedOutcome === 'DID_NOT_ATTEND' ? 'Marked Absent' : 'Ended Before Completion'}).\`);
        setShowEndSessionModal(false);
        onLeave();
      } else {
        toast.error(res.data?.message || 'Failed to end meeting');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to end meeting');
    } finally {
      setCompleting(false);
    }
  };`;

const newConfirm = `  const handleConfirmEndSession = async () => {
    if (!selectedOutcome || completing) {
      return;
    }

    // Client-side validations
    if (selectedOutcome === 'DID_NOT_ATTEND') {
      if (hasCandidateJoined) {
        toast.error("Candidate joined this session. 'Did Not Attend' cannot be selected.");
        return;
      }
      if (startAt && nowTick < startAt.getTime() + 15 * 60 * 1000) {
        const remSec = Math.ceil((startAt.getTime() + 15 * 60 * 1000 - nowTick) / 1000);
        toast.error(\`Mark Absent is locked during the 15-minute join grace period (\${remSec}s remaining).\`);
        return;
      }
    } else if (selectedOutcome === 'ATTENDED_COMPLETED' || selectedOutcome === 'ATTENDED_INCOMPLETE') {
      if (!hasCandidateJoined) {
        toast.error("Candidate has not joined this session. An attended outcome cannot be selected.");
        return;
      }
    }

    setCompleting(true);
    try {
      const payload: any = {
        attendanceOutcome: selectedOutcome,
        reason: selectedOutcome === 'DID_NOT_ATTEND' ? (noShowReason.trim() || 'Candidate did not attend within 15-minute grace period') : undefined
      };
      if (selectedOutcome === 'ATTENDED_COMPLETED') {
        payload.completionEvidence = {
          interviewConducted: true,
          summary: 'Full interview conducted and verified'
        };
      } else if (selectedOutcome === 'ATTENDED_INCOMPLETE') {
        payload.completionEvidence = {
          interviewConducted: false,
          summary: 'Session ended before completion'
        };
      }

      const res = await axios.post(\`/api/sessions/\${meetingId}/complete\`, payload);
      if (res.data?.success) {
        setResolvedSession((prev: any) => ({
          ...prev,
          status: selectedOutcome === 'DID_NOT_ATTEND' ? 'CANDIDATE_NO_SHOW' : 'completed',
          attendanceOutcome: selectedOutcome
        }));
        toast.success(\`Session ended successfully (\${
          selectedOutcome === 'ATTENDED_COMPLETED' ? 'Attended & Completed' :
          selectedOutcome === 'DID_NOT_ATTEND' ? 'Marked Absent' : 'Attended but Left Early'
        }).\`);
        setShowEndSessionModal(false);
        onLeave();
      } else {
        toast.error(res.data?.message || 'Failed to end meeting');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to end meeting');
    } finally {
      setCompleting(false);
    }
  };`;

if (code.includes(oldConfirm)) {
  code = code.replace(oldConfirm, newConfirm);
  console.log('Updated handleConfirmEndSession');
}

// 4. Find the section from Quick Instructions closing tag up to showLeaveModal
// and replace with the clean modal only (removing the extra attendance div).

const searchStart = `        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-3">Quick Instructions</h3>
          <div className="space-y-2.5 text-sm text-slate-600">
            {activeRole === 'expert' ? (
              <>
                <p className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />Create a Google Meet link and save it here before interview starts.</p>
                <p className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />Use "Open in Google Meet" to verify your mic/camera setup.</p>
                <p className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />End the meeting only after the interview is fully completed.</p>
              </>
            ) : (
              <>
                <p className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />Wait for the expert to share a Google Meet link.</p>
                <p className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />Click "Open in Google Meet and Join" once the button appears.</p>
                <p className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />Keep this page open for session timer and controls.</p>
              </>
            )}
          </div>
        </div>
      </div>`;

const searchEnd = `      {/* Candidate Leave Meeting In-App Confirmation Modal */}
      {showLeaveModal && (`;

const startIndex = code.indexOf(searchStart);
const endIndex = code.indexOf(searchEnd);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not locate block bounds:', { startIndex, endIndex });
  process.exit(1);
}

const replacementModal = `${searchStart}

      {/* End Interview Session In-App Confirmation Modal (Only location for attendance outcome choices) */}
      {showEndSessionModal && (() => {
        const startMs = startAt ? startAt.getTime() : 0;
        const nowMs = nowTick;
        const lockDurationMinutes = 15;
        const lockEndMs = startMs + lockDurationMinutes * 60 * 1000;
        const isNoShowLocked = startMs > 0 && nowMs < lockEndMs;
        const lockRemMs = Math.max(0, lockEndMs - nowMs);
        const lockRemMin = Math.floor(lockRemMs / 60000);
        const lockRemSec = Math.floor((lockRemMs % 60000) / 1000);
        const lockCountdownStr = \`\${lockRemMin.toString().padStart(2, '0')}:\${lockRemSec.toString().padStart(2, '0')}\`;

        let confirmDisabledReason = '';
        if (!selectedOutcome) {
          confirmDisabledReason = 'Select an attendance outcome to proceed.';
        } else if (completing) {
          confirmDisabledReason = 'Ending session...';
        } else if (selectedOutcome === 'ATTENDED_COMPLETED') {
          if (!hasCandidateJoined) {
            confirmDisabledReason = 'Candidate has not joined this session yet.';
          }
        } else if (selectedOutcome === 'DID_NOT_ATTEND') {
          if (hasCandidateJoined) {
            confirmDisabledReason = 'Candidate joined this session. Cannot mark absent.';
          } else if (isNoShowLocked) {
            confirmDisabledReason = \`Mark Absent locked for 15-minute grace period (\${lockCountdownStr} remaining).\`;
          }
        } else if (selectedOutcome === 'ATTENDED_INCOMPLETE') {
          if (!hasCandidateJoined) {
            confirmDisabledReason = 'Candidate has not joined this session yet.';
          }
        }

        const isConfirmDisabled = Boolean(confirmDisabledReason) || completing;

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
            onClick={() => {
              if (!completing) setShowEndSessionModal(false);
            }}
          >
            <div
              className="relative bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-3rem)]"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0 bg-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                    <PhoneOff size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base leading-snug">End Interview Session?</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Select the Candidate's attendance outcome before ending this interview.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!completing) setShowEndSessionModal(false);
                  }}
                  disabled={completing}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body: Exactly Three Options */}
              <div className="p-5 space-y-3 overflow-y-auto min-h-0 flex-1">
                <div className="space-y-2.5">
                  {/* Option 1: Attended & Completed */}
                  <label
                    onClick={() => setSelectedOutcome('ATTENDED_COMPLETED')}
                    className={\`block p-3.5 rounded-xl border text-xs cursor-pointer transition-all \${
                      selectedOutcome === 'ATTENDED_COMPLETED'
                        ? 'bg-blue-50/70 border-[#0755E8] ring-2 ring-[#0755E8]/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }\`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="modalAttendanceOutcome"
                        value="ATTENDED_COMPLETED"
                        checked={selectedOutcome === 'ATTENDED_COMPLETED'}
                        onChange={() => setSelectedOutcome('ATTENDED_COMPLETED')}
                        className="mt-0.5 text-[#0755E8] focus:ring-[#0755E8]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">Attended &amp; Completed</span>
                          {hasCandidateJoined ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                              <CheckCircle2 size={11} /> Joined
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              Not joined
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5 leading-snug">
                          Candidate participated and completed the interview.
                        </p>
                        {!hasCandidateJoined && selectedOutcome === 'ATTENDED_COMPLETED' && (
                          <p className="text-[11px] text-rose-500 font-medium mt-1.5 flex items-center gap-1">
                            <AlertTriangle size={12} /> Requires candidate to have joined the session.
                          </p>
                        )}
                      </div>
                    </div>
                  </label>

                  {/* Option 2: Did Not Attend (No-Show) */}
                  <label
                    onClick={() => setSelectedOutcome('DID_NOT_ATTEND')}
                    className={\`block p-3.5 rounded-xl border text-xs cursor-pointer transition-all \${
                      selectedOutcome === 'DID_NOT_ATTEND'
                        ? 'bg-rose-50/70 border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }\`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="modalAttendanceOutcome"
                        value="DID_NOT_ATTEND"
                        checked={selectedOutcome === 'DID_NOT_ATTEND'}
                        onChange={() => setSelectedOutcome('DID_NOT_ATTEND')}
                        className="mt-0.5 text-rose-600 focus:ring-rose-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">Did Not Attend (No-Show)</span>
                          {isNoShowLocked && !hasCandidateJoined ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              <Lock size={11} /> {lockCountdownStr}
                            </span>
                          ) : hasCandidateJoined ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                              Invalid (Joined)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                              Unlocked
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5 leading-snug">
                          Candidate never joined the interview during the allowed grace period.
                        </p>
                        {hasCandidateJoined && selectedOutcome === 'DID_NOT_ATTEND' && (
                          <p className="text-[11px] text-rose-500 font-medium mt-1.5 flex items-center gap-1">
                            <AlertTriangle size={12} /> Candidate joined this session. Did Not Attend cannot be selected.
                          </p>
                        )}
                        {!hasCandidateJoined && isNoShowLocked && selectedOutcome === 'DID_NOT_ATTEND' && (
                          <div className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mt-2 leading-relaxed">
                            <p className="font-bold flex items-center gap-1 text-amber-950 mb-0.5">
                              <Lock size={12} /> 15-Minute Candidate Join Grace Period Active
                            </p>
                            Platform policy requires waiting 15 minutes before marking a candidate absent. Unlocks automatically in <span className="font-mono font-bold">{lockCountdownStr}</span>.
                          </div>
                        )}
                      </div>
                    </div>
                  </label>

                  {/* Option 3: Attended but Left Before Completion */}
                  <label
                    onClick={() => setSelectedOutcome('ATTENDED_INCOMPLETE')}
                    className={\`block p-3.5 rounded-xl border text-xs cursor-pointer transition-all \${
                      selectedOutcome === 'ATTENDED_INCOMPLETE'
                        ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }\`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="modalAttendanceOutcome"
                        value="ATTENDED_INCOMPLETE"
                        checked={selectedOutcome === 'ATTENDED_INCOMPLETE'}
                        onChange={() => setSelectedOutcome('ATTENDED_INCOMPLETE')}
                        className="mt-0.5 text-amber-600 focus:ring-amber-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">Attended but Left Before Completion</span>
                          {hasCandidateJoined ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                              <CheckCircle2 size={11} /> Joined
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              Not joined
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5 leading-snug">
                          Candidate joined but did not complete the interview.
                        </p>
                        {!hasCandidateJoined && selectedOutcome === 'ATTENDED_INCOMPLETE' && (
                          <p className="text-[11px] text-rose-500 font-medium mt-1.5 flex items-center gap-1">
                            <AlertTriangle size={12} /> Requires candidate to have joined the session.
                          </p>
                        )}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Modal Footer: Cancel and Confirm & End Session ALWAYS Rendered and Accessible */}
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
                <div className="text-xs text-slate-500 flex-1 min-w-0">
                  {confirmDisabledReason ? (
                    <span className="text-rose-600 font-medium truncate block" title={confirmDisabledReason}>
                      {confirmDisabledReason}
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 size={13} /> Ready to end session
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowEndSessionModal(false)}
                    disabled={completing}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs cursor-pointer transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmEndSession}
                    disabled={isConfirmDisabled}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    {completing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PhoneOff className="w-3.5 h-3.5" />}
                    <span>Confirm &amp; End Session</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

`;

code = code.substring(0, startIndex) + replacementModal + code.substring(endIndex);

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Successfully updated LiveMeeting.tsx!');
