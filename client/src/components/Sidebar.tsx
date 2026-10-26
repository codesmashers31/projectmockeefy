import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Bookmark,
  Calendar,
  User,
  LogOut,
  Video,
  ArrowRight,
  Sparkles,
  Award,
  Heart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import axios from "../lib/axios";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getProfileImageUrl } from "../lib/imageUtils";
import { useUserProfile } from "../hooks/useUserProfile";
import { useQuery } from "@tanstack/react-query";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: userProfile } = useUserProfile();

  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [savedCount, setSavedCount] = useState<number>(0);

  // Fetch verified active experts for expert count badge
  const { data: expertsData = [] } = useQuery({
    queryKey: ["allMentorsList"],
    queryFn: async () => {
      const response = await axios.get("/api/expert/verified");
      return Array.isArray(response.data) ? response.data : response.data.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Sync saved mentors count
  useEffect(() => {
    const updateSavedCount = () => {
      try {
        const saved = localStorage.getItem("savedExperts");
        if (saved) {
          const parsed = JSON.parse(saved);
          setSavedCount(Array.isArray(parsed) ? parsed.length : 0);
        } else {
          setSavedCount(0);
        }
      } catch (e) {
        setSavedCount(0);
      }
    };

    updateSavedCount();
    window.addEventListener("storage", updateSavedCount);
    return () => window.removeEventListener("storage", updateSavedCount);
  }, []);

  // Fetch upcoming sessions for logged-in user with live event synchronization
  const fetchUpcoming = useCallback(async () => {
    const userId = user?.id || user?._id || (userProfile as any)?._id;
    if (!userId) {
      setUpcomingSessions([]);
      return;
    }
    try {
      const res = await axios.get(`/api/sessions/candidate/${userId}`);
      if (Array.isArray(res.data)) {
        const now = new Date();
        const upcoming = res.data
          .filter((s: any) => {
            const status = (s.status || "").toLowerCase();
            if (status === "cancelled" || status === "completed") {
              return false;
            }
            const endTime = s.endTime
              ? new Date(s.endTime)
              : new Date(new Date(s.startTime).getTime() + 60 * 60 * 1000);
            return (
              endTime.getTime() > now.getTime() ||
              new Date(s.startTime).getTime() > now.getTime() - 45 * 60 * 1000
            );
          })
          .sort(
            (a: any, b: any) =>
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          );

        setUpcomingSessions(upcoming);
      }
    } catch (err) {
      console.error("Error fetching upcoming sessions:", err);
    }
  }, [user?.id, user?._id, (userProfile as any)?._id]);

  useEffect(() => {
    fetchUpcoming();

    // Live sync when any session is booked across modals or pages
    const handleSessionBooked = () => {
      fetchUpcoming();
    };

    window.addEventListener("session-booked", handleSessionBooked);
    window.addEventListener("focus", handleSessionBooked);

    // Periodic sync every 15s to keep active schedule fresh
    const interval = setInterval(fetchUpcoming, 15000);

    return () => {
      window.removeEventListener("session-booked", handleSessionBooked);
      window.removeEventListener("focus", handleSessionBooked);
      clearInterval(interval);
    };
  }, [fetchUpcoming]);

  // Auto-cycle through upcoming sessions every 2 seconds
  useEffect(() => {
    if (upcomingSessions.length <= 1 || isHovered) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % upcomingSessions.length);
    }, 2000);

    return () => clearInterval(timer);
  }, [upcomingSessions.length, isHovered]);

  const activeIndex =
    upcomingSessions.length > 0
      ? currentIndex % upcomingSessions.length
      : 0;
  const currentSession = upcomingSessions[activeIndex];

  const formatSessionTime = (startTime: string | Date) => {
    if (!startTime) return "";
    const date = new Date(startTime);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatSessionDate = (startTime: string | Date) => {
    if (!startTime) return "";
    const date = new Date(startTime);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();
    if (isToday) return "Today";

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow =
      date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear();
    if (isTomorrow) return "Tomorrow";

    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const navItems = [
    {
      label: "Interview Experts",
      icon: Users,
      path: "/",
      isActive:
        location.pathname === "/" ||
        location.pathname === "/dashboard" ||
        location.pathname === "/mentors" ||
        location.pathname === "/find-mentor" ||
        location.pathname === "/book-session",
      count: Array.isArray(expertsData) && expertsData.length > 0 ? `${expertsData.length}+` : "50+",
    },
    {
      label: "Saved Interview Experts",
      icon: Bookmark,
      path: "/saved-experts",
      isActive: location.pathname === "/saved-experts" || location.pathname === "/liked-mentors",
      count: savedCount,
    },
    {
      label: "My Sessions",
      icon: Calendar,
      path: "/my-sessions",
      isActive: location.pathname === "/my-sessions",
    },
    {
      label: "Certificates",
      icon: Award,
      path: "/certificates",
      isActive: location.pathname === "/certificates",
    },
    {
      label: "Profile & Settings",
      icon: User,
      path: "/profile",
      isActive: location.pathname === "/profile",
    },
  ];

  const profileImg = user?.profileImage || userProfile?.profileImage;
  const userName = user?.name || userProfile?.personalInfo?.name || "Candidate";
  const userEmail = user?.email || "";
  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      aria-label="Sidebar Navigation"
      className="relative w-full bg-white rounded-[24px] border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.08),0_1px_4px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.04] p-3 sm:p-3.5 overflow-hidden space-y-3.5 font-sans text-left"
    >
      <div className="relative z-10 space-y-3.5">
        {/* Primary Navigation */}
        <div className="space-y-1">
        <div className="px-2.5 pb-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Navigation
          </p>
        </div>

        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => {
                  if (location.pathname === item.path && !location.search) {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  } else {
                    navigate(item.path);
                  }
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-[13px] font-semibold transition-all duration-150 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B8FF] ${
                  item.isActive
                    ? "bg-[#EAF2FF] text-[#0755E8] font-bold shadow-xs border border-[#93B8FF]/50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    size={16.5}
                    className={`shrink-0 transition-colors ${
                      item.isActive ? "text-[#0755E8]" : "text-slate-400"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {typeof item.count === "number" && item.count > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200/70 text-slate-700">
                      {item.count}
                    </span>
                  )}
                  {typeof item.count === "string" && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100/70 text-[#0755E8]">
                      {item.count}
                    </span>
                  )}
                  {item.isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0755E8]" />
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Upcoming Session Carousel or Practice Reminder Card */}
      {currentSession ? (
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative bg-[#E8FAF4] rounded-[18px] p-2.5 sm:p-3 border border-[#7FE3C3] shadow-[0_2px_10px_-4px_rgba(5,150,105,0.08)] space-y-2.5 transition-all duration-300"
        >
          {/* Top Row: Upcoming Session Pill + Scheduled Time */}
          <div className="flex items-center justify-between gap-1.5">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wider text-[#065F46] bg-white px-2 py-0.5 rounded-full border border-[#7FE3C3]/70 shadow-2xs whitespace-nowrap shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#059669] shrink-0 animate-pulse" />
              <span>UPCOMING SESSION</span>
            </span>
            <span className="text-[11.5px] font-bold text-slate-800 shrink-0 whitespace-nowrap">
              {formatSessionTime(currentSession.startTime)}
            </span>
          </div>

          {/* Expert Info with Category & Date Subtitle */}
          {(() => {
            const sessionCategory =
              currentSession.category ||
              (Array.isArray(currentSession.topics) && currentSession.topics[0]) ||
              "Mock Interview";
            const sessionDate = formatSessionDate(currentSession.startTime);
            const subtitle = sessionDate
              ? `${sessionCategory} • ${sessionDate}`
              : sessionCategory;

            return (
              <div
                key={currentSession.sessionId || currentSession._id || activeIndex}
                className="flex items-center gap-2.5 animate-session-fade"
              >
                <div className="w-8 h-8 rounded-full bg-white border border-[#7FE3C3]/50 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                  {currentSession.expertDetails?.profileImage ? (
                    <img
                      src={getProfileImageUrl(
                        currentSession.expertDetails.profileImage,
                        currentSession.expertDetails.name || currentSession.expertName
                      )}
                      alt={currentSession.expertDetails?.name || "Expert"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={15} className="text-emerald-600/70" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-slate-900 truncate leading-tight">
                    {currentSession.expertDetails?.name ||
                      currentSession.expertName ||
                      "Verified Expert"}
                  </p>
                  <p className="text-[11px] font-medium text-slate-500 truncate leading-tight mt-0.5">
                    {subtitle}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Action Button: Join Session */}
          <button
            onClick={() =>
              navigate(`/live-meeting/${currentSession.sessionId || currentSession._id}`)
            }
            className="w-full py-1.5 sm:py-2 bg-[#00875A] hover:bg-[#00734D] active:bg-[#005E3E] text-white rounded-xl text-[12px] font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FE3C3]"
          >
            <Video size={14} />
            <span>Join Session</span>
          </button>

          {/* Multi-Session Compact Pagination / Indicators */}
          {upcomingSessions.length > 1 &&
            (upcomingSessions.length <= 5 ? (
              <div className="flex items-center justify-center gap-1 pt-0.5">
                {upcomingSessions.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === activeIndex
                        ? "w-3.5 bg-[#00875A]"
                        : "w-1 bg-[#7FE3C3] hover:bg-[#059669]/60"
                    }`}
                    aria-label={`Switch to session ${idx + 1}`}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-between text-[10px] font-semibold text-[#065F46] pt-0.5 px-0.5">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentIndex(
                      (prev) => (prev - 1 + upcomingSessions.length) % upcomingSessions.length
                    )
                  }
                  className="p-0.5 rounded hover:bg-emerald-100/60 transition-colors cursor-pointer text-emerald-800"
                  aria-label="Previous session"
                >
                  <ChevronLeft size={13} />
                </button>
                <span className="text-[10px] font-bold text-emerald-800 tracking-tight">
                  {activeIndex + 1} of {upcomingSessions.length} Upcoming
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentIndex((prev) => (prev + 1) % upcomingSessions.length)
                  }
                  className="p-0.5 rounded hover:bg-emerald-100/60 transition-colors cursor-pointer text-emerald-800"
                  aria-label="Next session"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            ))}
        </div>
      ) : (
        <div className="bg-[#F5F8FF] rounded-xl p-3 border border-[#E2E8F0] shadow-xs space-y-2">
          <div className="flex items-center gap-1.5 text-[#0755E8]">
            <Sparkles size={14} />
            <p className="text-[12.5px] font-bold text-slate-900">
              Need Interview Practice?
            </p>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Practice 1-on-1 mock interviews with engineers and managers from top tech companies.
          </p>
          <button
            onClick={() => {
              if (location.pathname === "/" && !location.search) {
                window.scrollTo({ top: 0, behavior: "smooth" });
              } else {
                navigate("/");
              }
            }}
            className="w-full py-1.5 bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#073AA3] text-white rounded-lg text-[11.5px] font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B8FF]"
          >
            <span>Explore Interview Experts</span>
            <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* Authenticated User Compact Section with Subtle Divider */}
      {user && (
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#EAF2FF] border border-[#93B8FF] overflow-hidden flex items-center justify-center shrink-0 text-[#0755E8] font-bold text-[11px]">
              {profileImg ? (
                <img
                  src={getProfileImageUrl(profileImg)}
                  alt={userName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-slate-900 truncate">
                {userName}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {userEmail || "Candidate"}
              </p>
            </div>
          </div>

          <button
            onClick={() => logout()}
            title="Log out"
            aria-label="Log out"
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
          >
            <LogOut size={15} />
          </button>
        </div>
      )}
      </div>
    </aside>
  );
}

export const SkeletonSidebar = () => (
  <aside
    aria-label="Sidebar Navigation Loading"
    className="relative w-full bg-white rounded-[24px] border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.08),0_1px_4px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.04] p-3 sm:p-3.5 overflow-hidden space-y-3.5 font-sans text-left"
  >
    <div className="relative z-10 space-y-3.5">
      {/* Primary Navigation Skeleton */}
      <div className="space-y-1">
        <div className="px-2.5 pb-1">
          <div className="h-3 w-20 rounded bg-slate-200/70 shimmer-shining" />
        </div>

        <div className="space-y-1">
          {[
            { w: "w-28", badge: "w-7" },
            { w: "w-36", badge: "w-5" },
            { w: "w-24", badge: "" },
            { w: "w-20", badge: "" },
            { w: "w-32", badge: "" },
          ].map((item, idx) => (
            <div
              key={idx}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50/40 border border-slate-100/60"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-md bg-slate-200/70 shimmer-shining shrink-0" />
                <div className={`h-3.5 ${item.w} rounded bg-slate-200/60 shimmer-shining`} />
              </div>
              {item.badge && (
                <div className={`h-4 ${item.badge} rounded-full bg-[#EAF2FF] shimmer-shining shrink-0`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Practice Promo Card Skeleton */}
      <div className="bg-[#F5F8FF] rounded-xl p-3 border border-[#E2E8F0] shadow-xs space-y-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-blue-200 shimmer-shining" />
          <div className="h-3.5 w-36 rounded bg-blue-200/80 shimmer-shining" />
        </div>
        <div className="h-3 w-full rounded bg-slate-200/60 shimmer-shining" />
        <div className="h-3 w-4/5 rounded bg-slate-200/60 shimmer-shining" />
        <div className="h-7 w-full rounded-lg bg-[#0755E8]/20 shimmer-shining mt-1" />
      </div>

      {/* Authenticated User Compact Placeholder */}
      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-full bg-slate-100 shimmer-shining shrink-0" />
          <div className="space-y-1 min-w-0 flex-1">
            <div className="h-3.5 w-24 rounded bg-slate-200/70 shimmer-shining" />
            <div className="h-2.5 w-32 rounded bg-slate-100 shimmer-shining" />
          </div>
        </div>
        <div className="w-6 h-6 rounded-lg bg-slate-100 shimmer-shining shrink-0" />
      </div>
    </div>
  </aside>
);