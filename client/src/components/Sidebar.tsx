import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Bookmark,
  Calendar,
  User,
  LogOut,
  Video,
  ChevronRight,
  ArrowRight,
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
      isActive:
        location.pathname === "/mentors" ||
        location.pathname === "/find-mentor" ||
        location.pathname === "/book-session",
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
      className="w-full bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-3.5 shadow-xs space-y-4 font-sans text-left"
    >
      {/* Primary Navigation */}
      <div className="space-y-1">
        <div className="px-3 pb-1">
          <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[15px] font-semibold transition-all duration-150 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B8FF] ${
                  item.isActive
                    ? "bg-[#EAF2FF] text-[#0755E8] font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    size={19}
                    className={`shrink-0 transition-colors ${
                      item.isActive ? "text-[#0755E8]" : "text-slate-400"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#EAF2FF] text-[#0755E8] border border-[#93B8FF] tracking-wide uppercase">
                      {item.badge}
                    </span>
                  )}
                  {typeof item.count === "number" && item.count > 0 && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
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
        <div className="bg-emerald-50/50 rounded-xl p-3.5 border border-emerald-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200/60 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Upcoming Session
            </span>
            <span className="text-[12px] font-medium text-slate-500">
              {new Date(nextSession.startTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/70 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
              {nextSession.expertDetails?.profileImage ? (
                <img
                  src={getProfileImageUrl(nextSession.expertDetails.profileImage)}
                  alt="Mentor"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={16} className="text-slate-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-slate-900 truncate">
                {nextSession.expertDetails?.name || "Verified Mentor"}
              </p>
              <p className="text-[12px] text-slate-500 truncate">
                {nextSession.category || "Mock Interview"}
              </p>
            </div>
          </div>

          <button
            onClick={() =>
              navigate(`/live-meeting/${nextSession.sessionId || nextSession._id}`)
            }
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[13px] font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            <Video size={14} />
            <span>Join Session</span>
          </button>
        </div>
      ) : (
        <div className="bg-[#F5F8FF] rounded-xl p-3.5 border border-[#E2E8F0] shadow-xs space-y-2.5">
          <div className="flex items-center gap-2 text-[#0755E8]">
            <Sparkles size={16} />
            <p className="text-[13.5px] font-bold text-slate-900">
              Need Interview Practice?
            </p>
          </div>
          <p className="text-[12px] text-slate-600 leading-relaxed">
            Practice 1-on-1 mock interviews with engineers and managers from top tech companies.
          </p>
          <button
            onClick={() => navigate("/mentors")}
            className="w-full py-2 bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#073AA3] text-white rounded-xl text-[12.5px] font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B8FF]"
          >
            <span>Explore Mentors</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* Authenticated User Compact Section with Subtle Divider */}
      {user && (
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2.5 px-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#EAF2FF] border border-[#93B8FF] overflow-hidden flex items-center justify-center shrink-0 text-[#0755E8] font-bold text-xs">
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
              <p className="text-[14.5px] font-semibold text-slate-900 truncate">
                {userName}
              </p>
              <p className="text-[12px] text-slate-500 truncate">
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
            <LogOut size={16} />
          </button>
        </div>
      )}
    </aside>
  );
}

export const SkeletonSidebar = () => (
  <div className="w-full bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-3.5 shadow-xs space-y-3">
    <div className="h-60 rounded-xl bg-slate-100 shimmer-shining" />
    <div className="h-28 rounded-xl bg-slate-100 shimmer-shining" />
  </div>
);