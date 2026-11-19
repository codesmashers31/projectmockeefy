// --- Google Meet only: no socket, no WebRTC ---

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Clock, Copy, ExternalLink, HelpCircle, LogOut, PhoneOff, CheckCircle2, AlertTriangle, Star, X, User, Briefcase, CalendarDays, Timer, ChevronLeft, Loader2, UserX, Lock, Check, UserCheck, ShieldAlert, ShieldCheck, Video, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useSocket, useDataSync } from '../context/SocketContext';
import { IdentityConfirmationModal } from '../components/IdentityConfirmationModal';
import { useCertificateVerification } from '../hooks/useCertificateVerification';
import axios from '../lib/axios';
import MockeefyLogo from '../components/MockeefyLogo';

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const GoogleMeetOnlyMeeting = ({
  meetingId,
  role,
  onLeave,
  sessionData,
  currentUserId,
}: {
  meetingId: string;
  role: string;
  onLeave: () => void;
  sessionData: any;
  currentUserId: string;
}) => {
  const [localMeetLink, setLocalMeetLink] = useState<string | null>(null);
  const [fetchedMeetingLink, setFetchedMeetingLink] = useState<string | null>(null);
  const [resolvedSession, setResolvedSession] = useState<any>(sessionData?.session || null);
  const [loadingSession, setLoadingSession] = useState<boolean>(!sessionData?.session);
  const { socket } = useSocket();

  // Authoritative session participant check:
  // If the resolved session specifies candidateId and matches currentUserId, force candidate view
  const sessionCandidateId = resolvedSession?.candidateId?._id || resolvedSession?.candidateId;
  const isCandidateInSession = Boolean(sessionCandidateId && currentUserId && String(sessionCandidateId) === String(currentUserId));
  const activeRole = isCandidateInSession ? 'candidate' : role;

  // Authoritative candidate attendance state derived safely from session record:
  const hasCandidateJoined = Boolean(
    resolvedSession?.candidateJoinedAt ||
    resolvedSession?.attendanceStatus === 'attended' ||
    resolvedSession?.candidateConnectionStatus === 'connected' ||
    resolvedSession?.candidateConnectionStatus === 'left'
  );

  const [expertReviewSubmitted, setExpertReviewSubmitted] = useState(false);
  const [autoClosed, setAutoClosed] = useState(false);
  const onLeaveRef = useRef(onLeave);
  const [showMeetLinkInput, setShowMeetLinkInput] = useState(false);
  const [meetLinkInputValue, setMeetLinkInputValue] = useState('');
  const [savingMeetLink, setSavingMeetLink] = useState(false);
  const [showMeetHelp, setShowMeetHelp] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [completing, setCompleting] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showNoShowModal, setShowNoShowModal] = useState(false);
  const [submittingNoShow, setSubmittingNoShow] = useState(false);
  const [noShowReason, setNoShowReason] = useState('');
  type AttendanceOutcome = 'ATTENDED_COMPLETED' | 'DID_NOT_ATTEND' | 'ATTENDED_INCOMPLETE';
  const [selectedOutcome, setSelectedOutcome] = useState<AttendanceOutcome | null>(null);
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!meetingId) return;
    axios.post(`/api/sessions/${meetingId}/join`).catch(() => {});
  }, [meetingId]);
  const [reviewForm, setReviewForm] = useState({
    technicalRating: 4,
    communicationRating: 4,
    problemSolvingRating: 4,
    confidenceRating: 4,
    strengths: '',
    improvements: '',
    feedback: '',
  });

  const sessionEndTime = resolvedSession?.endTime ? new Date(resolvedSession.endTime).getTime() : null;

  const overallRating = Number((
    (reviewForm.technicalRating +
      reviewForm.communicationRating +
      reviewForm.problemSolvingRating +
      reviewForm.confidenceRating) / 4
  ).toFixed(1));

  const isTimerEnded = remainingSeconds != null && remainingSeconds <= 0;
  const canReviewCandidate = activeRole === 'expert' && isTimerEnded && !expertReviewSubmitted;
  const candidateName = resolvedSession?.candidateDetails?.name || resolvedSession?.candidateName || 'Candidate';

  const fetchReviewStatus = async () => {
    if (!meetingId) return;
    try {
      const res = await axios.get(`/api/sessions/${meetingId}/reviews`);
      setExpertReviewSubmitted(Boolean(res.data?.data?.expertReview));
    } catch (_) { }
  };

  useEffect(() => {
    onLeaveRef.current = onLeave;
  }, [onLeave]);

  const playCompletionAlarm = async () => {
    try {
      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as any;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const destination = ctx.destination;

      // Short beep pattern using WebAudio (no external audio files required).
      const beepFrequencies = [880, 660, 880];
      const beepCount = beepFrequencies.length;
      const startAt = ctx.currentTime + 0.02;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.0001, startAt);
      masterGain.gain.exponentialRampToValueAtTime(0.35, startAt + 0.02);
      masterGain.connect(destination);

      beepFrequencies.forEach((freq: number, i: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, startAt + i * 0.22);
        gain.gain.exponentialRampToValueAtTime(0.8, startAt + i * 0.22 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + i * 0.22 + 0.16);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startAt + i * 0.22);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(startAt + i * 0.22);
        osc.stop(startAt + i * 0.22 + 0.18);
      });

      const totalMs = Math.ceil(beepCount * 220 + 500);
      window.setTimeout(() => {
        try {
          masterGain.disconnect();
          ctx.close();
        } catch (_) {}
      }, totalMs);
    } catch (_) {
      // Ignore audio errors (autoplay restrictions, unsupported contexts, etc.)
    }

    try {
      if ('vibrate' in navigator) navigator.vibrate([120, 80, 120]);
    } catch (_) {}
  };

  useEffect(() => {
    if (!meetingId) return;
    const fetchSession = async () => {
      try {
        const res = await axios.get(`/api/sessions/${meetingId}`);
        if (res.data) setResolvedSession(res.data);
        const link = res.data?.meetingLink || res.data?.meetLink || null;
        if (link && /meet\.google\.com/i.test(link)) setFetchedMeetingLink(link);
      } catch (_) {}
      finally {
        setLoadingSession(false);
      }
    };
    fetchSession();
    const interval = setInterval(fetchSession, 5000);
    return () => clearInterval(interval);
  }, [meetingId]);

  useEffect(() => {
    fetchReviewStatus();
    const interval = setInterval(fetchReviewStatus, 20000);
    return () => clearInterval(interval);
  }, [meetingId]);

  useEffect(() => {
    if (!meetingId || !socket) return;
    socket.emit('join-session', meetingId);
    return () => {
      socket.emit('leave-session', meetingId);
    };
  }, [meetingId, socket]);

  useDataSync(['SESSION_UPDATED', 'RECONNECTED'], (payload) => {
    if (!payload) return;
    const isTargetSession =
      payload.sessionId === meetingId ||
      payload.data?.sessionId === meetingId ||
      (payload.data?._id && String(payload.data._id) === String(meetingId));

    if (isTargetSession || payload.type === 'RECONNECTED') {
      if (payload.data) {
        setResolvedSession((prev: any) => ({ ...prev, ...payload.data }));
        const link = payload.data.meetingLink || payload.data.meetLink;
        if (link && /meet\.google\.com/i.test(link)) {
          setFetchedMeetingLink(link);
          setLocalMeetLink(link);
        }
      } else {
        axios.get(`/api/sessions/${meetingId}`)
          .then(res => {
            if (res.data) {
              setResolvedSession(res.data);
              const link = res.data.meetingLink || res.data.meetLink;
              if (link && /meet\.google\.com/i.test(link)) {
                setFetchedMeetingLink(link);
              }
            }
          })
          .catch(() => {});
      }
    }
  });

  // Auto-alert + auto-close when the session is completed by expert
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
  }, [meetingId, resolvedSession?.status, autoClosed]);

  useEffect(() => {
    if (!sessionEndTime) return;
    const tick = () => {
      const rem = Math.max(0, Math.floor((sessionEndTime - Date.now()) / 1000));
      setRemainingSeconds(rem);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [sessionEndTime]);

  const googleMeetLink = localMeetLink || fetchedMeetingLink || resolvedSession?.meetingLink || resolvedSession?.meetLink || sessionData?.session?.meetingLink || sessionData?.session?.meetLink;
  const isGoogleMeetUrl = typeof googleMeetLink === 'string' && /meet\.google\.com/i.test(googleMeetLink);
  const expertName = resolvedSession?.expertDetails?.name || 'Expert';
  const expertRole = resolvedSession?.expertDetails?.role || 'Interview Expert';
  const expertCompany = resolvedSession?.expertDetails?.company || 'N/A';
  const topicLabel = resolvedSession?.topics?.length ? resolvedSession.topics.join(', ') : 'General Mock Interview';
  const startAt = resolvedSession?.startTime ? new Date(resolvedSession.startTime) : null;
  const endAt = resolvedSession?.endTime ? new Date(resolvedSession.endTime) : null;
  const durationMins = startAt && endAt ? Math.max(1, Math.round((endAt.getTime() - startAt.getTime()) / 60000)) : null;

  const isBeforeStart = startAt ? nowTick < startAt.getTime() : false;
  const isAfterEnd = sessionEndTime ? nowTick > sessionEndTime : false;
  const isLiveNow = !isBeforeStart && !isAfterEnd;

  const timeToStartStr = useMemo(() => {
    if (!startAt || nowTick >= startAt.getTime()) return null;
    const diffMs = startAt.getTime() - nowTick;
    const diffSec = Math.floor(diffMs / 1000);
    const days = Math.floor(diffSec / 86400);
    const hours = Math.floor((diffSec % 86400) / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m ${diffSec % 60}s`;
  }, [startAt, nowTick]);

  const handleSaveMeetLink = async () => {
    const link = meetLinkInputValue.trim();
    if (!link || !/meet\.google\.com/i.test(link)) {
      toast.error('Enter a valid Google Meet link (e.g. https://meet.google.com/xxx-xxxx-xxx)');
      return;
    }
    setSavingMeetLink(true);
    try {
      await axios.patch(`/api/sessions/${meetingId}/meeting-link`, { meetingLink: link });
      setLocalMeetLink(link);
      setShowMeetLinkInput(false);
      setMeetLinkInputValue('');
      toast.success('Google Meet link saved. Candidate can open it below.');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save link');
    } finally {
      setSavingMeetLink(false);
    }
  };

  const fetchMeetingLinkOnce = async () => {
    if (!meetingId) return;
    try {
      const res = await axios.get(`/api/sessions/${meetingId}`);
      const link = res.data?.meetingLink || res.data?.meetLink || null;
      if (link && /meet\.google\.com/i.test(link)) {
        setFetchedMeetingLink(link);
        toast.success('Meet link loaded. Click "Open in Google Meet" to join.');
      } else {
        toast.info('Expert has not added a Meet link yet. Ask them to add it.');
      }
    } catch (_) {
      toast.error('Could not load Meet link.');
    }
  };

  const handleJoinWithGoogleMeet = () => {
    if (isGoogleMeetUrl && googleMeetLink) {
      window.open(googleMeetLink, '_blank', 'noopener,noreferrer');
      toast.success('Opened Google Meet in a new tab');
    } else {
      window.open('https://meet.google.com/new', '_blank', 'noopener,noreferrer');
      toast.info('Create your meeting, then paste the link above and Save (expert).');
    }
  };

  const handleConfirmNoShow = async () => {
    if (submittingNoShow) return;
    setSubmittingNoShow(true);
    try {
      const res = await axios.post(`/api/sessions/${meetingId}/no-show`, {
        reason: noShowReason.trim() || undefined
      });
      if (res.data?.success) {
        toast.success("Candidate marked as absent.");
        setShowNoShowModal(false);
        onLeave();
      } else {
        toast.error(res.data?.message || "Failed to mark candidate absent");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Could not mark candidate as absent");
    } finally {
      setSubmittingNoShow(false);
    }
  };

  const handleClickEndOrLeave = () => {
    if (activeRole !== 'expert') {
      setShowLeaveModal(true);
    } else {
      setShowEndSessionModal(true);
    }
  };

  const handleConfirmEndSession = async () => {
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
        toast.error(`Mark Absent is locked during the 15-minute join grace period (${remSec}s remaining).`);
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

      const res = await axios.post(`/api/sessions/${meetingId}/complete`, payload);
      if (res.data?.success) {
        setResolvedSession((prev: any) => ({
          ...prev,
          status: selectedOutcome === 'DID_NOT_ATTEND' ? 'CANDIDATE_NO_SHOW' : 'completed',
          attendanceOutcome: selectedOutcome
        }));
        toast.success(`Session ended successfully (${
          selectedOutcome === 'ATTENDED_COMPLETED' ? 'Attended & Completed' :
          selectedOutcome === 'DID_NOT_ATTEND' ? 'Marked Absent' : 'Attended but Left Early'
        }).`);
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
  };

  const handleSubmitCandidateReview = async () => {
    if (!resolvedSession?.candidateId || !resolvedSession?.expertId) {
      toast.error('Session participant details missing. Please refresh and try again.');
      return;
    }

    if (!reviewForm.feedback.trim()) {
      toast.error('Please add detailed feedback before submitting.');
      return;
    }

    setSubmittingReview(true);
    try {
      await axios.post(`/api/sessions/${meetingId}/review`, {
        overallRating,
        technicalRating: reviewForm.technicalRating,
        communicationRating: reviewForm.communicationRating,
        feedback: `${reviewForm.feedback.trim()} \n\nAdditional Scores:\n- Problem Solving: ${reviewForm.problemSolvingRating}/5\n- Confidence: ${reviewForm.confidenceRating}/5`,
        strengths: reviewForm.strengths.split(',').map((s) => s.trim()).filter(Boolean),
        weaknesses: reviewForm.improvements.split(',').map((s) => s.trim()).filter(Boolean),
        expertId: resolvedSession.expertId || currentUserId,
        candidateId: resolvedSession.candidateId,
        reviewerRole: 'expert',
      });

      setExpertReviewSubmitted(true);
      setShowReviewModal(false);
      toast.success('Feedback submitted.');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderRating = (
    label: string,
    value: number,
    onChange: (value: number) => void
  ) => (
    <div>
      <label className="text-sm font-medium text-slate-700 block mb-1.5">{label}</label>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={`${label}-${star}`}
            type="button"
            onClick={() => onChange(star)}
            className={`transition-transform hover:scale-110 ${star <= value ? 'text-amber-400' : 'text-slate-300'}`}
          >
            <Star className="w-5 h-5 fill-current" />
          </button>
        ))}
        <span className="text-xs text-slate-500 ml-1">{value}/5</span>
      </div>
    </div>
  );

  const copyMeetingId = () => {
    navigator.clipboard.writeText(meetingId);
    toast.success('Meeting ID copied');
  };

  if (loadingSession) {
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
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-6 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Unified Executive Header */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 shadow-2xs">
              <MockeefyLogo className="w-8 h-8" />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Google Meet Interview Room
                </h1>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider ${
                  isTimerEnded
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : isLiveNow
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/90"
                    : "bg-blue-50 text-[#0755E8] border border-blue-200/80"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    isTimerEnded ? "bg-rose-500" : isLiveNow ? "bg-emerald-500 animate-pulse" : "bg-[#0755E8]"
                  }`} />
                  <span>{isTimerEnded ? "Session Concluded" : isLiveNow ? "Live In Progress" : "Scheduled Session"}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                Session ID: <span className="font-mono text-slate-700 font-semibold">{meetingId}</span>
                <button
                  type="button"
                  onClick={copyMeetingId}
                  className="ml-2 text-[#0755E8] hover:text-[#0645C7] text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 transition-colors"
                  title="Copy Session ID"
                >
                  <Copy size={11} />
                  <span>Copy ID</span>
                </button>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={onLeave}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              <ChevronLeft size={14} />
              <span>Back</span>
            </button>
            <span className="px-3 py-2 rounded-xl text-xs font-bold capitalize bg-slate-100 border border-slate-200 text-slate-700">
              {activeRole || 'participant'}
            </span>
            <button
              type="button"
              onClick={handleClickEndOrLeave}
              disabled={completing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50 whitespace-nowrap"
            >
              {activeRole === 'expert' ? <PhoneOff size={14} /> : <LogOut size={14} />}
              <span>{activeRole === 'expert' ? 'End Interview' : 'Leave Room'}</span>
            </button>
          </div>
        </div>

        {/* Timer Ended Alert Banner */}
        {isTimerEnded && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl px-5 py-4 animate-pulse shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-rose-700">
                <AlertTriangle size={18} />
                <span className="text-xs sm:text-sm font-bold">
                  Session timer ended. Please conclude the call and submit candidate feedback.
                </span>
              </div>
              {canReviewCandidate && (
                <button
                  type="button"
                  onClick={() => setShowReviewModal(true)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
                >
                  Review Candidate
                </button>
              )}
              {activeRole === 'expert' && expertReviewSubmitted && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Candidate review submitted
                </span>
              )}
            </div>
          </div>
        )}

        {/* Main Live Meeting Action Card */}
        <div className="relative rounded-[24px] bg-gradient-to-br from-white via-white to-blue-50/40 border border-slate-200/90 p-6 sm:p-8 shadow-xs overflow-hidden text-left">
          {/* Subtle atmospheric ambient glow */}
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-blue-200/25 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            {/* Top row: Video Call Status & Timer Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#0755E8] text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                  <Video className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                      Google Meet Live Room
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowMeetHelp(true)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title="Google Meet Help & FAQ"
                    >
                      <HelpCircle size={16} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 font-normal mt-0.5">
                    1-on-1 verified video meeting conducted via Google Meet with real-time feedback.
                  </p>
                </div>
              </div>

              {/* Real-time Schedule / Timer Pill */}
              <div className="flex items-center gap-2">
                {isBeforeStart ? (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200/80 text-[#0755E8] text-xs font-bold shadow-2xs">
                    <Clock size={14} className="text-[#0755E8]" />
                    <span>Starts in {timeToStartStr}</span>
                  </div>
                ) : isLiveNow ? (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/90 text-emerald-800 text-xs font-bold shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live • Ends in {formatTimer(remainingSeconds || 0)}</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                    <AlertTriangle size={14} className="text-amber-600" />
                    <span>Session Concluded</span>
                  </div>
                )}
              </div>
            </div>

            {/* Launch & Control Actions */}
            <div className="space-y-4">
              {activeRole === 'expert' ? (
                <>
                  {isGoogleMeetUrl ? (
                    <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                          <span className="text-xs sm:text-sm font-bold text-slate-800">
                            Google Meet link is active. Candidate can join now.
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleJoinWithGoogleMeet}
                            className="px-5 py-2.5 rounded-xl bg-[#0755E8] hover:bg-[#0645C7] text-white text-xs font-bold shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <ExternalLink size={14} />
                            <span>Open in Google Meet</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowMeetLinkInput(true); setMeetLinkInputValue(googleMeetLink || ''); }}
                            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                          >
                            Change Link
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : showMeetLinkInput ? (
                    <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                        Paste Google Meet Link
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <input
                          type="url"
                          placeholder="https://meet.google.com/xxx-xxxx-xxx"
                          value={meetLinkInputValue}
                          onChange={(e) => setMeetLinkInputValue(e.target.value)}
                          className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs sm:text-sm font-semibold placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:border-[#0755E8] focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSaveMeetLink}
                            disabled={savingMeetLink}
                            className="px-5 py-2.5 rounded-xl bg-[#0755E8] hover:bg-[#0645C7] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs whitespace-nowrap"
                          >
                            {savingMeetLink ? 'Saving...' : 'Save Link'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowMeetLinkInput(false); setMeetLinkInputValue(''); }}
                            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Add Google Meet Link</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Create a meeting in Google Meet, copy its link, and save it here for the candidate.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowMeetLinkInput(true)}
                          className="px-4 py-2.5 rounded-xl bg-[#0755E8] hover:bg-[#0645C7] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                        >
                          Paste Meet Link
                        </button>
                        <button
                          type="button"
                          onClick={handleJoinWithGoogleMeet}
                          className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                        >
                          Create New Meet
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Candidate View */
                <div className="space-y-4">
                  {isGoogleMeetUrl ? (
                    <div className="flex flex-col items-center justify-center text-center p-6 sm:p-8 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3.5">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/90 text-xs font-bold shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Google Meet Link Ready</span>
                      </div>

                      <h3 className="text-base sm:text-lg font-black text-slate-900">
                        Your 1-on-1 Mock Interview Call is Ready
                      </h3>
                      <p className="text-xs text-slate-500 max-w-md leading-relaxed font-normal">
                        Click below to open the video call in a new Google Meet tab. Keep this Mockeefy tab open to track your remaining time and access session rubrics.
                      </p>

                      <button
                        type="button"
                        onClick={handleJoinWithGoogleMeet}
                        className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-[#0755E8] to-[#0440BD] hover:from-[#0645C7] hover:to-[#033496] active:bg-[#053BA8] text-white text-sm sm:text-base font-black rounded-xl shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer inline-flex items-center justify-center gap-2.5 mt-2"
                      >
                        <ExternalLink className="w-5 h-5 stroke-[2.2]" />
                        <span>Open in Google Meet and Join</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0755E8] flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">Waiting for Expert to Share Meet Link</h4>
                      <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                        The interview expert will add the Google Meet link shortly before your scheduled start time.
                      </p>
                      <button
                        type="button"
                        onClick={fetchMeetingLinkOnce}
                        className="px-4 py-2 rounded-xl bg-[#0755E8] hover:bg-[#0645C7] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        Refresh Link
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Micro disclaimer footer */}
            <div className="pt-2 flex items-center justify-center gap-2 text-xs text-slate-500 text-center font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>This session uses Google Meet for high-fidelity video &amp; screen sharing.</span>
            </div>
          </div>
        </div>

        {/* Matchup & Details Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5 text-left">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Interview Participants &amp; Track
              </h3>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Verified session details and technical domain focus.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold text-[#0755E8] bg-blue-50 border border-blue-200/70 shadow-2xs">
              {topicLabel}
            </span>
          </div>

          {/* Candidate & Expert Matchup Grid */}
          <div className="grid gap-3.5 sm:grid-cols-2">
            {/* Candidate Card */}
            <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/40 via-white to-white p-4.5 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100/70 text-[#0755E8] text-[10.5px] font-black uppercase tracking-wider">
                  <User size={12} />
                  <span>Candidate</span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Mock Interviewee</span>
              </div>
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-[#EAF2FF] text-[#0755E8] font-black text-base flex items-center justify-center shrink-0 border border-blue-200 shadow-2xs">
                  {candidateName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-black text-slate-900 truncate">{candidateName}</h4>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {resolvedSession?.candidateDetails?.email || 'Email not available'}
                  </p>
                </div>
              </div>
            </div>

            {/* Expert Card */}
            <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-white p-4.5 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100/70 text-emerald-800 text-[10.5px] font-black uppercase tracking-wider">
                  <Briefcase size={12} />
                  <span>Interview Expert</span>
                </div>
                {expertCompany !== 'N/A' && (
                  <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-slate-800 font-bold text-[11px] shadow-2xs">
                    {expertCompany}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 font-black text-base flex items-center justify-center shrink-0 border border-emerald-200 shadow-2xs">
                  {expertName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-black text-slate-900 truncate">{expertName}</h4>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {expertRole} {expertCompany !== 'N/A' ? `• ${expertCompany}` : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Specifications Cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-1">
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5 shadow-2xs">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <CalendarDays size={14} className="text-[#0755E8]" />
                <span className="text-xs font-bold text-slate-700">Date</span>
              </div>
              <p className="text-sm font-black text-slate-900">
                {startAt ? startAt.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5 shadow-2xs">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Clock size={14} className="text-[#0755E8]" />
                <span className="text-xs font-bold text-slate-700">Scheduled Time</span>
              </div>
              <p className="text-sm font-black text-slate-900">
                {startAt ? startAt.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) : '--:--'}
                {' - '}
                {endAt ? endAt.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5 shadow-2xs">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Timer size={14} className="text-[#0755E8]" />
                <span className="text-xs font-bold text-slate-700">Duration</span>
              </div>
              <p className="text-sm font-black text-slate-900">
                {durationMins ? `${durationMins} mins` : '30 mins'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5 shadow-2xs">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Briefcase size={14} className="text-[#0755E8]" />
                <span className="text-xs font-bold text-slate-700">Topic</span>
              </div>
              <p className="text-sm font-black text-slate-900 truncate" title={topicLabel}>
                {topicLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Instructions & Live Guidelines */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs text-left space-y-4">
          <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Interview Guidelines &amp; Quick Tips</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {activeRole === 'expert' ? (
              <>
                <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 shadow-2xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-600 leading-snug">
                    <strong className="text-slate-800 font-bold block mb-0.5">Google Meet Setup</strong>
                    Create a Google Meet link and save it above before the interview starts.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 shadow-2xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-600 leading-snug">
                    <strong className="text-slate-800 font-bold block mb-0.5">Microphone &amp; Screen</strong>
                    Use "Open in Google Meet" to verify your mic and screen sharing setup.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 shadow-2xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-600 leading-snug">
                    <strong className="text-slate-800 font-bold block mb-0.5">Ending &amp; Feedback</strong>
                    End the meeting and submit candidate scorecard once the round is completed.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 shadow-2xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-600 leading-snug">
                    <strong className="text-slate-800 font-bold block mb-0.5">Join When Ready</strong>
                    Click "Open in Google Meet and Join" to enter the video interview in a new tab.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 shadow-2xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-600 leading-snug">
                    <strong className="text-slate-800 font-bold block mb-0.5">Keep Controller Open</strong>
                    Keep this Mockeefy control room open in the background to track session time.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 shadow-2xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-600 leading-snug">
                    <strong className="text-slate-800 font-bold block mb-0.5">Evaluation &amp; Rubrics</strong>
                    Your interviewer will provide verbal feedback and submit written rubrics after the call.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

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
        const lockCountdownStr = `${lockRemMin.toString().padStart(2, '0')}:${lockRemSec.toString().padStart(2, '0')}`;

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
            confirmDisabledReason = `Mark Absent locked for 15-minute grace period (${lockCountdownStr} remaining).`;
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
                    className={`block p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedOutcome === 'ATTENDED_COMPLETED'
                        ? 'bg-blue-50/70 border-[#0755E8] ring-2 ring-[#0755E8]/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
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
                    className={`block p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedOutcome === 'DID_NOT_ATTEND'
                        ? 'bg-rose-50/70 border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
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
                    className={`block p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedOutcome === 'ATTENDED_INCOMPLETE'
                        ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
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

      {/* Candidate Leave Meeting In-App Confirmation Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                  <LogOut size={16} />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Leave Meeting Room?</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to exit the live meeting room? You can return from My Sessions as long as the session is still active.
              </p>
            </div>
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                Stay in Meeting
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowLeaveModal(false);
                  try {
                    await axios.post('/api/sessions/' + meetingId + '/leave');
                  } catch (_) {}
                  onLeave();
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Exit Meeting
              </button>
            </div>
          </div>
        </div>
      )}

      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45" onClick={() => setShowReviewModal(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Candidate Review</h3>
                <p className="text-xs text-slate-500">Session feedback for {candidateName}</p>
              </div>
              <button type="button" onClick={() => setShowReviewModal(false)} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                {renderRating('Technical Skills', reviewForm.technicalRating, (v) => setReviewForm((f) => ({ ...f, technicalRating: v })))}
                {renderRating('Communication', reviewForm.communicationRating, (v) => setReviewForm((f) => ({ ...f, communicationRating: v })))}
                {renderRating('Problem Solving', reviewForm.problemSolvingRating, (v) => setReviewForm((f) => ({ ...f, problemSolvingRating: v })))}
                {renderRating('Confidence', reviewForm.confidenceRating, (v) => setReviewForm((f) => ({ ...f, confidenceRating: v })))}
              </div>

              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                Overall score (auto-calculated): <strong>{overallRating}/5</strong>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Strengths (comma separated)</label>
                <input
                  value={reviewForm.strengths}
                  onChange={(e) => setReviewForm((f) => ({ ...f, strengths: e.target.value }))}
                  placeholder="Example: Clear fundamentals, Good debugging, Structured approach"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Areas for Improvement (comma separated)</label>
                <input
                  value={reviewForm.improvements}
                  onChange={(e) => setReviewForm((f) => ({ ...f, improvements: e.target.value }))}
                  placeholder="Example: Time management, Better edge-case handling"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Detailed Feedback</label>
                <textarea
                  value={reviewForm.feedback}
                  onChange={(e) => setReviewForm((f) => ({ ...f, feedback: e.target.value }))}
                  placeholder="Summarize interview performance, strengths, and next steps."
                  rows={5}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm resize-none"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
              <button type="button" onClick={() => setShowReviewModal(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitCandidateReview}
                disabled={submittingReview}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-60"
              >
                {submittingReview ? 'Submitting...' : 'Submit Candidate Review'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showMeetHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45" onClick={() => setShowMeetHelp(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-slate-900 font-bold text-lg mb-3 flex items-center gap-2">
              <HelpCircle size={20} className="text-blue-600" />
              How to use Google Meet
            </h3>
            <div className="text-slate-600 text-sm space-y-3">
              <p><strong className="text-slate-900">Expert:</strong> Click &quot;Paste Meet link&quot;, create a meeting at meet.google.com/new, copy the link, then paste and save.</p>
              <p><strong className="text-slate-900">Candidate:</strong> Once the expert has saved a link, click &quot;Open in Google Meet and Join&quot;. If you don’t see it, click &quot;Refresh link&quot;.</p>
            </div>
            <button type="button" onClick={() => setShowMeetHelp(false)} className="mt-4 w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">Got it</button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Page wrapper ---
export default function LiveMeetingPage() {
  const { sessionId: sessionIdParam } = useParams<{ sessionId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { data: verificationData, confirmIdentity: confirmIdentityApi, refreshVerification } = useCertificateVerification();
  const [showIdentityModal, setShowIdentityModal] = useState(false);

  const sessionFromState = (location.state as any)?.session;
  const meetingId = sessionIdParam || searchParams.get('meetingId') || sessionFromState?.sessionId || null;

  // Security-hardened authoritative role resolution:
  // AuthContext is the absolute source of truth. Non-expert users (candidates/users)
  // CANNOT be elevated to expert by tampering with URL parameters (?role=expert) or location.state.
  const authUserType = String((user as any)?.userType || (user as any)?.role || '').toLowerCase();
  const isAuthExpert = authUserType === 'expert' || authUserType === 'admin';

  let role: 'expert' | 'candidate' = 'candidate';
  if (isAuthExpert) {
    const currentUserId = String((user as any)?._id || (user as any)?.id || (user as any)?.userId || '');
    const sessionCandidateId = sessionFromState?.candidateId?._id || sessionFromState?.candidateId;
    const isCandidateInThisSession = sessionCandidateId && String(sessionCandidateId) === currentUserId;

    if (isCandidateInThisSession) {
      role = 'candidate';
    } else {
      // By default an authenticated expert acts as expert, unless explicitly set to candidate view
      const explicitRole = searchParams.get('role') || (location.state as any)?.role;
      role = String(explicitRole).toLowerCase() === 'candidate' ? 'candidate' : 'expert';
    }
  } else {
    // Candidates and general users can NEVER be granted expert role under any circumstances
    role = 'candidate';
  }

  useEffect(() => {
    if (!isAuthLoading && role !== 'expert' && verificationData?.confirmationRequired) {
      setShowIdentityModal(true);
    }
  }, [isAuthLoading, role, verificationData?.confirmationRequired]);

  const now = new Date();
  const isSessionEndedOrExpired = sessionFromState && (
    sessionFromState.status === 'Completed' ||
    sessionFromState.status === 'Cancelled' ||
    (sessionFromState.endTime && new Date(sessionFromState.endTime) < now) ||
    (!sessionFromState.endTime && sessionFromState.startTime && new Date(sessionFromState.startTime) < now)
  );

  const playCompletionAlarm = () => {
    try {
      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as any;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
      window.setTimeout(() => {
        try { ctx.close(); } catch (_) {}
      }, 400);
    } catch (_) {}

    try {
      if ('vibrate' in navigator) navigator.vibrate([120, 80, 120]);
    } catch (_) {}
  };

  useEffect(() => {
    if (!isAuthLoading && !meetingId) {
      toast.error('Invalid Meeting ID');
      navigate(role === 'expert' ? '/dashboard/sessions' : '/my-sessions', { replace: true });
    }
  }, [isAuthLoading, meetingId, navigate, role]);

  useEffect(() => {
    if (isSessionEndedOrExpired) {
      toast.error('This meeting has ended or expired.');
      playCompletionAlarm();
      navigate(role === 'expert' ? '/dashboard/sessions' : '/my-sessions', { replace: true });
    }
  }, [isSessionEndedOrExpired, navigate, role]);

  if (isAuthLoading || (!user && localStorage.getItem('token'))) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center text-slate-700">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Loading meeting session...</p>
        </div>
      </div>
    );
  }

  if (!meetingId) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center text-slate-700">
        <div className="text-center p-6 bg-white rounded-xl border border-slate-200 shadow-sm max-w-sm">
          <p className="text-sm font-semibold text-slate-800 mb-1">Invalid Meeting Link</p>
          <p className="text-xs text-slate-500 mb-4">No valid session or meeting identifier was provided.</p>
          <button
            type="button"
            onClick={() => navigate(role === 'expert' ? '/dashboard/sessions' : '/my-sessions', { replace: true })}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Return to Sessions
          </button>
        </div>
      </div>
    );
  }

  if (isSessionEndedOrExpired) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center text-slate-700">
        <p className="text-sm">Meeting ended or expired. Redirecting...</p>
      </div>
    );
  }

  return (
    <>
      <IdentityConfirmationModal
        isOpen={showIdentityModal}
        onClose={() => navigate('/my-sessions')}
        onConfirmed={async () => {
          setShowIdentityModal(false);
          await refreshVerification();
        }}
        candidateName={verificationData?.profileName || user?.name || "Candidate"}
        onConfirmApi={confirmIdentityApi}
      />
      <GoogleMeetOnlyMeeting
        meetingId={meetingId}
        role={role}
        onLeave={() => navigate(role === 'expert' ? '/dashboard/sessions' : '/my-sessions')}
        sessionData={location.state}
        currentUserId={(user as any)?.id || (user as any)?._id || ''}
      />
    </>
  );
}
