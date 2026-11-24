import { useState, useEffect, useCallback } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutGrid, 
  User, 
  CalendarDays, 
  Award, 
  Grid2X2, 
  Settings, 
  LogOut, 
  X,
  Sparkles,
  Wallet,
  Video,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from "../context/AuthContext";
import MockeefyLogo from "./MockeefyLogo";
import axios from "../lib/axios";
import { getProfileImageUrl } from "../lib/imageUtils";
import { formatDisplayName } from "../lib/utils";
import { useDataSync } from "../context/SocketContext";

type SideNavProps = {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
  active?: string;
};

export default function SideNav({ isOpen = false, onClose, className = "" }: SideNavProps) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarStats, setSidebarStats] = useState({
    totalSessions: 0,
    upcomingSessions: 0,
    walletBalance: 0,
    isVerified: false,
    status: "pending",
  });
  const [upcomingSession, setUpcomingSession] = useState<any>(null);

  // Fetch expert stats & upcoming sessions for sidebar live badges and widgets
  const fetchSidebarData = useCallback(async () => {
    if (!user) return;
    try {
      const [statsRes, sessionsRes] = await Promise.allSettled([
        axios.get("/api/expert/stats"),
        axios.get(`/api/sessions/expert/${user.id || (user as any)._id || "me"}`),
      ]);

      if (statsRes.status === "fulfilled" && statsRes.value.data?.success) {
        const s = statsRes.value.data.data;
        setSidebarStats({
          totalSessions: s.totalSessions ?? 0,
          upcomingSessions: s.upcomingSessions ?? 0,
          walletBalance: s.walletBalance ?? 0,
          isVerified: Boolean(s.isVerified),
          status: s.status || "pending",
        });
      }

      if (sessionsRes.status === "fulfilled" && Array.isArray(sessionsRes.value.data)) {
        const now = new Date();
        const future = sessionsRes.value.data
          .filter((s: any) => new Date(s.startTime) > now && s.status !== "cancelled")
          .sort(
            (a: any, b: any) =>
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          );
        setUpcomingSession(future[0] || null);
      }
    } catch {
      // Non-blocking
    }
  }, [user]);

  useEffect(() => {
    fetchSidebarData();
  }, [fetchSidebarData, location.pathname]);

  // Live real-time sync across sockets
  useDataSync(["WALLET_UPDATED", "SESSION_CREATED", "SESSION_UPDATED", "RECONNECTED"], () => {
    fetchSidebarData();
  });

  const handleSignOut = () => {
    if (onClose) onClose();
    logout();
    navigate("/signin", { replace: true });
  };

  const formatBadgeBalance = (bal: number) => {
    if (!bal || bal <= 0) return undefined;
    const num = Number(bal);
    const rounded = Math.round((num + Number.EPSILON) * 100) / 100;
    return `₹${rounded.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const isExpertVerified = Boolean(user?.isExpertVerified || sidebarStats.isVerified);

  const navItems = [
    {
      id: "dashboard",
      icon: LayoutGrid,
      label: "Dashboard",
      to: "/dashboard",
    },
    {
      id: "profile",
      icon: User,
      label: "Profile",
      to: "/dashboard/profile",
      badge: isExpertVerified ? "Verified" : "In Setup",
      badgeClass: isExpertVerified
        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
        : "bg-amber-50 text-amber-700 border border-amber-200/80",
    },
    {
      id: "availability",
      icon: CalendarDays,
      label: "Availability",
      to: "/dashboard/availability",
    },
    {
      id: "skills",
      icon: Award,
      label: "Skills & Experience",
      to: "/dashboard/skills",
    },
    {
      id: "sessions",
      icon: Grid2X2,
      label: "Sessions",
      to: "/dashboard/sessions",
      badge: sidebarStats.totalSessions > 0 ? String(sidebarStats.totalSessions) : undefined,
      badgeClass: "bg-slate-100 text-slate-700 border border-slate-200 font-bold",
    },
    {
      id: "withdraw",
      icon: Wallet,
      label: "Payouts",
      to: "/dashboard/withdraw",
      badge: formatBadgeBalance(sidebarStats.walletBalance),
      badgeClass: "bg-amber-50 text-amber-800 border border-amber-200 font-bold",
    },
  ];

  return (
    <>
      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR: Floating Card (Sticky Command Center, matching candidate) */}
      {/* ========================================================================= */}
      <aside
        aria-label="Expert Sidebar Navigation"
        className={`hidden lg:block sidebar-main-card relative w-[235px] shrink-0 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-3 space-y-3 overflow-hidden font-sans text-left shadow-xs sticky top-[80px] self-start ${className}`}
      >
        {/* Decorative ambient blue lighting matching user sidebar */}
        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-2xl pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

        <div className="relative z-10 space-y-3">
          {/* Primary Navigation Links */}
          <div className="space-y-0.5">
            <div className="px-2 pb-0.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Main Menu
              </p>
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={({ isActive }) =>
                    `group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? "bg-[#EAF2FF] text-[#0755E8] shadow-2xs border border-blue-200/80 font-bold"
                        : "text-slate-600 hover:bg-slate-50/80 hover:text-slate-900 border border-transparent"
                    }`
                  }
                  end={item.to === "/dashboard"}
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 transition-colors shrink-0 ${
                            isActive ? "text-[#0755E8]" : "text-slate-400 group-hover:text-slate-600"
                          }`}
                          strokeWidth={isActive ? 2.5 : 2}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-1.5 ${item.badgeClass}`}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}

            <div className="pt-2 pb-0.5">
              <div className="px-2 pb-0.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Preferences
                </p>
              </div>

              <NavLink
                to="/dashboard/settings"
                className={({ isActive }) =>
                  `group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-[#EAF2FF] text-[#0755E8] shadow-2xs border border-blue-200/80 font-bold"
                      : "text-slate-600 hover:bg-slate-50/80 hover:text-slate-900 border border-transparent"
                  }`
                }
              >
                {({ isActive }) => (
                  <div className="flex items-center gap-2.5">
                    <Settings
                      className={`w-4 h-4 transition-colors shrink-0 ${
                        isActive ? "text-[#0755E8]" : "text-slate-400 group-hover:text-slate-600"
                      }`}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    <span>Settings</span>
                  </div>
                )}
              </NavLink>
            </div>
          </div>

          {/* Dynamic Upcoming Session or Booking Promotion Widget */}
          {upcomingSession ? (
            <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-xl p-2.5 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between text-[9.5px] font-bold text-emerald-800 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Upcoming Session
                </span>
                <span className="text-emerald-700 font-semibold">
                  {new Date(upcomingSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white border border-emerald-200 flex items-center justify-center font-bold text-[11px] text-emerald-700 shrink-0 shadow-2xs">
                  {(upcomingSession.candidateId?.name || "C").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11.5px] font-bold text-slate-900 truncate leading-tight">
                    {upcomingSession.candidateId?.name || "Candidate"}
                  </p>
                  <p className="text-[9.5px] text-slate-500 truncate leading-tight mt-0.5">
                    {upcomingSession.topics?.[0] || "Mock Interview"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate(`/live-meeting?meetingId=${upcomingSession.sessionId || upcomingSession._id}`)}
                className="w-full py-1.5 bg-[#00875A] hover:bg-[#00734D] text-white rounded-lg text-[11px] font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Video size={12} />
                <span>Join Session</span>
              </button>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-blue-50/60 border border-blue-200/80 rounded-xl p-3 shadow-2xs space-y-2">
              <div className="flex items-center gap-1.5 text-[#0755E8]">
                <Sparkles size={13} />
                <p className="text-[11.5px] font-bold text-slate-900">
                  Accepting Bookings
                </p>
              </div>
              <p className="text-[10.5px] text-slate-600 leading-snug">
                Publish calendar slots to receive candidate mock interview requests.
              </p>
              <button
                onClick={() => navigate("/dashboard/availability")}
                className="w-full py-1.5 bg-[#0755E8] hover:bg-[#0645C7] text-white rounded-lg text-[11px] font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>+ Set Availability</span>
                <ArrowRight size={12} />
              </button>
            </div>
          )}

          {/* Bottom Authenticated Mentor Card & Sign Out */}
          <div className="pt-2 border-t border-slate-200/80">
            <div className="flex items-center justify-between gap-2">
              <div
                role="button"
                tabIndex={0}
                onClick={() => navigate("/dashboard/profile")}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/dashboard/profile")}
                className="flex items-center gap-2 min-w-0 cursor-pointer group flex-1 select-none"
              >
                <div className="relative shrink-0">
                  <img
                    src={getProfileImageUrl(user?.profilePhoto || (user as any)?.profileImage, user?.name)}
                    alt={user?.name || "Mentor"}
                    className="w-8 h-8 rounded-lg object-cover border border-slate-200 shadow-2xs group-hover:ring-2 group-hover:ring-blue-500/30 transition-all bg-white"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Mentor')}&background=0755E8&color=fff&bold=true`;
                    }}
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border-2 border-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate group-hover:text-[#0755E8] transition-colors leading-tight capitalize">
                    {formatDisplayName(user?.name || "Expert Mentor")}
                  </p>
                  <p className="text-[9.5px] text-slate-500 truncate leading-tight mt-0.5 flex items-center gap-1">
                    <ShieldCheck className={`w-3 h-3 ${isExpertVerified ? "text-emerald-600" : "text-amber-500"}`} />
                    {isExpertVerified ? "Verified Mentor" : "Mentor In Setup"}
                  </p>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer shrink-0 shadow-2xs border border-transparent hover:border-red-200/70"
              >
                <LogOut className="w-3.5 h-3.5" strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MOBILE SLIDE-OVER DRAWER (Responsive for screens below lg)                  */}
      {/* ========================================================================= */}
      <div
        className={`fixed inset-0 z-50 transition-opacity lg:hidden ${
          isOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!isOpen}
      >
        <div
          className={`absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={onClose}
        />
        <div
          className={`absolute inset-y-0 left-0 w-[310px] max-w-[88vw] p-3 sm:p-4 transform transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="sidebar-main-card relative h-full w-full rounded-[24px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-3.5 space-y-3.5 overflow-y-auto font-sans shadow-2xl flex flex-col justify-between">
            <div>
              {/* Mobile Header with Logo & Close button */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-3">
                <div className="flex items-center gap-2.5">
                  <MockeefyLogo className="h-8 w-8" variant="brand" />
                  <div className="flex flex-col justify-center">
                    <span className="text-[19px] font-sans font-extrabold tracking-tight text-[#0755E8] leading-none mb-0.5">
                      Mockeefy
                    </span>
                    <p className="text-[9px] text-slate-400 tracking-wider font-bold uppercase leading-none">
                      Expert Terminal
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="space-y-1">
                <div className="px-2.5 pb-1">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                    Main Menu
                  </p>
                </div>

                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.label}
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                          isActive
                            ? "bg-[#EAF2FF] text-[#0755E8] shadow-2xs border border-blue-200/80 font-bold"
                            : "text-slate-600 hover:bg-slate-50/80 hover:text-slate-900 border border-transparent"
                        }`
                      }
                      end={item.to === "/dashboard"}
                    >
                      {({ isActive }) => (
                        <>
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon
                              className={`w-4.5 h-4.5 transition-colors shrink-0 ${
                                isActive ? "text-[#0755E8]" : "text-slate-400 group-hover:text-slate-600"
                              }`}
                              strokeWidth={isActive ? 2.5 : 2}
                            />
                            <span className="truncate">{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${item.badgeClass}`}>
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}

                <div className="pt-3 pb-1">
                  <div className="px-2.5 pb-1">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                      Preferences
                    </p>
                  </div>

                  <NavLink
                    to="/dashboard/settings"
                    onClick={onClose}
                    className={({ isActive }) =>
                      `group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        isActive
                          ? "bg-[#EAF2FF] text-[#0755E8] shadow-2xs border border-blue-200/80 font-bold"
                          : "text-slate-600 hover:bg-slate-50/80 hover:text-slate-900 border border-transparent"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <div className="flex items-center gap-3">
                        <Settings
                          className={`w-4.5 h-4.5 transition-colors shrink-0 ${
                            isActive ? "text-[#0755E8]" : "text-slate-400 group-hover:text-slate-600"
                          }`}
                          strokeWidth={isActive ? 2.5 : 2}
                        />
                        <span>Settings</span>
                      </div>
                    )}
                  </NavLink>
                </div>
              </div>

              {/* Dynamic Widget Mobile */}
              <div className="pt-3">
                {upcomingSession ? (
                  <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-3 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Upcoming Session
                      </span>
                      <span className="text-emerald-700 font-semibold">
                        {new Date(upcomingSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white border border-emerald-200 flex items-center justify-center font-bold text-xs text-emerald-700 shrink-0 shadow-2xs">
                        {(upcomingSession.candidateId?.name || "C").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                          {upcomingSession.candidateId?.name || "Candidate"}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
                          {upcomingSession.topics?.[0] || "Mock Interview"}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (onClose) onClose();
                        navigate(`/live-meeting?meetingId=${upcomingSession.sessionId || upcomingSession._id}`);
                      }}
                      className="w-full py-1.5 bg-[#00875A] hover:bg-[#00734D] text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Video size={13} />
                      <span>Join Session</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-blue-50/60 border border-blue-200/80 rounded-2xl p-3 shadow-2xs space-y-2">
                    <div className="flex items-center gap-1.5 text-[#0755E8]">
                      <Sparkles size={14} />
                      <p className="text-xs font-bold text-slate-900">
                        Accepting Bookings
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Publish calendar slots to receive candidate mock interview requests.
                    </p>
                    <button
                      onClick={() => {
                        if (onClose) onClose();
                        navigate("/dashboard/availability");
                      }}
                      className="w-full py-1.5 bg-[#0755E8] hover:bg-[#0645C7] text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>+ Set Availability</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Profile & Sign Out Footer */}
            <div className="pt-2 border-t border-slate-200/80">
              <div className="flex items-center justify-between gap-2">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (onClose) onClose();
                    navigate("/dashboard/profile");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      if (onClose) onClose();
                      navigate("/dashboard/profile");
                    }
                  }}
                  className="flex items-center gap-2.5 min-w-0 cursor-pointer group flex-1 select-none"
                >
                  <div className="relative shrink-0">
                    <img
                      src={getProfileImageUrl(user?.profilePhoto || (user as any)?.profileImage, user?.name)}
                      alt={user?.name || "Mentor"}
                      className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-2xs group-hover:ring-2 group-hover:ring-blue-500/30 transition-all bg-white"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Mentor')}&background=0755E8&color=fff&bold=true`;
                      }}
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate group-hover:text-[#0755E8] transition-colors leading-tight capitalize">
                      {formatDisplayName(user?.name || "Expert Mentor")}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5 flex items-center gap-1">
                      <ShieldCheck className={`w-3 h-3 ${isExpertVerified ? "text-emerald-600" : "text-amber-500"}`} />
                      {isExpertVerified ? "Verified Mentor" : "Mentor In Setup"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer shrink-0 shadow-2xs border border-transparent hover:border-red-200/70"
                >
                  <LogOut className="w-4 h-4" strokeWidth={2.2} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
