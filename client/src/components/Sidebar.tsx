import { useState, useEffect } from "react";
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

  const [nextSession, setNextSession] = useState<any>(null);
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

  // Fetch upcoming sessions for logged-in user
  useEffect(() => {
    const fetchUpcoming = async () => {
      const userId = user?.id || user?._id;
      if (!userId) return;
      try {
        const res = await axios.get(`/api/sessions/candidate/${userId}`);
        if (Array.isArray(res.data)) {
          const now = new Date();
          const upcoming = res.data
            .filter((s: any) => new Date(s.startTime) > now && s.status !== "Cancelled" && s.status !== "cancelled")
            .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
          if (upcoming) setNextSession(upcoming);
        }
      } catch (err) {
        console.error("Error fetching next session:", err);
      }
    };
    fetchUpcoming();
  }, [user?.id, user?._id]);

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
      className="relative w-full bg-gradient-to-b from-[#f0f5ff]/60 via-white to-white rounded-[24px] border border-slate-200/80 p-3 sm:p-3.5 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] overflow-hidden space-y-3.5 font-sans text-left"
    >
      {/* Decorative gradient glow matching other cards */}
      <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-gradient-to-br from-blue-100/40 via-indigo-100/30 to-transparent blur-2xl pointer-events-none" />

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
                    ? "bg-[#EAF2FF] text-[#0755E8] font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
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

      {/* Upcoming Session or Practice Reminder Card */}
      {nextSession ? (
        <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-200/80 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200/60 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Upcoming Session
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              {new Date(nextSession.startTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/70 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
              {nextSession.expertDetails?.profileImage ? (
                <img
                  src={getProfileImageUrl(nextSession.expertDetails.profileImage)}
                  alt="Interview Expert"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={15} className="text-slate-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-slate-900 truncate">
                {nextSession.expertDetails?.name || "Verified Interview Expert"}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {nextSession.category || "Mock Interview"}
              </p>
            </div>
          </div>

          <button
            onClick={() =>
              navigate(`/live-meeting/${nextSession.sessionId || nextSession._id}`)
            }
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[12px] font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            <Video size={13} />
            <span>Join Session</span>
          </button>
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
  <div className="relative w-full bg-gradient-to-b from-[#f0f5ff]/60 via-white to-white rounded-[24px] border border-slate-200/80 p-3 sm:p-3.5 shadow-xs space-y-3 overflow-hidden">
    <div className="h-60 rounded-xl bg-slate-100 shimmer-shining" />
    <div className="h-28 rounded-xl bg-slate-100 shimmer-shining" />
  </div>
);