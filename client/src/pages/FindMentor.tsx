import React, { useMemo, useState, useEffect, useRef, useDeferredValue } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDataSync } from "../context/SocketContext";
import axios from "../lib/axios";
import { MentorJobCard, MentorCardSkeleton, MentorProfile } from "../components/MentorJobCard";
import FindMentorSkeleton from "../components/FindMentorSkeleton";
import { getProfileImageUrl } from "../lib/imageUtils";
import {
  calculateProfessionalExperience,
  getCurrentCompany,
  getJobTitle,
} from "../lib/expertUtils";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { BookingModal } from "../components/BookingModal";
import { getPendingBooking, clearPendingBooking, PendingBookingIntent } from "../lib/pendingBooking";
import { mapExpertToProfile } from "../lib/bookSessionUtils";
import {
  Search,
  Users,
  Sparkles,
  X,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  AlertCircle,
  Hand,
  Code2,
  Cloud,
  Brain,
  Palette,
  ArrowUpDown,
  ArrowRight,
  Crown,
  Star,
  ShieldCheck,
} from "lucide-react";

const SORT_OPTIONS = [
  { value: "recommended", label: "Relevance" },
  { value: "rating", label: "Rating (High to Low)" },
  { value: "experience", label: "Experience (High to Low)" },
  { value: "price-low", label: "Price (Low to High)" },
  { value: "price-high", label: "Price (High to Low)" },
];

const ITEMS_PER_PAGE = 8;
const INITIAL_FILTER_ITEMS_LIMIT = 5;

interface MentorCategoryScrollRowProps {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  mentors: MentorProfile[];
}

const getCategoryBadgeStyle = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes("ai") || t.includes("data") || t.includes("machine learning")) {
    return {
      iconBg: "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xs shadow-indigo-500/20",
      badge: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
    };
  }
  if (t.includes("agile") || t.includes("project") || t.includes("management")) {
    return {
      iconBg: "bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-xs shadow-blue-500/20",
      badge: "bg-blue-50 text-blue-700 border-blue-200/80",
    };
  }
  if (t.includes("software") || t.includes("web") || t.includes("stack") || t.includes("it")) {
    return {
      iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xs shadow-emerald-500/20",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    };
  }
  if (t.includes("cloud") || t.includes("devops") || t.includes("system") || t.includes("database")) {
    return {
      iconBg: "bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-xs shadow-sky-500/20",
      badge: "bg-sky-50 text-sky-700 border-sky-200/80",
    };
  }
  if (t.includes("cyber") || t.includes("security")) {
    return {
      iconBg: "bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-xs shadow-rose-500/20",
      badge: "bg-rose-50 text-rose-700 border-rose-200/80",
    };
  }
  if (t.includes("business") || t.includes("product") || t.includes("hr")) {
    return {
      iconBg: "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xs shadow-amber-500/20",
      badge: "bg-amber-50 text-amber-700 border-amber-200/80",
    };
  }
  return {
    iconBg: "bg-gradient-to-br from-[#0755E8] to-[#0440B3] text-white shadow-xs shadow-blue-500/20",
    badge: "bg-[#EAF2FF] text-[#0755E8] border-blue-200/80",
  };
};

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
  const catStyle = getCategoryBadgeStyle(title);

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

    const firstCard = el.querySelector<HTMLElement>(":scope > div");
    const cardWidth = firstCard ? firstCard.offsetWidth : 290;
    const gap = 16;
    const step = cardWidth + gap;

    el.scrollBy({
      left: dir === "left" ? -step : step,
      behavior: "smooth",
    });

    setTimeout(checkScroll, 350);
  };

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
    const walk = x - startX.current;
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
    <div id={`track-${id}`} className="space-y-3 scroll-mt-24 group/section">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-8 h-8 rounded-xl ${catStyle.iconBg} flex items-center justify-center shrink-0`}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[15px] sm:text-[17px] font-bold text-slate-900 tracking-tight leading-snug m-0 truncate">
                {title}
              </h3>
              <span className={`text-[10px] sm:text-[10.5px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${catStyle.badge}`}>
                {mentors.length}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100/90 border border-slate-200/80 text-[10.5px] font-semibold text-slate-500 select-none shadow-2xs">
                <Hand size={11} className="text-[#0755E8]" />
                <span>Drag to scroll</span>
              </span>
            </div>
            <p className="text-[11.5px] sm:text-[12.5px] text-slate-500 mt-0.5 leading-normal truncate">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Top Header Arrow Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => handleScroll("left")}
            disabled={!canScrollLeft}
            aria-label={`Previous ${title}`}
            className="w-8 h-8 rounded-full border border-slate-200/90 bg-white hover:bg-[#0755E8] hover:text-white hover:border-[#0755E8] active:scale-95 disabled:opacity-25 disabled:hover:bg-white disabled:hover:text-slate-400 disabled:hover:border-slate-200 disabled:active:scale-100 text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => handleScroll("right")}
            disabled={!canScrollRight}
            aria-label={`Next ${title}`}
            className="w-8 h-8 rounded-full border border-slate-200/90 bg-white hover:bg-[#0755E8] hover:text-white hover:border-[#0755E8] active:scale-95 disabled:opacity-25 disabled:hover:bg-white disabled:hover:text-slate-400 disabled:hover:border-slate-200 disabled:active:scale-100 text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={rowRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onClickCapture={handleClickCapture}
          className="flex items-stretch gap-3 sm:gap-3.5 overflow-x-auto py-1 px-0.5 no-scrollbar select-none cursor-grab active:cursor-grabbing snap-x snap-mandatory scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {mentors.map((mentor) => (
            <div
              key={mentor.id}
              className="w-[calc(50%-6px)] sm:w-[calc(50%-7px)] shrink-0 flex flex-col h-auto snap-start"
            >
              <MentorJobCard mentor={mentor} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface FindMentorProps {
  showSkeletons?: boolean;
}

export default function FindMentor({ showSkeletons: propShowSkeletons }: FindMentorProps = {}) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get("q") || searchParams.get("search") || "";
  const [searchQuery, setSearchQuery] = useState(initialQ);
  const deferredSearch = useDeferredValue(searchQuery);

  const [activeResumeBookingMentor, setActiveResumeBookingMentor] = useState<MentorProfile | null>(() => {
    try {
      if (typeof window === "undefined") return null;
      const params = new URLSearchParams(window.location.search);
      const isResume = params.get("resumeBooking") === "true";
      const targetId = params.get("expertId");
      const pending = getPendingBooking();

      if (!isResume && !pending) return null;
      const expId = targetId || pending?.expertId;
      if (!expId) return null;

      if (pending?.cachedProfile) {
        return pending.cachedProfile as MentorProfile;
      }

      return {
        id: expId,
        name: pending?.expertName || "Interview Expert",
        role: pending?.expertRole || "Senior Mentor",
        avatar: pending?.expertAvatar || "",
        category: pending?.selectedDomain || "IT",
        level: pending?.selectedLevel || "Rising Mentor",
        levels: pending?.selectedLevel ? [pending.selectedLevel] : ["Rising Mentor"],
        sessionDuration: pending?.selectedDuration || 30,
        rawExpert: pending?.rawExpert || {
          _id: expId,
          userId: expId,
          name: pending?.expertName || "Interview Expert",
          role: pending?.expertRole || "Senior Mentor",
          avatar: pending?.expertAvatar || "",
          sessionDuration: pending?.selectedDuration || 30,
        },
      } as any;
    } catch {
      return null;
    }
  });

  const [activeResumePendingBooking, setActiveResumePendingBooking] = useState<PendingBookingIntent | null>(() => {
    try {
      if (typeof window === "undefined") return null;
      const pending = getPendingBooking();
      if (pending) return pending;
      const params = new URLSearchParams(window.location.search);
      const targetId = params.get("expertId");
      if (targetId && params.get("resumeBooking") === "true") {
        return { expertId: targetId, timestamp: Date.now() };
      }
      return null;
    } catch {
      return null;
    }
  });
  const hasResumedBookingRef = useRef(false);

  // Sync when URL query param changes
  useEffect(() => {
    const q = searchParams.get("q") || searchParams.get("search");
    if (q !== null && q !== searchQuery) {
      setSearchQuery(q);
    }
    const cat = searchParams.get("category");
    if (cat !== null) {
      setSelectedCategory(cat);
    } else {
      setSelectedCategory("All");
    }
  }, [searchParams]);

  // Sync live search from top navigation in real-time as user types
  useEffect(() => {
    const handleLiveSearch = (e: any) => {
      if (typeof e.detail?.query === "string") {
        setSearchQuery(e.detail.query);
      }
    };
    window.addEventListener("nav-search-change", handleLiveSearch);
    return () => window.removeEventListener("nav-search-change", handleLiveSearch);
  }, []);
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get("category") || "All");
  const [emptyCategoryNotice, setEmptyCategoryNotice] = useState<string | null>(null);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedExpRanges, setSelectedExpRanges] = useState<string[]>([]);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([]);
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState("recommended");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSortOpen(false);
      }
    };
    const handleScrollOrResize = () => {
      setIsSortOpen(false);
    };

    if (isSortOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      window.addEventListener("scroll", handleScrollOrResize, { passive: true, capture: true });
      window.addEventListener("resize", handleScrollOrResize, { passive: true });
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, { capture: true });
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isSortOpen]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const listTopRef = useRef<HTMLDivElement>(null);

  // Filter Accordions
  const [expandedSections, setExpandedSections] = useState({
    track: true,
    experience: true,
    price: false,
    availability: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Track "View More" expansion for each filter subheading (limits items to initial 5 by default)
  const [showAllSubheadings, setShowAllSubheadings] = useState<Record<string, boolean>>({
    track: false,
    level: false,
    experience: false,
    price: false,
    availability: false,
  });

  const toggleShowMore = (section: string) => {
    setShowAllSubheadings((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Fetch verified active experts from API
  const queryClient = useQueryClient();

  const {
    data: expertsData = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["allMentorsList"],
    queryFn: async () => {
      const response = await axios.get("/api/expert/verified");
      return Array.isArray(response.data) ? response.data : response.data.data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // Real-time synchronization when any mentor availability or session changes
  useDataSync(
    ["AVAILABILITY_UPDATED", "PROFILE_UPDATED", "SESSION_CREATED", "SESSION_UPDATED", "SESSION_CANCELLED"],
    () => {
      queryClient.invalidateQueries({ queryKey: ["allMentorsList"] });
      refetch();
    }
  );

  // Fetch active categories from MongoDB API
  const { data: dbCategoriesData = [] } = useQuery({
    queryKey: ["allCategoriesList"],
    queryFn: async () => {
      const response = await axios.get("/api/categories");
      const list = Array.isArray(response.data) ? response.data : response.data.data || [];
      return list.filter((c: any) => c.status !== "Inactive" && c.isActive !== false);
    },
    staleTime: 60 * 1000,
  });

  // Map backend experts to MentorProfile
  const allMentors = useMemo<MentorProfile[]>(() => {
    if (!Array.isArray(expertsData)) return [];

    const mapped = expertsData.map((expert: any) => {
      const cat =
        expert.personalInformation?.category ||
        expert.category ||
        expert.professionalDetails?.industry ||
        "Software Engineering";

      const skills = (() => {
        const rawDomains = Array.isArray(expert.skillsAndExpertise?.domains) ? expert.skillsAndExpertise.domains : [];
        const rawTools = Array.isArray(expert.skillsAndExpertise?.tools) ? expert.skillsAndExpertise.tools : [];
        const rawExpertSkills = Array.isArray(expert.expertSkills)
          ? expert.expertSkills.map((s: any) => (typeof s === "string" ? s : s.skillName)).filter(Boolean)
          : [];
        const rawSkills = Array.isArray(expert.skills) ? expert.skills : [];

        const combined = Array.from(new Set([...rawDomains, ...rawTools, ...rawExpertSkills, ...rawSkills])).filter(Boolean);
        if (combined.length) return combined;
        if (cat.toLowerCase().includes("mern")) {
          return ["React.js", "Node.js", "MongoDB", "Express.js", "System Design"];
        }
        return [cat, "Interview Prep", "System Design"];
      })();

      const exp = (() => {
        if (expert.professionalDetails?.totalExperience) {
          return `${expert.professionalDetails.totalExperience} yrs`;
        }
        if (expert.professionalDetails?.experience) {
          return `${expert.professionalDetails.experience} yrs`;
        }
        if (expert.experience) {
          return `${expert.experience} yrs`;
        }
        const calc = calculateProfessionalExperience(expert.professionalDetails);
        return calc ? `${calc} yrs` : "5+ yrs";
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
        activeTime: expert.activeTime || expert.availability?.activeTime || expert.availability?.nextAvailable || "Available Today",
        totalSessions: expert.metrics?.totalSessions || 15,
        category: cat,
        bio: expert.personalInformation?.bio || "",
        level: expert.professionalDetails?.level || expert.level || (Array.isArray(expert.professionalDetails?.levels) && expert.professionalDetails.levels[0]) || "Rising Mentor",
        levels: (Array.isArray(expert.professionalDetails?.levels) && expert.professionalDetails.levels.length > 0)
          ? expert.professionalDetails.levels
          : (Array.isArray(expert.levels) && expert.levels.length > 0)
          ? expert.levels
          : [expert.professionalDetails?.level || expert.level || "Rising Mentor"],
        availability: expert.availability,
        rawExpert: expert,
      };
    });

    // Feature Joel (MERN Stack Expert) prominently at the top
    return [...mapped].sort((a, b) => {
      const isJoelA = a.name?.toLowerCase() === "joel" || a.category?.toLowerCase().includes("mern");
      const isJoelB = b.name?.toLowerCase() === "joel" || b.category?.toLowerCase().includes("mern");
      if (isJoelA && !isJoelB) return -1;
      if (!isJoelA && isJoelB) return 1;
      return 0;
    });
  }, [expertsData]);

  // Curated hero avatars ensuring real team experts (Joel, Darvin, Godson, Sudalai, Kishore, Sudhan, Bala)
  const heroAvatars = useMemo(() => {
    if (!allMentors || allMentors.length === 0) return [];

    const realProfiles = [
      {
        keyword: "joel",
        fallbackAvatar: getProfileImageUrl("/uploads/profileImages/1794415573959-579427472.jpg"),
        name: "Joel",
      },
      {
        keyword: "darvin",
        fallbackAvatar: "https://res.cloudinary.com/dbzun4bbt/image/upload/v1793617811/mockeefy/profiles/krgl2xkm2mczesijdaoy.jpg",
        name: "Darvin Michael",
      },
      {
        keyword: "godson",
        fallbackAvatar: getProfileImageUrl("/uploads/profileImages/1793018584207-446260922.jpg"),
        name: "Godson Arockia Raj",
      },
      {
        keyword: "sudalai",
        fallbackAvatar: "https://res.cloudinary.com/dbzun4bbt/image/upload/v1782811992/mockeefy/profiles/rxmfx8cautygzwgsqxys.jpg",
        name: "Sudalaimani Kannan",
      },
      {
        keyword: "kishore",
        fallbackAvatar: "https://res.cloudinary.com/dbzun4bbt/image/upload/v1782738936/mockeefy/profiles/fd2gapze56dykmdjvsit.jpg",
        name: "KishoreKumar A",
      },
      {
        keyword: "sudhan",
        fallbackAvatar: "https://res.cloudinary.com/dbzun4bbt/image/upload/v1793295363/mockeefy/profiles/j6n4doq6eqfhpli5nxsl.jpg",
        name: "Sudhan",
      },
      {
        keyword: "bala",
        fallbackAvatar: "https://res.cloudinary.com/dbzun4bbt/image/upload/v1782806158/mockeefy/profiles/qkb6vlzqgbezvsw2xweq.jpg",
        name: "BalaMugunthan S",
      },
    ];

    const curated: { name: string; avatar: string }[] = [];
    const usedAvatars = new Set<string>();
    const usedNames = new Set<string>();

    for (const item of realProfiles) {
      const match = allMentors.find((m) => {
        const n = (m.name || "").toLowerCase();
        return n.includes(item.keyword);
      });

      let avatar = match?.avatar;
      if (
        !avatar ||
        avatar.toLowerCase().includes("placementx") ||
        avatar.toLowerCase().includes("ui-avatars") ||
        avatar.toLowerCase().includes("default-avatar")
      ) {
        avatar = item.fallbackAvatar;
      }

      const displayName = match?.name || item.name;
      const lowerName = displayName.toLowerCase();

      // Guard: strictly ensure only one Joel appears
      if (lowerName.includes("joel") && usedNames.has("joel")) continue;
      if (lowerName.includes("joel")) usedNames.add("joel");

      if (avatar && !usedAvatars.has(avatar)) {
        usedAvatars.add(avatar);
        curated.push({
          name: displayName,
          avatar,
        });
      }
    }

    // Fill up to 7 with other genuine real mentor headshots if any slot is missing
    if (curated.length < 7) {
      for (const m of allMentors) {
        const av = m.avatar || "";
        const n = (m.name || "").toLowerCase();
        if (n.includes("joel") && usedNames.has("joel")) continue;
        if (
          av &&
          !usedAvatars.has(av) &&
          !av.toLowerCase().includes("placementx") &&
          !av.toLowerCase().includes("ui-avatars")
        ) {
          usedAvatars.add(av);
          curated.push({ name: m.name, avatar: av });
          if (curated.length >= 7) break;
        }
      }
    }

    return curated;
  }, [allMentors]);

  // Scroll smoothly to target expert card if navigated back from profile or booking
  useEffect(() => {
    // Suppress scroll-to-card and pulse if a booking modal is being resumed
    try {
      const pending = getPendingBooking();
      const isResume = searchParams.get("resumeBooking") === "true";
      if (pending || isResume || activeResumeBookingMentor) {
        sessionStorage.removeItem("lastViewedExpertId");
        sessionStorage.removeItem("lastViewedExpertName");
        return;
      }
    } catch {}

    const state = location.state as any;
    let targetExpertId = state?.scrollToExpertId;
    let targetExpertName = state?.scrollToExpertName;

    try {
      if (!targetExpertId && typeof window !== "undefined") {
        targetExpertId = sessionStorage.getItem("lastViewedExpertId");
      }
      if (!targetExpertName && typeof window !== "undefined") {
        targetExpertName = sessionStorage.getItem("lastViewedExpertName");
      }
    } catch {
      // ignore
    }

    if (!targetExpertId && !targetExpertName) return;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const el =
        (targetExpertId ? document.getElementById(`expert-card-${targetExpertId}`) : null) ||
        (targetExpertId ? document.querySelector(`[data-expert-id="${targetExpertId}"]`) : null) ||
        (targetExpertName ? document.querySelector(`[data-expert-name="${targetExpertName}"]`) : null) ||
        (targetExpertName ? document.querySelector(`[data-expert-name*="${targetExpertName.split(" ")[0]}"]`) : null);

      if (el) {
        clearInterval(interval);
        try {
          sessionStorage.removeItem("lastViewedExpertId");
          sessionStorage.removeItem("lastViewedExpertName");
        } catch {}

        // Calculate card position and smoothly scroll window to center the card vertically
        const rect = el.getBoundingClientRect();
        const absoluteElementTop = rect.top + window.pageYOffset;
        const middle = absoluteElementTop - (window.innerHeight / 2) + (rect.height / 2);

        window.scrollTo({
          top: Math.max(0, middle),
          behavior: "smooth",
        });

        // If card is inside a horizontal scroll container, also scroll container
        const horizontalParent = el.closest(".overflow-x-auto") as HTMLElement | null;
        if (horizontalParent) {
          const cardLeft = (el.parentElement as HTMLElement || el).offsetLeft;
          horizontalParent.scrollTo({
            left: Math.max(0, cardLeft - 20),
            behavior: "smooth",
          });
        }

        // Add a gentle highlight pulse to visually confirm the selected expert
        el.classList.add("ring-4", "ring-[#0755E8]/40", "shadow-xl");
        setTimeout(() => {
          el.classList.remove("ring-4", "ring-[#0755E8]/40", "shadow-xl");
        }, 2200);

        // Clean up navigation state so it doesn't linger
        window.history.replaceState({}, document.title);
      } else if (attempts >= 25) {
        clearInterval(interval);
        try {
          sessionStorage.removeItem("lastViewedExpertId");
          sessionStorage.removeItem("lastViewedExpertName");
        } catch {}
        window.history.replaceState({}, document.title);
      }
    }, 80);

    return () => clearInterval(interval);
  }, [location.state, allMentors]);

  // Auto-resume booking flow after successful login or signup (smooth, frame-0 ready)
  useEffect(() => {
    if (!user || hasResumedBookingRef.current) return;

    const resumeParam = searchParams.get("resumeBooking") === "true";
    const paramExpertId = searchParams.get("expertId");
    const pending = getPendingBooking();

    const targetId = paramExpertId || pending?.expertId;
    if (!targetId && !resumeParam && !pending) return;

    hasResumedBookingRef.current = true;

    // Clean URL query params quietly in the browser history without triggering React Router re-renders
    if (resumeParam || paramExpertId) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const mentorNameToGreet = activeResumeBookingMentor?.name || pending?.expertName;
    if (mentorNameToGreet) {
      toast.success(
        `Welcome back, ${user.name?.split(" ")[0] || "there"}! Resuming your booking with ${mentorNameToGreet}.`
      );
    }

    // If allMentors has loaded from the API, enrich activeResumeBookingMentor with latest live data
    if (allMentors.length > 0 && targetId) {
      const foundMentor = allMentors.find(
        (m) =>
          String(m.id) === String(targetId) ||
          String(m.rawExpert?._id) === String(targetId) ||
          String(m.rawExpert?.userId) === String(targetId)
      );

      if (foundMentor) {
        setActiveResumeBookingMentor((prev) => {
          if (!prev || !prev.rawExpert?.availability) {
            return foundMentor;
          }
          return prev;
        });
      }
    }
  }, [user, allMentors]);

  // Categories and dynamic counts strictly from MongoDB categories and expert relationships
  const categories = useMemo(() => {
    const set = new Set<string>();
    // First, add all active categories from MongoDB
    if (Array.isArray(dbCategoriesData)) {
      dbCategoriesData.forEach((c: any) => {
        if (c.name?.trim()) set.add(c.name.trim());
      });
    }
    // Also include categories from mentors if any
    allMentors.forEach((m) => {
      if (m.category?.trim()) set.add(m.category.trim());
    });
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [dbCategoriesData, allMentors]);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    // Initialize all known categories with 0
    categories.forEach((cat) => {
      if (cat !== "All") map[cat] = 0;
    });

    // Count experts matching strictly by primary category or domains
    allMentors.forEach((m) => {
      const primaryCat = m.category?.trim();
      const domains = Array.isArray(m.rawExpert?.skillsAndExpertise?.domains)
        ? m.rawExpert.skillsAndExpertise.domains
        : [];

      categories.forEach((cat) => {
        if (cat === "All") return;
        const catLower = cat.toLowerCase();
        const matchesPrimary = primaryCat && primaryCat.toLowerCase() === catLower;
        const matchesDomain = domains.some((d: string) => d && d.toLowerCase() === catLower);
        if (matchesPrimary || matchesDomain) {
          map[cat] = (map[cat] || 0) + 1;
        }
      });
    });

    return map;
  }, [categories, allMentors]);

  const uniqueCompanies = useMemo(() => {
    const counts: Record<string, number> = {};
    allMentors.forEach((m) => {
      const comp = m.company?.trim();
      if (comp && !/l[ae]ntera/i.test(comp)) {
        counts[comp] = (counts[comp] || 0) + 1;
      }
    });
    return Object.keys(counts).sort((a, b) => {
      const diff = counts[b] - counts[a];
      if (diff !== 0) return diff;
      return a.localeCompare(b);
    });
  }, [allMentors]);

  // Real Counts for Filter Items
  const companyCounts = useMemo(() => {
    const map: Record<string, number> = {};
    allMentors.forEach((m) => {
      if (m.company) map[m.company] = (map[m.company] || 0) + 1;
    });
    return map;
  }, [allMentors]);

  const expCounts = useMemo(() => {
    const counts = { "0-2": 0, "3-5": 0, "6-10": 0, "10+": 0 };
    allMentors.forEach((m) => {
      const match = (m.experience || "").match(/\d+/);
      const exp = match ? parseInt(match[0], 10) : 0;
      if (exp <= 2) counts["0-2"]++;
      else if (exp <= 5) counts["3-5"]++;
      else if (exp <= 10) counts["6-10"]++;
      else counts["10+"]++;
    });
    return counts;
  }, [allMentors]);

  const priceCounts = useMemo(() => {
    const counts = { "under-1000": 0, "1000-2000": 0, "2000+": 0 };
    allMentors.forEach((m) => {
      const price = m.minPrice ?? parseInt((m.price || "0").replace(/[^\d]/g, ""), 10) ?? 0;
      if (price < 1000) counts["under-1000"]++;
      else if (price <= 2000) counts["1000-2000"]++;
      else counts["2000+"]++;
    });
    return counts;
  }, [allMentors]);

  const toggleCompany = (comp: string) => {
    setSelectedCompanies((prev) =>
      prev.includes(comp) ? prev.filter((c) => c !== comp) : [...prev, comp]
    );
  };

  const toggleExpRange = (range: string) => {
    setSelectedExpRanges((prev) =>
      prev.includes(range) ? prev.filter((r) => r !== range) : [...prev, range]
    );
  };

  const togglePriceRange = (range: string) => {
    setSelectedPriceRanges((prev) =>
      prev.includes(range) ? prev.filter((r) => r !== range) : [...prev, range]
    );
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
    setEmptyCategoryNotice(null);
    setSelectedCompanies([]);
    setSelectedExpRanges([]);
    setSelectedPriceRanges([]);
    setAvailabilityFilter("All");
    setSortBy("recommended");
    setCurrentPage(1);
    setSearchParams(new URLSearchParams());
  };

  // Automatic Empty Category Fallback with Clear Non-blocking Notification
  useEffect(() => {
    if (selectedCategory !== "All" && allMentors.length > 0 && !isLoading) {
      const selectedCatLower = selectedCategory.toLowerCase().trim();
      const count = allMentors.filter((m) => {
        const cat = (m.category || "").toLowerCase().trim();
        if (cat === selectedCatLower) return true;
        const domains = Array.isArray(m.rawExpert?.skillsAndExpertise?.domains)
          ? m.rawExpert.skillsAndExpertise.domains
          : [];
        return domains.some((d: string) => d && d.toLowerCase().trim() === selectedCatLower);
      }).length;

      if (count === 0) {
        // Fallback to All Tracks
        const prevCategory = selectedCategory;
        setSelectedCategory("All");
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete("category");
          return next;
        });
        setEmptyCategoryNotice(`No available interview experts were found in ${prevCategory}. Showing all available experts instead.`);
      }
    }
  }, [selectedCategory, allMentors, isLoading, setSearchParams]);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedCategory,
    deferredSearch,
    selectedCompanies,
    selectedExpRanges,
    selectedPriceRanges,
    availabilityFilter,
    sortBy,
  ]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== "All") count++;
    if (selectedCompanies.length > 0) count += selectedCompanies.length;
    if (selectedExpRanges.length > 0) count += selectedExpRanges.length;
    if (selectedPriceRanges.length > 0) count += selectedPriceRanges.length;
    if (availabilityFilter !== "All") count++;
    if (sortBy !== "recommended") count++;
    return count;
  }, [
    selectedCategory,
    selectedCompanies,
    selectedExpRanges,
    selectedPriceRanges,
    availabilityFilter,
    sortBy,
  ]);

  // Filter and sort mentors
  const filteredMentors = useMemo(() => {
    let list = [...allMentors];
    const q = deferredSearch.toLowerCase().trim();

    // 1. Strict Category filter (Strict MongoDB category relationship only - no substring or track grouping)
    if (selectedCategory !== "All") {
      const selectedCatLower = selectedCategory.toLowerCase().trim();
      list = list.filter((m) => {
        const cat = (m.category || "").toLowerCase().trim();
        if (cat === selectedCatLower) return true;
        const domains = Array.isArray(m.rawExpert?.skillsAndExpertise?.domains)
          ? m.rawExpert.skillsAndExpertise.domains
          : [];
        return domains.some((d: string) => d && d.toLowerCase().trim() === selectedCatLower);
      });
    }

    // 2. Search query (matches name, role, company, skills, or category)
    if (q) {
      list = list.filter((m) => {
        const matchName = m.name.toLowerCase().includes(q);
        const matchRole = m.role.toLowerCase().includes(q);
        const matchCompany = m.company?.toLowerCase().includes(q);
        const matchCategory = m.category?.toLowerCase().includes(q);
        const matchSkills = m.skills?.some((s) => s.toLowerCase().includes(q));
        return matchName || matchRole || matchCompany || matchCategory || matchSkills;
      });
    }

    // 3. Company Filter
    if (selectedCompanies.length > 0) {
      list = list.filter((m) => m.company && selectedCompanies.includes(m.company));
    }

    // 4. Experience Filter
    if (selectedExpRanges.length > 0) {
      list = list.filter((m) => {
        const match = (m.experience || "").match(/\d+/);
        const exp = match ? parseInt(match[0], 10) : 0;
        return selectedExpRanges.some((r) => {
          if (r === "0-2") return exp <= 2;
          if (r === "3-5") return exp >= 3 && exp <= 5;
          if (r === "6-10") return exp >= 6 && exp <= 10;
          if (r === "10+") return exp >= 10;
          return true;
        });
      });
    }

    // 5. Price Filter
    if (selectedPriceRanges.length > 0) {
      list = list.filter((m) => {
        const price = m.minPrice ?? parseInt((m.price || "0").replace(/[^\d]/g, ""), 10) ?? 0;
        return selectedPriceRanges.some((r) => {
          if (r === "under-1000") return price < 1000;
          if (r === "1000-2000") return price >= 1000 && price <= 2000;
          if (r === "2000+") return price > 2000;
          return true;
        });
      });
    }

    // 6. Availability Filter (Strict Asia/Kolkata calculation from backend)
    if (availabilityFilter === "Today") {
      list = list.filter((m) => {
        if (m.rawExpert?.isAvailableToday !== undefined) return m.rawExpert.isAvailableToday;
        return m.activeTime?.toLowerCase().includes("today");
      });
    } else if (availabilityFilter === "Week") {
      list = list.filter((m) => {
        if (m.rawExpert?.isAvailableThisWeek !== undefined) return m.rawExpert.isAvailableThisWeek;
        return (
          m.activeTime?.toLowerCase().includes("today") ||
          m.activeTime?.toLowerCase().includes("week") ||
          m.activeTime?.toLowerCase().includes("tomorrow") ||
          m.activeTime?.toLowerCase().includes("next:")
        );
      });
    }

    // 7. Sort
    list.sort((a, b) => {
      if (sortBy === "rating") {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortBy === "experience" || sortBy === "sessions") {
        const getExpYears = (m: any) => {
          const match = (m.experience || "").match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        };
        const expDiff = getExpYears(b) - getExpYears(a);
        if (expDiff !== 0) return expDiff;
        return (b.totalSessions || 0) - (a.totalSessions || 0);
      }
      if (sortBy === "price-low") {
        const priceA = a.minPrice ?? parseInt((a.price || "0").replace(/[^\d]/g, ""), 10) ?? 0;
        const priceB = b.minPrice ?? parseInt((b.price || "0").replace(/[^\d]/g, ""), 10) ?? 0;
        return priceA - priceB;
      }
      if (sortBy === "price-high") {
        const priceA = a.minPrice ?? parseInt((a.price || "0").replace(/[^\d]/g, ""), 10) ?? 0;
        const priceB = b.minPrice ?? parseInt((b.price || "0").replace(/[^\d]/g, ""), 10) ?? 0;
        return priceB - priceA;
      }
      // Default: recommended / relevance
      return (
        (b.rating || 0) * 10 +
        (b.totalSessions || 0) -
        ((a.rating || 0) * 10 + (a.totalSessions || 0))
      );
    });

    return list;
  }, [
    allMentors,
    selectedCategory,
    deferredSearch,
    selectedCompanies,
    selectedExpRanges,
    selectedPriceRanges,
    availabilityFilter,
    sortBy,
  ]);

  // Group mentors into categories strictly based on real MongoDB categories
  const filteredCategoryGroups = useMemo(() => {
    // If a specific category is selected, render only that category's group
    if (selectedCategory !== "All") {
      const matchingMentors = filteredMentors.filter((m) => {
        const cat = (m.category || "").toLowerCase().trim();
        const sel = selectedCategory.toLowerCase().trim();
        if (cat === sel) return true;
        const domains = Array.isArray(m.rawExpert?.skillsAndExpertise?.domains)
          ? m.rawExpert.skillsAndExpertise.domains
          : [];
        return domains.some((d: string) => d && d.toLowerCase().trim() === sel);
      });

      if (matchingMentors.length === 0) return [];

      return [
        {
          id: `cat-${selectedCategory.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          title: selectedCategory,
          subtitle: `Verified interview experts specialized in ${selectedCategory}.`,
          icon: <Sparkles size={16} />,
          mentors: matchingMentors,
        },
      ];
    }

    // When "All Tracks" is selected, group by each real category that has mentors
    // Derive list of categories in order
    const orderedCategories = categories.filter((c) => c !== "All");

    const categoryIcons: Record<string, React.ReactNode> = {
      "IT": <Code2 size={16} />,
      "Software Development": <Code2 size={16} />,
      "Web Development": <Code2 size={16} />,
      "Mobile Development": <Code2 size={16} />,
      "Full Stack Development (MERN)": <Code2 size={16} />,
      "DevOps & Cloud": <Cloud size={16} />,
      "Cybersecurity": <Cloud size={16} />,
      "Database": <Cloud size={16} />,
      "System Design": <Cloud size={16} />,
      "Data Science & ML": <Brain size={16} />,
      "AI": <Brain size={16} />,
      "Design": <Palette size={16} />,
      "Agile & Project Management": <Palette size={16} />,
      "Business": <Palette size={16} />,
      "HR": <Users size={16} />,
      "QA & Testing": <Code2 size={16} />,
    };

    const categorySubtitles: Record<string, string> = {
      "IT": "Enterprise systems, solutions architecture, and core IT infrastructure.",
      "Software Development": "Backend architecture, object-oriented systems, and clean code.",
      "Web Development": "Modern frontend, responsive UI engineering, and web applications.",
      "Mobile Development": "Native iOS, Android, and cross-platform mobile engineering.",
      "Full Stack Development (MERN)": "End-to-end JavaScript stack, Node.js, Express, and React.",
      "DevOps & Cloud": "Cloud platforms (AWS/GCP/Azure), CI/CD pipelines, and Kubernetes.",
      "Cybersecurity": "Security operations, penetration testing, and compliance frameworks.",
      "Database": "Relational, NoSQL, high-throughput database systems, and caching.",
      "System Design": "Distributed systems, scalability, fault tolerance, and API architecture.",
      "Data Science & ML": "Data pipelines, predictive modeling, and analytics systems.",
      "AI": "Artificial intelligence, deep learning, LLMs, and neural networks.",
      "Design": "User experience, UI design systems, and product ergonomics.",
      "Agile & Project Management": "Scrum, sprint planning, project delivery, and roadmap strategy.",
      "Business": "Product-market fit, commercial strategy, and tech business leadership.",
      "HR": "Tech recruiting, talent acquisition, and behavioral round preparation.",
      "QA & Testing": "Automated testing, test strategy, performance testing, and QA lead rounds.",
    };

    const groups: {
      id: string;
      title: string;
      subtitle: string;
      icon: React.ReactNode;
      mentors: MentorProfile[];
    }[] = [];

    orderedCategories.forEach((catName) => {
      const mentorsInCat = filteredMentors.filter(
        (m) => (m.category || "").toLowerCase().trim() === catName.toLowerCase().trim()
      );
      if (mentorsInCat.length > 0) {
        groups.push({
          id: `cat-${catName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          title: catName,
          subtitle: categorySubtitles[catName] || `Verified interview experts specialized in ${catName}.`,
          icon: categoryIcons[catName] || <Sparkles size={16} />,
          mentors: mentorsInCat,
        });
      }
    });

    return groups;
  }, [filteredMentors, selectedCategory, categories]);

  // Pagination calculations (kept for fallback)
  const totalPages = Math.max(1, Math.ceil(filteredMentors.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedMentors = useMemo(() => {
    return filteredMentors.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredMentors, startIndex]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);
    if (listTopRef.current) {
      listTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Dedicated Filter Sidebar Component
  const renderFilterPanel = () => (
    <div className="sidebar-main-card relative rounded-[24px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-4.5 space-y-4 text-left overflow-hidden">
      {/* Decorative ambient blue lighting */}
      <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-2xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

      <div className="relative z-10 space-y-4">
        <div className="pb-3 border-b border-slate-100 space-y-2">
          {/* Main Title Row: Filters title & Clear all */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#EAF2FF] text-[#0755E8] flex items-center justify-center shrink-0">
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 m-0">Filters</h2>
              {activeFilterCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#0755E8] text-white text-[10.5px] font-bold shadow-2xs">
                  {activeFilterCount}
                </span>
              )}
            </div>

            {activeFilterCount > 0 ? (
              <button
                onClick={handleResetFilters}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer whitespace-nowrap transition-colors"
              >
                Clear all
              </button>
            ) : (
              <span className="text-[11px] font-extrabold text-[#0755E8] bg-[#EAF2FF] border border-blue-200/60 px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-2xs">
                {allMentors.length} Experts
              </span>
            )}
          </div>

          {/* Sub Row: Shown when filters are active so both Clear all and Interview Experts are cleanly aligned without wrapping */}
          {activeFilterCount > 0 && (
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100/70">
              <span className="text-slate-500 font-medium">Total:</span>
              <span className="font-extrabold text-[#0755E8] bg-[#EAF2FF] px-2.5 py-0.5 rounded-full whitespace-nowrap">
                {allMentors.length} Interview Experts
              </span>
            </div>
          )}
        </div>

      {/* 1. Track Filter */}
      {(() => {
        const isTrackExpanded = !!showAllSubheadings.track;
        const visibleCategories = (() => {
          if (isTrackExpanded || categories.length <= INITIAL_FILTER_ITEMS_LIMIT) {
            return categories;
          }
          const top = categories.slice(0, INITIAL_FILTER_ITEMS_LIMIT);
          // If the user selected a category outside top 5, include it so the active choice isn't hidden
          if (selectedCategory !== "All" && !top.includes(selectedCategory)) {
            return [...top, selectedCategory];
          }
          return top;
        })();

        return (
          <div className="space-y-2">
            <button
              onClick={() => toggleSection("track")}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-800 uppercase tracking-wider cursor-pointer py-1"
            >
              <span className="flex items-center gap-1.5">
                <span>Filter by Track</span>
                {selectedCategory !== "All" && (
                  <span className="text-[10px] bg-[#EAF2FF] text-[#0755E8] px-1.5 py-0.2 rounded-full font-bold">
                    1
                  </span>
                )}
              </span>
              {expandedSections.track ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {expandedSections.track && (
              <div className="space-y-1">
                <div className={`space-y-1 ${isTrackExpanded ? "max-h-72 overflow-y-auto custom-scrollbar pr-1" : ""}`}>
                  {visibleCategories.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    const count = cat === "All" ? allMentors.length : categoryCounts[cat] || 0;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          const newCat = cat;
                          setEmptyCategoryNotice(null);
                          setSelectedCategory(newCat);
                          setSearchParams((prev) => {
                            const next = new URLSearchParams(prev);
                            if (newCat === "All") next.delete("category");
                            else next.set("category", newCat);
                            return next;
                          });
                        }}
                        className={`w-full group flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all duration-150 cursor-pointer text-left ${
                          isSelected
                            ? "bg-gradient-to-r from-[#0755E8] to-[#0440B3] text-white font-bold shadow-xs shadow-blue-500/20"
                            : "text-slate-700 hover:text-[#0755E8] hover:bg-blue-50/50 font-medium"
                        }`}
                      >
                        <span className="truncate pr-1">{cat === "All" ? "All Tracks" : cat}</span>
                        <span
                          className={`text-[11px] px-1.5 py-0.2 rounded-full shrink-0 transition-colors ${
                            isSelected
                              ? "bg-white/20 text-white font-bold"
                              : "text-slate-400 bg-slate-100 group-hover:bg-blue-100/70 group-hover:text-[#0755E8]"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {categories.length > INITIAL_FILTER_ITEMS_LIMIT && (
                  <button
                    type="button"
                    onClick={() => toggleShowMore("track")}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 mt-0.5 text-xs font-bold text-[#0755E8] hover:text-[#0645C7] hover:bg-blue-50/70 rounded-xl cursor-pointer transition-all"
                  >
                    <span>{isTrackExpanded ? "View Less" : "View More"}</span>
                    {isTrackExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* 2. Experience */}
      {(() => {
        const expOptions = [
          { id: "0-2", label: "0-2 Yrs", count: expCounts["0-2"] },
          { id: "3-5", label: "3-5 Yrs", count: expCounts["3-5"] },
          { id: "6-10", label: "6-10 Yrs", count: expCounts["6-10"] },
          { id: "10+", label: "10+ Yrs", count: expCounts["10+"] },
        ];
        const isExpExpanded = !!showAllSubheadings.experience;
        const visibleExpOptions = isExpExpanded || expOptions.length <= INITIAL_FILTER_ITEMS_LIMIT
          ? expOptions
          : expOptions.slice(0, INITIAL_FILTER_ITEMS_LIMIT);

        return (
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <button
              onClick={() => toggleSection("experience")}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-800 uppercase tracking-wider cursor-pointer py-1"
            >
              <span className="flex items-center gap-1.5">
                <span>Experience</span>
                {selectedExpRanges.length > 0 && (
                  <span className="text-[10px] bg-[#EAF2FF] text-[#0755E8] px-1.5 py-0.2 rounded-full font-bold">
                    {selectedExpRanges.length}
                  </span>
                )}
              </span>
              {expandedSections.experience ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {expandedSections.experience && (
              <div className="space-y-1">
                <div className={`space-y-1 ${isExpExpanded ? "max-h-72 overflow-y-auto custom-scrollbar pr-1" : ""}`}>
                  {visibleExpOptions.map((item) => {
                    const checked = selectedExpRanges.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        onClick={() => toggleExpRange(item.id)}
                        className="group flex items-center gap-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer select-none py-1 transition-colors"
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-all ${
                            checked
                              ? "bg-[#0755E8] border-[#0755E8] text-white shadow-2xs"
                              : "border-slate-300 bg-white group-hover:border-[#0755E8]"
                          }`}
                        >
                          {checked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span className="flex-1 font-medium">{item.label}</span>
                        <span className="text-slate-400 text-[11px]">({item.count})</span>
                      </label>
                    );
                  })}
                </div>

                {expOptions.length > INITIAL_FILTER_ITEMS_LIMIT && (
                  <button
                    type="button"
                    onClick={() => toggleShowMore("experience")}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 mt-0.5 text-xs font-bold text-[#0755E8] hover:text-[#0645C7] hover:bg-blue-50/70 rounded-xl cursor-pointer transition-all"
                  >
                    <span>{isExpExpanded ? "View Less" : "View More"}</span>
                    {isExpExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* 3. Session Price */}
      {(() => {
        const priceOptions = [
          { id: "under-1000", label: "Under ₹1,000", count: priceCounts["under-1000"] },
          { id: "1000-2000", label: "₹1,000 - ₹2,000", count: priceCounts["1000-2000"] },
          { id: "2000+", label: "₹2,000+", count: priceCounts["2000+"] },
        ];
        const isPriceExpanded = !!showAllSubheadings.price;
        const visiblePriceOptions = isPriceExpanded || priceOptions.length <= INITIAL_FILTER_ITEMS_LIMIT
          ? priceOptions
          : priceOptions.slice(0, INITIAL_FILTER_ITEMS_LIMIT);

        return (
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <button
              onClick={() => toggleSection("price")}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-800 uppercase tracking-wider cursor-pointer py-1"
            >
              <span className="flex items-center gap-1.5">
                <span>Session Price</span>
                {selectedPriceRanges.length > 0 && (
                  <span className="text-[10px] bg-[#EAF2FF] text-[#0755E8] px-1.5 py-0.2 rounded-full font-bold">
                    {selectedPriceRanges.length}
                  </span>
                )}
              </span>
              {expandedSections.price ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {expandedSections.price && (
              <div className="space-y-1">
                <div className={`space-y-1 ${isPriceExpanded ? "max-h-72 overflow-y-auto custom-scrollbar pr-1" : ""}`}>
                  {visiblePriceOptions.map((item) => {
                    const checked = selectedPriceRanges.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        onClick={() => togglePriceRange(item.id)}
                        className="group flex items-center gap-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer select-none py-1 transition-colors"
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-all ${
                            checked
                              ? "bg-[#0755E8] border-[#0755E8] text-white shadow-2xs"
                              : "border-slate-300 bg-white group-hover:border-[#0755E8]"
                          }`}
                        >
                          {checked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span className="flex-1 font-medium">{item.label}</span>
                        <span className="text-slate-400 text-[11px]">({item.count})</span>
                      </label>
                    );
                  })}
                </div>

                {priceOptions.length > INITIAL_FILTER_ITEMS_LIMIT && (
                  <button
                    type="button"
                    onClick={() => toggleShowMore("price")}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 mt-0.5 text-xs font-bold text-[#0755E8] hover:text-[#0645C7] hover:bg-blue-50/70 rounded-xl cursor-pointer transition-all"
                  >
                    <span>{isPriceExpanded ? "View Less" : "View More"}</span>
                    {isPriceExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* 4. Availability Pills (matching mockup) */}
      {(() => {
        const availabilityOptions = [
          { id: "All", label: "Anytime" },
          { id: "Today", label: "Today" },
          { id: "Week", label: "This week" },
        ];

        return (
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <button
              onClick={() => toggleSection("availability")}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-800 uppercase tracking-wider cursor-pointer py-1"
            >
              <span className="flex items-center gap-1.5">
                <span>Availability</span>
                {availabilityFilter !== "All" && (
                  <span className="text-[10px] bg-[#EAF2FF] text-[#0755E8] px-1.5 py-0.2 rounded-full font-bold">
                    1
                  </span>
                )}
              </span>
              {expandedSections.availability ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {expandedSections.availability && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {availabilityOptions.map((opt) => {
                  const isSelected = availabilityFilter === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAvailabilityFilter(opt.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none ${
                        isSelected
                          ? "bg-[#0755E8] text-white shadow-2xs font-bold"
                          : "bg-white border border-slate-200/90 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}
      </div>
    </div>
  );

  const isPageLoading = (propShowSkeletons ?? isLoading) && allMentors.length === 0;

  if (isPageLoading) {
    return <FindMentorSkeleton />;
  }

  return (
    <div ref={listTopRef} className="w-full font-sans text-left animate-in fade-in duration-200">
      <div className="flex items-start gap-5 lg:gap-6 w-full">
        {/* CENTER COLUMN: All Experts Content */}
        <div className="flex-1 min-w-0 space-y-3.5">
          {/* COMPACT Hero Banner (matching user's mockup but sleek and compact as requested) */}
          <div className="relative rounded-[22px] overflow-hidden bg-gradient-to-r from-[#0755E8] via-[#0848C9] to-[#043394] p-4 sm:py-4.5 sm:px-5 text-white shadow-[0_8px_24px_-6px_rgba(7,85,232,0.3)]">
            {/* Subtle Blueprint Grid Pattern & Ambient Glow */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.3) 1px, transparent 1px)`,
                backgroundSize: "16px 16px",
              }}
            />
            <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-blue-300/20 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
              {/* Left Content */}
              <div className="space-y-1.5 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/25 backdrop-blur-md border border-white/20 text-[10px] font-bold text-white shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="tracking-wide uppercase">
                    {Math.min(12, allMentors.length || 12)} Experts Online Now
                  </span>
                </div>

                <h2 className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight leading-snug">
                  Practice with real interviewers. Walk in ready.
                </h2>

                <p className="text-xs text-blue-100/90 leading-normal font-normal line-clamp-2 md:line-clamp-none">
                  One-on-one mock interviews with industry experts — honest feedback, real questions, and a plan to land your offer.
                </p>

                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById("all-experts-categories");
                      el?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#0755E8] font-bold text-xs shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                  >
                    <span>Browse experts</span>
                    <ArrowRight size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/help")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/12 hover:bg-white/20 border border-white/25 text-white font-semibold text-xs transition-all active:scale-95 cursor-pointer backdrop-blur-xs"
                  >
                    <span>How it works</span>
                  </button>
                </div>
              </div>

              {/* Right Sleek Frosted Glass Social Proof Card */}
              <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-white/[0.14] via-white/[0.08] to-white/[0.04] backdrop-blur-xl border border-white/25 rounded-2xl p-3 sm:p-3.5 space-y-2.5 w-full md:w-auto md:min-w-[250px] shadow-[0_8px_32px_rgba(0,0,0,0.18)]">
                {/* Top Glossy Highlight Line */}
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />
                {/* Ambient Soft Blur */}
                <div className="absolute -top-8 -right-8 w-24 h-24 bg-blue-300/20 rounded-full blur-xl pointer-events-none" />

                {/* Top Row: Overlapping Avatars + Count Badge - Full Width */}
                <div className="flex items-center justify-between w-full gap-2 relative z-10">
                  <div className="flex -space-x-2 sm:-space-x-2.5">
                    {heroAvatars.map((m, idx) => (
                      <div
                        key={idx}
                        title={m.name}
                        className="relative inline-block h-8 w-8 sm:h-8.5 sm:w-8.5 rounded-full ring-2 ring-white/95 shadow-sm overflow-hidden bg-white/20 shrink-0 group/avatar cursor-pointer"
                      >
                        <img
                          src={m.avatar}
                          alt={m.name}
                          className="w-full h-full object-cover object-top transition-transform duration-200 group-hover/avatar:scale-110"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name || "Mentor")}&background=0755E8&color=fff&bold=true`;
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <span className="text-[11px] font-black text-white bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/35 shadow-2xs leading-none shrink-0">
                    +{Math.max(1, (allMentors.length || 74) - heroAvatars.length)}
                  </span>
                </div>

                {/* Bottom Row: 3 Frosted Glass Metrics */}
                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/15 relative z-10">
                  <div className="bg-white/[0.08] hover:bg-white/[0.14] rounded-xl py-1.5 px-1 border border-white/10 text-center transition-all">
                    <div className="text-xs sm:text-sm font-black text-white leading-tight">
                      {allMentors.length || 74}+
                    </div>
                    <div className="text-[9px] font-bold text-blue-200/90 uppercase tracking-wider mt-0.5">
                      Experts
                    </div>
                  </div>
                  
                  {/* Metric 2: 100% Vetted & Verified Credential */}
                  <div className="bg-white/[0.08] hover:bg-white/[0.14] rounded-xl py-1.5 px-1 border border-white/10 text-center transition-all">
                    <div className="text-xs sm:text-sm font-black text-white leading-tight flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0 drop-shadow-xs" />
                      <span>100%</span>
                    </div>
                    <div className="text-[9px] font-bold text-blue-200/90 uppercase tracking-wider mt-0.5">
                      Verified
                    </div>
                  </div>

                  <div className="bg-white/[0.08] hover:bg-white/[0.14] rounded-xl py-1.5 px-1 border border-white/10 text-center transition-all">
                    <div className="text-xs sm:text-sm font-black text-white leading-tight">
                      {categories.filter((c) => c !== "All").length || 21}
                    </div>
                    <div className="text-[9px] font-bold text-blue-200/90 uppercase tracking-wider mt-0.5">
                      Tracks
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Header Controls: Result Count & Sort Dropdown in the same line */}
          <div className="space-y-2 px-1 sm:px-1.5">
            {/* Same Line Header Row: Title, Count & Compact Sort Control */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
              {/* LEFT: Title & Verified Count */}
              <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 m-0 tracking-tight whitespace-nowrap">
                  {selectedCategory !== "All"
                    ? `Available Interview Experts — ${selectedCategory}`
                    : "Available Interview Experts"}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0755E8] font-bold text-xs border border-blue-200/80 shadow-2xs whitespace-nowrap">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0755E8]"></span>
                  </span>
                  <span>{filteredMentors.length} Verified</span>
                </span>
              </div>

              {/* Controls Row: On mobile, full width with Filters on Left and Relevance on Right */}
              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                {/* Mobile Filter Button (< xl screens) - Assigned at Left */}
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(true)}
                  className="xl:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 text-slate-700 text-xs font-semibold hover:bg-slate-50 active:bg-slate-100 shadow-2xs cursor-pointer transition-all"
                >
                  <SlidersHorizontal size={13} className="text-slate-500" />
                  <span>Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="min-w-4 h-4 px-1 rounded-full bg-[#0755E8] text-white text-[9.5px] font-bold flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* Compact Custom Sort Dropdown: Assigned at Right */}
                <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 select-none whitespace-nowrap">
                    <ArrowUpDown size={11} className="text-slate-400" />
                    <span>Sort by:</span>
                  </span>
                  <div className="relative" ref={sortMenuRef}>
                    <button
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={isSortOpen}
                      onClick={() => setIsSortOpen((prev) => !prev)}
                      className={`inline-flex items-center gap-2 bg-white border text-xs font-semibold rounded-full py-1.5 pl-3.5 pr-2.5 shadow-2xs transition-all cursor-pointer select-none ${
                        isSortOpen
                          ? "border-[#0755E8] text-[#0755E8] ring-2 ring-[#0755E8]/15 shadow-sm"
                          : "border-slate-200 text-slate-800 hover:border-blue-300 hover:text-[#0755E8] hover:bg-blue-50/20"
                      }`}
                    >
                      <span>
                        {SORT_OPTIONS.find((o) => o.value === sortBy)?.label || "Relevance"}
                      </span>
                      <ChevronDown
                        size={13}
                        className={`transition-transform duration-200 ${
                          isSortOpen ? "rotate-180 text-[#0755E8]" : "text-slate-400"
                        }`}
                      />
                    </button>

                    {isSortOpen && (
                      <div
                        role="listbox"
                        className="absolute right-0 top-[calc(100%+6px)] w-56 bg-white border border-slate-200/90 rounded-2xl shadow-[0_16px_40px_-8px_rgba(0,0,0,0.14)] p-1.5 z-30 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/5"
                      >
                        <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Sort Options
                        </div>
                        <div className="space-y-0.5">
                          {SORT_OPTIONS.map((opt) => {
                            const isSelected = sortBy === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                  setSortBy(opt.value);
                                  setIsSortOpen(false);
                                }}
                                className={`w-full group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                                  isSelected
                                    ? "bg-[#EAF2FF] text-[#0755E8]"
                                    : "text-slate-700 hover:text-[#0755E8] hover:bg-[#F5F8FF]"
                                }`}
                              >
                                <span>{opt.label}</span>
                                {isSelected && (
                                  <Check size={14} className="text-[#0755E8] shrink-0 stroke-[2.5]" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Empty Category Fallback Notification (Non-blocking banner) */}
            {emptyCategoryNotice && (
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs shadow-xs animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber-600 shrink-0" />
                  <span className="font-medium">{emptyCategoryNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEmptyCategoryNotice(null)}
                  className="p-1 rounded-lg hover:bg-amber-100 text-amber-700 transition-colors cursor-pointer shrink-0"
                  aria-label="Dismiss notice"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Active Filter Badges (Shown below the title line when filters are applied) */}
            {activeFilterCount > 0 && (
              <div className="flex items-center justify-start gap-1.5 flex-wrap pt-0.5">
                <span className="text-xs text-slate-400 font-medium">Filtered by:</span>

                  {selectedCategory !== "All" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EAF2FF] border border-[#93B8FF] text-xs font-bold text-[#0755E8]">
                      {selectedCategory}
                      <button onClick={() => setSelectedCategory("All")} className="hover:text-red-500 cursor-pointer">
                        <X size={12} />
                      </button>
                    </span>
                  )}

                  {selectedCompanies.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700"
                    >
                      {c}
                      <button onClick={() => toggleCompany(c)} className="hover:text-red-500 cursor-pointer">
                        <X size={12} />
                      </button>
                    </span>
                  ))}

                  {selectedExpRanges.map((exp) => (
                    <span
                      key={exp}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700"
                    >
                      Exp: {exp} yrs
                      <button onClick={() => toggleExpRange(exp)} className="hover:text-red-500 cursor-pointer">
                        <X size={12} />
                      </button>
                    </span>
                  ))}

                  {selectedPriceRanges.map((pr) => (
                    <span
                      key={pr}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700"
                    >
                      Price: {pr}
                      <button onClick={() => togglePriceRange(pr)} className="hover:text-red-500 cursor-pointer">
                        <X size={12} />
                      </button>
                    </span>
                  ))}

                  {availabilityFilter !== "All" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
                      {availabilityFilter}
                      <button onClick={() => setAvailabilityFilter("All")} className="hover:text-red-500 cursor-pointer">
                        <X size={12} />
                      </button>
                    </span>
                  )}

                  {sortBy !== "recommended" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
                      {sortBy === "rating"
                        ? "Rating (High to Low)"
                        : sortBy === "experience"
                        ? "Experience (High to Low)"
                        : sortBy === "price-low"
                        ? "Price (Low to High)"
                        : "Price (High to Low)"}
                      <button onClick={() => setSortBy("recommended")} className="hover:text-red-500 cursor-pointer">
                        <X size={12} />
                      </button>
                    </span>
                  )}

                  <button
                    onClick={handleResetFilters}
                    className="text-xs font-semibold text-rose-600 hover:underline ml-1 cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

          {/* DIV CARD: All Experts Categories & Content */}
          <div id="all-experts-categories" className="sidebar-main-card relative rounded-[24px] sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-3.5 sm:p-5 md:p-6 overflow-hidden space-y-4 scroll-mt-24">
            {/* Decorative ambient blue lighting */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

            <div className="relative z-10">
              {/* Mentors Grid / Empty / Error States */}
              {isLoading && allMentors.length === 0 ? (
                <div className="space-y-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-3">
                      <div className="h-6 w-48 bg-slate-100 rounded-lg animate-pulse" />
                      <div className="flex gap-3 sm:gap-3.5 overflow-hidden">
                        {[1, 2].map((n) => (
                          <div key={n} className="w-[calc(50%-6px)] sm:w-[calc(50%-7px)] shrink-0">
                            <MentorCardSkeleton />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : isError ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-rose-200 p-6 space-y-3">
                  <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-900">Failed to load interview experts</h3>
                  <p className="text-xs text-slate-500">
                    {error instanceof Error ? error.message : "Error connecting to interview expert API."}
                  </p>
                  <button
                    onClick={() => refetch()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <RefreshCw size={13} />
                    <span>Retry</span>
                  </button>
                </div>
              ) : filteredCategoryGroups.length > 0 ? (
                <div className="space-y-6 sm:space-y-7">
                  {filteredCategoryGroups.map((group, index) => (
                    <div key={group.id} className="space-y-6 sm:space-y-7">
                      <MentorCategoryScrollRow
                        id={group.id}
                        title={group.title}
                        subtitle={group.subtitle}
                        icon={group.icon}
                        mentors={group.mentors}
                      />
                      {index < filteredCategoryGroups.length - 1 && (
                        <div className="h-[1px] bg-gradient-to-r from-transparent via-blue-200/60 to-transparent" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-12 border border-slate-200/80 shadow-xs text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-[#EAF2FF] text-[#0755E8] flex items-center justify-center mx-auto mb-2">
                    <Users size={24} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">No interview experts found</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    We couldn't find any interview experts matching your search or filters. Try resetting to explore all experts.
                  </p>
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#073AA3] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    Show All Interview Experts
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sticky & Independently Scrollable Filter Sidebar (Desktop xl+ screens) */}
        <aside
          aria-label="Filters Panel"
          className="hidden xl:block w-[250px] shrink-0 sticky top-[76px] self-start max-h-[calc(100vh-86px)] overflow-y-auto overflow-x-hidden custom-scrollbar overscroll-contain space-y-4 pr-1 pb-8"
        >
          {renderFilterPanel()}

          {/* Finding the right expert - 3 step guide (matching mockup) */}
          <div className="sidebar-main-card relative rounded-[24px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-4 space-y-2.5 text-left overflow-hidden shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-100/80 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
                <Sparkles size={13} />
              </div>
              <span className="text-xs font-bold text-slate-900">Finding the right expert</span>
            </div>

            <div className="space-y-2 text-[11px] text-slate-600">
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-[#0755E8] text-[9.5px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <p className="leading-snug">Pick the track that matches your target role</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-[#0755E8] text-[9.5px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <p className="leading-snug">Check ratings and companies they've worked at</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-[#0755E8] text-[9.5px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <p className="leading-snug">Book a slot that fits — reschedule anytime</p>
              </div>
            </div>
          </div>

          {/* Mockeefy Pro Promotional Card (matching mockup) */}
          <div className="relative rounded-[24px] overflow-hidden bg-gradient-to-br from-[#0755E8] to-[#043394] p-4 text-white shadow-xs space-y-2.5">
            <div className="flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="text-xs font-bold tracking-tight">Get 3 mock interviews every month</span>
            </div>
            <p className="text-[11px] text-blue-100/90 leading-normal">
              Save up to 40% with Mockeefy Pro subscription plans.
            </p>
            <button
              type="button"
              onClick={() => navigate("/plans")}
              className="w-full py-1.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-[#0755E8] font-bold text-xs transition-all shadow-xs cursor-pointer text-center"
            >
              See plans
            </button>
          </div>
        </aside>
      </div>

      {/* Mobile Filter Drawer Modal */}
      {isMobileFilterOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filter Interview Experts"
          className="xl:hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsMobileFilterOpen(false)}
        >
          <div
            className="w-full max-w-md max-h-[85vh] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-900">Filter Interview Experts</span>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-7 h-7 rounded-full bg-rose-100 hover:bg-rose-200 active:bg-rose-300 text-rose-600 hover:text-rose-800 border border-rose-200/80 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                aria-label="Close filters"
              >
                <X size={15} className="stroke-[2.5]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">{renderFilterPanel()}</div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={handleResetFilters}
                className="text-xs font-semibold text-slate-600 hover:underline"
              >
                Reset All
              </button>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#073AA3] text-white text-xs font-semibold shadow-xs"
              >
                Apply ({filteredMentors.length} Interview Experts)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-resume booking modal when redirected back after login/register */}
      {activeResumeBookingMentor && (
        <BookingModal
          isOpen={true}
          onClose={() => {
            setActiveResumeBookingMentor(null);
            setActiveResumePendingBooking(null);
            clearPendingBooking();
          }}
          expertId={String(activeResumeBookingMentor.id || (activeResumeBookingMentor as any).rawExpert?._id || (activeResumeBookingMentor as any).rawExpert?.userId)}
          initialProfile={activeResumeBookingMentor}
          initialPendingBooking={activeResumePendingBooking}
        />
      )}
    </div>
  );
}
