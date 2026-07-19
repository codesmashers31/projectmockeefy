import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Calendar,
  ChevronRight,
  Sparkles,
  Briefcase,
  Award,
  Bookmark,
  Check,
  Star,
  X,
  MessageSquare,
  Clock,
  Send
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import axios from '../lib/axios';
import { getProfileImageUrl } from "../lib/imageUtils";
import { MentorJobCard } from "./MentorJobCard";

// --- Types ---
type ReviewInfo = {
  overallRating?: number;
  technicalRating?: number;
  communicationRating?: number;
  feedback?: string;
  strengths?: string[];
  weaknesses?: string[];
};

type Session = {
  id: string;
  sessionId: string;
  expert: string;
  role: string;
  company: string;
  date: string;
  time: string;
  duration: string;
  status: string;
  score?: number;
  meetLink?: string;
  profileImage?: string | null;
  startTime?: string;
  endTime?: string;
  category?: string;
  expertId?: string;
  candidateId?: string;
  expertReview?: ReviewInfo | null;
  candidateReview?: ReviewInfo | null;
  feedbackRequested?: boolean;
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Upcoming: "bg-blue-50/50 text-blue-600 border-blue-100",
    Confirmed: "bg-elite-blue text-white border-blue-600",
    Completed: "bg-slate-50 text-slate-500 border-slate-200",
    Cancelled: "bg-rose-50 text-rose-600 border-rose-100",
    Live: "bg-emerald-50 text-emerald-600 border-emerald-100",
    Expired: "bg-amber-50/80 text-amber-700 border-amber-200"
  };
  return (
    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black tracking-tight border shadow-sm ${styles[status] || styles.Completed}`}>
      {status}
    </span>
  );
}

function SessionAvatar({
  name,
  profileImage,
  className
}: {
  name: string;
  profileImage?: string | null;
  className?: string;
}) {
  const [imageError, setImageError] = useState(false);
  const initial = (name || "E").trim().substring(0, 2).toUpperCase();
  const shouldShowLetter = !profileImage || profileImage.includes('default-avatar.png') || imageError;

  if (shouldShowLetter) {
    return (
      <div className={`w-full h-full rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black uppercase text-[10px] ${className || ""}`}>
        {initial}
      </div>
    );
  }

  return (
    <img
      src={getProfileImageUrl(profileImage)}
      alt={name}
      className={`w-full h-full object-cover rounded-lg ${className || ""}`}
      onError={() => setImageError(true)}
    />
  );
}

function MySessionsSkeletonDesktop() {
  return (
    <tbody className="divide-y divide-slate-50">
      {Array.from({ length: 5 }).map((_, index) => (
        <tr key={`desktop-skeleton-${index}`} className="animate-pulse">
          <td className="px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/60 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="h-3 w-48 bg-slate-100 rounded mb-2" />
                <div className="h-2.5 w-28 bg-slate-100 rounded" />
              </div>
            </div>
          </td>
          <td className="px-6 py-5 hidden sm:table-cell">
            <div className="h-3 w-24 bg-slate-100 rounded mb-2" />
            <div className="h-2.5 w-16 bg-slate-100 rounded" />
          </td>
          <td className="px-6 py-5">
            <div className="h-6 w-20 bg-slate-100 rounded-lg" />
          </td>
          <td className="px-6 py-5 text-right">
            <div className="h-8 w-24 bg-slate-100 rounded-lg ml-auto" />
          </td>
        </tr>
      ))}
    </tbody>
  );
}

function MySessionsSkeletonMobile() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={`mobile-skeleton-${index}`} className="p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200/60 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-3 w-40 bg-slate-100 rounded mb-2" />
              <div className="h-2.5 w-28 bg-slate-100 rounded mb-2" />
              <div className="h-2.5 w-32 bg-slate-100 rounded" />
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="h-6 w-20 bg-slate-100 rounded-lg" />
                <div className="h-7 w-24 bg-slate-100 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

/** Session is joinable from startTime until endTime (e.g. 2:00–2:30 → joinable until 2:30). */
function canJoinSession(session: Session): boolean {
  if (['Completed', 'Cancelled'].includes(session.status)) return false;
  const now = new Date();
  const start = session.startTime ? new Date(session.startTime) : null;
  const end = session.endTime ? new Date(session.endTime) : null;
  if (!start) return true;
  if (now < start) return false; // not started yet
  if (end && now > end) return false; // already ended → expire after endTime only
  return true; // now >= start && (no end || now <= end)
}

/** Expired only after endTime (e.g. 2:00–2:30 → Expired only after 2:30). */
function getDisplayStatus(session: Session): string {
  if (session.status === 'Completed' || session.status === 'Cancelled') return session.status;
  const now = new Date();
  const end = session.endTime ? new Date(session.endTime) : null;
  const start = session.startTime ? new Date(session.startTime) : null;
  if (end && now > end) return 'Expired';
  if (start && now >= start && (!end || now <= end)) return 'Live';
  return session.status;
}

/** Session time (e.g. "3:45 PM") and countdown. Countdown runs 3 min before start; Join only when countdown done. */
function getSessionTimeAndCountdown(session: Session, now: Date): { timeLabel: string; countdown: string | null; joinable: boolean } {
  const start = session.startTime ? new Date(session.startTime) : null;
  const end = session.endTime ? new Date(session.endTime) : null;
  const timeLabel = start ? start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (session.time || '—');
  if (['Completed', 'Cancelled'].includes(session.status)) return { timeLabel, countdown: null, joinable: false };
  if (!start) return { timeLabel, countdown: null, joinable: true };
  if (end && now > end) return { timeLabel, countdown: null, joinable: false };
  if (now >= start && (!end || now <= end)) return { timeLabel, countdown: null, joinable: true };
  const diffMs = start.getTime() - now.getTime();
  const threeMinMs = 3 * 60 * 1000;
  if (diffMs > threeMinMs) {
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / 60000);

    let countdownStr = "Starts in ";
    if (days > 0) {
      countdownStr += `${days}d ${hours}h`;
    } else if (hours > 0) {
      countdownStr += `${hours}h ${minutes}m`;
    } else {
      countdownStr += `${minutes} min`;
    }
    return { timeLabel, countdown: countdownStr, joinable: false };
  }
  const m = Math.floor(diffMs / 60000);
  const s = Math.floor((diffMs % 60000) / 1000);
  return { timeLabel, countdown: `Starts in ${m}:${s.toString().padStart(2, '0')}`, joinable: false };
}

const SessionCard: React.FC<{
  session: Session;
  now: Date;
  getDisplayStatus: (s: Session) => string;
  getSessionTimeAndCountdown: (s: Session, n: Date) => { timeLabel: string; countdown: string | null; joinable: boolean };
  setCertificateModalSession: (s: Session) => void;
  setReviewModalSession: (s: Session) => void;
  handleRequestFeedback: (id: string) => void;
  handleJoin: (s: Session) => void;
  getCompletedCountForCategory: (cat: string) => number;
  navigate: any;
}> = ({
  session, now, getDisplayStatus, getSessionTimeAndCountdown, setCertificateModalSession, setReviewModalSession, handleRequestFeedback, handleJoin, getCompletedCountForCategory, navigate
}) => {
  const displayStatus = getDisplayStatus(session);
  const { timeLabel, countdown, joinable } = getSessionTimeAndCountdown(session, now);
  const dateStr = session.startTime ? new Date(session.startTime).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between text-left h-full">
      {/* Top Header: Category & Status */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black bg-blue-50 text-[#004fcb] border border-blue-100 uppercase tracking-tight">
          {session.category || "IT"}
        </span>
        {countdown ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-black uppercase tracking-tight">
            <Clock className="w-3 h-3" />
            {countdown}
          </span>
        ) : (
          <StatusBadge status={displayStatus} />
        )}
      </div>

      {/* Profile Details */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 p-0.5 shadow-sm shrink-0 overflow-hidden">
          <SessionAvatar name={session.expert} profileImage={session.profileImage} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-black text-slate-800 text-sm truncate leading-tight">
            {session.expert}
          </p>
          <p className="text-[11.5px] text-slate-500 font-bold truncate mt-0.5">
            {session.role || "Senior Expert"}
          </p>
        </div>
      </div>

      {/* Date & Time */}
      <div className="bg-slate-50 border border-slate-100/50 rounded-xl p-2.5 flex items-center justify-between text-slate-700 text-xs mb-4.5 mt-auto">
        <div className="flex items-center gap-1.5 font-extrabold text-slate-800">
          <Calendar className="w-3.5 h-3.5 text-[#004fcb]" />
          <span>{dateStr}</span>
        </div>
        <div className="flex items-center gap-1.5 font-bold text-slate-500">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{timeLabel}</span>
        </div>
      </div>

      {/* CTA Actions */}
      <div className="flex items-center gap-2 w-full pt-3.5 border-t border-slate-100">
        {displayStatus === 'Completed' ? (
          <>
            {session.candidateReview ? (
              session.expertReview && getCompletedCountForCategory(session.category || "IT") >= 3 ? (
                <button
                  onClick={() => setCertificateModalSession(session)}
                  className="flex-1 py-2 px-3 border border-slate-200 hover:border-[#004fcb] hover:text-[#004fcb] text-slate-600 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 bg-white"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Certificate</span>
                </button>
              ) : null
            ) : (
              <button
                onClick={() => setReviewModalSession(session)}
                className="flex-1 py-2 px-3 bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Review</span>
              </button>
            )}

            {session.expertReview ? (
              <button
                onClick={() => setCertificateModalSession(session)}
                className="flex-1 py-2 px-3 border border-indigo-200 hover:border-indigo-600 hover:text-indigo-600 text-indigo-700 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 bg-indigo-50/30"
              >
                <MessageSquare className="w-3.5 h-3.5 animate-pulse" />
                <span>Feedback</span>
              </button>
            ) : session.feedbackRequested ? (
              <button
                disabled
                className="flex-1 py-2 px-3 bg-slate-50 border border-slate-200 text-slate-400 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-not-allowed"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Requested</span>
              </button>
            ) : (
              <button
                onClick={() => handleRequestFeedback(session.sessionId)}
                className="flex-1 py-2 px-3 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Request</span>
              </button>
            )}
          </>
        ) : joinable ? (
          <button
            onClick={() => handleJoin(session)}
            className="w-full py-2 bg-[#2F5FFF] hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
          >
            Join Now <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
          </button>
        ) : countdown ? (
          <span className="w-full py-2 text-center text-xs font-black text-amber-700 rounded-xl bg-amber-50 border border-amber-200 inline-flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {countdown}
          </span>
        ) : (
          <span className="w-full py-2 text-center text-xs font-black text-slate-400 rounded-xl bg-slate-50 border border-slate-100 inline-flex items-center justify-center">
            {displayStatus === 'Expired' ? 'Expired' : displayStatus}
          </span>
        )}
      </div>
    </div>
  );
};

const MySessions = ({ initialViewOverride }: { initialViewOverride?: 'overview' | 'jobs' | 'saved' } = {}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialView = (initialViewOverride || (searchParams.get('view') as any) || 'overview') as any;

  const [activeView, setActiveView] = useState(initialView);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (initialViewOverride) {
      setActiveView(initialViewOverride);
      return;
    }
    const view = new URLSearchParams(location.search).get('view');
    if (view === 'certificates') {
      navigate('/certificates', { replace: true });
      return;
    }
    if (view) setActiveView(view);
  }, [location.search, initialViewOverride]);

  const [savedExperts, setSavedExperts] = useState<any[]>([]);
  const [reviewModalSession, setReviewModalSession] = useState<Session | null>(null);
  const [certificateModalSession, setCertificateModalSession] = useState<Session | null>(null);
  const [reviewForm, setReviewForm] = useState({ overallRating: 5, technicalRating: 5, communicationRating: 5, feedback: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // Bookings list: newest first + pagination
  const sortedSessions = useMemo(() => {
    return [...sessions].sort(
      (a, b) => new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime()
    );
  }, [sessions]);

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(sortedSessions.length / PAGE_SIZE));
  useEffect(() => {
    setPage(1);
  }, [sortedSessions.length]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageStartIdx = (page - 1) * PAGE_SIZE;
  const pageEndIdx = Math.min(sortedSessions.length, pageStartIdx + PAGE_SIZE);
  const pagedSessions = sortedSessions.slice(pageStartIdx, pageEndIdx);

  // Tick every second when on overview and there are upcoming sessions (for countdown)
  useEffect(() => {
    if (activeView !== 'overview' || sessions.length === 0) return;
    const hasUpcoming = sessions.some(s => {
      if (['Completed', 'Cancelled'].includes(s.status)) return false;
      const start = s.startTime ? new Date(s.startTime) : null;
      const end = s.endTime ? new Date(s.endTime) : null;
      const n = new Date();
      return start && n < start || (start && end && n >= start && n <= end);
    });
    if (!hasUpcoming) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [activeView, sessions]);

  const fetchSessions = async () => {
    const userId = user?.id || user?._id;
    if (!userId) return;
    try {
      const res = await axios.get(`/api/sessions/candidate/${userId}`);
      if (res.data) {
        const mapped = res.data.map((s: any) => ({
          id: s._id,
          sessionId: s.sessionId,
          expert: s.expertDetails?.name || 'Expert',
          company: s.expertDetails?.company || '',
          profileImage: s.expertDetails?.profileImage,
          category: s.category || s.expertDetails?.category || 'IT',
          topic: s.skill || (s.topics && s.topics[0]) || 'Interview Simulation',
          startTime: s.startTime,
          endTime: s.endTime,
          time: new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: (s.status || '').charAt(0).toUpperCase() + (s.status || '').slice(1),
          score: s.expertReview?.overallRating != null ? s.expertReview.overallRating * 20 : undefined,
          expertId: s.expertId,
          candidateId: s.candidateId,
          expertReview: s.expertReview || null,
          candidateReview: s.candidateReview || null,
          meetLink: s.meetingLink || undefined,
          meetingLink: s.meetingLink || undefined
        }));
        setSessions(mapped);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadSavedExperts = () => {
    const saved = localStorage.getItem("savedExperts");
    if (saved) {
      setSavedExperts(JSON.parse(saved));
    } else {
      setSavedExperts([]);
    }
  };

  useEffect(() => {
    if (user?.id || user?._id) {
      fetchSessions();
    }
    loadSavedExperts();

    const handleStorageChange = () => {
      loadSavedExperts();
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [user?.id, user?._id]);

  const handleJoin = (session: Session) => {
    navigate(`/live-meeting/${session.sessionId}`, { state: { session } });
  };

  const handleRequestFeedback = async (sessionId: string) => {
    try {
      const res = await axios.post(`/api/sessions/${sessionId}/request-feedback`);
      if (res.data.success) {
        toast.success("Feedback request sent successfully to the expert dashboard!");
        // Update local session status/flag
        setSessions(prev => prev.map(s => s.sessionId === sessionId ? { ...s, feedbackRequested: true } : s));
      } else {
        toast.error(res.data.message || "Failed to request feedback.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to request feedback.");
    }
  };

  const getCompletedCountForCategory = (categoryName: string) => {
    return sessions.filter(
      (s) =>
        (s.status || "").toLowerCase() === "completed" &&
        (s.category || "IT") === categoryName &&
        s.candidateReview &&
        s.expertReview
    ).length;
  };

  const handleSubmitReview = async () => {
    if (!reviewModalSession || !user?.id) return;
    setSubmittingReview(true);
    try {
      await axios.post(`/api/sessions/${reviewModalSession.sessionId}/review`, {
        overallRating: reviewForm.overallRating,
        technicalRating: reviewForm.technicalRating,
        communicationRating: reviewForm.communicationRating,
        feedback: reviewForm.feedback,
        strengths: [],
        weaknesses: [],
        expertId: reviewModalSession.expertId,
        candidateId: reviewModalSession.candidateId || user?.id || user?._id,
        reviewerRole: "candidate"
      });
      toast.success("Review submitted. You can now view your certificate details.");
      setReviewModalSession(null);
      setReviewForm({ overallRating: 5, technicalRating: 5, communicationRating: 5, feedback: "" });
      fetchSessions();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
      <div className="flex flex-col gap-8 pb-10 w-full">

        {/* EXECUTIVE DASHBOARD PANEL - OVERVIEW */}
        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Header - simple, flat title row with icon */}
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 shrink-0">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">My Bookings</h1>
                  <p className="text-xs font-semibold text-gray-500 mt-1">All bookings — view and join sessions</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full border border-blue-100 bg-blue-50 text-[10px] font-black text-blue-700 uppercase tracking-wider">
                  Bookings
                </span>
                <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/50 text-xs font-bold text-slate-600">
                  Total: {sortedSessions.length}
                </span>
              </div>
            </div>

            {/* List - directly rendered grid, no extra white card container! */}
            <div>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={`skeleton-${index}`} className="h-[210px] bg-white border border-slate-200/60 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : pagedSessions.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
                  {pagedSessions.map(session => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      now={now}
                      getDisplayStatus={getDisplayStatus}
                      getSessionTimeAndCountdown={getSessionTimeAndCountdown}
                      setCertificateModalSession={setCertificateModalSession}
                      setReviewModalSession={setReviewModalSession}
                      handleRequestFeedback={handleRequestFeedback}
                      handleJoin={handleJoin}
                      getCompletedCountForCategory={getCompletedCountForCategory}
                      navigate={navigate}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                  <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-900 font-bold text-[15px]">No bookings yet</p>
                  <p className="text-gray-500 text-xs font-medium mt-1 max-w-xs mx-auto">Your bookings will show here after you book a session.</p>
                  <button type="button" onClick={() => navigate("/book-session")} className="mt-5 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[13px] font-bold hover:bg-blue-700 transition-colors shadow-sm cursor-pointer">
                    Book a session
                  </button>
                </div>
              )}
            </div>

            {/* Pagination footer */}
            {!loading && sortedSessions.length > 0 && (
              <div className="flex items-center justify-between px-2 py-4 mt-4 border-t border-slate-200">
                <div className="text-[10px] font-bold text-slate-500">
                  Showing <span className="text-slate-700 tabular-nums">{pageStartIdx + 1}</span>–<span className="text-slate-700 tabular-nums">{pageEndIdx}</span> of{" "}
                  <span className="text-slate-700 tabular-nums">{sortedSessions.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-black hover:border-elite-blue hover:text-elite-blue disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:text-slate-600 transition-all cursor-pointer bg-white"
                  >
                    Prev
                  </button>
                  <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-[10px] font-black text-slate-700 tabular-nums">
                    Page {page} / {totalPages}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-black hover:border-elite-blue hover:text-elite-blue disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:text-slate-600 transition-all cursor-pointer bg-white"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SAVED EXPERTS VIEW */}
        {activeView === 'saved' && (
          <div className="space-y-6">
            {/* Header - simple, flat title row with icon */}
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 shrink-0">
                  <Bookmark className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none">Saved Experts Library</h2>
                  <p className="text-xs font-semibold text-gray-500 mt-1">
                    Track your shortlisted mentors and book quickly when ready.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full border border-blue-100 bg-blue-50 text-[10px] font-black text-blue-700 uppercase tracking-wider">
                {savedExperts.length} Saved
              </span>
            </div>

            {/* List - directly rendered grid, no extra white card container! */}
            {savedExperts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
                {savedExperts.map((expert) => (
                  <div key={expert.expertID} className="flex animate-in fade-in duration-300">
                    <MentorJobCard mentor={expert} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-20 text-center flex flex-col items-center shadow-sm">
                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                  <Bookmark className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-gray-900 font-bold mb-1">No Saved Experts</h3>
                <p className="text-gray-500 text-sm font-medium max-w-xs mx-auto">Start saving mentors from the discovery feed to build your personal shortlist.</p>
                <button onClick={() => navigate('/')} className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[13px] font-bold shadow-sm hover:bg-blue-700 transition-all cursor-pointer">Browse Mentors</button>
              </div>
            )}
          </div>
        )}

        {/* CERTIFICATES VIEW */}
        {activeView === 'certificates' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-elite-blue" />
              <h2 className="font-elite leading-none text-xl">My Certificates</h2>
            </div>

            {sessions.filter(s => s.status === 'Completed').length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
                {sessions.filter(s => s.status === 'Completed').map(session => (
                  <div key={session.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between text-left h-full">
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4 shadow-sm">
                        <Award size={22} />
                      </div>
                      <h3 className="font-black text-slate-800 text-[15px] leading-tight">Certificate of Completion</h3>
                      <p className="text-xs font-semibold text-slate-500 mt-1">{session.category} Simulation with {session.expert}</p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Date Issued</p>
                        <p className="text-xs font-bold text-gray-700 mt-0.5">{new Date(session.startTime!).toLocaleDateString()}</p>
                      </div>
                      <button className="px-4 py-2 border border-slate-200 hover:border-blue-600 hover:text-blue-600 text-slate-600 rounded-xl text-xs font-black transition-all flex items-center gap-1 bg-white cursor-pointer shadow-sm">
                        <span>Download PDF</span>
                        <ChevronRight size={13} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-20 text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                  <Award className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-gray-900 font-bold mb-1">No Certificates Yet</h3>
                <p className="text-gray-500 font-medium text-sm max-w-xs mx-auto">Complete 3 sessions with any expert to unlock your first certification.</p>
                <button onClick={() => navigate('/')} className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[13px] font-bold shadow-sm hover:bg-blue-700">Book a Session</button>
              </div>
            )}
          </div>
        )}

        {/* Other views fallback */}
        {activeView !== 'overview' && activeView !== 'saved' && activeView !== 'certificates' && (
          <div className="bg-white rounded-2xl border border-slate-200/60 p-16 text-center shadow-sm">
            <Briefcase className="w-10 h-10 text-slate-100 mx-auto mb-4" />
            <p className="text-slate-500 text-[10px] font-black tracking-tight">Intel Core "{activeView}" Encrypted</p>
            <button onClick={() => setActiveView('overview')} className="mt-8 px-8 py-2.5 bg-elite-blue text-white rounded-xl text-[10px] font-black tracking-tight hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/10">Return to Nexus</button>
          </div>
        )}

        {/* Give Review Modal (candidate) — only after meeting ended; then they can view certificate */}
        {reviewModalSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Give your review</h3>
                <button onClick={() => setReviewModalSession(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600">Session with <strong>{reviewModalSession.expert}</strong>. Your feedback helps improve the experience.</p>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Overall rating (1–5)</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} type="button" onClick={() => setReviewForm((f) => ({ ...f, overallRating: star }))} className="p-1">
                        <Star size={24} className={star <= reviewForm.overallRating ? "text-amber-400 fill-amber-400" : "text-slate-200"} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Feedback (optional)</label>
                  <textarea value={reviewForm.feedback} onChange={(e) => setReviewForm((f) => ({ ...f, feedback: e.target.value }))} placeholder="How was the session?" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none" rows={3} />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
                <button onClick={() => setReviewModalSession(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={handleSubmitReview} disabled={submittingReview} className="px-4 py-2 bg-elite-blue text-white rounded-lg text-sm font-bold hover:bg-blue-600 disabled:opacity-60">{submittingReview ? "Submitting…" : "Submit review"}</button>
              </div>
            </div>
          </div>
        )}

        {/* View Certificate Modal — expert feedback (marks) and certificate details */}
        {certificateModalSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
                <h3 className="font-bold text-slate-900 flex items-center gap-2"><Award size={20} className="text-elite-blue" /> Certificate details</h3>
                <button onClick={() => setCertificateModalSession(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-12 h-12 rounded-xl bg-elite-blue/10 flex items-center justify-center"><Award className="w-6 h-6 text-elite-blue" /></div>
                  <div>
                    <p className="font-bold text-slate-900">Session with {certificateModalSession.expert}</p>
                    <p className="text-xs text-slate-500">{certificateModalSession.category} · {certificateModalSession.startTime ? new Date(certificateModalSession.startTime).toLocaleDateString() : ""}</p>
                  </div>
                </div>
                {certificateModalSession.expertReview ? (
                  <>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Expert feedback & marks</p>
                      <div className="flex flex-wrap gap-3 mb-2">
                        <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 text-sm font-bold">Overall: {certificateModalSession.expertReview.overallRating}/5</span>
                        {certificateModalSession.expertReview.technicalRating != null && <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium">Technical: {certificateModalSession.expertReview.technicalRating}/5</span>}
                        {certificateModalSession.expertReview.communicationRating != null && <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium">Communication: {certificateModalSession.expertReview.communicationRating}/5</span>}
                        {certificateModalSession.expertReview.problemSolvingRating != null && certificateModalSession.expertReview.problemSolvingRating > 0 && <span className="px-2 py-1 rounded-lg bg-violet-50 text-violet-700 text-sm font-medium">Problem Solving: {certificateModalSession.expertReview.problemSolvingRating}/5</span>}
                        {certificateModalSession.expertReview.designRating != null && certificateModalSession.expertReview.designRating > 0 && <span className="px-2 py-1 rounded-lg bg-cyan-50 text-cyan-700 text-sm font-medium">System Design: {certificateModalSession.expertReview.designRating}/5</span>}
                        {certificateModalSession.expertReview.behavioralRating != null && certificateModalSession.expertReview.behavioralRating > 0 && <span className="px-2 py-1 rounded-lg bg-pink-50 text-pink-700 text-sm font-medium">Behavioral: {certificateModalSession.expertReview.behavioralRating}/5</span>}
                      </div>
                      {certificateModalSession.expertReview.feedback && (
                        <div className="mt-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Detailed Feedback</p>
                          <p className="text-sm text-slate-700 mt-0.5">{certificateModalSession.expertReview.feedback}</p>
                        </div>
                      )}
                      {certificateModalSession.expertReview.suggestions && (
                        <div className="mt-3 bg-indigo-50/40 border border-indigo-100/50 p-3 rounded-xl">
                          <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">Key Recommendations & Suggestions</p>
                          <p className="text-sm text-slate-700 mt-1">{certificateModalSession.expertReview.suggestions}</p>
                        </div>
                      )}
                      {(certificateModalSession.expertReview.strengths?.length || certificateModalSession.expertReview.weaknesses?.length) ? (
                        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                          {certificateModalSession.expertReview.strengths?.length ? <p className="text-xs text-slate-600"><strong>Strengths:</strong> {certificateModalSession.expertReview.strengths.join(", ")}</p> : null}
                          {certificateModalSession.expertReview.weaknesses?.length ? <p className="text-xs text-slate-600"><strong>Areas to improve:</strong> {certificateModalSession.expertReview.weaknesses.join(", ")}</p> : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 flex items-start gap-2">
                      <Award className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <span>This session is completed and verified. You can download or share this certificate from the </span>
                        <button
                          type="button"
                          onClick={() => {
                            setCertificateModalSession(null);
                            setActiveView('certificates');
                          }}
                          className="font-bold underline text-blue-800 hover:text-blue-900 transition-colors"
                        >
                          Certificates tab
                        </button>
                        <span>.</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">Expert feedback is not available yet for this session.</p>
                )}
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
                <button onClick={() => setCertificateModalSession(null)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};

export default MySessions;
