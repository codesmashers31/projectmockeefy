import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "../lib/axios";
import { useAuth } from "../context/AuthContext";
import { MentorJobCard, MentorCardSkeleton, MentorProfile } from "./MentorJobCard";
import {
  calculateProfessionalExperience,
  getCurrentCompany,
  getJobTitle,
} from "../lib/expertUtils";
import { getProfileImageUrl } from "../lib/imageUtils";
import {
  Calendar,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Video,
  User,
  Users,
  Code2,
  Cloud,
  Brain,
  Palette,
} from "lucide-react";

// Reusable Category Mentor Scroll Row Component
interface MentorCategoryScrollRowProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  mentors: MentorProfile[];
}

function MentorCategoryScrollRow({
  title,
  subtitle,
  icon,
  mentors,
}: MentorCategoryScrollRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = rowRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
  };

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [mentors]);

  const handleScroll = (dir: "left" | "right") => {
    const el = rowRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.9;
    el.scrollBy({ left: dir === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
  };

  if (!mentors || mentors.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#EAF2FF] text-[#0755E8] flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[20px] sm:text-[22px] font-semibold text-slate-900 tracking-tight leading-snug m-0">
                {title}
              </h2>
              <span className="text-[12px] font-bold text-[#0755E8] bg-[#EAF2FF] px-2.5 py-0.5 rounded-full">
                {mentors.length}
              </span>
            </div>
            <p className="text-[13px] sm:text-[14px] text-slate-600 mt-1 leading-normal">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => handleScroll("left")}
            disabled={!canScrollLeft}
            aria-label={`Previous ${title}`}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-35 disabled:hover:bg-white text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-xs disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B8FF]"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => handleScroll("right")}
            disabled={!canScrollRight}
            aria-label={`Next ${title}`}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-35 disabled:hover:bg-white text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-xs disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B8FF]"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={rowRef}
          className="flex items-stretch gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory py-2 px-1 no-scrollbar select-none"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {mentors.map((mentor) => (
            <div
              key={mentor.id}
              className="w-[85%] sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)] shrink-0 snap-start flex flex-col h-auto"
            >
              <MentorJobCard mentor={mentor} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CoachSessionCard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // 1. Fetch Verified Experts (for Curated Recommendations)
  const { data: expertsData = [], isLoading: isExpertsLoading } = useQuery({
    queryKey: ["allMentorsList"],
    queryFn: async () => {
      const res = await axios.get("/api/expert/verified");
      return Array.isArray(res.data) ? res.data : res.data.data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // 2. Fetch User Candidate Sessions for Upcoming Bookings
  const [candidateSessions, setCandidateSessions] = useState<any[]>([]);
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

  // Compute upcoming bookings
  const upcomingSessions = useMemo(() => {
    const now = new Date();
    return candidateSessions
      .filter(
        (s) =>
          new Date(s.startTime) > now &&
          s.status?.toLowerCase() !== "cancelled"
      )
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
  }, [candidateSessions]);

  // Map experts to MentorProfile
  const allRecommendedMentors = useMemo<MentorProfile[]>(() => {
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

    return mapped.sort(
      (a, b) => (b.rating || 0) * 10 + (b.reviews || 0) - ((a.rating || 0) * 10 + (a.reviews || 0))
    );
  }, [expertsData]);

  // 5 Category Groups for Dedicated Horizontal Scrolls
  const categoryGroups = useMemo(() => {
    const definitions = [
      {
        id: "software-web",
        title: "Software & Web Development",
        subtitle: "Frontend, backend, mobile engineers and system architects.",
        icon: <Code2 size={16} />,
        filter: (cat: string) => {
          const c = cat.toLowerCase().trim();
          return (
            c.includes("software") ||
            c.includes("web") ||
            c.includes("mobile") ||
            c.includes("mern") ||
            c.includes("it") ||
            c.includes("qa") ||
            c.includes("testing")
          );
        },
      },
      {
        id: "cloud-security",
        title: "Cloud, DevOps & Security",
        subtitle: "Cloud architects, DevOps leads, system design and cybersecurity.",
        icon: <Cloud size={16} />,
        filter: (cat: string) => {
          const c = cat.toLowerCase().trim();
          return (
            c.includes("cloud") ||
            c.includes("devops") ||
            c.includes("security") ||
            c.includes("database") ||
            c.includes("system design")
          );
        },
      },
      {
        id: "ai-data",
        title: "AI & Data Science",
        subtitle: "Machine learning engineers, AI researchers, and data scientists.",
        icon: <Brain size={16} />,
        filter: (cat: string) => {
          const c = cat.toLowerCase().trim();
          return c.includes("ai") || c.includes("data") || c.includes("ml") || c.includes("learning");
        },
      },
      {
        id: "product-design",
        title: "Product, Design & Management",
        subtitle: "UI/UX product designers, agile project leads, and business strategists.",
        icon: <Palette size={16} />,
        filter: (cat: string) => {
          const c = cat.toLowerCase().trim();
          return (
            c.includes("design") ||
            c.includes("agile") ||
            c.includes("project") ||
            c.includes("business")
          );
        },
      },
      {
        id: "hr-behavioral",
        title: "HR & Behavioral Prep",
        subtitle: "Hiring managers and tech recruiters for behavioral & HR rounds.",
        icon: <Users size={16} />,
        filter: (cat: string) => {
          const c = cat.toLowerCase().trim();
          return c.includes("hr") || c.includes("human resources") || c.includes("recruit");
        },
      },
    ];

    return definitions.map((def) => ({
      ...def,
      mentors: allRecommendedMentors.filter((m) => def.filter(m.category || "")),
    }));
  }, [allRecommendedMentors]);

  return (
    <div className="w-full space-y-6 text-left font-sans">
      {/* ======================================================== */}
      {/* ======================================================== */}
      {/* SECTION 1: PERSONALIZED WELCOME                          */}
      {/* ======================================================== */}
      <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF2FF] text-[#0755E8] text-[11px] font-bold tracking-wide uppercase">
            <Sparkles size={12} />
            <span>5 Core Technical Tracks</span>
          </div>
          <h1 className="text-[28px] sm:text-[32px] font-bold text-slate-900 tracking-tight leading-tight">
            {user?.name ? `Welcome back, ${user.name}` : "Welcome to Mockeefy"}
          </h1>
          <p className="text-slate-600 text-[14px] sm:text-[15px] leading-relaxed mt-1">
            Connect with top hiring managers and mentors across 5 core technical tracks.
          </p>
        </div>

        <button
          onClick={() => navigate("/mentors")}
          className="group inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#073AA3] active:scale-95 text-white text-[14px] font-semibold shadow-md shadow-[#0755E8]/20 hover:shadow-lg hover:shadow-[#0755E8]/30 transition-all cursor-pointer shrink-0 self-start sm:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B8FF]"
        >
          <Users size={16} className="text-white/90" />
          <span>Explore All Mentors</span>
          <span className="bg-white/25 text-white text-xs px-2 py-0.5 rounded-full font-bold ml-0.5">
            {isExpertsLoading ? "50+" : expertsData.length}
          </span>
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-1 ml-0.5" />
        </button>
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: 5 CATEGORY MENTORS SCROLL SECTIONS            */}
      {/* ======================================================== */}
      <div className="space-y-6">
        {isExpertsLoading ? (
          // Skeleton loading method for category mentor cards
          [
            {
              id: "skel-1",
              title: "Software & Web Development",
              subtitle: "Frontend, backend, mobile engineers and system architects.",
              icon: <Code2 size={16} />,
            },
            {
              id: "skel-2",
              title: "Cloud, DevOps & Security",
              subtitle: "Cloud architects, DevOps leads, system design and cybersecurity.",
              icon: <Cloud size={16} />,
            },
            {
              id: "skel-3",
              title: "AI & Data Science",
              subtitle: "Machine learning engineers, AI researchers, and data scientists.",
              icon: <Brain size={16} />,
            },
          ].map((item) => (
            <div key={item.id} className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EAF2FF] text-[#0755E8] flex items-center justify-center shrink-0">
                  {item.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[20px] sm:text-[22px] font-semibold text-slate-900 tracking-tight leading-snug m-0">
                      {item.title}
                    </h2>
                    <span className="text-[12px] font-bold text-[#0755E8] bg-[#EAF2FF] px-2.5 py-0.5 rounded-full animate-pulse">
                      Loading...
                    </span>
                  </div>
                  <p className="text-[13px] sm:text-[14px] text-slate-600 mt-1 leading-normal">
                    {item.subtitle}
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="flex items-stretch gap-4 overflow-x-auto py-2 px-1 no-scrollbar">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="w-[85%] sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)] shrink-0 flex flex-col h-auto"
                    >
                      <MentorCardSkeleton />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        ) : (
          categoryGroups.map((group) => (
            <MentorCategoryScrollRow
              key={group.id}
              title={group.title}
              subtitle={group.subtitle}
              icon={group.icon}
              mentors={group.mentors}
            />
          ))
        )}
      </div>

      {/* ======================================================== */}
      {/* VIEW ALL MENTORS BUTTON (CENTERED)                       */}
      {/* ======================================================== */}
      <div className="flex justify-center py-2">
        <button
          onClick={() => navigate("/mentors")}
          className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#EAF2FF] hover:bg-[#0755E8] text-[#0755E8] hover:text-white font-semibold text-[14px] transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B8FF]"
        >
          <span>View all mentors</span>
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      {/* ======================================================== */}
      {/* SECTION 3: COMPACT UPCOMING SESSIONS                     */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EAF2FF] text-[#0755E8] flex items-center justify-center shrink-0">
              <Calendar size={18} />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-[20px] sm:text-[22px] font-semibold text-slate-900 tracking-tight leading-snug m-0">
                Upcoming Sessions
              </h2>
              {upcomingSessions.length > 0 && (
                <span className="text-[12px] font-bold text-[#0755E8] bg-[#EAF2FF] px-2.5 py-0.5 rounded-full">
                  {upcomingSessions.length}
                </span>
              )}
            </div>
          </div>
          {upcomingSessions.length > 0 && (
            <button
              onClick={() => navigate("/my-sessions")}
              className="text-[13px] font-semibold text-[#0755E8] hover:underline cursor-pointer"
            >
              View all sessions →
            </button>
          )}
        </div>

        {upcomingSessions.length > 0 ? (
          <div className="space-y-3 pt-1">
            {upcomingSessions.slice(0, 3).map((session, idx) => {
              const sessionDate = new Date(session.startTime);
              const isToday = new Date().toDateString() === sessionDate.toDateString();
              const formattedDate = isToday
                ? `Today at ${sessionDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                : `${sessionDate.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    weekday: "short",
                  })} • ${sessionDate.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}`;
              const expertName = session.expertDetails?.name || "Verified Expert";
              const initials = expertName
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={session._id || session.sessionId || idx}
                  className="p-3.5 sm:p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-[#0755E8]/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-[#0755E8]">
                      {session.expertDetails?.profileImage ? (
                        <img
                          src={getProfileImageUrl(session.expertDetails.profileImage)}
                          alt={expertName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[14px] sm:text-[15px] font-semibold text-slate-900 truncate">
                          {expertName}
                        </p>
                        <span className="text-[11px] font-bold text-[#0755E8] bg-[#EAF2FF] px-2 py-0.5 rounded-full shrink-0">
                          {session.category || "Mock Interview"}
                        </span>
                      </div>
                      <p className="text-[12px] sm:text-[13px] text-slate-600 mt-0.5">
                        {formattedDate}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      navigate(`/live-meeting/${session.sessionId || session._id}`)
                    }
                    className="w-full sm:w-auto px-4 py-2 bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#073AA3] text-white rounded-xl text-[13px] font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B8FF]"
                  >
                    <Video size={14} />
                    <span>Join Session</span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 space-y-2">
            <div className="w-9 h-9 rounded-full bg-[#EAF2FF] text-[#0755E8] flex items-center justify-center mx-auto mb-1.5">
              <Calendar size={18} />
            </div>
            <p className="text-[14px] font-semibold text-slate-800">
              No upcoming sessions scheduled
            </p>
            <p className="text-[13px] text-slate-600 max-w-sm mx-auto leading-relaxed">
              Schedule your next 1-on-1 technical mock interview or system design drill with an experienced mentor.
            </p>
            <div className="pt-1">
              <button
                onClick={() => navigate("/mentors")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#073AA3] text-white text-[13px] font-semibold shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B8FF]"
              >
                <span>Find a Mentor</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
