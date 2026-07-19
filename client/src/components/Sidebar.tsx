import { useState, useEffect } from "react";
import {
  User,
  UserCircle,
  Calendar,
  Video,
  BookOpen,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Bookmark,
  Award,
  Pencil,
  Sparkles,
  Star,
  Briefcase,
  GraduationCap,
} from "lucide-react";
import axios from '../lib/axios';
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getProfileImageUrl } from "../lib/imageUtils";
import { useUserProfile } from "../hooks/useUserProfile";
import Avatar from "./ui/avatar";
import { useQuery } from "@tanstack/react-query";

const Sidebar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: userProfile, isLoading: isProfileLoading } = useUserProfile();

  const { status: expertsStatus } = useQuery({
    queryKey: ["experts"],
    enabled: false,
  });
  const { status: categoriesStatus } = useQuery({
    queryKey: ["categories"],
    enabled: false,
  });
  const isExpertsLoading = expertsStatus === "pending";
  const isCategoriesLoading = categoriesStatus === "pending";

  const [isPageLoading, setIsPageLoading] = useState(false);

  useEffect(() => {
    const handleLoadingChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsPageLoading(!!customEvent.detail?.loading);
    };
    window.addEventListener("page-loading-state", handleLoadingChange);
    return () => {
      window.removeEventListener("page-loading-state", handleLoadingChange);
    };
  }, []);

  useEffect(() => {
    const routes = ["/my-sessions", "/saved-experts", "/tips", "/certificates", "/profile"];
    if (routes.includes(location.pathname)) {
      setIsPageLoading(true);
    } else {
      setIsPageLoading(false);
    }
  }, [location.pathname]);

  const [nextSession, setNextSession] = useState<any>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      if (user?.id) {
        try {
          const sessionsRes = await axios.get(`/api/sessions/candidate/${user.id}`);
          if (Array.isArray(sessionsRes.data)) {
            const now = new Date();
            const upcoming = sessionsRes.data
              .filter((s: any) => new Date(s.startTime) > now && s.status !== 'Cancelled')
              .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
            if (upcoming) setNextSession(upcoming);
          }
        } catch (error) {
          console.error("Error fetching sessions:", error);
        }
      }
    };
    fetchSessions();
  }, [user?.id]);

  const displayProfile = userProfile || {
    name: user?.name || "User",
    profileImage: null,
    profileCompletion: 0,
  };

  const roleLine = (() => {
    const data: any = userProfile;
    const expList = Array.isArray(data?.experience) ? data.experience : [];
    const current = expList.find((e: any) => e?.current && e?.position) || expList.find((e: any) => e?.position);
    const position = (current?.position || "").toString().trim();
    if (position) return position;
    // Fallback: if user hasn’t added experience, show Fresher.
    return "Fresher";
  })();

  const NavItem = ({ icon: Icon, label, path, active }: any) => (
    <button
      onClick={() => navigate(path)}
      className={`w-full flex items-center justify-between px-2.5 py-2 mb-1 rounded-2xl text-[13px] font-semibold transition-all duration-200 group tracking-tight border ${
        active
          ? "bg-gradient-to-r from-blue-50 to-indigo-50/60 border-blue-100 text-blue-700 shadow-sm"
          : "bg-transparent border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-100"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
          active ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30" : "bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500"
        }`}>
          <Icon size={14} strokeWidth={active ? 2.5 : 2} />
        </div>
        <span>{label}</span>
      </div>
      <ChevronRight size={13} className={`transition-all duration-200 ${active ? "text-blue-400 translate-x-0" : "text-slate-300 -translate-x-0.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0"}`} />
    </button>
  );

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - ((displayProfile.profileCompletion || 0) / 100) * circumference;

  if (isProfileLoading || isPageLoading || (location.pathname === "/" && (isExpertsLoading || isCategoriesLoading))) {
    return <SkeletonSidebar />;
  }

  return (
    <div className="w-full max-w-[240px] mx-auto space-y-4 font-sans">

      {/* CARD 1: IDENTITY & STATS */}
      <div
        onClick={() => navigate("/profile")}
        className="relative bg-white rounded-[24px] p-4 pt-5 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] cursor-pointer hover:shadow-[0_12px_32px_-10px_rgba(0,79,203,0.18)] hover:-translate-y-0.5 transition-all duration-300 group/profile-card border border-slate-100 flex flex-col gap-4 overflow-hidden"
      >
        {/* Decorative gradient glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 via-indigo-100 to-transparent opacity-60 blur-2xl pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-[#f0f5ff] to-transparent pointer-events-none" />

        {/* Top Section */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            {/* Avatar & Progress Ring */}
            <div className="relative shrink-0 w-[56px] h-[56px] flex items-center justify-center">
              <svg className="absolute top-0 left-0 w-full h-full transform -rotate-90" viewBox="0 0 64 64">
                <defs>
                  <linearGradient id="sidebarRing" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#004fcb" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
                <circle cx="32" cy="32" r={28} fill="none" stroke="#f1f5f9" strokeWidth="4" />
                <circle
                  cx="32" cy="32" r={28}
                  fill="none"
                  stroke="url(#sidebarRing)"
                  strokeWidth="4"
                  strokeDasharray={2 * Math.PI * 28}
                  strokeDashoffset={(2 * Math.PI * 28) - ((displayProfile.profileCompletion || 0) / 100) * (2 * Math.PI * 28)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="w-[44px] h-[44px] rounded-full border-[2.5px] border-white absolute bg-gradient-to-br from-[#eaf1ff] to-[#dfe8ff] text-blue-600 flex items-center justify-center font-bold text-lg overflow-hidden shadow-sm">
                {((user as any)?.profileImage || (displayProfile as any)?.profileImage) ? (
                  <img src={getProfileImageUrl((user as any)?.profileImage || (displayProfile as any)?.profileImage)} className="w-full h-full object-cover" alt="avatar" />
                ) : (
                  (displayProfile.name || "B").charAt(0).toUpperCase()
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white z-10 shadow-sm" />
            </div>

            {/* Name and Badge */}
            <div className="flex flex-col gap-1.5 mt-0.5 min-w-0">
              <h3 className="text-[17px] font-bold text-[#0f172a] truncate tracking-tight group-hover/profile-card:text-blue-600 transition-colors">
                {displayProfile.name}
              </h3>
              <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-[#eef2ff] to-[#f0f5ff] border border-indigo-100/70 text-[9px] font-bold text-[#3730a3] tracking-wide inline-flex items-center gap-1.5 leading-none w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1] shrink-0" />
                {roleLine.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Edit Button */}
          <div className="w-8 h-8 rounded-full bg-[#f4f7ff] border border-[#e0e7ff] text-blue-600 transition-all duration-300 flex items-center justify-center shrink-0 shadow-sm group-hover/profile-card:bg-blue-600 group-hover/profile-card:text-white group-hover/profile-card:border-blue-600 group-hover/profile-card:rotate-12">
            <Pencil size={12} strokeWidth={2.5} />
          </div>
        </div>

        {/* Completion progress label */}
        <div className="relative z-10 -mt-2 flex items-center justify-between px-0.5">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Profile strength</span>
          <span className="text-[10px] font-black text-blue-600">{displayProfile.profileCompletion || 0}%</span>
        </div>

        {/* Bottom Stats Section */}
        <div className="grid grid-cols-3 gap-0 relative z-10 pt-1 border-t border-slate-50">
          {/* Stat 1 */}
          <div className="flex flex-col items-center justify-center relative group/stat pt-3">
             <div className="w-8 h-8 rounded-xl bg-[#f4f7ff] text-blue-500 flex items-center justify-center mb-1.5 transition-all group-hover/stat:bg-blue-600 group-hover/stat:text-white group-hover/stat:scale-105">
                <Star size={14} strokeWidth={2} />
             </div>
             <span className="text-[13px] font-extrabold text-[#0f172a] leading-none mb-1">4.8</span>
             <span className="text-[10px] text-slate-500 font-medium">Rating</span>
             {/* Vertical Divider */}
             <div className="absolute right-0 top-[30%] h-[55%] w-[1px] bg-slate-100" />
          </div>

          {/* Stat 2 */}
          <div className="flex flex-col items-center justify-center relative group/stat pt-3">
             <div className="w-8 h-8 rounded-xl bg-[#f4f7ff] text-blue-500 flex items-center justify-center mb-1.5 transition-all group-hover/stat:bg-blue-600 group-hover/stat:text-white group-hover/stat:scale-105">
                <Briefcase size={14} strokeWidth={2} />
             </div>
             <span className="text-[13px] font-extrabold text-[#0f172a] leading-none mb-1">{displayProfile.sessionsCount || 0}</span>
             <span className="text-[10px] text-slate-500 font-medium">Interviews</span>
             {/* Vertical Divider */}
             <div className="absolute right-0 top-[30%] h-[55%] w-[1px] bg-slate-100" />
          </div>

          {/* Stat 3 */}
          <div className="flex flex-col items-center justify-center group/stat overflow-hidden pt-3">
             <div className="w-8 h-8 rounded-xl bg-[#f4f7ff] text-blue-500 flex items-center justify-center mb-1.5 transition-all group-hover/stat:bg-blue-600 group-hover/stat:text-white group-hover/stat:scale-105 shrink-0">
                <GraduationCap size={14} strokeWidth={2} />
             </div>
             <span className="text-[13px] font-extrabold text-[#0f172a] leading-none mb-1 capitalize truncate w-full text-center px-1">
               {roleLine.toLowerCase() === "fresher" ? "Fresher" : roleLine}
             </span>
             <span className="text-[10px] text-slate-500 font-medium">Experience</span>
          </div>
        </div>
      </div>

      {/* CARD 2: NAVIGATION */}
      <div className="bg-white rounded-[24px] border border-slate-100 p-3 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] space-y-1">
        <p className="px-3 pb-1 pt-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Menu</p>
        <NavItem icon={User} label="Overview" path="/" active={location.pathname === "/" || location.pathname === "/dashboard"} />
        <NavItem icon={UserCircle} label="Profile" path="/profile" active={location.pathname === "/profile"} />
        <NavItem icon={Calendar} label="Sessions" path="/my-sessions" active={location.pathname === "/my-sessions"} />
        <NavItem icon={BookOpen} label="Interview tips" path="/tips" active={location.pathname === "/tips"} />
        <NavItem icon={Bookmark} label="Saved Experts" path="/saved-experts" active={location.pathname === "/saved-experts"} />
        <NavItem icon={Award} label="Certificates" path="/certificates" active={location.pathname === "/certificates"} />
      </div>

      {/* CARD 4: UPCOMING */}
      {nextSession && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-[0_10px_28px_-10px_rgba(16,185,129,0.25)] transition-shadow duration-300">
          <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-emerald-50 opacity-70 blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Confirmed</span>
            </div>
            <span className="text-[10px] font-black text-gray-400 tracking-tight">
              {new Date(nextSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="flex items-center gap-3 mb-5 relative z-10">
            <div className="w-10 h-10 rounded-xl border border-gray-100 p-0.5 shadow-sm">
              <img
                src={getProfileImageUrl(nextSession.expertDetails?.profileImage)}
                className="w-full h-full rounded-lg object-cover"
                alt="Expert"
              />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[13px] text-gray-900 truncate">{nextSession.expertDetails?.name}</p>
              <p className="text-[9px] font-black text-gray-400 tracking-tight mt-1 uppercase">Simulation</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/my-sessions')}
            className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-[11px] font-bold tracking-wide hover:bg-blue-700 transition-all shadow-sm flex items-center justify-center gap-2 relative z-10 active:scale-[0.98]"
          >
            <Video size={14} strokeWidth={3} />
            Join Studio
          </button>
        </div>
      )}

      {/* Stats card removed (Skills / Top 5%) */}
    </div>
  );
};

export const SkeletonSidebar = () => (
  <div className="w-full space-y-4">
    <div className="h-32 rounded-[24px] border border-slate-100 shimmer-shining"></div>
    <div className="h-40 rounded-[24px] border border-slate-100 shimmer-shining"></div>
  </div>
);

export default Sidebar;