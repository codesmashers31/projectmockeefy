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

  if (isProfileLoading) return <SkeletonSidebar />;

  return (
    <div className="w-full max-w-[240px] mx-auto font-sans">
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
    </div>
  );
};

export const SkeletonSidebar = () => (
  <div className="w-full animate-pulse">
    <div className="h-[240px] bg-white rounded-2xl border border-slate-100"></div>
  </div>
);

export default Sidebar;