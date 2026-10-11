import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MentorJobCard, MentorProfile } from "./MentorJobCard";
import {
  Calendar,
  CheckCircle2,
  Bookmark,
  Award,
  Sparkles,
  Bot,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  FileText,
  Video,
  Lightbulb,
  Check,
  User,
  Users,
} from "lucide-react";
import axios from "../lib/axios";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import {
  calculateProfessionalExperience,
  getCurrentCompany,
  getJobTitle,
} from "../lib/expertUtils";
import { getProfileImageUrl } from "../lib/imageUtils";

export default function CoachSessionCard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // 1. Fetch Verified Experts (for Curated Recommendations)
  const { data: expertsData = [], isLoading: isExpertsLoading } = useQuery({
    queryKey: ["verifiedExperts"],
    queryFn: async () => {
      const res = await axios.get("/api/expert/verified");
      return Array.isArray(res.data) ? res.data : res.data.data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // 2. Fetch User Candidate Sessions for Real Dashboard Metrics & Upcoming Bookings
  const [candidateSessions, setCandidateSessions] = useState<any[]>([]);
  const [savedCount, setSavedCount] = useState<number>(0);
  const [isSessionsLoading, setIsSessionsLoading] = useState<boolean>(true);

  useEffect(() => {
    const userId = user?.id || user?._id;
    if (!userId) {
      setIsSessionsLoading(false);
      return;
    }

    axios
      .get(`/api/sessions/candidate/${userId}`)
      .then((res) => {
        if (Array.isArray(res.data)) {
          setCandidateSessions(res.data);
        }
      })
      .catch((err) => {
        console.error("Error fetching candidate sessions", err);
      })
      .finally(() => {
        setIsSessionsLoading(false);
      });
  }, [user?.id, user?._id]);

  // Sync Saved Mentors Count from localStorage
  useEffect(() => {
    const updateSaved = () => {
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
    updateSaved();
    window.addEventListener("storage", updateSaved);
    return () => window.removeEventListener("storage", updateSaved);
  }, []);

  // Compute real dashboard metrics and upcoming bookings
  const { completedCount, upcomingSessions } = useMemo(() => {
    const now = new Date();
    const completed = candidateSessions.filter(
      (s) => s.status?.toLowerCase() === "completed"
    ).length;
    const upcoming = candidateSessions
      .filter(
        (s) =>
          new Date(s.startTime) > now &&
          s.status?.toLowerCase() !== "cancelled"
      )
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

    return {
      completedCount: completed,
      upcomingSessions: upcoming,
    };
  }, [candidateSessions]);

  // Map experts to MentorProfile and pick top 2-3 for Recommendations
  const recommendedMentors = useMemo<MentorProfile[]>(() => {
    if (!Array.isArray(expertsData) || expertsData.length === 0) return [];

    const mapped = expertsData.map((expert: any) => {
      const cat =
        expert.personalInformation?.category ||
        expert.category ||
        expert.professionalDetails?.industry ||
        "Software Engineering";

      let exp = "5+ yrs";
      if (expert.professionalDetails?.totalExperience) {
        exp = `${expert.professionalDetails.totalExperience} yrs`;
      } else if (expert.professionalDetails?.experience) {
        exp = `${expert.professionalDetails.experience} yrs`;
      } else {
        const calc = calculateProfessionalExperience(expert.professionalDetails);
        if (calc) exp = `${calc} yrs`;
      }

      const skills = (() => {
        if (Array.isArray(expert.expertSkills) && expert.expertSkills.length > 0) {
          return expert.expertSkills
            .filter((s: any) => s.isEnabled !== false)
            .map((s: any) => (typeof s === "string" ? s : s.skillName))
            .filter(Boolean);
        }
        if (Array.isArray(expert.skillsAndExpertise?.tools) && expert.skillsAndExpertise.tools.length) {
          return expert.skillsAndExpertise.tools;
        }
        if (Array.isArray(expert.skills) && expert.skills.length) {
          return expert.skills;
        }
        return [cat, "Interview Prep", "System Design"];
      })();

      return {
        id: expert._id || expert.userId,
        expertID: expert._id || expert.userId,
        name: expert.personalInformation?.userName || expert.name || "Verified Mentor",
        role: getJobTitle(expert.professionalDetails, cat),
        company: getCurrentCompany(expert.professionalDetails, cat),
        location: expert.personalInformation?.city || "Remote",
        rating: expert.metrics?.avgRating || 4.9,
        reviews: expert.metrics?.totalReviews || 12,
        avatar: getProfileImageUrl(expert.profileImage),
        isVerified: true,
        price: expert.price ? String(expert.price) : "799",
        minPrice: expert.minPrice,
        maxPrice: expert.maxPrice,
        skills,
        experience: exp,
        activeTime: expert.availability?.nextAvailable || "Available Today",
        totalSessions: expert.metrics?.totalSessions || 10,
        category: cat,
        bio: expert.personalInformation?.bio || "",
      };
    });

    // Curate top 20 mentors based on rating and reviews
    return mapped
      .sort((a, b) => (b.rating || 0) * 10 + (b.reviews || 0) - ((a.rating || 0) * 10 + (a.reviews || 0)))
      .slice(0, 20);
  }, [expertsData]);

  // Smooth Carousel Scroll Controls
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [recommendedMentors]);

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth + 16;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="w-full space-y-6 text-left font-sans">
      {/* ======================================================== */}
      {/* SECTION 1: PERSONALIZED WELCOME (Transparent on Canvas)  */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {user?.name ? `Welcome back, ${user.name}` : "Welcome to Mockeefy"}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm">
            Your next step toward interview readiness starts here.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => navigate("/ai-video")}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#5B4BDB] hover:bg-[#4938C8] active:bg-[#3F2FB3] text-white text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Bot size={15} />
            <span>Start AI Mock Interview</span>
          </button>

          <button
            onClick={() => navigate("/mentors")}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            <Users size={15} />
            <span>Find Mentors</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: UNIFIED DASHBOARD STATISTICS                  */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-4 sm:p-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 gap-y-4 lg:gap-y-0">
          {/* Completed Mocks */}
          <div className="flex items-center gap-3.5 px-2 sm:px-4">
            <div className="w-10 h-10 rounded-xl bg-[#F0EDFF] text-[#5B4BDB] flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-slate-900 leading-none">
                {isSessionsLoading ? "--" : completedCount}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1 truncate">
                Completed Mocks
              </p>
            </div>
          </div>

          {/* Upcoming Sessions */}
          <div className="flex items-center gap-3.5 px-2 sm:px-4 pt-4 lg:pt-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Calendar size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-slate-900 leading-none">
                {isSessionsLoading ? "--" : upcomingSessions.length}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1 truncate">
                {upcomingSessions.length > 0 ? "Upcoming Sessions" : "None Scheduled"}
              </p>
            </div>
          </div>

          {/* Saved Mentors */}
          <div className="flex items-center gap-3.5 px-2 sm:px-4 pt-4 lg:pt-0">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Bookmark size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-slate-900 leading-none">
                {savedCount}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1 truncate">
                Shortlisted Mentors
              </p>
            </div>
          </div>

          {/* Readiness Status */}
          <div className="flex items-center gap-3.5 px-2 sm:px-4 pt-4 lg:pt-0">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Award size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 leading-snug">
                Interview Track
              </p>
              <p className="text-xs text-slate-500 font-medium truncate">
                Active Preparation
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 3: RECOMMENDED MENTORS FOR YOU (HORIZONTAL CAROUSEL) */}
      {/* ======================================================== */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 m-0">
              Recommended Mentors for You
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Handpicked hiring managers and senior engineers ready for mock interviews.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Smooth Left & Right Carousel Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleScroll("left")}
                disabled={!canScrollLeft}
                aria-label="Previous mentors"
                className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-35 disabled:hover:bg-white text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-xs disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4BDB]"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleScroll("right")}
                disabled={!canScrollRight}
                aria-label="Next mentors"
                className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-35 disabled:hover:bg-white text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-xs disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4BDB]"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              onClick={() => navigate("/mentors")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#5B4BDB] hover:text-[#4938C8] cursor-pointer"
            >
              <span>View all mentors ({expertsData.length})</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Horizontal Smooth Scrollable Track - Responsive Width per Card */}
        <div className="relative">
          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory py-1 px-0.5 no-scrollbar select-none"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {recommendedMentors.map((mentor) => (
              <div
                key={mentor.id}
                className="w-full sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)] shrink-0 snap-start flex flex-col"
              >
                <MentorJobCard mentor={mentor} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 4: CONTINUE YOUR PREPARATION (ACTION CARDS)      */}
      {/* ======================================================== */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Continue Your Preparation
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Action 1: AI Mock */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-4 hover:border-[#D8D1FF] transition-colors">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-[#F0EDFF] text-[#5B4BDB] flex items-center justify-center">
                <Bot size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                AI Video Mock Interview
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Run an interactive, adaptive interview simulation with real-time feedback on your answers.
              </p>
            </div>
            <button
              onClick={() => navigate("/ai-video")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B4BDB] hover:text-[#4938C8] transition-colors cursor-pointer pt-1"
            >
              <span>Start Practice Drill</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Action 2: ATS Resume Builder */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-4 hover:border-emerald-300 transition-colors">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileText size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                ATS Resume Optimizer
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Build or refine an ATS-compliant resume tailored to tech roles, hiring rubrics, and keywords.
              </p>
            </div>
            <button
              onClick={() => navigate("/resume-builder")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer pt-1"
            >
              <span>Open Resume Builder</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Action 3: Expert 1-on-1 Mentorship */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-4 hover:border-[#D8D1FF] transition-colors">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-[#F0EDFF] text-[#5B4BDB] flex items-center justify-center">
                <Users size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                1-on-1 Mentor Mock
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Schedule a full mock interview with engineers and managers from Google, Amazon, and Zoho.
              </p>
            </div>
            <button
              onClick={() => navigate("/mentors")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B4BDB] hover:text-[#4938C8] transition-colors cursor-pointer pt-1"
            >
              <span>Explore Mentors</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 4: UPCOMING SESSIONS                             */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-[#5B4BDB]" />
            <h2 className="text-base font-bold text-slate-900 m-0">
              Your Upcoming Sessions
            </h2>
          </div>
          {upcomingSessions.length > 0 && (
            <button
              onClick={() => navigate("/my-sessions")}
              className="text-xs font-semibold text-[#5B4BDB] hover:underline cursor-pointer"
            >
              View all sessions
            </button>
          )}
        </div>

        {upcomingSessions.length > 0 ? (
          <div className="space-y-3">
            {upcomingSessions.map((session, idx) => {
              const sessionDate = new Date(session.startTime);
              return (
                <div
                  key={session._id || idx}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center">
                      {session.expertDetails?.profileImage ? (
                        <img
                          src={getProfileImageUrl(session.expertDetails.profileImage)}
                          alt="Expert"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={18} className="text-slate-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {session.expertDetails?.name || "Verified Expert"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {session.category || "Mock Interview"} •{" "}
                        {sessionDate.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        at{" "}
                        {sessionDate.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      navigate(`/live-meeting/${session.sessionId || session._id}`)
                    }
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Video size={13} />
                    <span>Join Session Studio</span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 space-y-2">
            <p className="text-xs font-semibold text-slate-700">
              No upcoming mentor bookings yet
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Schedule your first 1-on-1 technical mock round or system design drill with an experienced mentor.
            </p>
            <button
              onClick={() => navigate("/mentors")}
              className="mt-2 inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#5B4BDB] hover:bg-[#4938C8] active:bg-[#3F2FB3] text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              <span>Find a Mentor</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}
      </div>


      {/* ======================================================== */}
      {/* SECTION 6: INTERVIEW READINESS CHECKLIST                 */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3">
        <div className="flex items-center gap-2 text-[#5B4BDB]">
          <Sparkles size={16} />
          <h2 className="text-sm font-bold text-slate-900 m-0">
            Interview Readiness Checklist
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-xs font-bold">
              ✓
            </span>
            <div>
              <p className="text-xs font-bold text-slate-800">1. Account Setup</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Profile completed</p>
            </div>
          </div>

          <div
            onClick={() => navigate("/resume-builder")}
            className="p-3 rounded-xl border border-slate-200 hover:border-[#D8D1FF] bg-white flex items-start gap-2.5 cursor-pointer transition-colors"
          >
            <span className="w-5 h-5 rounded-full bg-[#F0EDFF] text-[#5B4BDB] flex items-center justify-center shrink-0 text-xs font-bold">
              2
            </span>
            <div>
              <p className="text-xs font-bold text-slate-800">2. Target Resume</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Build ATS resume →</p>
            </div>
          </div>

          <div
            onClick={() => navigate("/ai-video")}
            className="p-3 rounded-xl border border-slate-200 hover:border-[#D8D1FF] bg-white flex items-start gap-2.5 cursor-pointer transition-colors"
          >
            <span className="w-5 h-5 rounded-full bg-[#F0EDFF] text-[#5B4BDB] flex items-center justify-center shrink-0 text-xs font-bold">
              3
            </span>
            <div>
              <p className="text-xs font-bold text-slate-800">3. AI Practice Drill</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Take AI mock session →</p>
            </div>
          </div>

          <div
            onClick={() => navigate("/mentors")}
            className="p-3 rounded-xl border border-slate-200 hover:border-[#D8D1FF] bg-white flex items-start gap-2.5 cursor-pointer transition-colors"
          >
            <span className="w-5 h-5 rounded-full bg-[#F0EDFF] text-[#5B4BDB] flex items-center justify-center shrink-0 text-xs font-bold">
              4
            </span>
            <div>
              <p className="text-xs font-bold text-slate-800">4. Live Mentor Mock</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Book with mentor →</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
