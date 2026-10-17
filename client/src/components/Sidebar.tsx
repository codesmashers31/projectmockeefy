import { useState, useEffect, useMemo } from "react";
import {
  Users,
  Bookmark,
  Calendar,
  User,
  LogOut,
  Video,
  ArrowRight,
  Sparkles,
  SlidersHorizontal,
  Code2,
  Cloud,
  Brain,
  Palette,
} from "lucide-react";
import axios from "../lib/axios";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getProfileImageUrl } from "../lib/imageUtils";
import { useUserProfile } from "../hooks/useUserProfile";
import { useQuery } from "@tanstack/react-query";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { data: userProfile } = useUserProfile();

  const [nextSession, setNextSession] = useState<any>(null);
  const [savedCount, setSavedCount] = useState<number>(0);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  // Fetch verified active experts for real-time track counts
  const { data: expertsData = [] } = useQuery({
    queryKey: ["allMentorsList"],
    queryFn: async () => {
      const response = await axios.get("/api/expert/verified");
      return Array.isArray(response.data) ? response.data : response.data.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Calculate live mentor counts per track
  const trackCounts = useMemo(() => {
    const counts = {
      all: Array.isArray(expertsData) ? expertsData.length : 0,
      software: 0,
      cloud: 0,
      ai: 0,
      product: 0,
      hr: 0,
    };
    if (!Array.isArray(expertsData)) return counts;

    expertsData.forEach((expert: any) => {
      const cat = (
        expert.personalInformation?.category ||
        expert.category ||
        expert.professionalDetails?.industry ||
        ""
      ).toLowerCase();

      if (
        cat.includes("software") ||
        cat.includes("web") ||
        cat.includes("mobile") ||
        cat.includes("mern") ||
        cat.includes("it") ||
        cat.includes("qa") ||
        cat.includes("testing")
      ) {
        counts.software++;
      }
      if (
        cat.includes("cloud") ||
        cat.includes("devops") ||
        cat.includes("cyber") ||
        cat.includes("security") ||
        cat.includes("database") ||
        cat.includes("system design")
      ) {
        counts.cloud++;
      }
      if (
        cat.includes("ai") ||
        cat.includes("data") ||
        cat.includes("ml") ||
        cat.includes("learning")
      ) {
        counts.ai++;
      }
      if (
        cat.includes("design") ||
        cat.includes("agile") ||
        cat.includes("project") ||
        cat.includes("business")
      ) {
        counts.product++;
      }
      if (
        cat.includes("hr") ||
        cat.includes("human resources") ||
        cat.includes("recruit")
      ) {
        counts.hr++;
      }
    });

    return counts;
  }, [expertsData]);

  // Synchronize active filter with URL parameter
  useEffect(() => {
    const cat = searchParams.get("category");
    if (!cat || cat === "All") {
      setSelectedFilter("all");
    } else {
      const lower = cat.toLowerCase();
      if (lower.includes("software") || lower.includes("web")) setSelectedFilter("software-web");
      else if (lower.includes("cloud") || lower.includes("devops")) setSelectedFilter("cloud-security");
      else if (lower.includes("ai") || lower.includes("data")) setSelectedFilter("ai-data");
      else if (lower.includes("product") || lower.includes("design")) setSelectedFilter("product-design");
      else if (lower.includes("hr") || lower.includes("behavioral")) setSelectedFilter("hr-behavioral");
      else setSelectedFilter("all");
    }
  }, [location.pathname, searchParams]);

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

  const tracks = [
    {
      id: "all",
      label: "All Experts",
      icon: Sparkles,
      anchorId: "top",
      queryValue: "All",
      count: trackCounts.all,
    },
    {
      id: "software-web",
      label: "Software & Web",
      icon: Code2,
      anchorId: "track-software-web",
      queryValue: "Software & Web",
      count: trackCounts.software,
    },
    {
      id: "cloud-security",
      label: "Cloud & DevOps",
      icon: Cloud,
      anchorId: "track-cloud-security",
      queryValue: "Cloud & DevOps",
      count: trackCounts.cloud,
    },
    {
      id: "ai-data",
      label: "AI & Data Science",
      icon: Brain,
      anchorId: "track-ai-data",
      queryValue: "AI & Data Science",
      count: trackCounts.ai,
    },
    {
      id: "product-design",
      label: "Product & Design",
      icon: Palette,
      anchorId: "track-product-design",
      queryValue: "Product & Design",
      count: trackCounts.product,
    },
    {
      id: "hr-behavioral",
      label: "HR & Behavioral",
      icon: Users,
      anchorId: "track-hr-behavioral",
      queryValue: "HR & Behavioral",
      count: trackCounts.hr,
    },
  ];

  const handleTrackFilter = (trackId: string, _anchorId: string, queryValue: string) => {
    setSelectedFilter(trackId);

    if (trackId === "all") {
      navigate("/");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate(`/?category=${encodeURIComponent(queryValue)}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const isInterviewExpertsActive =
    location.pathname === "/" ||
    location.pathname === "/dashboard" ||
    location.pathname === "/mentors" ||
    location.pathname === "/find-mentor" ||
    location.pathname === "/book-session";

  const secondaryNavItems = [
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

        <nav className="space-y-1.5">
          {/* Main: Interview Experts with Quick Track Filters */}
          <div className="space-y-1">
            <button
              onClick={() => {
                setSelectedFilter("all");
                if (location.pathname === "/" && !location.search) {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } else {
                  navigate("/");
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[14.5px] font-semibold transition-all duration-150 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B8FF] ${
                isInterviewExpertsActive
                  ? "bg-[#EAF2FF] text-[#0755E8] font-bold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Users
                  size={18}
                  className={`shrink-0 transition-colors ${
                    isInterviewExpertsActive ? "text-[#0755E8]" : "text-slate-400"
                  }`}
                />
                <span className="truncate">Interview Experts</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100/70 text-[#0755E8]">
                  {trackCounts.all ? `${trackCounts.all}+` : "50+"}
                </span>
                {isInterviewExpertsActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0755E8]" />
                )}
              </div>
            </button>

            {/* Sub-Filters: Technical Tracks & Categories */}
            <div className="mt-1 ml-2 pl-2 border-l-2 border-blue-100/80 space-y-0.5 py-1">
              <div className="flex items-center justify-between px-2 py-0.5 mb-1">
                <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <SlidersHorizontal size={10} className="text-slate-400" />
                  Filter Tracks
                </span>
                {selectedFilter !== "all" && (
                  <button
                    onClick={() => handleTrackFilter("all", "top", "All")}
                    className="text-[10px] font-semibold text-[#0755E8] hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {tracks.map((t) => {
                const isSelected = selectedFilter === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleTrackFilter(t.id, t.anchorId, t.queryValue)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[12.5px] transition-all cursor-pointer text-left ${
                      isSelected
                        ? "bg-[#EAF2FF] text-[#0755E8] font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon
                        size={13}
                        className={`shrink-0 ${
                          isSelected ? "text-[#0755E8]" : "text-slate-400"
                        }`}
                      />
                      <span className="truncate">{t.label}</span>
                    </div>
                    {typeof t.count === "number" && (
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                          isSelected
                            ? "bg-white text-[#0755E8] shadow-2xs"
                            : "text-slate-400 bg-slate-100"
                        }`}
                      >
                        {t.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Secondary Navigation Items */}
          {secondaryNavItems.map((item) => {
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[14.5px] font-semibold transition-all duration-150 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B8FF] ${
                  item.isActive
                    ? "bg-[#EAF2FF] text-[#0755E8] font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    size={18}
                    className={`shrink-0 transition-colors ${
                      item.isActive ? "text-[#0755E8]" : "text-slate-400"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
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