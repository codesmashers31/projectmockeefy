import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDataSync } from "../../context/SocketContext";
import axios from "../../lib/axios";
import ExpertPageSkeleton from "../../components/ExpertPageSkeleton";
import { getProfileImageUrl } from "../../lib/imageUtils";
import { formatDisplayName } from "../../lib/utils";
import {
  CalendarDays,
  CalendarPlus,
  IndianRupee,
  Video,
  Clock,
  User,
  Award,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
  Wallet,
  AlertCircle,
  FileText,
  ExternalLink,
  ShieldCheck,
  Building2,
  BarChart3,
  Box,
  CheckCircle2,
  Star,
  TrendingUp,
  Check,
  Zap,
} from "lucide-react";
import CardFloatingWave from "../../components/CardFloatingWave";


// --- Quick Action Item Component ---
interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColorClass?: string;
  gradientClass?: string;
  borderHoverClass?: string;
  onClick?: () => void;
}

function QuickActionCard({
  title,
  description,
  icon,
  badge,
  badgeColorClass = "bg-blue-50 text-[#0755E8] border-blue-200",
  gradientClass = "from-blue-600 to-indigo-600 text-white shadow-blue-500/25",
  borderHoverClass = "hover:border-blue-400 hover:ring-blue-100",
  onClick,
}: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full group flex items-center justify-between p-2.5 sm:p-3 bg-white hover:bg-slate-50/60 border border-slate-200/90 rounded-xl ${borderHoverClass} hover:shadow-xs hover:ring-2 transition-all duration-200 text-left cursor-pointer`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${gradientClass} flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#0755E8] transition-colors truncate">
              {title}
            </h4>
            {badge && (
              <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${badgeColorClass}`}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">{description}</p>
        </div>
      </div>
      <div className="w-6 h-6 rounded-lg bg-slate-50 group-hover:bg-blue-50 border border-slate-200/60 group-hover:border-blue-200 flex items-center justify-center shrink-0 ml-2 transition-all">
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0755E8] group-hover:translate-x-0.5 transition-all" />
      </div>
    </button>
  );
}

// Helper for session timing countdown
const getSessionTimingInfo = (startTime: string, endTime?: string) => {
  const start = new Date(startTime).getTime();
  const end = endTime ? new Date(endTime).getTime() : start + 60 * 60000;
  const now = Date.now();

  if (now >= start && now <= end) {
    return { isLive: true, isPast: false, text: "Live Now" };
  }
  if (now > end) {
    return { isLive: false, isPast: true, text: "Completed" };
  }
  const diffMs = start - now;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) {
    return { isLive: false, isPast: false, text: `Starts in ${Math.max(1, diffMins)}m` };
  }
  const diffHours = Math.floor(diffMins / 60);
  const remMins = diffMins % 60;
  if (diffHours < 24) {
    return { isLive: false, isPast: false, text: `Starts in ${diffHours}h ${remMins}m` };
  }
  const diffDays = Math.floor(diffHours / 24);
  const remHours = diffHours % 24;
  return { isLive: false, isPast: false, text: `Starts in ${diffDays}d ${remHours}h` };
};

// --- Main Expert Dashboard Index ---
export default function DashboardIndex() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profileCompletion, setProfileCompletion] = useState<number | null>(null);
  const [missingSections, setMissingSections] = useState<string[]>([]);
  const [profileStatus, setProfileStatus] = useState<string>("");
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);
  const [expertProfile, setExpertProfile] = useState<any>(null);
  const [sessionFilter, setSessionFilter] = useState<"all" | "upcoming" | "completed">("all");
  const [stats, setStats] = useState({
    totalSessions: 0,
    upcomingSessions: 0,
    reportsPending: 0,
    walletBalance: 0,
    revenue: 0,
    rating: 0,
    completionRate: 100,
    status: "",
    verificationRequested: false,
    isVerified: false,
  });
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const SESSIONS_PER_PAGE = 4;
  const [currentPage, setCurrentPage] = useState<number>(1);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, sessionsRes, profileRes] = await Promise.allSettled([
        axios.get("/api/expert/stats"),
        axios.get(`/api/sessions/expert/${user?.id || "me"}`),
        axios.get("/api/expert/profile"),
      ]);

      if (statsRes.status === "fulfilled" && statsRes.value.data.success) {
        const s = statsRes.value.data.data;
        setStats((prev) => ({
          ...prev,
          totalSessions: s.totalSessions ?? 0,
          upcomingSessions: s.upcomingSessions ?? 0,
          reportsPending: s.todaysBookings ?? 0,
          walletBalance: s.walletBalance ?? 0,
          revenue: s.revenue ?? 0,
          rating: s.rating ?? 0,
          completionRate: s.completionRate ?? 100,
          status: s.status || "pending",
          verificationRequested: Boolean(s.verificationRequested),
          isVerified: Boolean(s.isVerified),
        }));
      }

      if (profileRes.status === "fulfilled" && profileRes.value.data?.success) {
        const p = profileRes.value.data.profile || {};
        setExpertProfile(p);
        const comp = profileRes.value.data.completion ?? null;
        const missing = profileRes.value.data.missingSections || [];
        setProfileCompletion(comp);
        setMissingSections(missing);
        const currentStatus = p.status || "pending";
        setProfileStatus(currentStatus);
        setIsProfileComplete(
          comp !== null
            ? comp >= 80 && missing.filter((m: string) => m !== "Availability").length === 0
            : false
        );
      }

      if (sessionsRes.status === "fulfilled" && Array.isArray(sessionsRes.value.data)) {
        const rawSessions = sessionsRes.value.data;
        setAllSessions(rawSessions);
      }
    } catch (error) {
      console.error("Dashboard data fetch error", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  // Real-time synchronization
  useDataSync(["WALLET_UPDATED", "SESSION_UPDATED", "SESSION_CREATED", "STATUS_UPDATED", "EXPERT_STATUS_UPDATED", "RECONNECTED"], () => {
    if (user) fetchData();
  });

  const formatCurrency = (amount: number) => {
    const rounded = Math.round((Number(amount || 0) + Number.EPSILON) * 100) / 100;
    return rounded.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  const formattedRevenue = `₹${formatCurrency(stats.revenue)}`;

  // Session filtering
  const now = new Date();
  const upcomingSessions = allSessions
    .filter((s) => new Date(s.startTime) > now && s.status !== "cancelled")
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const completedSessions = allSessions
    .filter((s) => s.status === "completed" || new Date(s.endTime) < now || s.status === "confirmed")
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const displayedSessions =
    sessionFilter === "upcoming"
      ? upcomingSessions
      : sessionFilter === "completed"
      ? completedSessions
      : allSessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  // Session pagination calculations
  const totalPages = Math.max(1, Math.ceil(displayedSessions.length / SESSIONS_PER_PAGE));
  const startIndex = (currentPage - 1) * SESSIONS_PER_PAGE;
  const currentSessions = displayedSessions.slice(startIndex, startIndex + SESSIONS_PER_PAGE);

  // Check if profile page is done (excluding availability which is on a separate dashboard tab)
  const profilePageMissing = missingSections.filter(
    (s) => s !== "Availability" && s !== "Profile Photo"
  );

  const isExpertApproved = Boolean(
    user?.isExpertVerified ||
    user?.expertStatus?.toLowerCase() === "active" ||
    user?.expertStatus?.toLowerCase() === "approved" ||
    profileStatus?.toLowerCase() === "approved" ||
    profileStatus?.toLowerCase() === "active" ||
    profileStatus?.toLowerCase() === "verified" ||
    stats.isVerified ||
    stats.status?.toLowerCase() === "active" ||
    stats.status?.toLowerCase() === "approved" ||
    expertProfile?.status?.toLowerCase() === "active" ||
    expertProfile?.status?.toLowerCase() === "approved" ||
    expertProfile?.isVerified
  );

  const isUnderReview = !isExpertApproved && Boolean(
    user?.verificationRequested ||
    expertProfile?.verificationRequested ||
    stats.verificationRequested
  );

  const isProfileFullyComplete = Boolean(
    isExpertApproved ||
    (profileCompletion !== null && profileCompletion >= 100 && profilePageMissing.length === 0) ||
    stats.totalSessions > 0 ||
    stats.upcomingSessions > 0
  );

  if (isAuthLoading || loading) return <ExpertPageSkeleton variant="dashboard" />;

  return (
    <div className="sidebar-main-card relative w-full rounded-2xl border border-blue-200/80 bg-gradient-to-b from-[#DCEBFF] via-[#F4F8FF] to-white p-3.5 sm:p-5 md:p-6 shadow-[0_8px_32px_-12px_rgba(7,85,232,0.08)] overflow-hidden font-sans text-left animate-in fade-in duration-200">
      {/* Decorative ambient blue lighting - Vivid & clearly visible */}
      <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-gradient-to-br from-blue-400/35 via-indigo-300/25 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -top-12 -left-12 w-64 h-64 rounded-full bg-gradient-to-br from-sky-400/25 via-blue-200/20 to-transparent blur-2xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-blue-200/30 via-blue-100/10 to-transparent pointer-events-none" />

      {/* Content Layer */}
      <div className="relative z-10 space-y-4 sm:space-y-5">
        {/* 1. Executive Mentor Header Banner with Luminous Soft Gradient (Theme Matched, Non-Collapsing) */}
        <div className="relative rounded-2xl border border-blue-200/90 bg-gradient-to-r from-[#D8E9FF] via-[#EFF6FF] to-white p-4 sm:p-5 shadow-xs overflow-hidden">
          {/* Subtle ambient lighting glows */}
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-gradient-to-br from-blue-400/30 to-indigo-300/20 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-52 h-52 rounded-full bg-gradient-to-tr from-sky-300/25 to-blue-200/15 blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-3.5 sm:gap-4">
            {/* Left: Mentor Identity & Status with Clean Alignment */}
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={getProfileImageUrl(expertProfile?.photoUrl || user?.profilePhoto, user?.name)}
                  alt={user?.name || "Expert"}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border-2 border-white shadow-md ring-2 ring-blue-500/20 bg-slate-100"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Expert')}&background=0755E8&color=fff&bold=true`;
                  }}
                />
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs animate-pulse"
                  title="Online & Accepting Bookings"
                />
              </div>

              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight capitalize truncate">
                    {formatDisplayName(user?.name || expertProfile?.name || "Expert Mentor")}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-200/90 rounded-full shadow-2xs text-[10px] font-bold text-emerald-700 uppercase tracking-wide shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Accepting Bookings
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full shadow-2xs text-[10px] font-bold shrink-0 border ${
                    isExpertApproved
                      ? "bg-emerald-50 border-emerald-200/90 text-emerald-700"
                      : isUnderReview
                      ? "bg-blue-50 border-blue-200/90 text-[#0755E8]"
                      : "bg-amber-50 border-amber-200/90 text-amber-700"
                  }`}>
                    <ShieldCheck className={`w-3 h-3 ${isExpertApproved ? "text-emerald-600" : isUnderReview ? "text-[#0755E8]" : "text-amber-600"}`} />
                    {isExpertApproved ? "Approved Mentor" : isUnderReview ? "Waiting for Admin Approval" : "Mentor In Setup"}
                  </span>
                </div>

                <div className="text-xs text-slate-600 font-medium flex items-center gap-2 flex-wrap">
                  <span className="text-slate-800 font-bold capitalize">
                    {expertProfile?.title || (user?.title ? user.title : "") || "Mentor Profile"}
                  </span>
                  {expertProfile?.company && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                      <span className="font-bold text-slate-800 flex items-center gap-1 capitalize">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        {expertProfile.company}
                      </span>
                    </>
                  )}
                  {expertProfile?.category && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                      <span className="text-[#0755E8] font-bold bg-blue-50/80 px-1.5 py-0.5 rounded-md border border-blue-100 text-[11px]">
                        {expertProfile.category}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Clean Action Buttons Aligned Without Any Collapsing or Squeezing */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
              <button
                onClick={() => navigate("/dashboard/reports")}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:py-2 bg-white border border-slate-200/90 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs cursor-pointer whitespace-nowrap active:scale-95"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Download Report</span>
              </button>

              {user?.id && (
                <button
                  onClick={() => window.open(`/expert-profile/${user.id}`, "_blank")}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:py-2 bg-white border border-blue-200 text-[#0755E8] text-xs font-bold rounded-lg hover:bg-blue-50/80 transition-all shadow-2xs cursor-pointer whitespace-nowrap active:scale-95"
                  title="Public View"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#0755E8]" />
                  <span>Public View</span>
                </button>
              )}

              <button
                onClick={() => navigate("/dashboard/availability")}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 sm:py-2 bg-[#0755E8] hover:bg-[#0645C7] text-white text-xs font-bold rounded-lg transition-all shadow-sm shadow-[#0755E8]/25 hover:shadow-md cursor-pointer whitespace-nowrap active:scale-95"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span>Set Availability</span>
              </button>
            </div>
          </div>
        </div>

        {/* Under Review or Incomplete Profile Alert */}
        {isUnderReview ? (
          <div className="bg-gradient-to-r from-blue-50/95 via-indigo-50/50 to-blue-50/40 border border-blue-200/90 rounded-2xl p-4 sm:px-5 sm:py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/25">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold text-blue-950">
                    Profile Submitted • Waiting for Admin Approval
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    Under Review
                  </span>
                </div>
                <p className="text-xs sm:text-[13px] text-blue-800/80 leading-snug">
                  Your profile is 100% complete and undergoing admin verification. You will receive an email notification as soon as your account is approved.
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate("/dashboard/profile")}
              className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-blue-50/80 text-[#0755E8] border border-blue-200 text-xs font-bold rounded-xl transition-all duration-200 shadow-2xs cursor-pointer whitespace-nowrap self-start md:self-center group"
            >
              View Profile Status
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        ) : !isProfileFullyComplete ? (
          <div className="bg-gradient-to-r from-amber-50/90 via-rose-50/40 to-white border border-amber-200/90 rounded-2xl p-4 sm:px-5 sm:py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/25">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold text-slate-900">
                    Profile Setup Incomplete
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {profileCompletion !== null ? `${profileCompletion}% Done` : "Pending Details"}
                  </span>
                </div>
                <p className="text-xs sm:text-[13px] text-slate-600 leading-snug">
                  Complete your profile details, category & verification to start publishing time slots and receiving mock interview bookings.
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate("/dashboard/profile")}
              className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0755E8] hover:bg-[#0645C7] text-white text-xs font-bold rounded-xl transition-all duration-200 shadow-2xs cursor-pointer whitespace-nowrap self-start md:self-center group"
            >
              Complete Profile
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        ) : null}

        {/* 3. OPTION 4: KPI CARDS (MODERN LOOK) WITH FLOATING WAVE DESIGN */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          {/* Header Row from Reference Image */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 flex-wrap gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-slate-50 text-slate-700 rounded-lg border border-slate-200/80 shrink-0">
                <BarChart3 className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-900">
                  INTERVIEW LIFECYCLE DISTRIBUTION
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Live booking stages derived from database records
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200 shadow-2xs">
              {stats.totalSessions} Total Rounds
            </span>
          </div>

          {/* 4 Floating Wave KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Total Sessions (Blue) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/dashboard/sessions")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/dashboard/sessions")}
              className="relative bg-gradient-to-b from-[#EFF6FF] via-[#F8FAFF] to-[#DBEAFE]/40 border border-blue-200/80 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:border-blue-300 transition-all duration-200 cursor-pointer min-h-[118px] group text-left select-none"
            >
              <div className="flex items-center justify-between relative z-10 mb-1">
                <div className="w-7.5 h-7.5 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/25 group-hover:scale-105 transition-transform">
                  <Box className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
                <div className="w-5 h-5 rounded-full bg-white/90 shadow-xs border border-blue-100 flex items-center justify-center text-blue-600 group-hover:translate-x-0.5 transition-transform">
                  <ChevronRight size={11} className="stroke-[2.5]" />
                </div>
              </div>

              <div className="relative z-10">
                <h4 className="text-[11px] font-bold text-blue-800 tracking-tight">
                  Total Sessions
                </h4>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight my-0.5">
                  {stats.totalSessions}
                </div>
                <p className="text-[10.5px] font-medium text-slate-500">
                  +12% this month
                </p>
              </div>

              <CardFloatingWave colorClass="text-blue-500/70" />
            </div>

            {/* Card 2: Upcoming Sessions (Soft Emerald / Mint) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/dashboard/sessions")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/dashboard/sessions")}
              className="relative bg-gradient-to-b from-[#ECFDF5] via-[#F7FCF9] to-[#D1FAE5]/40 border border-emerald-200/80 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-300 transition-all duration-200 cursor-pointer min-h-[118px] group text-left select-none"
            >
              <div className="flex items-center justify-between relative z-10 mb-1">
                <div className="w-7.5 h-7.5 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-sm shadow-emerald-500/25 group-hover:scale-105 transition-transform">
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
                <div className="w-5 h-5 rounded-full bg-white/90 shadow-xs border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:translate-x-0.5 transition-transform">
                  <ChevronRight size={11} className="stroke-[2.5]" />
                </div>
              </div>

              <div className="relative z-10">
                <h4 className="text-[11px] font-bold text-emerald-800 tracking-tight">
                  Upcoming
                </h4>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight my-0.5">
                  {stats.upcomingSessions}
                </div>
                <p className="text-[10.5px] font-medium text-slate-500">
                  Next 7 Days
                </p>
              </div>

              <CardFloatingWave colorClass="text-emerald-500/70" />
            </div>

            {/* Card 3: Wallet Balance (Amber) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/dashboard/withdraw")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/dashboard/withdraw")}
              className="relative bg-gradient-to-b from-[#FFFBEB] via-[#FFFEFA] to-[#FEF3C7]/40 border border-amber-200/80 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:border-amber-300 transition-all duration-200 cursor-pointer min-h-[118px] group text-left select-none"
            >
              <div className="flex items-center justify-between relative z-10 mb-1">
                <div className="w-7.5 h-7.5 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-sm shadow-amber-500/25 group-hover:scale-105 transition-transform">
                  <Wallet className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
                <div className="w-5 h-5 rounded-full bg-white/90 shadow-xs border border-amber-200 flex items-center justify-center text-amber-600 group-hover:translate-x-0.5 transition-transform">
                  <ChevronRight size={11} className="stroke-[2.5]" />
                </div>
              </div>

              <div className="relative z-10">
                <h4 className="text-[11px] font-bold text-amber-800 tracking-tight">
                  Wallet Balance
                </h4>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight my-0.5">
                  ₹{formatCurrency(stats.walletBalance)}
                </div>
                <p className="text-[10.5px] font-medium text-slate-500">
                  Available for withdrawal
                </p>
              </div>

              <CardFloatingWave colorClass="text-amber-500/70" />
            </div>

            {/* Card 4: Total Earnings (Rose) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/dashboard/reports")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/dashboard/reports")}
              className="relative bg-gradient-to-b from-[#FFF1F2] via-[#FFF8F8] to-[#FFE4E6]/40 border border-rose-200/80 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:border-rose-300 transition-all duration-200 cursor-pointer min-h-[118px] group text-left select-none"
            >
              <div className="flex items-center justify-between relative z-10 mb-1">
                <div className="w-7.5 h-7.5 rounded-lg bg-gradient-to-tr from-rose-500 to-rose-600 text-white flex items-center justify-center shadow-sm shadow-rose-500/25 group-hover:scale-105 transition-transform">
                  <IndianRupee className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
                <div className="w-5 h-5 rounded-full bg-white/90 shadow-xs border border-rose-100 flex items-center justify-center text-rose-600 group-hover:translate-x-0.5 transition-transform">
                  <ChevronRight size={11} className="stroke-[2.5]" />
                </div>
              </div>

              <div className="relative z-10">
                <h4 className="text-[11px] font-bold text-rose-800 tracking-tight">
                  Total Earnings
                </h4>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight my-0.5">
                  {formattedRevenue}
                </div>
                <p className="text-[10.5px] font-medium text-slate-500">
                  Current Month
                </p>
              </div>

              <CardFloatingWave colorClass="text-rose-500/70" />
            </div>
          </div>

          {/* Bottom Action Strip from Reference Image */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate("/dashboard/availability")}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/dashboard/availability")}
            className="group cursor-pointer bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-blue-50/60 border border-blue-200/80 rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:border-blue-400 hover:shadow-xs transition-all select-none"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#0755E8] text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/25">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#0755E8] transition-colors truncate">
                  Monitor each stage to keep your interview bookings on track.
                </h4>
                <p className="text-[11px] text-slate-500 truncate">
                  Keep availability updated to receive candidate bookings • Instant wallet credits upon completion.
                </p>
              </div>
            </div>
            <div className="w-6 h-6 rounded-full bg-white shadow-xs border border-blue-100 flex items-center justify-center text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0">
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          </div>
        </div>

        {/* 4. Main Two-Column Layout: Left (2 cols) + Right Stack (1 col) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-stretch">
          {/* Left Column (2 cols): Interviews Hub + Interview Excellence Guide (Moved to left as requested) */}
          <div className="lg:col-span-2 flex flex-col justify-between gap-4 sm:gap-5">
            {/* 1. Interview Sessions & Schedule Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col space-y-3.5">
              {/* Header with Title & Filter Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0755E8] shadow-2xs">
                    <Clock className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                      Interview Sessions &amp; Schedule
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Live meeting rooms, candidate status &amp; scheduled bookings
                    </p>
                  </div>
                </div>

                {/* Filter Tabs & Quick Link */}
                <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                    <button
                      onClick={() => { setSessionFilter("all"); setCurrentPage(1); }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        sessionFilter === "all"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      All ({allSessions.length})
                    </button>
                    <button
                      onClick={() => { setSessionFilter("upcoming"); setCurrentPage(1); }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        sessionFilter === "upcoming"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Upcoming ({upcomingSessions.length})
                    </button>
                    <button
                      onClick={() => { setSessionFilter("completed"); setCurrentPage(1); }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        sessionFilter === "completed"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Completed ({completedSessions.length})
                    </button>
                  </div>
                  <button
                    onClick={() => navigate("/dashboard/sessions")}
                    className="text-[11px] font-bold text-[#0755E8] hover:text-[#0645C7] hover:underline flex items-center gap-1 cursor-pointer ml-1"
                  >
                    <span>All Sessions</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Sessions List */}
              {displayedSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto py-8">
                  <div className="relative mb-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 border border-blue-200/80 flex items-center justify-center shadow-xs">
                      <CalendarDays className="w-7 h-7 text-[#0755E8]" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold shadow-xs">
                      <Sparkles className="w-3 h-3" />
                    </div>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1">
                    {sessionFilter === "upcoming" ? "No Upcoming Interviews Scheduled" : "No Sessions Found"}
                  </h3>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed max-w-sm">
                    {sessionFilter === "upcoming"
                      ? "You don't have any sessions booked for the upcoming 7 days. Open time slots in your availability calendar to let candidates book."
                      : "No interview records match the selected filter."}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate("/dashboard/availability")}
                      className="px-3.5 py-1.5 bg-[#0755E8] hover:bg-[#0645C7] text-white text-xs font-bold rounded-lg transition-all shadow-sm shadow-[#0755E8]/20 cursor-pointer"
                    >
                      + Open Availability Slots
                    </button>
                    <button
                      onClick={() => { setSessionFilter("all"); setCurrentPage(1); }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer"
                    >
                      View All ({allSessions.length})
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {currentSessions.map((session: any) => {
                    const timing = getSessionTimingInfo(session.startTime, session.endTime);
                    const isCompleted = session.status === "completed" || timing.isPast;
                    const candidateName = session.candidateId?.name || "Candidate";
                    const candidatePhoto = session.candidateId?.profileImage || null;
                    const topic = session.topics?.[0] || session.domain || session.categoryNameSnapshot || "Technical Mock Interview";
                    const sessionDate = new Date(session.startTime).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    });
                    const sessionTime = new Date(session.startTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={session._id || session.sessionId}
                        onClick={() => navigate(`/dashboard/sessions?sessionId=${session.sessionId || session._id}`)}
                        className={`group relative bg-white hover:bg-blue-50/25 border border-slate-200/90 hover:border-blue-400 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-200 shadow-2xs hover:shadow-xs cursor-pointer select-none ${
                          isCompleted
                            ? "border-l-[3.5px] border-l-emerald-500"
                            : timing.isLive
                            ? "border-l-[3.5px] border-l-emerald-400 ring-2 ring-emerald-500/20"
                            : "border-l-[3.5px] border-l-[#0755E8]"
                        }`}
                      >
                        {/* Left: Avatar & Candidate Identity */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-center font-black text-sm shadow-xs border border-blue-200/40 overflow-hidden">
                              {candidatePhoto ? (
                                <img
                                  src={candidatePhoto}
                                  alt={candidateName}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(candidateName)}&background=0755E8&color=ffffff&bold=true`;
                                  }}
                                />
                              ) : (
                                <span>{candidateName.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            {timing.isLive ? (
                              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
                            ) : isCompleted ? (
                              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 border border-white flex items-center justify-center text-[9px] font-bold">
                                ✓
                              </span>
                            ) : null}
                          </div>

                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-slate-900 text-sm group-hover:text-[#0755E8] transition-colors truncate capitalize">
                                {formatDisplayName(candidateName)}
                              </h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#0755E8] border border-blue-200/80 uppercase tracking-wide truncate max-w-[210px]">
                                {topic}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-500 font-medium">
                              1:1 Live Mock Session • 45 Mins Google Meet
                            </p>
                          </div>
                        </div>

                        {/* Middle: Schedule Information (Date & Time Pill) */}
                        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-50/90 border border-slate-200/70 text-xs self-start sm:self-center shrink-0">
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                            {sessionDate}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span className="flex items-center gap-1 font-semibold text-[#0755E8]">
                            <Clock className="w-3.5 h-3.5" />
                            {sessionTime}
                          </span>
                        </div>

                        {/* Right: Status & Action Button */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {isCompleted ? (
                            <>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Completed
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/dashboard/sessions?sessionId=${session.sessionId || session._id}`);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-[#0755E8] text-white text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                              >
                                <span>View Session</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : timing.isLive ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/live-meeting?meetingId=${session.sessionId || session._id}`);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all shadow-sm shadow-emerald-600/30 flex items-center gap-1.5 animate-pulse cursor-pointer active:scale-95"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>Join Live Room</span>
                            </button>
                          ) : (
                            <>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-blue-50 text-[#0755E8] border border-blue-200">
                                <Clock className="w-3 h-3" />
                                {timing.text}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/live-meeting?meetingId=${session.sessionId || session._id}`);
                                }}
                                className="bg-[#0755E8] hover:bg-[#0645C7] text-white px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all shadow-sm shadow-[#0755E8]/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
                              >
                                <Video className="w-3.5 h-3.5" />
                                <span>Join Call</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination Footer Controls (Requested by user: 4 per page with Previous / Next) */}
              {displayedSessions.length > 0 && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-wrap gap-2 text-xs">
                  <span className="text-slate-500 font-medium">
                    Showing {startIndex + 1}–{Math.min(startIndex + SESSIONS_PER_PAGE, displayedSessions.length)} of {displayedSessions.length} candidate sessions
                  </span>
                  <div className="flex items-center gap-2">
                    {totalPages > 1 && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-all shadow-2xs cursor-pointer"
                          title="Previous 4 Candidates"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Prev</span>
                        </button>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                                currentPage === pageNum
                                  ? "bg-[#0755E8] text-white shadow-xs"
                                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              {pageNum}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-all shadow-2xs cursor-pointer"
                          title="Next 4 Candidates"
                        >
                          <span>Next</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => navigate("/dashboard/sessions")}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#0755E8] hover:underline cursor-pointer ml-1"
                    >
                      <span>Manage All Sessions</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Interview Excellence Guide Card (NOW IN THE LEFT AS REQUESTED IN PIC 1!) */}
            <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white border border-blue-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-blue-100/90 mb-3.5 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                      Interview Excellence Guide
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#0755E8]">
                        Mentor Protocols
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Key practices to deliver top-rated mock interview experiences
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/help")}
                  className="text-xs font-bold text-[#0755E8] hover:text-[#0645C7] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span>Help &amp; Support</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 3 Pillar Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white/90 border border-blue-100 rounded-xl p-3.5 flex flex-col justify-between shadow-2xs hover:border-blue-300 transition-colors">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-50 text-[#0755E8] flex items-center justify-center text-xs font-bold border border-blue-200/60">
                        1
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">Join 2 Mins Prior</h4>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Google Meet room initializes automatically at slot start. Test camera, mic &amp; live coding sandbox.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-[#0755E8] mt-2 inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Punctuality Protocol
                  </span>
                </div>

                <div className="bg-white/90 border border-blue-100 rounded-xl p-3.5 flex flex-col justify-between shadow-2xs hover:border-blue-300 transition-colors">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center text-xs font-bold border border-purple-200/60">
                        2
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">Structured Debrief</h4>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Reserve 5–8 mins at the conclusion for actionable verbal guidance and rubric rating breakdown.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-purple-700 mt-2 inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Actionable Feedback
                  </span>
                </div>

                <div className="bg-white/90 border border-blue-100 rounded-xl p-3.5 flex flex-col justify-between shadow-2xs hover:border-blue-300 transition-colors">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs font-bold border border-emerald-200/60">
                        3
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">Submit Review</h4>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Complete candidate review within 24h to unlock immediate wallet credits &amp; candidate notifications.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 mt-2 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Instant Payout
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Quick Management & Active Mentorship Tiers (Redesigned & Balanced) */}
          <div className="lg:col-span-1 flex flex-col justify-between gap-4 sm:gap-5 h-full">
            {/* Panel 1: Quick Management (Impressive, Vibrant, Interactive) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-4.5 shadow-xs flex-1 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0755E8] shadow-2xs">
                      <Sparkles className="w-3.5 h-3.5 fill-blue-500/20" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        Quick Management
                      </h3>
                      <p className="text-[10px] text-slate-500 font-medium">Fast action shortcuts &amp; setups</p>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    Fast Actions
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <QuickActionCard
                    title="Calendar Availability"
                    description="Set recurring slots, blackout dates & sync"
                    icon={<CalendarDays className="w-4 h-4" />}
                    badge="Slots Open"
                    badgeColorClass="bg-blue-50 text-[#0755E8] border-blue-200/80"
                    gradientClass="from-blue-600 to-indigo-600 text-white shadow-blue-500/25"
                    borderHoverClass="hover:border-blue-300 hover:ring-blue-100"
                    onClick={() => navigate("/dashboard/availability")}
                  />
                  <QuickActionCard
                    title="Profile & Credentials"
                    description="Edit bio, seniority, hourly fee & social"
                    icon={<User className="w-4 h-4" />}
                    badge="Verified"
                    badgeColorClass="bg-purple-50 text-purple-700 border-purple-200/80"
                    gradientClass="from-purple-600 to-violet-600 text-white shadow-purple-500/25"
                    borderHoverClass="hover:border-purple-300 hover:ring-purple-100"
                    onClick={() => navigate("/dashboard/profile")}
                  />
                  <QuickActionCard
                    title="Interview Tracks"
                    description="Add DSA, AI, System Design & rubrics"
                    icon={<Award className="w-4 h-4" />}
                    badge="3 Tracks"
                    badgeColorClass="bg-amber-50 text-amber-800 border-amber-200/80"
                    gradientClass="from-amber-500 to-orange-500 text-white shadow-amber-500/25"
                    borderHoverClass="hover:border-amber-300 hover:ring-amber-100"
                    onClick={() => navigate("/dashboard/skills")}
                  />
                  <QuickActionCard
                    title="Payouts & Banking"
                    description="View wallet balance & bank payouts"
                    icon={<Wallet className="w-4 h-4" />}
                    badge="Instant"
                    badgeColorClass="bg-emerald-50 text-emerald-700 border-emerald-200/80"
                    gradientClass="from-emerald-600 to-teal-600 text-white shadow-emerald-500/25"
                    borderHoverClass="hover:border-emerald-300 hover:ring-emerald-100"
                    onClick={() => navigate("/dashboard/withdraw")}
                  />
                </div>
              </div>
            </div>

            {/* Panel 2: Active Mentorship Tiers Offered (Impressive, Attractive, Integrated Trust) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-4.5 shadow-xs flex-1 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0755E8]">
                      <Zap className="w-3.5 h-3.5 fill-[#0755E8]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                        Mentorship Tiers Offered
                      </h4>
                      <p className="text-[10px] text-slate-500">Live booking offerings on your profile</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-bold">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    Live
                  </span>
                </div>

                <div className="space-y-2.5">
                  {/* Tier 1: 1:1 Live Mock Interview (Popular) */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate("/dashboard/profile")}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/dashboard/profile")}
                    className="group relative p-2.5 sm:p-3 bg-gradient-to-r from-blue-50/70 via-indigo-50/20 to-white rounded-xl border border-blue-200/80 border-l-[3.5px] border-l-[#0755E8] flex items-center justify-between gap-2.5 hover:border-blue-400 hover:shadow-xs transition-all duration-200 cursor-pointer"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-[#0755E8] transition-colors truncate">
                          1:1 Live Mock Interview
                        </span>
                        <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded-md bg-blue-100 text-[#0755E8] border border-blue-200/70">
                          Popular
                        </span>
                      </div>
                      <div className="text-[10.5px] text-slate-500 flex items-center gap-1.5">
                        <span className="font-semibold text-slate-700">45 mins</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span>Coding &amp; System Design</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-slate-900 group-hover:text-[#0755E8] transition-colors block">
                        ₹999
                      </span>
                      <span className="text-[9.5px] font-semibold text-slate-400 block">per session</span>
                    </div>
                  </div>

                  {/* Tier 2: System Architecture Deep Dive (Advanced) */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate("/dashboard/profile")}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/dashboard/profile")}
                    className="group relative p-2.5 sm:p-3 bg-gradient-to-r from-purple-50/60 via-fuchsia-50/20 to-white rounded-xl border border-purple-200/80 border-l-[3.5px] border-l-purple-600 flex items-center justify-between gap-2.5 hover:border-purple-400 hover:shadow-xs transition-all duration-200 cursor-pointer"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors truncate">
                          System Architecture Deep Dive
                        </span>
                        <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-700 border border-purple-200/70">
                          Advanced
                        </span>
                      </div>
                      <div className="text-[10.5px] text-slate-500 flex items-center gap-1.5">
                        <span className="font-semibold text-slate-700">60 mins</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span>Scalability &amp; DB Review</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-slate-900 group-hover:text-purple-700 transition-colors block">
                        ₹1,499
                      </span>
                      <span className="text-[9.5px] font-semibold text-slate-400 block">per session</span>
                    </div>
                  </div>

                  {/* Tier 3: Resume & Portfolio Audit (Fast Track) */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate("/dashboard/profile")}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/dashboard/profile")}
                    className="group relative p-2.5 sm:p-3 bg-gradient-to-r from-amber-50/60 via-orange-50/20 to-white rounded-xl border border-amber-200/80 border-l-[3.5px] border-l-amber-500 flex items-center justify-between gap-2.5 hover:border-amber-400 hover:shadow-xs transition-all duration-200 cursor-pointer"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-amber-800 transition-colors truncate">
                          Resume &amp; Portfolio Audit
                        </span>
                        <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 border border-amber-200/70">
                          Fast Track
                        </span>
                      </div>
                      <div className="text-[10.5px] text-slate-500 flex items-center gap-1.5">
                        <span className="font-semibold text-slate-700">30 mins</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span>ATS &amp; Project Feedback</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-slate-900 group-hover:text-amber-800 transition-colors block">
                        ₹499
                      </span>
                      <span className="text-[9.5px] font-semibold text-slate-400 block">per session</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Integrated Trust Strip & Edit Tiers */}
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                  <span className="text-amber-500 font-bold">★ 5.0 Rating</span>
                  <span className="text-slate-300">•</span>
                  <span>100% Attendance</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-emerald-600 font-bold">Instant Credit</span>
                </div>
                <button
                  onClick={() => navigate("/dashboard/profile")}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#0755E8] hover:text-[#0645C7] hover:underline cursor-pointer group shrink-0"
                >
                  <span>Edit Tiers</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
