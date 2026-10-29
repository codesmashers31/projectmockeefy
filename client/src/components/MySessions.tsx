import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Calendar,
  ChevronRight,
  Sparkles,
  Briefcase,
  Award,
  Bookmark,
  Heart,
  Check,
  Star,
  X,
  MessageSquare,
  Clock,
  Send,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useDataSync } from "../context/SocketContext";
import axios from '../lib/axios';
import { getProfileImageUrl } from "../lib/imageUtils";
import { MentorJobCard } from "./MentorJobCard";
import MySessionsSkeleton, { SessionCardSkeleton } from "./MySessionsSkeleton";

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
  const s = (status || "").toLowerCase();
  if (s === "completed") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10.5px] font-bold tracking-tight shadow-2xs shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>Completed</span>
      </span>
    );
  }
  if (s === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10.5px] font-black uppercase tracking-tight shadow-2xs shrink-0">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
        <span>Live Now</span>
      </span>
    );
  }
  if (s === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-[10.5px] font-bold tracking-tight shadow-2xs shrink-0">
        <span>Cancelled</span>
      </span>
    );
  }
  if (s === "expired") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10.5px] font-semibold tracking-tight shrink-0">
        <span>Expired</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EAF2FF] text-[#0755E8] border border-[#93B8FF]/70 text-[10.5px] font-bold tracking-tight shadow-2xs shrink-0">
      <span>{status || "Upcoming"}</span>
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
  const avatarUrl = getProfileImageUrl(profileImage, name);

  if (imageError || !avatarUrl) {
    return (
      <div className={`w-full h-full rounded-lg bg-[#EAF2FF] text-[#0755E8] flex items-center justify-center font-black uppercase text-[10px] ${className || ""}`}>
        {initial}
      </div>
    );
  }

  return (
    <img
      src={avatarUrl}
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
    <article className="group relative bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 hover:border-[#0755E8]/40 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_-6px_rgba(7,85,232,0.12)] transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between h-full w-full text-left box-border">
      <div className="space-y-3 flex-1 flex flex-col">
        {/* 1. Header: Avatar + Expert Name & Role/Company + Status Badge */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
              <SessionAvatar name={session.expert} profileImage={session.profileImage} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className="font-black text-slate-900 text-sm sm:text-[15px] truncate group-hover:text-[#0755E8] transition-colors leading-tight">
                  {session.expert}
                </h3>
                <CheckCircle2 className="w-4 h-4 fill-[#0755E8] text-white shrink-0" title="Verified Interview Expert" />
              </div>

              <p className="text-xs font-semibold text-slate-500 truncate mt-0.5 leading-tight">
                {session.company ? (
                  <>
                    <span className="font-bold text-slate-800">{session.company}</span>
                    <span className="text-slate-400 font-normal"> • {session.role || "Tech Expert"}</span>
                  </>
                ) : (
                  session.role || "Senior Tech Expert"
                )}
              </p>
            </div>
          </div>

          {/* Status or Countdown Badge (Top Right) */}
          <div className="shrink-0 pt-0.5">
            {joinable ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10.5px] font-black uppercase tracking-tight shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Live Now</span>
              </span>
            ) : countdown ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EAF2FF] text-[#0755E8] border border-[#93B8FF]/70 text-[10.5px] font-black uppercase tracking-tight shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-[#0755E8] animate-pulse" />
                <span>{countdown}</span>
              </span>
            ) : (
              <StatusBadge status={displayStatus} />
            )}
          </div>
        </div>

        {/* 2. Integrated Schedule & Session Details Box */}
        <div className="bg-[#F8FAFC] group-hover:bg-[#F3F6FD]/70 border border-slate-200/70 group-hover:border-[#93B8FF]/40 rounded-2xl p-3 sm:p-3.5 space-y-2.5 mt-1 transition-colors duration-200">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 min-w-0">
              <div className="flex items-center gap-1.5 text-slate-900 font-bold shrink-0">
                <Calendar className="w-3.5 h-3.5 text-[#0755E8]" />
                <span>{dateStr}</span>
              </div>
              <span className="text-slate-300 shrink-0">•</span>
              <div className="flex items-center gap-1.5 text-slate-600 truncate">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{timeLabel}</span>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white group-hover:bg-[#EAF2FF]/60 border border-slate-200/80 group-hover:border-[#93B8FF]/60 text-[#0755E8] text-[10.5px] font-black uppercase tracking-tight shadow-2xs shrink-0 transition-colors">
              <Briefcase className="w-3 h-3 text-[#0755E8]" />
              <span>{session.category || "IT"}</span>
            </span>
          </div>

          {/* Session Focus / Topic */}
          <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-[#EAF2FF] text-[#0755E8] border border-[#93B8FF]/60 text-[9.5px] font-black uppercase tracking-wider shrink-0">
              Topic
            </span>
            <span className="font-bold text-slate-800 text-xs truncate">
              {session.topic && session.topic.trim().toLowerCase() !== (session.category || "").toLowerCase()
                ? session.topic
                : `${session.category || "Technical"} 1-on-1 Mock Interview & Live Review`}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Action Row */}
      <div className="w-full pt-3.5 mt-3.5 border-t border-slate-100">
        {displayStatus === 'Completed' ? (
          <div className="space-y-2.5 w-full">
            {/* Top Action Row: Review + Feedback / Certificate */}
            <div className="flex items-center gap-2 w-full">
              {!session.candidateReview ? (
                <button
                  type="button"
                  onClick={() => setReviewModalSession(session)}
                  className="group/rate flex-1 py-2.5 px-3 bg-amber-50 hover:bg-amber-100/90 active:bg-amber-200/70 text-amber-800 hover:text-amber-900 border border-amber-200/90 hover:border-amber-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs hover:shadow-amber-500/10 active:scale-95 whitespace-nowrap cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 group-hover/rate:scale-110 transition-transform shrink-0" />
                  <span>Rate Expert</span>
                </button>
              ) : session.expertReview && getCompletedCountForCategory(session.category || "IT") >= 3 ? (
                <button
                  type="button"
                  onClick={() => setCertificateModalSession(session)}
                  className="group/cert flex-1 py-2.5 px-3 bg-indigo-50/70 hover:bg-indigo-100 active:bg-indigo-200/70 text-indigo-700 hover:text-indigo-800 border border-indigo-200/80 hover:border-indigo-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs active:scale-95 whitespace-nowrap"
                >
                  <Award className="w-3.5 h-3.5 text-indigo-600 group-hover/cert:scale-110 transition-transform shrink-0" />
                  <span>Certificate</span>
                </button>
              ) : null}

              {session.expertReview ? (
                <button
                  type="button"
                  onClick={() => setCertificateModalSession(session)}
                  className="group/view flex-1 py-2.5 px-3 bg-[#EAF2FF] hover:bg-[#D9E8FF] active:bg-[#C8DCFF] text-[#0755E8] hover:text-[#0645C7] border border-[#93B8FF]/70 hover:border-[#0755E8]/50 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs hover:shadow-[#0755E8]/10 active:scale-95 whitespace-nowrap cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#0755E8] group-hover/view:scale-110 transition-transform shrink-0" />
                  <span>View Feedback</span>
                </button>
              ) : session.feedbackRequested ? (
                <button
                  disabled
                  className="flex-1 py-2.5 px-3 bg-slate-50 border border-slate-200/80 text-slate-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-not-allowed whitespace-nowrap"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Report Requested</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRequestFeedback(session.sessionId)}
                  className="group/req flex-1 py-2.5 px-3 bg-[#EAF2FF] hover:bg-[#D9E8FF] active:bg-[#C8DCFF] text-[#0755E8] hover:text-[#0645C7] border border-[#93B8FF]/70 hover:border-[#0755E8]/50 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs hover:shadow-[#0755E8]/10 active:scale-95 whitespace-nowrap cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-[#0755E8] group-hover/req:translate-x-0.5 group-hover/req:-translate-y-0.5 transition-transform shrink-0" />
                  <span>Request Report</span>
                </button>
              )}

              {/* If candidate already reviewed and no certificate button needed, put Book Again in this row */}
              {session.candidateReview && !(session.expertReview && getCompletedCountForCategory(session.category || "IT") >= 3) && (
                <button
                  type="button"
                  onClick={() => session.expertId ? navigate(`/book-session?expertId=${session.expertId}`) : navigate('/find-mentor')}
                  className="group/book flex-1 py-2.5 px-3 bg-slate-50 hover:bg-[#EAF2FF] active:bg-[#D9E8FF] text-slate-700 hover:text-[#0755E8] border border-slate-200/80 hover:border-[#93B8FF]/80 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap"
                >
                  <span>Book Again</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover/book:text-[#0755E8] group-hover/book:translate-x-0.5 transition-all stroke-[2.5]" />
                </button>
              )}
            </div>

            {/* Bottom Row: Book with Expert Again (shown when Rate Expert is on top row) */}
            {(!session.candidateReview || (session.expertReview && getCompletedCountForCategory(session.category || "IT") >= 3)) && (
              <button
                type="button"
                onClick={() => session.expertId ? navigate(`/book-session?expertId=${session.expertId}`) : navigate('/find-mentor')}
                className="group/book w-full py-2.5 px-3 bg-slate-50/80 hover:bg-[#EAF2FF] active:bg-[#D9E8FF] text-slate-700 hover:text-[#0755E8] border border-slate-200/80 hover:border-[#93B8FF]/80 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-98"
              >
                <span>Book with {session.expert?.split(" ")[0] || "Expert"} Again</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover/book:text-[#0755E8] group-hover/book:translate-x-0.5 transition-all stroke-[2.5]" />
              </button>
            )}

            {/* Candidate Review summary pill if already rated */}
            {session.candidateReview && (
              <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-slate-500 pt-0.5">
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600" /> Your feedback submitted
                </span>
                <span className="inline-flex items-center gap-1 text-amber-600 font-bold bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-md">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                  {session.candidateReview.overallRating || 5}.0 / 5.0
                </span>
              </div>
            )}
          </div>
        ) : displayStatus === 'Cancelled' ? (
          <button
            type="button"
            onClick={() => session.expertId ? navigate(`/book-session?expertId=${session.expertId}`) : navigate('/find-mentor')}
            className="w-full py-2.5 px-4 bg-slate-50 hover:bg-[#EAF2FF] text-slate-700 hover:text-[#0755E8] border border-slate-200 hover:border-[#93B8FF] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
          >
            <span>Book Another Interview Expert</span>
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        ) : joinable ? (
          <button
            type="button"
            onClick={() => handleJoin(session)}
            className="w-full py-3 px-4 bg-gradient-to-r from-[#0755E8] to-[#0645C7] hover:from-[#0645C7] hover:to-[#0538A8] text-white rounded-xl text-xs sm:text-sm font-black transition-all shadow-md shadow-[#0755E8]/20 flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span>Join Live Interview Meeting</span>
            <ChevronRight className="w-4 h-4 stroke-[3]" />
          </button>
        ) : countdown ? (
          <div className="w-full flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 min-w-0">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span className="truncate">Meeting link activates at start time</span>
            </div>
            <button
              type="button"
              onClick={() => session.expertId && navigate(`/book-session?expertId=${session.expertId}`)}
              className="group/exp py-2 px-3.5 bg-[#EAF2FF] hover:bg-[#D9E8FF] active:bg-[#C8DCFF] text-[#0755E8] hover:text-[#0645C7] border border-[#93B8FF]/70 hover:border-[#0755E8]/50 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1"
            >
              <span>View Expert</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#0755E8] group-hover/exp:translate-x-0.5 transition-transform" />
            </button>
          </div>
        ) : (
          <div className="w-full flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-400">
              {displayStatus === 'Expired' ? 'Session Expired' : displayStatus}
            </span>
            <button
              type="button"
              onClick={() => session.expertId ? navigate(`/book-session?expertId=${session.expertId}`) : navigate('/find-mentor')}
              className="py-2 px-3.5 bg-[#EAF2FF] hover:bg-[#D9E8FF] active:bg-[#C8DCFF] text-[#0755E8] hover:text-[#0645C7] border border-[#93B8FF]/70 hover:border-[#0755E8]/50 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              Book Again
            </button>
          </div>
        )}
      </div>
    </article>
  );
};

const MySessions = ({
  initialViewOverride,
  showSkeletons: propShowSkeletons,
}: {
  initialViewOverride?: 'overview' | 'jobs' | 'saved';
  showSkeletons?: boolean;
} = {}) => {
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
    if (view) {
      setActiveView(view as any);
    } else {
      setActiveView('overview');
    }
  }, [location.pathname, location.search, initialViewOverride, navigate]);

  const [savedExperts, setSavedExperts] = useState<any[]>([]);
  const [reviewModalSession, setReviewModalSession] = useState<Session | null>(null);
  const [certificateModalSession, setCertificateModalSession] = useState<Session | null>(null);
  const [reviewForm, setReviewForm] = useState({ overallRating: 5, technicalRating: 5, communicationRating: 5, feedback: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');

  // Bookings list: newest first
  const sortedSessions = useMemo(() => {
    return [...sessions].sort(
      (a, b) => new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime()
    );
  }, [sessions]);

  const upcomingCount = useMemo(() => {
    return sessions.filter(s => {
      if (['Completed', 'Cancelled'].includes(s.status)) return false;
      const end = s.endTime ? new Date(s.endTime) : null;
      if (end && now > end) return false;
      return true;
    }).length;
  }, [sessions, now]);

  const completedCount = useMemo(() => {
    return sessions.filter(s => s.status === 'Completed').length;
  }, [sessions]);

  const cancelledCount = useMemo(() => {
    return sessions.filter(s => s.status === 'Cancelled').length;
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    if (statusFilter === 'all') return sortedSessions;
    if (statusFilter === 'upcoming') {
      return sortedSessions.filter(s => {
        if (['Completed', 'Cancelled'].includes(s.status)) return false;
        const end = s.endTime ? new Date(s.endTime) : null;
        if (end && now > end) return false;
        return true;
      });
    }
    if (statusFilter === 'completed') {
      return sortedSessions.filter(s => s.status === 'Completed');
    }
    if (statusFilter === 'cancelled') {
      return sortedSessions.filter(s => s.status === 'Cancelled');
    }
    return sortedSessions;
  }, [sortedSessions, statusFilter, now]);

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / PAGE_SIZE));
  useEffect(() => {
    setPage(1);
  }, [filteredSessions.length, statusFilter]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageStartIdx = (page - 1) * PAGE_SIZE;
  const pageEndIdx = Math.min(filteredSessions.length, pageStartIdx + PAGE_SIZE);
  const pagedSessions = filteredSessions.slice(pageStartIdx, pageEndIdx);

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
    if (!userId) {
      window.dispatchEvent(new CustomEvent("page-loading-state", { detail: { loading: false } }));
      return;
    }
    window.dispatchEvent(new CustomEvent("page-loading-state", { detail: { loading: true } }));
    try {
      const res = await axios.get(`/api/sessions/candidate/${userId}`);
      if (res.data) {
        const mapped = res.data.map((s: any) => ({
          id: s._id,
          sessionId: s.sessionId,
          expert: s.expertDetails?.name || s.expertName || 'Expert',
          role: s.expertDetails?.role || s.role || 'Tech Expert',
          company: s.expertDetails?.company || s.company || '',
          profileImage: s.expertDetails?.profileImage || s.profileImage || null,
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
      window.dispatchEvent(new CustomEvent("page-loading-state", { detail: { loading: false } }));
    }
  };

  // Real-time synchronization for candidate bookings (registered at component level)
  useDataSync(['SESSION_CREATED', 'SESSION_UPDATED', 'RECONNECTED'], () => {
    console.log('[MySessions] Real-time session sync event received');
    fetchSessions();
  });

  const loadSavedExperts = async () => {
    let list: any[] = [];
    try {
      const saved = localStorage.getItem("savedExperts");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          list = parsed;
        }
      }
    } catch {
      list = [];
    }

    // If local list is empty and user is logged in, try fetching from backend
    const userId = user?.id || user?._id;
    if (list.length === 0 && userId) {
      try {
        const res = await axios.get("/api/user/saved-experts");
        if (res.data?.success && Array.isArray(res.data?.data)) {
          list = res.data.data.map((item: any) => {
            const exp = item.expertId || item;
            return {
              id: exp._id || item._id,
              expertID: exp._id || item._id,
              name: exp.personalInformation?.userName || exp.name || "Interview Expert",
              role: exp.professionalDetails?.title || exp.role || "Consultant",
              company: exp.professionalDetails?.company || exp.company || "",
              avatar: getProfileImageUrl(exp.profileImage, exp.personalInformation?.userName || exp.name),
              rating: exp.metrics?.avgRating || 4.9,
              reviews: exp.metrics?.totalReviews || 0,
              price: exp.price ? String(exp.price) : "799",
              skills: exp.skillsAndExpertise?.domains || exp.skills || ["Mock Interview"],
              experience: exp.professionalDetails?.totalExperience ? `${exp.professionalDetails.totalExperience} yrs` : "5+ yrs",
              location: exp.personalInformation?.city || "Remote",
              isVerified: true,
              totalSessions: exp.metrics?.totalSessions || 10,
              category: exp.personalInformation?.category || "IT",
            };
          });
          if (list.length > 0) {
            localStorage.setItem("savedExperts", JSON.stringify(list));
            window.dispatchEvent(new Event("storage"));
            window.dispatchEvent(new CustomEvent("saved-experts-updated"));
          }
        }
      } catch (err) {
        console.error("Failed to load saved experts from backend:", err);
      }
    }

    setSavedExperts(list);
  };

  useEffect(() => {
    if ((user?.id || user?._id) && activeView !== 'saved') {
      fetchSessions();
    } else {
      setLoading(false);
      window.dispatchEvent(new CustomEvent("page-loading-state", { detail: { loading: false } }));
    }
    loadSavedExperts();

    const handleStorageChange = () => {
      loadSavedExperts();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("saved-experts-updated", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("saved-experts-updated", handleStorageChange);
    };
  }, [user?.id, user?._id, activeView]);

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

  const isPageLoading = (propShowSkeletons ?? false) || (loading && sessions.length === 0);

  if (isPageLoading && activeView === 'overview') {
    return <MySessionsSkeleton />;
  }

  return (
    <div className="sidebar-main-card relative w-full rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-3.5 sm:p-6 md:p-8 overflow-hidden pb-12 font-sans text-left">
      {/* Decorative ambient blue lighting */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

      <div className="w-full space-y-5 sm:space-y-6 relative z-10">

        {/* EXECUTIVE DASHBOARD PANEL - OVERVIEW */}
        {activeView === 'overview' && (
          <div className="space-y-5 sm:space-y-6">
            {/* Header - simple, flat title row with icon */}
            <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-200/80 pb-4">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#EAF2FF] flex items-center justify-center border border-[#93B8FF] shrink-0">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#0755E8]" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight leading-none truncate">My Bookings</h1>
                  <p className="text-xs font-semibold text-gray-500 mt-1 truncate">Real-time sessions, countdowns, and expert feedback</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-[#93B8FF] bg-[#EAF2FF] text-[10px] font-black text-[#0755E8] uppercase tracking-wider">
                  Bookings
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700">
                  Total: {sessions.length}
                </span>
              </div>
            </div>

            {/* Status Filter Tabs - Modern Segmented Control */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 px-0.5 no-scrollbar touch-pan-x">
              {[
                {
                  id: 'all',
                  label: 'All',
                  count: sessions.length,
                },
                {
                  id: 'upcoming',
                  label: 'Upcoming',
                  count: upcomingCount,
                  hasDot: true,
                },
                {
                  id: 'completed',
                  label: 'Completed',
                  count: completedCount,
                },
                {
                  id: 'cancelled',
                  label: 'Cancelled',
                  count: cancelledCount,
                },
              ].map((tab) => {
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id as any)}
                    className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                      isActive
                        ? 'bg-[#0755E8] text-white shadow-sm shadow-[#0755E8]/25'
                        : 'bg-white hover:bg-blue-50 text-slate-700 hover:text-[#0755E8] border border-slate-200 shadow-2xs'
                    }`}
                  >
                    {tab.hasDot && (
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isActive ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-500'
                        }`}
                      />
                    )}
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums transition-colors ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-white text-slate-700 shadow-2xs border border-slate-200/60'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* List */}
            <div>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <SessionCardSkeleton key={`skeleton-${index}`} />
                  ))}
                </div>
              ) : pagedSessions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
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
                <div className="py-16 text-center bg-slate-50/50 border border-slate-200/80 rounded-2xl p-6 shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-3 shadow-xs">
                    <Briefcase className="w-6 h-6 text-slate-400" />
                  </div>
                  <h3 className="text-gray-900 font-bold text-[15px]">
                    {statusFilter === 'all' && 'No bookings yet'}
                    {statusFilter === 'upcoming' && 'No upcoming sessions'}
                    {statusFilter === 'completed' && 'No completed sessions yet'}
                    {statusFilter === 'cancelled' && 'No cancelled sessions'}
                  </h3>
                  <p className="text-gray-500 text-xs font-medium mt-1 max-w-sm mx-auto">
                    {statusFilter === 'all' && 'Your bookings will appear here after you schedule a session with an interview expert.'}
                    {statusFilter === 'upcoming' && 'You have no active sessions scheduled. Explore interview experts to book a mock interview.'}
                    {statusFilter === 'completed' && 'Your finished sessions, feedback reports, and certificates will appear here.'}
                    {statusFilter === 'cancelled' && 'All your scheduled sessions are currently active or completed.'}
                  </p>
                  {statusFilter !== 'cancelled' && (
                    <button
                      type="button"
                      onClick={() => navigate("/find-mentor")}
                      className="mt-5 px-5 py-2.5 bg-[#0755E8] hover:bg-[#0645C7] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Explore Interview Experts</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Pagination footer */}
            {!loading && filteredSessions.length > 0 && (
              <div className="flex items-center justify-between px-2 py-4 mt-4 border-t border-slate-200">
                <div className="text-[10px] font-bold text-slate-500">
                  Showing <span className="text-slate-700 tabular-nums">{pageStartIdx + 1}</span>–<span className="text-slate-700 tabular-nums">{pageEndIdx}</span> of{" "}
                  <span className="text-slate-700 tabular-nums">{filteredSessions.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-black hover:border-[#0755E8] hover:text-[#0755E8] disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:text-slate-600 transition-all cursor-pointer bg-white"
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
                    className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-black hover:border-[#0755E8] hover:text-[#0755E8] disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:text-slate-600 transition-all cursor-pointer bg-white"
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
                <div className="w-10 h-10 rounded-xl bg-[#EAF2FF] flex items-center justify-center border border-[#93B8FF] shrink-0">
                  <Bookmark className="w-5 h-5 text-[#0755E8] fill-[#0755E8]" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none">Saved Interview Experts</h2>
                  <p className="text-xs font-semibold text-gray-500 mt-1">
                    Your shortlisted interview experts. Book a session or view profile anytime.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full border border-[#93B8FF] bg-[#EAF2FF] text-[10.5px] font-black text-[#0755E8] uppercase tracking-wider">
                {savedExperts.length} Saved
              </span>
            </div>

            {/* List - 2-column grid matching interview experts */}
            {savedExperts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
                {savedExperts.map((expert) => (
                  <div key={expert.expertID || expert.id} className="flex animate-in fade-in duration-300">
                    <MentorJobCard mentor={expert} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50/50 rounded-2xl border border-slate-200/80 p-12 sm:p-16 text-center flex flex-col items-center shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-[#EAF2FF] border border-[#93B8FF] flex items-center justify-center mb-3.5 shadow-xs">
                  <Bookmark className="w-7 h-7 text-[#0755E8] fill-[#0755E8]" />
                </div>
                <h3 className="text-gray-900 font-bold text-base mb-1">No Saved Interview Experts Yet</h3>
                <p className="text-gray-500 text-xs font-medium max-w-xs mx-auto">Click the bookmark icon on any card to add interview experts to your saved list for quick access.</p>
                <button
                  type="button"
                  onClick={() => navigate('/find-mentor')}
                  className="mt-5 px-5 py-2.5 bg-[#0755E8] hover:bg-[#0645C7] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Explore Interview Experts</span>
                </button>
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
                  <div key={session.id} className="relative bg-gradient-to-b from-[#f0f5ff]/60 via-white to-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between text-left h-full overflow-hidden">
                    {/* Decorative gradient glow */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-blue-100/40 via-indigo-100/35 to-transparent blur-2xl pointer-events-none" />
                    <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-[#f0f5ff]/50 to-transparent pointer-events-none" />
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
            <button onClick={() => setActiveView('overview')} className="mt-8 px-8 py-2.5 bg-[#0755E8] text-white rounded-xl text-[10px] font-black tracking-tight hover:bg-[#0645C7] transition-all shadow-xl shadow-[#0755E8]/20">Return to Nexus</button>
          </div>
        )}

        {/* Give Review Modal (candidate) — only after meeting ended; then they can view certificate */}
        {reviewModalSession && (
          <div
            className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setReviewModalSession(null)}
          >
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
                <button onClick={() => setReviewModalSession(null)} className="px-4 py-2 border border-slate-300/90 bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 hover:text-slate-950 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer">Cancel</button>
                <button onClick={handleSubmitReview} disabled={submittingReview} className="px-4 py-2 bg-[#0755E8] text-white rounded-lg text-sm font-bold hover:bg-[#0645C7] disabled:opacity-60">{submittingReview ? "Submitting…" : "Submit review"}</button>
              </div>
            </div>
          </div>
        )}

        {/* View Certificate Modal — expert feedback (marks) and certificate details */}
        {certificateModalSession && (
          <div
            className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setCertificateModalSession(null)}
          >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
                <h3 className="font-bold text-slate-900 flex items-center gap-2"><Award size={20} className="text-[#0755E8]" /> Certificate details</h3>
                <button
                  type="button"
                  onClick={() => setCertificateModalSession(null)}
                  className="shrink-0 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-red-500/20 cursor-pointer"
                  aria-label="Close certificate details modal"
                >
                  <X size={15} />
                  <span>Close</span>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-12 h-12 rounded-xl bg-[#EAF2FF] flex items-center justify-center"><Award className="w-6 h-6 text-[#0755E8]" /></div>
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
                        <div className="mt-3 bg-[#EAF2FF]/50 border border-[#93B8FF] p-3 rounded-xl">
                          <p className="text-[10px] font-bold text-[#0755E8] uppercase tracking-wider">Key Recommendations & Suggestions</p>
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
                    <div className="mt-4 p-3 bg-[#EAF2FF] border border-[#93B8FF] rounded-xl text-xs text-[#0755E8] flex items-start gap-2">
                      <Award className="w-4 h-4 text-[#0755E8] shrink-0 mt-0.5" />
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
                <button
                  type="button"
                  onClick={() => setCertificateModalSession(null)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-red-500/20 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MySessions;
