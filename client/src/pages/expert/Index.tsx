import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "../../lib/axios";
import ExpertPageSkeleton from "../../components/ExpertPageSkeleton";
import {
  Activity,
  CalendarDays,
  CalendarClock,
  DollarSign,
  IndianRupee,
  Video,
  Clock,
  User,
  Award,
  ChevronRight,
  Info,
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  Wallet,
  AlertCircle
} from "lucide-react";

// --- Visual Components (Floating Modern KPI Cards) ---

// Soft Layered Bottom Wave SVG from Reference
function CardBottomWave({ colorClass }: { colorClass: string }) {
  return (
    <svg
      viewBox="0 0 300 60"
      preserveAspectRatio="none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`absolute bottom-0 inset-x-0 w-full h-9 sm:h-11 pointer-events-none ${colorClass}`}
    >
      {/* Background soft wave */}
      <path
        d="M0 25C60 40 120 15 180 30C240 45 270 20 300 35V60H0V25Z"
        fill="currentColor"
        opacity="0.45"
      />
      {/* Foreground wave */}
      <path
        d="M0 40C45 22 95 48 150 32C205 16 255 42 300 28V60H0V40Z"
        fill="currentColor"
        opacity="0.85"
      />
    </svg>
  );
}

// --- Quick Action Card Component ---
interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

function QuickActionCard({ title, description, icon, onClick }: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full group flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 hover:shadow-md hover:ring-2 hover:ring-blue-50 transition-all duration-300 text-left cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <div className="p-3 bg-slate-50 text-slate-600 rounded-xl shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 shadow-sm">
          {icon}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-0.5 group-hover:text-blue-600 transition-colors">
            {title}
          </h4>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
    </button>
  );
}

// --- Main Page Component ---
export default function DashboardIndex() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profileCompletion, setProfileCompletion] = useState<number | null>(null);
  const [missingSections, setMissingSections] = useState<string[]>([]);
  const [profileStatus, setProfileStatus] = useState<string>("");
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);
  const [stats, setStats] = useState({
    totalSessions: 0,
    upcomingSessions: 0,
    reportsPending: 0,
    walletBalance: 0,
    revenue: 0,
  });
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
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
          }));
        }

        if (profileRes.status === "fulfilled" && profileRes.value.data?.success) {
          const p = profileRes.value.data.profile || {};
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
          const now = new Date();
          const future = sessionsRes.value.data
            .filter((s: any) => new Date(s.startTime) > now && s.status !== "cancelled")
            .sort(
              (a: any, b: any) =>
                new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            )
            .slice(0, 5);
          setSessions(future);
        }
      } catch (error) {
        console.error("Dashboard data fetch error", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchData();
  }, [user]);

  const formattedRevenue = `₹${stats.revenue.toLocaleString()}`;

  // Check if profile page is done (excluding availability which is on a separate dashboard tab)
  const profilePageMissing = missingSections.filter(
    (s) => s !== "Availability" && s !== "Profile Photo"
  );

  const isProfileFullyComplete = Boolean(
    // 1. Status indicates approved / active / verified
    profileStatus === "approved" ||
    profileStatus === "active" ||
    profileStatus === "verified" ||
    localStorage.getItem("profile_status") === "approved" ||
    localStorage.getItem("profile_status") === "active" ||
    // 2. Profile page sections are 100% complete
    (profileCompletion !== null && profileCompletion >= 80 && profilePageMissing.length === 0) ||
    (profileCompletion !== null && profileCompletion >= 85) ||
    (profileCompletion !== null && profileCompletion >= 100) ||
    (profileCompletion !== null && profilePageMissing.length === 0) ||
    // 3. User already has active or upcoming sessions in dashboard (profile verified & active)
    stats.totalSessions > 0 ||
    stats.upcomingSessions > 0
  );

  if (isAuthLoading || loading) return <ExpertPageSkeleton variant="dashboard" />;

  return (
    <div className="sidebar-main-card relative w-full max-w-[1400px] mx-auto rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-4 sm:p-6 md:p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] overflow-hidden font-sans text-left animate-in fade-in duration-200">
      {/* Decorative ambient blue gradient lighting matching login & platform style */}
      <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

      {/* Content Layer */}
      <div className="relative z-10 space-y-8">
        {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Expert Dashboard
            </h1>
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
                Active
              </span>
            </span>
          </div>
          <p className="text-sm sm:text-base text-slate-500 font-medium">
            Welcome back, <span className="font-semibold text-slate-800">{user?.name || "Mockeefy"}</span>. Here's what's happening today.
          </p>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={() => navigate("/dashboard/reports")}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            Download Report
          </button>
          <button
            onClick={() => navigate("/dashboard/availability")}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-[#0755E8] hover:bg-[#0645C7] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-[#0755E8]/20 cursor-pointer"
          >
            New Session
          </button>
        </div>
      </div>

      {/* 2. Dynamic Intimation Banner based on Profile Completion */}
      {isProfileFullyComplete ? (
        /* State 1: Profile 100% Completed -> Show how to work & earn in this project */
        <div className="bg-blue-50/60 border border-blue-200/90 rounded-xl p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
              <Info className="w-4.5 h-4.5" />
            </div>
            <div className="text-xs sm:text-sm text-blue-900 leading-snug">
              <span className="font-bold text-blue-950">How to work & earn:</span> Keep your availability updated to receive candidate bookings. Payouts are credited to your wallet per completed session based on your chosen <span className="font-semibold text-blue-950">skill category</span>, <span className="font-semibold text-blue-950">expertise level</span>, and session <span className="font-semibold text-blue-950">duration</span>.
            </div>
          </div>

          <button
            onClick={() => navigate("/dashboard/availability")}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-300 hover:border-blue-600 text-xs font-semibold rounded-lg transition-all duration-200 shadow-2xs cursor-pointer whitespace-nowrap self-end sm:self-auto group"
          >
            Manage Availability
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      ) : (
        /* State 2: Profile Incomplete -> Show "Profile Required" red intimation */
        <div className="bg-red-50/60 border border-red-200/90 rounded-xl p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
              <AlertCircle className="w-4.5 h-4.5" />
            </div>
            <div className="text-xs sm:text-sm text-red-900 leading-snug">
              <span className="font-bold text-red-950">Profile Required:</span> Complete your profile to proceed with publishing your available timings to candidates.
            </div>
          </div>

          <button
            onClick={() => navigate("/dashboard/profile")}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-red-600 text-red-700 hover:text-white border border-red-300 hover:border-red-600 text-xs font-semibold rounded-lg transition-all duration-200 shadow-2xs cursor-pointer whitespace-nowrap self-end sm:self-auto group"
          >
            Complete Profile
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      )}

      {/* 3. FLOATING KPI CARDS (MODERN LOOK FROM REFERENCE IMAGE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Total Sessions */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate("/dashboard/sessions")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/dashboard/sessions")}
          className="relative bg-gradient-to-b from-blue-50/90 via-blue-50/40 to-blue-100/50 border border-blue-200/80 rounded-2xl p-5 sm:p-6 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-xl hover:-translate-y-1.5 hover:border-blue-400 transition-all duration-300 cursor-pointer min-h-[175px] group text-left select-none"
        >
          {/* Top Row: Icon + Circular Arrow Button */}
          <div className="flex items-center justify-between relative z-10 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-500 text-white flex items-center justify-center shadow-sm shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <Video className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <div className="w-7 h-7 rounded-full bg-white shadow-xs border border-blue-100 flex items-center justify-center text-blue-600 group-hover:translate-x-0.5 transition-transform">
              <ChevronRight size={14} className="stroke-[2.5]" />
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10">
            <h4 className="text-sm font-bold text-blue-700 tracking-tight">
              Total Sessions
            </h4>
            <div className="text-3xl font-black text-slate-900 tracking-tight my-1">
              {stats.totalSessions}
            </div>
            <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-600 font-bold">+12%</span> this month
            </p>
          </div>

          {/* Decorative Bottom Wave */}
          <CardBottomWave colorClass="text-blue-200/60" />
        </div>

        {/* Card 2: Upcoming */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate("/dashboard/sessions")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/dashboard/sessions")}
          className="relative bg-gradient-to-b from-indigo-50/90 via-indigo-50/40 to-indigo-100/50 border border-indigo-200/80 rounded-2xl p-5 sm:p-6 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-xl hover:-translate-y-1.5 hover:border-indigo-400 transition-all duration-300 cursor-pointer min-h-[175px] group text-left select-none"
        >
          {/* Top Row: Icon + Circular Arrow Button */}
          <div className="flex items-center justify-between relative z-10 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-sm shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <CalendarClock className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <div className="w-7 h-7 rounded-full bg-white shadow-xs border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:translate-x-0.5 transition-transform">
              <ChevronRight size={14} className="stroke-[2.5]" />
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10">
            <h4 className="text-sm font-bold text-indigo-700 tracking-tight">
              Upcoming
            </h4>
            <div className="text-3xl font-black text-slate-900 tracking-tight my-1">
              {stats.upcomingSessions}
            </div>
            <p className="text-xs font-semibold text-slate-500">
              Next 7 Days
            </p>
          </div>

          {/* Decorative Bottom Wave */}
          <CardBottomWave colorClass="text-indigo-200/60" />
        </div>

        {/* Card 3: Wallet Balance */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate("/dashboard/withdraw")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/dashboard/withdraw")}
          className="relative bg-gradient-to-b from-amber-50/90 via-amber-50/40 to-amber-100/50 border border-amber-200/80 rounded-2xl p-5 sm:p-6 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-xl hover:-translate-y-1.5 hover:border-amber-400 transition-all duration-300 cursor-pointer min-h-[175px] group text-left select-none"
        >
          {/* Top Row: Icon + Circular Arrow Button */}
          <div className="flex items-center justify-between relative z-10 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white flex items-center justify-center shadow-sm shadow-amber-500/25 group-hover:scale-105 transition-transform">
              <Wallet className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <div className="w-7 h-7 rounded-full bg-white shadow-xs border border-amber-100 flex items-center justify-center text-amber-600 group-hover:translate-x-0.5 transition-transform">
              <ChevronRight size={14} className="stroke-[2.5]" />
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10">
            <h4 className="text-sm font-bold text-amber-700 tracking-tight">
              Wallet Balance
            </h4>
            <div className="text-3xl font-black text-slate-900 tracking-tight my-1">
              ₹{stats.walletBalance.toLocaleString()}
            </div>
            <p className="text-xs font-semibold text-slate-500">
              Available for withdrawal
            </p>
          </div>

          {/* Decorative Bottom Wave */}
          <CardBottomWave colorClass="text-amber-200/60" />
        </div>

        {/* Card 4: Total Earnings */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate("/dashboard/reports")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/dashboard/reports")}
          className="relative bg-gradient-to-b from-emerald-50/90 via-emerald-50/40 to-emerald-100/50 border border-emerald-200/80 rounded-2xl p-5 sm:p-6 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-xl hover:-translate-y-1.5 hover:border-emerald-400 transition-all duration-300 cursor-pointer min-h-[175px] group text-left select-none"
        >
          {/* Top Row: Icon + Circular Arrow Button */}
          <div className="flex items-center justify-between relative z-10 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white flex items-center justify-center shadow-sm shadow-emerald-500/25 group-hover:scale-105 transition-transform">
              <IndianRupee className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <div className="w-7 h-7 rounded-full bg-white shadow-xs border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:translate-x-0.5 transition-transform">
              <ChevronRight size={14} className="stroke-[2.5]" />
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10">
            <h4 className="text-sm font-bold text-emerald-700 tracking-tight">
              Total Earnings
            </h4>
            <div className="text-3xl font-black text-slate-900 tracking-tight my-1">
              {formattedRevenue}
            </div>
            <p className="text-xs font-semibold text-slate-500">
              Current Month
            </p>
          </div>

          {/* Decorative Bottom Wave */}
          <CardBottomWave colorClass="text-emerald-200/60" />
        </div>
      </div>

      {/* 4. Bottom Content Grid: Upcoming Sessions + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Main Section: Upcoming Sessions */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 rounded-lg">
                <Clock className="w-5 h-5 text-slate-700" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Upcoming Sessions</h2>
            </div>
            <button
              onClick={() => navigate("/dashboard/sessions")}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
            >
              View Schedule
            </button>
          </div>

          {/* Upcoming Sessions List / Empty State */}
          {sessions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border-8 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.05)] text-slate-400">
                <CalendarDays className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">No upcoming sessions</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                You don't have any interviews scheduled for the next 7 days. Open more slots to get booked.
              </p>
              <button
                onClick={() => navigate("/dashboard/availability")}
                className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-md shadow-slate-900/10 cursor-pointer"
              >
                Manage Availability
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sessions.map((session: any) => (
                <div
                  key={session._id || session.sessionId}
                  className="py-5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 -mx-4 px-4 rounded-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-100">
                      {session.candidateId?.name ? (
                        session.candidateId.name.charAt(0).toUpperCase()
                      ) : (
                        <User size={20} />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-[15px]">
                        {session.candidateId?.name || "Candidate"}
                      </h4>
                      <div className="flex items-center gap-2 text-[12px] font-medium text-slate-500 mt-1">
                        <span>{session.topics?.[0] || "Interview"}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span>{new Date(session.startTime).toLocaleDateString()}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-blue-600 font-semibold">
                          {new Date(session.startTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigate(`/dashboard/sessions/${session.sessionId || session._id}`)}
                      className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 mt-1 rounded-xl font-bold text-[13px] transition-colors cursor-pointer"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => navigate(`/live-meeting?meetingId=${session.sessionId || session._id}`)}
                      className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 mt-1 rounded-xl font-bold text-[13px] transition-colors shadow-sm cursor-pointer"
                    >
                      Join Call
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Section: Quick Actions */}
        <div className="flex flex-col">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              Quick Actions
            </h3>
            <div className="flex flex-col gap-3">
              <QuickActionCard
                title="Update Profile"
                description="Edit your bio & preferences"
                icon={<User className="w-5 h-5" />}
                onClick={() => navigate("/dashboard/profile")}
              />
              <QuickActionCard
                title="Set Availability"
                description="Manage your calendar slots"
                icon={<Clock className="w-5 h-5" />}
                onClick={() => navigate("/dashboard/availability")}
              />
              <QuickActionCard
                title="Skills & Expertise"
                description="Add new technical skills"
                icon={<Award className="w-5 h-5" />}
                onClick={() => navigate("/dashboard/skills")}
              />
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
