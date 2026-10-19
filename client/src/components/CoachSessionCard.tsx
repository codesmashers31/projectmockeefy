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
  Hand,
} from "lucide-react";

// Reusable Category Mentor Scroll Row Component
interface MentorCategoryScrollRowProps {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  mentors: MentorProfile[];
}

function MentorCategoryScrollRow({
  id,
  title,
  subtitle,
  icon,
  mentors,
}: MentorCategoryScrollRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Mouse drag-to-scroll state
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);
  const hasMoved = useRef(false);

  const checkScroll = () => {
    const el = rowRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  };

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    checkScroll();
    const t1 = setTimeout(checkScroll, 60);
    const t2 = setTimeout(checkScroll, 350);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => checkScroll());
      ro.observe(el);
    }

    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (ro) ro.disconnect();
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [mentors]);

  const handleScroll = (dir: "left" | "right") => {
    const el = rowRef.current;
    if (!el) return;

    // Calculate exact single profile step: card width + gap (16px)
    const firstCard = el.querySelector<HTMLElement>(":scope > div");
    const cardWidth = firstCard ? firstCard.offsetWidth : 280;
    const gap = 16;
    const step = cardWidth + gap;

    // Scroll exactly one profile at a time
    el.scrollBy({
      left: dir === "left" ? -step : step,
      behavior: "smooth",
    });

    setTimeout(checkScroll, 350);
  };

  // Drag-to-scroll mouse handlers (1:1 tracking, stops dead on mouse release)
  const handleMouseDown = (e: React.MouseEvent) => {
    const el = rowRef.current;
    if (!el) return;
    isDragging.current = true;
    hasMoved.current = false;
    startX.current = e.pageX - el.offsetLeft;
    scrollLeftStart.current = el.scrollLeft;
    el.style.scrollBehavior = "auto";
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const el = rowRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = x - startX.current; // Exact 1:1 mouse movement
    if (Math.abs(walk) > 4) {
      hasMoved.current = true;
    }
    el.scrollLeft = scrollLeftStart.current - walk;
    checkScroll();
  };

  const handleMouseUpOrLeave = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const el = rowRef.current;
    if (!el) return;
    // Stays exactly where released: no animation, no glide, no snap
    el.style.scrollBehavior = "auto";
    checkScroll();
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    if (hasMoved.current) {
      e.stopPropagation();
      e.preventDefault();
      hasMoved.current = false;
    }
  };

  if (!mentors || mentors.length === 0) return null;

  return (
    <div id={`track-${id}`} className="space-y-2.5 scroll-mt-24 group/section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7.5 h-7.5 rounded-lg bg-[#EAF2FF] text-[#0755E8] flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[17px] sm:text-[18.5px] font-bold text-slate-900 tracking-tight leading-snug m-0">
                {title}
              </h2>
              <span className="text-[11px] font-bold text-[#0755E8] bg-[#EAF2FF] px-2 py-0.2 rounded-full">
                {mentors.length}
              </span>
              {/* Hand drag scroll indicator */}
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100/90 border border-slate-200/80 text-[10.5px] font-bold text-slate-600 select-none shadow-2xs">
                <Hand size={11} className="text-[#0755E8]" />
                <span>Drag to scroll</span>
              </span>
            </div>
            <p className="text-[12.5px] sm:text-[13px] text-slate-500 mt-0.5 leading-normal">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Top Header Arrow Controls */}
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => handleScroll("left")}
            disabled={!canScrollLeft}
            aria-label={`Previous ${title}`}
            className="w-7.5 h-7.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-25 disabled:hover:bg-white text-slate-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B8FF]"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => handleScroll("right")}
            disabled={!canScrollRight}
            aria-label={`Next ${title}`}
            className="w-7.5 h-7.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-25 disabled:hover:bg-white text-slate-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B8FF]"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="relative">
        {/* Scrollable Cards Track */}
        <div
          ref={rowRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onClickCapture={handleClickCapture}
          className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto py-1.5 px-0.5 no-scrollbar select-none cursor-grab active:cursor-grabbing"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {mentors.map((mentor) => (
            <div
              key={mentor.id}
              className="w-[85%] sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)] shrink-0 flex flex-col h-auto"
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
        name: expert.personalInformation?.userName || expert.name || "Verified Interview Expert",
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

  const trackScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollTrackLeft, setCanScrollTrackLeft] = useState(false);
  const [canScrollTrackRight, setCanScrollTrackRight] = useState(false);

  // Track Shortcuts Drag-to-Scroll state
  const isTrackDragging = useRef(false);
  const trackStartX = useRef(0);
  const trackScrollStart = useRef(0);
  const trackHasDragged = useRef(false);

  const checkTrackScroll = () => {
    const el = trackScrollRef.current;
    if (!el) return;
    setCanScrollTrackLeft(el.scrollLeft > 4);
    setCanScrollTrackRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  const trackShortcuts = useMemo(() => {
    return categoryGroups.map((group) => {
      const shortName = group.title.includes("&")
        ? group.title.split("&")[0].trim()
        : group.title.split(",")[0].trim();
      return {
        id: group.id,
        name: shortName,
        fullName: group.title,
        count: `${group.mentors.length || 10}+ Interview Experts >`,
      };
    });
  }, [categoryGroups]);

  useEffect(() => {
    const el = trackScrollRef.current;
    if (!el) return;
    checkTrackScroll();
    const t = setTimeout(checkTrackScroll, 100);
    el.addEventListener("scroll", checkTrackScroll, { passive: true });
    window.addEventListener("resize", checkTrackScroll);
    return () => {
      clearTimeout(t);
      el.removeEventListener("scroll", checkTrackScroll);
      window.removeEventListener("resize", checkTrackScroll);
    };
  }, [trackShortcuts]);

  const handleTrackScroll = (dir: "left" | "right") => {
    const el = trackScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -240 : 240, behavior: "smooth" });
    setTimeout(checkTrackScroll, 300);
  };

  const handleTrackMouseDown = (e: React.MouseEvent) => {
    const el = trackScrollRef.current;
    if (!el) return;
    isTrackDragging.current = true;
    trackHasDragged.current = false;
    trackStartX.current = e.pageX - el.offsetLeft;
    trackScrollStart.current = el.scrollLeft;
    el.style.scrollBehavior = "auto";
  };

  const handleTrackMouseMove = (e: React.MouseEvent) => {
    if (!isTrackDragging.current) return;
    const el = trackScrollRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = x - trackStartX.current; // 1:1 direct tracking
    if (Math.abs(walk) > 4) {
      trackHasDragged.current = true;
    }
    el.scrollLeft = trackScrollStart.current - walk;
    checkTrackScroll();
  };

  const handleTrackMouseUp = () => {
    if (!isTrackDragging.current) return;
    isTrackDragging.current = false;
    const el = trackScrollRef.current;
    if (!el) return;
    // Stays exactly where released
    el.style.scrollBehavior = "auto";
    checkTrackScroll();
  };

  const handleTrackClickCapture = (e: React.MouseEvent) => {
    if (trackHasDragged.current) {
      e.stopPropagation();
      e.preventDefault();
      trackHasDragged.current = false;
    }
  };

  const scrollToTrack = (trackId: string) => {
    const el = document.getElementById(`track-${trackId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="w-full space-y-5 text-left font-sans">
      {/* ======================================================== */}
      {/* SECTION 1: PERSONALIZED WELCOME                          */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="space-y-0.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF2FF] text-[#0755E8] text-[10.5px] font-bold tracking-wide uppercase">
            <Sparkles size={11} />
            <span>5 Core Technical Tracks</span>
          </div>
          <h1 className="text-[20px] sm:text-[23px] font-bold text-slate-900 tracking-tight leading-snug">
            {user?.name ? `Welcome back, ${user.name}` : "Welcome to Mockeefy"}
          </h1>
          <p className="text-slate-500 text-[12.5px] sm:text-[13px] leading-relaxed">
            Connect with top hiring managers and interview experts across 5 core technical tracks.
          </p>
        </div>

        <button
          onClick={() => navigate("/mentors")}
          className="group inline-flex items-center gap-1.5 px-4 h-9 rounded-xl bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#073AA3] text-white text-[12.5px] sm:text-[13px] font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer shrink-0 self-start sm:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B8FF]"
        >
          <Users size={15} className="text-white/90" />
          <span>Explore All Interview Experts</span>
          <span className="bg-white/20 text-white text-[11px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
            {isExpertsLoading ? "50+" : expertsData.length}
          </span>
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5 ml-0.5" />
        </button>
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: NAUKRI-STYLE TECHNICAL TRACK QUICK STRIP     */}
      {/* ======================================================== */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[15px] sm:text-[16px] font-bold text-slate-900 tracking-tight">
              Top Categories Hiring Now
            </h2>
            {/* Hand symbol indicator for dragging */}
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50/90 border border-blue-200/70 text-[11px] font-bold text-[#0755E8] select-none shadow-2xs">
              <Hand size={12} className="text-[#0755E8] animate-pulse" />
              <span>Drag to explore</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-[11.5px] font-medium text-slate-400 hidden md:inline">
              5 Core Technical Tracks
            </span>

            {/* Left & Right Arrow Buttons for Scrolling */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleTrackScroll("left")}
                disabled={!canScrollTrackLeft}
                className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                  canScrollTrackLeft
                    ? "bg-white hover:bg-slate-100 text-slate-700 shadow-2xs border border-slate-200/90 active:scale-95 cursor-pointer"
                    : "bg-slate-100/50 text-slate-300 border border-slate-200/40 cursor-not-allowed"
                }`}
                title="Scroll categories left"
                aria-label="Scroll categories left"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                onClick={() => handleTrackScroll("right")}
                disabled={!canScrollTrackRight}
                className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                  canScrollTrackRight
                    ? "bg-white hover:bg-slate-100 text-slate-700 shadow-2xs border border-slate-200/90 active:scale-95 cursor-pointer"
                    : "bg-slate-100/50 text-slate-300 border border-slate-200/40 cursor-not-allowed"
                }`}
                title="Scroll categories right"
                aria-label="Scroll categories right"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>

        <div className="relative group/track bg-gradient-to-r from-blue-50/60 via-slate-50/80 to-blue-50/60 p-2 sm:p-2.5 rounded-2xl border border-blue-100/70 shadow-2xs">
          {/* Subtle floating side arrows on hover */}
          {canScrollTrackLeft && (
            <button
              type="button"
              onClick={() => handleTrackScroll("left")}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/95 hover:bg-white text-slate-700 border border-slate-200 shadow-sm flex items-center justify-center transition-all active:scale-95 cursor-pointer"
              title="Scroll left"
            >
              <ChevronLeft size={14} />
            </button>
          )}

          {canScrollTrackRight && (
            <button
              type="button"
              onClick={() => handleTrackScroll("right")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/95 hover:bg-white text-slate-700 border border-slate-200 shadow-sm flex items-center justify-center transition-all active:scale-95 cursor-pointer"
              title="Scroll right"
            >
              <ChevronRight size={14} />
            </button>
          )}

          <div
            ref={trackScrollRef}
            onMouseDown={handleTrackMouseDown}
            onMouseMove={handleTrackMouseMove}
            onMouseUp={handleTrackMouseUp}
            onMouseLeave={handleTrackMouseUp}
            onClickCapture={handleTrackClickCapture}
            className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-0.5 px-0.5 select-none cursor-grab active:cursor-grabbing"
            style={{ scrollbarWidth: "none" }}
          >
            {trackShortcuts.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => scrollToTrack(t.id)}
                className="bg-white hover:bg-blue-50/30 active:scale-[0.98] rounded-xl px-3.5 py-2 border border-slate-200/80 hover:border-[#0755E8]/40 shadow-2xs hover:shadow-xs transition-all cursor-pointer shrink-0 text-left min-w-[155px] sm:min-w-[175px]"
              >
                <p className="text-[12.5px] sm:text-[13px] font-bold text-slate-800 truncate">
                  {t.name}
                </p>
                <p className="text-[11px] font-semibold text-[#0755E8] flex items-center justify-between mt-0.5">
                  <span>{t.count}</span>
                  <ChevronRight size={12} className="text-[#0755E8]/70" />
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 3: 5 CATEGORY MENTORS SCROLL SECTIONS            */}
      {/* ======================================================== */}
      <div className="space-y-5">
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
            <div key={item.id} className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7.5 h-7.5 rounded-lg bg-[#EAF2FF] text-[#0755E8] flex items-center justify-center shrink-0">
                  {item.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[17px] sm:text-[18.5px] font-bold text-slate-900 tracking-tight leading-snug m-0">
                      {item.title}
                    </h2>
                    <span className="text-[11px] font-bold text-[#0755E8] bg-[#EAF2FF] px-2 py-0.2 rounded-full animate-pulse">
                      Loading...
                    </span>
                  </div>
                  <p className="text-[12.5px] sm:text-[13px] text-slate-500 mt-0.5 leading-normal">
                    {item.subtitle}
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto py-1.5 px-0.5 no-scrollbar">
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
              id={group.id}
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
          <span>View all interview experts</span>
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
              Schedule your next 1-on-1 technical mock interview or system design drill with an experienced interview expert.
            </p>
            <div className="pt-1">
              <button
                onClick={() => navigate("/mentors")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#073AA3] text-white text-[13px] font-semibold shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B8FF]"
              >
                <span>Find an Interview Expert</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
