import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Bot,
  FileText,
  Bookmark,
  Calendar,
  User,
  LogOut,
  Video,
  ChevronRight,
  Sparkles,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import axios from "../lib/axios";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getProfileImageUrl } from "../lib/imageUtils";
import { useUserProfile } from "../hooks/useUserProfile";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: userProfile } = useUserProfile();

  const [nextSession, setNextSession] = useState<any>(null);
  const [savedCount, setSavedCount] = useState<number>(0);

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
      label: "Dashboard",
      icon: LayoutDashboard,
      path: "/",
      isActive: location.pathname === "/" || location.pathname === "/dashboard",
    },
    {
      label: "Find Mentors",
      icon: Users,
      path: "/mentors",
      isActive: location.pathname === "/mentors" || location.pathname === "/find-mentor",
    },
    {
      label: "AI Mock Interview",
      icon: Bot,
      path: "/ai-video",
      isActive: location.pathname === "/ai-video",
      badge: "AI",
    },
    {
      label: "Resume Builder",
      icon: FileText,
      path: "/resume-builder",
      isActive: location.pathname === "/resume-builder",
    },
    {
      label: "Saved Mentors",
      icon: Bookmark,
      path: "/saved-experts",
      isActive: location.pathname === "/saved-experts",
      count: savedCount,
    },
    {
      label: "My Sessions",
      icon: Calendar,
      path: "/my-sessions",
      isActive: location.pathname === "/my-sessions",
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
      className="w-full space-y-4 font-sans text-left"
    >
      {/* Primary Navigation - Directly on canvas */}
      <div className="space-y-1">
        <div className="px-3 pb-1.5">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Navigation
          </p>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer text-left ${
                  item.isActive
                    ? "bg-[#F0EDFF] text-[#5B4BDB] font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    size={16}
                    className={`shrink-0 transition-colors ${
                      item.isActive ? "text-[#5B4BDB]" : "text-slate-400"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.badge && (
                    <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-[#F0EDFF] text-[#5B4BDB] border border-[#D8D1FF] tracking-wide uppercase">
                      {item.badge}
                    </span>
                  )}
                  {typeof item.count === "number" && item.count > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                      {item.count}
                    </span>
                  )}
                  {item.isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B4BDB]" />
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Upcoming Session or Practice Reminder Card - Kept as Distinct Card */}
      {nextSession ? (
        <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
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

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/70 overflow-hidden shrink-0 flex items-center justify-center">
              {nextSession.expertDetails?.profileImage ? (
                <img
                  src={getProfileImageUrl(nextSession.expertDetails.profileImage)}
                  alt="Mentor"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={15} className="text-slate-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">
                {nextSession.expertDetails?.name || "Verified Mentor"}
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
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Video size={13} />
            <span>Join Session</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-2.5">
          <div className="flex items-center gap-2 text-[#5B4BDB]">
            <Sparkles size={14} />
            <p className="text-xs font-bold text-slate-900">
              Need Interview Practice?
            </p>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Practice 1-on-1 with senior engineers and hiring managers from top tech companies.
          </p>
          <button
            onClick={() => navigate("/mentors")}
            className="w-full py-2 bg-[#5B4BDB] hover:bg-[#4938C8] active:bg-[#3F2FB3] text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>Explore Mentors</span>
            <ChevronRight size={13} />
          </button>
        </div>
      )}

      {/* Authenticated User Compact Section with Subtle Divider */}
      {user && (
        <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2.5 px-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#F0EDFF] border border-[#D8D1FF] overflow-hidden flex items-center justify-center shrink-0 text-[#5B4BDB] font-bold text-xs">
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
              <p className="text-xs font-bold text-slate-900 truncate">
                {userName}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {userEmail || "Candidate"}
              </p>
            </div>
          </div>

          <button
            onClick={() => logout()}
            title="Log out"
            aria-label="Log out"
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
          >
            <LogOut size={15} />
          </button>
        </div>
      )}
    </aside>
  );
}

export const SkeletonSidebar = () => (
  <div className="w-full space-y-3">
    <div className="h-60 rounded-2xl border border-slate-100 shimmer-shining" />
    <div className="h-32 rounded-2xl border border-slate-100 shimmer-shining" />
  </div>
);