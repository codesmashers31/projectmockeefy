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

// --- Soft Layered Bottom Wave SVG (Floating Modern Look from Reference) ---
function CardBottomWave({ colorClass }: { colorClass: string }) {
  return (
    <svg
      viewBox="0 0 300 70"
      preserveAspectRatio="none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`absolute bottom-0 inset-x-0 w-full h-14 sm:h-16 pointer-events-none ${colorClass}`}
    >
      {/* Background soft wave */}
      <path
        d="M0 32C70 48 130 18 190 32C250 46 275 24 300 38V70H0V32Z"
        fill="currentColor"
        opacity="0.38"
      />
      {/* Foreground wave */}
      <path
        d="M0 46C50 28 105 52 160 38C215 24 260 48 300 35V70H0V46Z"
        fill="currentColor"
        opacity="0.82"
      />
    </svg>
  );
}

// --- Quick Action Item Component ---
interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  onClick?: () => void;
}

function QuickActionCard({ title, description, icon, badge, onClick }: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full group flex items-center justify-between p-3.5 sm:p-4 bg-white border border-slate-200/90 rounded-2xl hover:border-blue-300 hover:shadow-md hover:ring-2 hover:ring-blue-50/80 transition-all duration-200 text-left cursor-pointer"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-[#0755E8] group-hover:text-white transition-colors duration-200 shadow-2xs border border-slate-200/70">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-[#0755E8] transition-colors truncate">
              {title}
            </h4>
            {badge && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-[#0755E8] border border-blue-200 shrink-0">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 truncate mt-0.5">{description}</p>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#0755E8] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
    </button>
  );
}

// Helper for session timing countdown
const getSessionTimingInfo = (startTime: string) => {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  const diffMs = start - now;
  if (diffMs <= 0) {
    return { isLive: true, isPast: true, text: "Completed" };
  }
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) {
    return { isLive: false, isPast: false, text: `Starts in ${diffMins}m` };
  }
  const diffHours = Math.floor(diffMins / 60);
  const remMins = diffMins % 60;
  if (diffHours < 24) {
    return { isLive: false, isPast: false, text: `Starts in ${diffHours}h ${remMins}m` };
  }
  const diffDays = Math.floor(diffHours / 24);
  const remHours = diffHours % 24;
  return { isLive: false, text: `Starts in ${diffDays}d ${remHours}h` };
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
  });
  const [allSessions, setAllSessions] = useState<any[]>([]);

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
        }));
      }

      if (profileRes.status === "fulfilled" && profileRes.value.data?.success) {
        const p = profileRes.value.data.profile || {};
        setExpertProfile(p);
        const comp = profileRes.value.data.completion ?? null;
        const missing = profileRes.value.data.missingSections || [];
        setProfileCompletion(comp);
        setMissingSections(missing);
        const currentStatus = p.status || localStorage.getItem("profile_status") || "pending";
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
  useDataSync(["WALLET_UPDATED", "SESSION_UPDATED", "SESSION_CREATED", "RECONNECTED"], () => {
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

  // Check if profile page is done (excluding availability which is on a separate dashboard tab)
  const profilePageMissing = missingSections.filter(
    (s) => s !== "Availability" && s !== "Profile Photo"
  );

  const isProfileFullyComplete = Boolean(
    profileStatus === "approved" ||
    profileStatus === "active" ||
    profileStatus === "verified" ||
    localStorage.getItem("profile_status") === "approved" ||
    localStorage.getItem("profile_status") === "active" ||
    (profileCompletion !== null && profileCompletion >= 80 && profilePageMissing.length === 0) ||
    (profileCompletion !== null && profileCompletion >= 85) ||
    (profileCompletion !== null && profileCompletion >= 100) ||
    (profileCompletion !== null && profilePageMissing.length === 0) ||
    stats.totalSessions > 0 ||
    stats.upcomingSessions > 0
  );

  if (isAuthLoading || loading) return <ExpertPageSkeleton variant="dashboard" />;

  return (
    <div className="sidebar-main-card relative w-full rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-4 sm:p-6 md:p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] overflow-hidden font-sans text-left animate-in fade-in duration-200">
      {/* Decorative ambient blue lighting */}
      <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

      {/* Content Layer */}
      <div className="relative z-10 space-y-6 sm:space-y-7">
        {/* 1. Executive Mentor Header Banner with Luminous Soft Gradient (Theme Matched, Non-Collapsing) */}
        <div className="relative rounded-2xl sm:rounded-3xl border border-blue-200/90 bg-gradient-to-r from-[#EBF3FF] via-[#F6F9FF] to-white p-5 sm:p-6 shadow-xs overflow-hidden">
          {/* Subtle ambient lighting glows */}
          <div className="absolute -top-10 -right-10 w-60 h-60 rounded-full bg-blue-300/25 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-indigo-200/20 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-5">
            {/* Left: Mentor Identity & Status with Clean Alignment */}
            <div className="flex items-center gap-3.5 sm:gap-4.5 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={getProfileImageUrl(expertProfile?.photoUrl || user?.profilePhoto, user?.name)}
                  alt={user?.name || "Expert"}
                  className="w-15 h-15 sm:w-17 sm:h-17 rounded-2xl object-cover border-2 border-white shadow-md ring-2 ring-blue-500/20 bg-slate-100"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Expert')}&background=0755E8&color=fff&bold=true`;
                  }}
                />
                <span
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-xs animate-pulse"
                  title="Online & Accepting Bookings"
                />
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight capitalize truncate">
                    {formatDisplayName(user?.name || expertProfile?.name || "Expert Mentor")}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 border border-emerald-200/90 rounded-full shadow-2xs text-[11px] font-bold text-emerald-700 uppercase tracking-wide shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Accepting Bookings
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 border border-blue-200/90 rounded-full shadow-2xs text-[11px] font-bold text-[#0755E8] shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#0755E8]" />
                    Verified Mentor
                  </span>
                </div>

                <div className="text-xs sm:text-[13px] text-slate-600 font-medium flex items-center gap-2 flex-wrap">
                  <span className="text-slate-800 font-bold capitalize">
                    {expertProfile?.title || "Senior Software Engineer"}
                  </span>
                  {expertProfile?.company && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                      <span className="font-extrabold text-slate-800 flex items-center gap-1 capitalize">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {expertProfile.company}
                      </span>
                    </>
                  )}
                  {expertProfile?.category && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                      <span className="text-[#0755E8] font-bold bg-blue-50/80 px-2 py-0.5 rounded-lg border border-blue-100 text-xs">
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
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-2.5 bg-white border border-slate-200/90 text-slate-700 text-xs sm:text-sm font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs cursor-pointer whitespace-nowrap active:scale-95"
              >
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Download Report</span>
              </button>

              {user?.id && (
                <button
                  onClick={() => window.open(`/expert-profile/${user.id}`, "_blank")}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-2.5 bg-white border border-blue-200 text-[#0755E8] text-xs sm:text-sm font-bold rounded-xl hover:bg-blue-50/80 transition-all shadow-2xs cursor-pointer whitespace-nowrap active:scale-95"
                  title="Public View"
                >
                  <ExternalLink className="w-4 h-4 text-[#0755E8]" />
                  <span>Public View</span>
                </button>
              )}

              <button
                onClick={() => navigate("/dashboard/availability")}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 bg-[#0755E8] hover:bg-[#0645C7] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm shadow-[#0755E8]/25 hover:shadow-md cursor-pointer whitespace-nowrap active:scale-95"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>Set Availability</span>
              </button>
            </div>
          </div>
        </div>

        {/* Incomplete Profile Alert (if applicable) */}
        {!isProfileFullyComplete && (
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
        )}

        {/* 3. OPTION 4: KPI CARDS (MODERN LOOK) WITH FLOATING WAVE DESIGN */}
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          {/* Header Row from Reference Image */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 text-slate-700 rounded-xl border border-slate-200/80 shrink-0">
                <BarChart3 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                  INTERVIEW LIFECYCLE DISTRIBUTION
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Live booking stages derived from database records
                </p>
              </div>
            </div>
            <span className="px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 shadow-2xs">
              {stats.totalSessions} Total Rounds
            </span>
          </div>

          {/* 4 Floating Wave KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Sessions (Blue) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/dashboard/sessions")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/dashboard/sessions")}
              className="relative bg-[#F0F6FF] border border-blue-200/80 rounded-2xl p-5 sm:p-5.5 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:border-blue-300 transition-all duration-200 cursor-pointer min-h-[165px] group text-left select-none"
            >
              <div className="flex items-center justify-between relative z-10 mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/30 group-hover:scale-105 transition-transform">
                  <Box className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="w-7 h-7 rounded-full bg-white shadow-xs border border-blue-100 flex items-center justify-center text-blue-600 group-hover:translate-x-0.5 transition-transform">
                  <ChevronRight size={14} className="stroke-[2.5]" />
                </div>
              </div>

              <div className="relative z-10">
                <h4 className="text-xs sm:text-sm font-bold text-blue-700 tracking-tight mb-0.5">
                  Total Sessions
                </h4>
                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight my-0.5">
                  {stats.totalSessions}
                </div>
                <p className="text-xs font-semibold text-slate-500">
                  +12% this month
                </p>
              </div>

              <CardBottomWave colorClass="text-blue-200/70" />
            </div>

            {/* Card 2: Upcoming Sessions (Green) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/dashboard/sessions")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/dashboard/sessions")}
              className="relative bg-[#F0FDF4] border border-emerald-200/80 rounded-2xl p-5 sm:p-5.5 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-300 transition-all duration-200 cursor-pointer min-h-[165px] group text-left select-none"
            >
              <div className="flex items-center justify-between relative z-10 mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm shadow-emerald-500/30 group-hover:scale-105 transition-transform">
                  <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="w-7 h-7 rounded-full bg-white shadow-xs border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:translate-x-0.5 transition-transform">
                  <ChevronRight size={14} className="stroke-[2.5]" />
                </div>
              </div>

              <div className="relative z-10">
                <h4 className="text-xs sm:text-sm font-bold text-emerald-700 tracking-tight mb-0.5">
                  Upcoming
                </h4>
                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight my-0.5">
                  {stats.upcomingSessions}
                </div>
                <p className="text-xs font-semibold text-slate-500">
                  Next 7 Days
                </p>
              </div>

              <CardBottomWave colorClass="text-emerald-200/70" />
            </div>

            {/* Card 3: Wallet Balance (Amber) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/dashboard/withdraw")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/dashboard/withdraw")}
              className="relative bg-[#FFFBEB] border border-amber-200/80 rounded-2xl p-5 sm:p-5.5 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:border-amber-300 transition-all duration-200 cursor-pointer min-h-[165px] group text-left select-none"
            >
              <div className="flex items-center justify-between relative z-10 mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shadow-amber-500/30 group-hover:scale-105 transition-transform">
                  <Wallet className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="w-7 h-7 rounded-full bg-white shadow-xs border border-amber-200 flex items-center justify-center text-amber-600 group-hover:translate-x-0.5 transition-transform">
                  <ChevronRight size={14} className="stroke-[2.5]" />
                </div>
              </div>

              <div className="relative z-10">
                <h4 className="text-xs sm:text-sm font-bold text-amber-800 tracking-tight mb-0.5">
                  Wallet Balance
                </h4>
                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight my-0.5">
                  ₹{formatCurrency(stats.walletBalance)}
                </div>
                <p className="text-xs font-semibold text-slate-500">
                  Available for withdrawal
                </p>
              </div>

              <CardBottomWave colorClass="text-amber-200/70" />
            </div>

            {/* Card 4: Total Earnings (Rose) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/dashboard/reports")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/dashboard/reports")}
              className="relative bg-[#FFF1F2] border border-rose-200/80 rounded-2xl p-5 sm:p-5.5 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:border-rose-300 transition-all duration-200 cursor-pointer min-h-[165px] group text-left select-none"
            >
              <div className="flex items-center justify-between relative z-10 mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-sm shadow-rose-500/30 group-hover:scale-105 transition-transform">
                  <IndianRupee className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="w-7 h-7 rounded-full bg-white shadow-xs border border-rose-100 flex items-center justify-center text-rose-600 group-hover:translate-x-0.5 transition-transform">
                  <ChevronRight size={14} className="stroke-[2.5]" />
                </div>
              </div>

              <div className="relative z-10">
                <h4 className="text-xs sm:text-sm font-bold text-rose-700 tracking-tight mb-0.5">
                  Total Earnings
                </h4>
                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight my-0.5">
                  {formattedRevenue}
                </div>
                <p className="text-xs font-semibold text-slate-500">
                  Current Month
                </p>
              </div>

              <CardBottomWave colorClass="text-rose-200/70" />
            </div>
          </div>

          {/* Bottom Action Strip from Reference Image */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate("/dashboard/availability")}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/dashboard/availability")}
            className="group cursor-pointer bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-blue-50/60 border border-blue-200/80 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:border-blue-400 hover:shadow-xs transition-all select-none"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#0755E8] text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/25">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#0755E8] transition-colors truncate">
                  Monitor each stage to keep your interview bookings on track.
                </h4>
                <p className="text-xs text-slate-500 truncate">
                  Keep availability updated to receive candidate bookings • Instant wallet credits upon completion.
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white shadow-xs border border-blue-100 flex items-center justify-center text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0">
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
        </div>

        {/* 4. Main Two-Column Layout: Interviews & Dossiers (2 cols) + Command Stack (1 col) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column: Interviews & Dossiers Hub */}
          <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col space-y-5">
            {/* Header with Title & Filter Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0755E8] shadow-2xs">
                  <Clock className="w-4.5 h-4.5 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Candidate Interviews &amp; Scorecards
                  </h2>
                  <p className="text-xs text-slate-500">
                    Live video countdowns, Google Meet access &amp; submitted reviews
                  </p>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-center">
                <button
                  onClick={() => setSessionFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sessionFilter === "all"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  All ({allSessions.length})
                </button>
                <button
                  onClick={() => setSessionFilter("upcoming")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sessionFilter === "upcoming"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Upcoming ({upcomingSessions.length})
                </button>
                <button
                  onClick={() => setSessionFilter("completed")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sessionFilter === "completed"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Completed ({completedSessions.length})
                </button>
              </div>
            </div>

            {/* Sessions List or Elevated Action Prompt */}
            {displayedSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto py-8">
                <div className="relative mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 border border-blue-200/80 flex items-center justify-center shadow-xs">
                    <CalendarDays className="w-8 h-8 text-[#0755E8]" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold shadow-xs">
                    <Sparkles className="w-3 h-3" />
                  </div>
                </div>

                <h3 className="text-base font-black text-slate-900 mb-1">
                  {sessionFilter === "upcoming" ? "No Upcoming Interviews Scheduled" : "No Sessions Found"}
                </h3>
                <p className="text-xs text-slate-500 mb-5 leading-relaxed max-w-sm">
                  {sessionFilter === "upcoming"
                    ? "You don't have any sessions booked for the upcoming 7 days. Open time slots in your availability calendar to let candidates book."
                    : "No interview records match the selected filter."}
                </p>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => navigate("/dashboard/availability")}
                    className="px-4 py-2 bg-[#0755E8] hover:bg-[#0645C7] text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-[#0755E8]/20 cursor-pointer"
                  >
                    + Open Availability Slots
                  </button>
                  <button
                    onClick={() => setSessionFilter("all")}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    View All ({allSessions.length})
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {displayedSessions.slice(0, 6).map((session: any) => {
                  const timing = getSessionTimingInfo(session.startTime);
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
                      className="group relative bg-white hover:bg-blue-50/20 border border-slate-200/90 hover:border-blue-300 rounded-2xl p-5 sm:p-5.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 shadow-2xs hover:shadow-xs"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 text-[#0755E8] flex items-center justify-center font-black text-lg border border-blue-100 shrink-0 shadow-2xs overflow-hidden">
                          {candidatePhoto ? (
                            <img
                              src={candidatePhoto}
                              alt={candidateName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(candidateName)}&background=EAF2FF&color=0755E8&bold=true`;
                              }}
                            />
                          ) : (
                            <span>{candidateName.charAt(0).toUpperCase()}</span>
                          )}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h4 className="font-black text-slate-900 text-base sm:text-lg truncate capitalize">
                              {formatDisplayName(candidateName)}
                            </h4>
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#0755E8] border border-blue-200/80 uppercase tracking-wide truncate max-w-[220px]">
                              {topic}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-slate-500 flex-wrap">
                            <span className="flex items-center gap-1.5 font-bold text-slate-700">
                              <CalendarDays className="w-4 h-4 text-slate-400" />
                              {sessionDate}
                            </span>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            <span className="flex items-center gap-1.5 font-bold text-[#0755E8]">
                              <Clock className="w-4 h-4" />
                              {sessionTime}
                            </span>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                                isCompleted
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : timing.isLive
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}
                            >
                              {isCompleted ? "Completed" : timing.text}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => navigate(`/dashboard/sessions/${session.sessionId || session._id}`)}
                          className="text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-colors shadow-2xs cursor-pointer"
                        >
                          Dossier
                        </button>
                        {isCompleted ? (
                          <button
                            onClick={() => navigate(`/dashboard/sessions/${session.sessionId || session._id}`)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Check className="w-4 h-4" />
                            Scorecard
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate(`/live-meeting?meetingId=${session.sessionId || session._id}`)}
                            className="bg-[#0755E8] hover:bg-[#0645C7] text-white px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all shadow-sm shadow-[#0755E8]/20 flex items-center gap-2 cursor-pointer active:scale-95"
                          >
                            <Video className="w-4 h-4" />
                            Join Call
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Quick Management, Active Tiers & Guidelines */}
          <div className="space-y-5">
            {/* Panel 1: Fast Management */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-100">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#0755E8]" />
                  Quick Management
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Fast Actions
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <QuickActionCard
                  title="Calendar Availability"
                  description="Set recurring slots & blackout dates"
                  icon={<Clock className="w-4 h-4" />}
                  onClick={() => navigate("/dashboard/availability")}
                />
                <QuickActionCard
                  title="Profile & Credentials"
                  description="Edit bio, seniority & hourly rates"
                  icon={<User className="w-4 h-4" />}
                  onClick={() => navigate("/dashboard/profile")}
                />
                <QuickActionCard
                  title="Interview Tracks"
                  description="Add DSA, AI & System Design tracks"
                  icon={<Award className="w-4 h-4" />}
                  onClick={() => navigate("/dashboard/skills")}
                />
                <QuickActionCard
                  title="Payouts & Banking"
                  description="View wallet balance & bank payouts"
                  icon={<Wallet className="w-4 h-4" />}
                  badge="Instant"
                  onClick={() => navigate("/dashboard/withdraw")}
                />
              </div>
            </div>

            {/* Panel 2: Active Mentorship Tiers Offered (Candidate View Preview) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#0755E8]" />
                  Mentorship Tiers Offered
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live on Mockeefy
                </span>
              </div>

              <div className="space-y-2">
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-900">1:1 Live Mock Interview</div>
                    <div className="text-[11px] text-slate-500">45 mins • Coding &amp; System Design</div>
                  </div>
                  <span className="text-xs font-extrabold text-[#0755E8] bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                    ₹999
                  </span>
                </div>

                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-900">System Architecture Deep Dive</div>
                    <div className="text-[11px] text-slate-500">60 mins • Scalability &amp; DB Review</div>
                  </div>
                  <span className="text-xs font-extrabold text-[#0755E8] bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                    ₹1,499
                  </span>
                </div>

                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Resume &amp; Portfolio Audit</div>
                    <div className="text-[11px] text-slate-500">30 mins • ATS &amp; Project Feedback</div>
                  </div>
                  <span className="text-xs font-extrabold text-[#0755E8] bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                    ₹499
                  </span>
                </div>
              </div>

              <button
                onClick={() => navigate("/dashboard/profile")}
                className="w-full text-center text-xs font-bold text-[#0755E8] hover:underline pt-1 cursor-pointer block"
              >
                Edit Mentorship Tiers &amp; Pricing →
              </button>
            </div>

            {/* Panel 3: Interview Excellence Guidelines Card */}
            <div className="bg-gradient-to-br from-blue-50/60 via-slate-50/40 to-white border border-blue-200/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-blue-100/80 text-[#0755E8] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0755E8]">
                  Interview Excellence Guide
                </h4>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span>
                    <strong className="text-slate-800">Join 2 mins prior:</strong> Google Meet room initializes automatically at slot start.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span>
                    <strong className="text-slate-800">Structured debrief:</strong> Reserve 5-8 mins at the conclusion for actionable verbal guidance.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span>
                    <strong className="text-slate-800">Submit scorecard:</strong> Complete candidate review within 24h to unlock wallet credits.
                  </span>
                </li>
              </ul>

              <div className="mt-4 pt-3 border-t border-blue-100/80 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500">Need mentor assistance?</span>
                <button
                  onClick={() => navigate("/help")}
                  className="text-xs font-bold text-[#0755E8] hover:underline cursor-pointer"
                >
                  Help &amp; Support →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
