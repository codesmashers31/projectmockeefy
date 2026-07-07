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
  GraduationCap
} from "lucide-react";
import axios from '../lib/axios';
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getProfileImageUrl } from "../lib/imageUtils";
import { useUserProfile } from "../hooks/useUserProfile";
import { ProUpgradeCard } from "./ProUpgradeCard";
import Avatar from "./ui/avatar";

const Sidebar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: userProfile, isLoading: isProfileLoading } = useUserProfile();
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
      className={`w-full flex items-center justify-between px-4 py-2.5 mb-2 rounded-full text-[13px] font-semibold transition-all duration-200 group tracking-tight border ${
        active
          ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
          : "bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon 
          size={15} 
          className={active ? "text-blue-600" : "text-slate-400 group-hover:text-blue-500"} 
        />
        <span>{label}</span>
      </div>
      <ChevronRight size={14} className={active ? "text-blue-600" : "text-slate-400 group-hover:text-blue-500"} />
    </button>
  );

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - ((displayProfile.profileCompletion || 0) / 100) * circumference;

  if (!displayProfile && isProfileLoading) return <SkeletonSidebar />;

  return (
    <div className="w-full max-w-[240px] mx-auto space-y-4 font-sans">

      {/* CARD 1: IDENTITY & STATS */}
      <div 
        onClick={() => navigate("/profile")}
        className="bg-white rounded-[24px] p-4 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] cursor-pointer hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] transition-all duration-300 group/profile-card border border-slate-100 flex flex-col gap-4"
      >
        {/* Top Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar & Progress Ring */}
            <div className="relative shrink-0 w-[54px] h-[54px] flex items-center justify-center">
              <svg className="absolute top-0 left-0 w-full h-full transform -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r={28} fill="none" stroke="#f8fafc" strokeWidth="4" />
                <circle
                  cx="32" cy="32" r={28}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="4"
                  strokeDasharray={2 * Math.PI * 28}
                  strokeDashoffset={(2 * Math.PI * 28) - ((displayProfile.profileCompletion || 0) / 100) * (2 * Math.PI * 28)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="w-[42px] h-[42px] rounded-full border-[2.5px] border-white absolute bg-[#f0f5ff] text-blue-600 flex items-center justify-center font-bold text-lg overflow-hidden">
                {((user as any)?.profileImage || (displayProfile as any)?.profileImage) ? (
                  <img src={getProfileImageUrl((user as any)?.profileImage || (displayProfile as any)?.profileImage)} className="w-full h-full object-cover" alt="avatar" />
                ) : (
                  (displayProfile.name || "B").charAt(0).toUpperCase()
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white z-10" />
            </div>

            {/* Name and Badge */}
            <div className="flex flex-col gap-1 mt-0.5">
              <h3 className="text-[17px] font-bold text-[#0f172a] truncate tracking-tight group-hover/profile-card:text-blue-600 transition-colors">
                {displayProfile.name}
              </h3>
              <span className="px-2.5 py-1 rounded-full bg-[#f4f6ff] text-[9px] font-bold text-[#1e293b] tracking-wide inline-flex items-center gap-1.5 leading-none w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1] shrink-0" />
                {roleLine.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Edit Button */}
          <div className="w-8 h-8 rounded-full bg-[#f4f7ff] border border-[#e0e7ff] text-blue-600 transition-all duration-300 flex items-center justify-center shrink-0 shadow-sm group-hover/profile-card:bg-blue-600 group-hover/profile-card:text-white group-hover/profile-card:border-blue-600">
            <Pencil size={12} strokeWidth={2.5} />
          </div>
        </div>

        {/* Bottom Stats Section */}
        <div className="grid grid-cols-3 gap-0 relative pt-1">
          {/* Stat 1 */}
          <div className="flex flex-col items-center justify-center relative group/stat">
             <div className="w-8 h-8 rounded-full bg-[#f4f7ff] text-blue-500 flex items-center justify-center mb-1.5 transition-colors group-hover/stat:bg-blue-100">
                <Star size={14} strokeWidth={2} />
             </div>
             <span className="text-[13px] font-extrabold text-[#0f172a] leading-none mb-1">4.8</span>
             <span className="text-[10px] text-slate-500 font-medium">Rating</span>
             {/* Vertical Divider */}
             <div className="absolute right-0 top-[15%] h-[70%] w-[1px] bg-slate-100" />
          </div>

          {/* Stat 2 */}
          <div className="flex flex-col items-center justify-center relative group/stat">
             <div className="w-8 h-8 rounded-full bg-[#f4f7ff] text-blue-500 flex items-center justify-center mb-1.5 transition-colors group-hover/stat:bg-blue-100">
                <Briefcase size={14} strokeWidth={2} />
             </div>
             <span className="text-[13px] font-extrabold text-[#0f172a] leading-none mb-1">{displayProfile.sessionsCount || 0}</span>
             <span className="text-[10px] text-slate-500 font-medium">Interviews</span>
             {/* Vertical Divider */}
             <div className="absolute right-0 top-[15%] h-[70%] w-[1px] bg-slate-100" />
          </div>

          {/* Stat 3 */}
          <div className="flex flex-col items-center justify-center group/stat overflow-hidden">
             <div className="w-8 h-8 rounded-full bg-[#f4f7ff] text-blue-500 flex items-center justify-center mb-1.5 transition-colors group-hover/stat:bg-blue-100 shrink-0">
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
        <NavItem icon={User} label="Overview" path="/" active={location.pathname === "/" || location.pathname === "/dashboard"} />
        <NavItem icon={UserCircle} label="Profile" path="/profile" active={location.pathname === "/profile"} />
        <NavItem icon={Calendar} label="Sessions" path="/my-sessions" active={location.pathname === "/my-sessions"} />
        <NavItem icon={BookOpen} label="Interview tips" path="/tips" active={location.pathname === "/tips"} />
        <NavItem icon={Bookmark} label="Saved Experts" path="/saved-experts" active={location.pathname === "/saved-experts"} />
        <NavItem icon={Award} label="Certificates" path="/certificates" active={location.pathname === "/certificates"} />
      </div>

      {/* CARD 3: UPGRADE */}
      <div className="bg-white rounded-2xl border border-gray-100 p-1 shadow-sm overflow-hidden">
        <ProUpgradeCard />
      </div>

      {/* CARD 4: UPCOMING */}
      {nextSession && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group">
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
            <div className="w-10 h-10 rounded-xl border border-gray-100 p-0.5">
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
            className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-[11px] font-bold tracking-wide hover:bg-blue-700 transition-all shadow-sm flex items-center justify-center gap-2"
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
  <div className="w-full space-y-4 animate-pulse">
    <div className="h-32 bg-white rounded-2xl border border-slate-100"></div>
    <div className="h-40 bg-white rounded-2xl border border-slate-100"></div>
  </div>
);

export default Sidebar;