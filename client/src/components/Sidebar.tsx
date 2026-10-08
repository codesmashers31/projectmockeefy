import { useState, useEffect } from "react";
import {
  Bot,
  Users,
  Bookmark,
  FileText,
  BarChart3,
  Video,
  ArrowRight,
  Calendar,
  ChevronRight,
  Crown,
} from "lucide-react";
import axios from "../lib/axios";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getProfileImageUrl } from "../lib/imageUtils";
import { useUserProfile } from "../hooks/useUserProfile";

export default function Sidebar() {
  const { user } = useAuth();
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
            .filter((s: any) => new Date(s.startTime) > now && s.status !== "Cancelled")
            .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
          if (upcoming) setNextSession(upcoming);
        }
      } catch (err) {
        console.error("Error fetching next session:", err);
      }
    };
    fetchUpcoming();
  }, [user?.id, user?._id]);



  return (
    <div className="w-full max-w-[240px] mx-auto space-y-3.5 font-sans text-left">



      {/* ======================================================== */}
      {/* 4. QUICK ACTIONS (COMMAND HUB)                          */}
      {/* ======================================================== */}
      <div className="bg-white rounded-[24px] p-3.5 border border-slate-100 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)]">
        <p className="px-2.5 pb-2 text-[10.5px] font-black text-slate-400 uppercase tracking-widest">
          Quick Actions
        </p>
        <div className="space-y-1">
          <button
            onClick={() => navigate("/ai-video")}
            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50/60 text-slate-700 hover:text-blue-700 font-semibold text-[13px] transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                <Bot size={15} />
              </div>
              <span>AI Mock Interview</span>
            </div>
            <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            onClick={() => navigate("/mentors")}
            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-semibold text-[13px] transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
                <Users size={15} />
              </div>
              <span>Find a Mentor</span>
            </div>
            <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            onClick={() => navigate("/saved-experts")}
            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50/70 text-slate-700 hover:text-blue-700 font-semibold text-[13px] transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                <Bookmark size={15} className="text-blue-600 group-hover:text-white" />
              </div>
              <span>Saved Mentors</span>
            </div>
            <div className="flex items-center gap-1.5">
              {savedCount > 0 && (
                <span className="text-[10.5px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {savedCount}
                </span>
              )}
              <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
            </div>
          </button>

          <button
            onClick={() => navigate("/resume-builder")}
            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-semibold text-[13px] transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                <FileText size={15} />
              </div>
              <span>ATS Resume Builder</span>
            </div>
            <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            onClick={() => navigate("/my-sessions")}
            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-semibold text-[13px] transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0">
                <BarChart3 size={15} />
              </div>
              <span>My Reports & Bookings</span>
            </div>
            <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            onClick={() => navigate("/plans")}
            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-amber-50/70 text-slate-700 hover:text-amber-800 font-semibold text-[13px] transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors shrink-0">
                <Crown size={15} />
              </div>
              <span className="flex items-center gap-1.5">
                Upgrade Plan
                <span className="text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">Pro</span>
              </span>
            </div>
            <ChevronRight size={14} className="text-slate-300 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. UPCOMING SESSION OR MENTOR PROMPT                    */}
      {/* ======================================================== */}
      {nextSession ? (
        <div className="bg-white rounded-[24px] p-4.5 border border-emerald-100 shadow-[0_4px_24px_-8px_rgba(16,185,129,0.18)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">
                Upcoming Mock
              </span>
            </div>
            <span className="text-[11px] font-bold text-slate-500">
              {new Date(nextSession.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-9 h-9 rounded-xl border border-slate-100 p-0.5 shadow-sm shrink-0">
              <img
                src={getProfileImageUrl(nextSession.expertDetails?.profileImage)}
                className="w-full h-full rounded-lg object-cover"
                alt="Expert"
              />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[13px] text-gray-900 truncate">
                {nextSession.expertDetails?.name}
              </p>
              <p className="text-[10.5px] font-semibold text-slate-400 truncate">
                {nextSession.category || "Mock Simulation"}
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate(`/live-meeting/${nextSession.sessionId || nextSession._id}`)}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[12.5px] font-bold transition-all shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-1.5"
          >
            <Video size={14} /> Join Studio
          </button>
        </div>
      ) : (
        <div className="bg-gradient-to-b from-blue-50/60 to-white rounded-[24px] p-4.5 border border-blue-100/70 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Calendar size={13} />
            </div>
            <p className="text-[12px] font-extrabold text-slate-900">
              Ready for your next mock?
            </p>
          </div>
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-3">
            Practice 1-on-1 with verified hiring managers from top tech firms.
          </p>
          <button
            onClick={() => navigate("/mentors")}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11.5px] font-bold transition-all shadow-sm shadow-blue-500/20 flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>Book a Mock Interview</span>
            <ArrowRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

export const SkeletonSidebar = () => (
  <div className="w-full space-y-4">
    <div className="h-44 rounded-[24px] border border-slate-100 shimmer-shining" />
    <div className="h-32 rounded-[24px] border border-slate-100 shimmer-shining" />
    <div className="h-40 rounded-[24px] border border-slate-100 shimmer-shining" />
  </div>
);