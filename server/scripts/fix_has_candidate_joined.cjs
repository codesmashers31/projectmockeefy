const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../client/src/pages/LiveMeeting.tsx');
let c = fs.readFileSync(filePath, 'utf8');
c = c.replace(/\r\n/g, '\n');

// 1. Add component-scoped hasCandidateJoined
const oldScope = `  const sessionCandidateId = resolvedSession?.candidateId?._id || resolvedSession?.candidateId;
  const isCandidateInSession = Boolean(sessionCandidateId && currentUserId && String(sessionCandidateId) === String(currentUserId));
  const activeRole = isCandidateInSession ? 'candidate' : role;`;

const newScope = `  const sessionCandidateId = resolvedSession?.candidateId?._id || resolvedSession?.candidateId;
  const isCandidateInSession = Boolean(sessionCandidateId && currentUserId && String(sessionCandidateId) === String(currentUserId));
  const activeRole = isCandidateInSession ? 'candidate' : role;

  // Authoritative candidate attendance state derived safely from session record:
  const hasCandidateJoined = Boolean(
    resolvedSession?.candidateJoinedAt ||
    resolvedSession?.attendanceStatus === 'attended' ||
    resolvedSession?.candidateConnectionStatus === 'connected' ||
    resolvedSession?.candidateConnectionStatus === 'left'
  );`;

if (!c.includes('// Authoritative candidate attendance state derived safely from session record:')) {
  c = c.replace(oldScope, newScope);
  console.log('Added component-scoped hasCandidateJoined to GoogleMeetOnlyMeeting');
}

// 2. Remove redundant shadowing declaration in IIFE
const oldShadow = `        const lockDurationMinutes = 15;
        const lockEndMs = startMs + lockDurationMinutes * 60 * 1000;
        const hasCandidateJoined = Boolean(resolvedSession?.candidateJoinedAt || resolvedSession?.attendanceStatus === 'attended');
        const isNoShowLocked = startMs > 0 && nowMs < lockEndMs;`;

const newShadow = `        const lockDurationMinutes = 15;
        const lockEndMs = startMs + lockDurationMinutes * 60 * 1000;
        const isNoShowLocked = startMs > 0 && nowMs < lockEndMs;`;

if (c.includes(oldShadow)) {
  c = c.replace(oldShadow, newShadow);
  console.log('Removed shadowing declaration from IIFE');
}

// 3. Add robust empty session error boundary check if session is missing after loading
const oldLoading = `  if (loadingSession) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 py-6 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <MockeefyLogo className="w-11 h-11 shrink-0" />
                <div>
                  <p className="text-xs font-black tracking-wide uppercase text-slate-400">Mockeefy Live Session</p>
                  <h1 className="text-base sm:text-lg font-bold text-slate-900">Google Meet Interview Room</h1>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 flex flex-col items-center justify-center gap-3 min-h-[220px]">
            <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
            <p className="text-sm font-medium text-slate-600">Loading interview details...</p>
          </div>
        </div>
      </div>
    );
  }`;

const newLoading = `  if (loadingSession) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 py-6 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <MockeefyLogo className="w-11 h-11 shrink-0" />
                <div>
                  <p className="text-xs font-black tracking-wide uppercase text-slate-400">Mockeefy Live Session</p>
                  <h1 className="text-base sm:text-lg font-bold text-slate-900">Google Meet Interview Room</h1>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 flex flex-col items-center justify-center gap-3 min-h-[220px]">
            <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
            <p className="text-sm font-medium text-slate-600">Loading interview details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!resolvedSession && !loadingSession) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 py-6 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 flex flex-col items-center justify-center gap-3 min-h-[220px]">
            <AlertTriangle className="w-8 h-8 text-amber-500 mb-1" />
            <p className="text-sm font-bold text-slate-800">Interview Session Not Found</p>
            <p className="text-xs text-slate-500 max-w-sm text-center">Unable to load the requested interview session details. Please check your connection or return to sessions.</p>
            <button
              type="button"
              onClick={onLeave}
              className="mt-2 px-4 py-2 bg-[#0755E8] hover:bg-blue-700 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-xs"
            >
              Return to Sessions
            </button>
          </div>
        </div>
      </div>
    );
  }`;

if (!c.includes('Interview Session Not Found')) {
  c = c.replace(oldLoading, newLoading);
  console.log('Added safe empty session fallback state');
}

fs.writeFileSync(filePath, c, 'utf8');
console.log('LiveMeeting.tsx successfully patched and saved');
