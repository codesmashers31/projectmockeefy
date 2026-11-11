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
import { useSearchParams, useLocation } from "react-router-dom";
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
    <div id={`track-${id}`} className="space-y-2.5 scroll-mt-24 group/section">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-xl bg-[#EAF2FF] text-[#0755E8] flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[15px] sm:text-[17px] font-bold text-slate-900 tracking-tight leading-snug m-0 truncate">
                {title}
              </h3>
              <span className="text-[10px] sm:text-[10.5px] font-bold text-[#0755E8] bg-[#EAF2FF] px-2 py-0.5 rounded-full shrink-0">
                {mentors.length}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100/90 border border-slate-200/80 text-[10.5px] font-bold text-slate-600 select-none shadow-2xs">
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
            className="w-7.5 h-7.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-25 disabled:hover:bg-white text-slate-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs disabled:cursor-not-allowed"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={() => handleScroll("right")}
            disabled={!canScrollRight}
            aria-label={`Next ${title}`}
            className="w-7.5 h-7.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-25 disabled:hover:bg-white text-slate-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs disabled:cursor-not-allowed"
          >
            <ChevronRight size={15} />
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
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get("q") || searchParams.get("search") || "";
  const [searchQuery, setSearchQuery] = useState(initialQ);
  const deferredSearch = useDeferredValue(searchQuery);

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
    staleTime: 30 * 1000,
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

    return expertsData.map((expert: any) => {
      const cat =
        expert.personalInformation?.category ||
        expert.category ||
        expert.professionalDetails?.industry ||
        "Software Engineering";

      const skills = (() => {
        if (Array.isArray(expert.skillsAndExpertise?.tools) && expert.skillsAndExpertise.tools.length) {
          return expert.skillsAndExpertise.tools;
        }
        if (Array.isArray(expert.expertSkills) && expert.expertSkills.length) {
          return expert.expertSkills.map((s: any) => (typeof s === "string" ? s : s.skillName)).filter(Boolean);
        }
        if (Array.isArray(expert.skills) && expert.skills.length) {
          return expert.skills;
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
  }, [expertsData]);

  // Scroll to target expert card if navigated back from booking
  useEffect(() => {
    const state = location.state as any;
    const targetExpertId = state?.scrollToExpertId;
    const targetExpertName = state?.scrollToExpertName;

    if (!targetExpertId && !targetExpertName) return;
    if (isLoading) return;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const el = (targetExpertId ? document.getElementById(`expert-card-${targetExpertId}`) : null) ||
        (targetExpertName ? document.querySelector(`[data-expert-name="${targetExpertName}"]`) : null);

      if (el) {
        clearInterval(interval);
        // Smoothly bring the card into view centered vertically
        el.scrollIntoView({ behavior: "smooth", block: "center" });

        // If card is inside a horizontal scroll container, also scroll container
        const horizontalParent = el.closest(".overflow-x-auto") as HTMLElement | null;
        if (horizontalParent) {
          const cardLeft = (el as HTMLElement).offsetLeft;
          horizontalParent.scrollTo({
            left: Math.max(0, cardLeft - 20),
            behavior: "smooth",
          });
        }

        // Clean up navigation state so it doesn't linger
        window.history.replaceState({}, document.title);
      } else if (attempts >= 15) {
        clearInterval(interval);
        window.history.replaceState({}, document.title);
        // Fallback: scroll to all experts container if specific card not found
        const container = document.getElementById("all-experts-categories");
        if (container) {
          container.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [location.state, isLoading]);

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
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-[#0755E8]" />
              <h2 className="text-sm font-bold text-slate-900 m-0">Filters</h2>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#EAF2FF] text-[#0755E8] text-[10.5px] font-bold">
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
              <span className="text-[11px] font-extrabold text-[#0755E8] bg-[#EAF2FF] px-2.5 py-0.5 rounded-full whitespace-nowrap">
                {allMentors.length} Interview Experts
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
                <div className={`space-y-1 ${isTrackExpanded ? "max-h-72 overflow-y-auto pr-1" : ""}`}>
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
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all duration-150 cursor-pointer text-left ${
                          isSelected
                            ? "bg-[#0755E8] text-white font-bold shadow-xs"
                            : "text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-medium"
                        }`}
                      >
                        <span className="truncate pr-1">{cat === "All" ? "All Tracks" : cat}</span>
                        <span
                          className={`text-[11px] px-1.5 py-0.2 rounded-full shrink-0 ${
                            isSelected
                              ? "bg-white/20 text-white font-bold"
                              : "text-slate-400 bg-slate-100"
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
                <div className={`space-y-1 ${isExpExpanded ? "max-h-72 overflow-y-auto pr-1" : ""}`}>
                  {visibleExpOptions.map((item) => {
                    const checked = selectedExpRanges.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        onClick={() => toggleExpRange(item.id)}
                        className="flex items-center gap-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer select-none py-1"
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                            checked
                              ? "bg-[#0755E8] border-[#0755E8] text-white"
                              : "border-slate-300 bg-white"
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
                <div className={`space-y-1 ${isPriceExpanded ? "max-h-72 overflow-y-auto pr-1" : ""}`}>
                  {visiblePriceOptions.map((item) => {
                    const checked = selectedPriceRanges.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        onClick={() => togglePriceRange(item.id)}
                        className="flex items-center gap-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer select-none py-1"
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                            checked
                              ? "bg-[#0755E8] border-[#0755E8] text-white"
                              : "border-slate-300 bg-white"
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

      {/* 4. Availability */}
      {(() => {
        const availabilityOptions = [
          { id: "All", label: "Anytime" },
          { id: "Today", label: "Available Today" },
          { id: "Week", label: "This Week" },
        ];
        const isAvailExpanded = !!showAllSubheadings.availability;
        const visibleAvailOptions = isAvailExpanded || availabilityOptions.length <= INITIAL_FILTER_ITEMS_LIMIT
          ? availabilityOptions
          : availabilityOptions.slice(0, INITIAL_FILTER_ITEMS_LIMIT);

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
              <div className="space-y-1">
                <div className={`space-y-1 ${isAvailExpanded ? "max-h-72 overflow-y-auto pr-1" : ""}`}>
                  {visibleAvailOptions.map((opt) => (
                    <label
                      key={opt.id}
                      onClick={() => setAvailabilityFilter(opt.id)}
                      className="flex items-center gap-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer select-none py-1"
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                          availabilityFilter === opt.id
                            ? "border-[#0755E8]"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {availabilityFilter === opt.id && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#0755E8]" />
                        )}
                      </div>
                      <span className="flex-1 font-medium">{opt.label}</span>
                    </label>
                  ))}
                </div>

                {availabilityOptions.length > INITIAL_FILTER_ITEMS_LIMIT && (
                  <button
                    type="button"
                    onClick={() => toggleShowMore("availability")}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 mt-0.5 text-xs font-bold text-[#0755E8] hover:text-[#0645C7] hover:bg-blue-50/70 rounded-xl cursor-pointer transition-all"
                  >
                    <span>{isAvailExpanded ? "View Less" : "View More"}</span>
                    {isAvailExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                )}
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
          {/* Header Controls: Result Count & Sort Dropdown in the same line */}
          <div className="space-y-2 px-1 sm:px-1.5">
            {/* Same Line Header Row: Title, Count & Compact Sort Control */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
              {/* LEFT: Title & Verified Count */}
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 m-0 tracking-tight whitespace-nowrap">
                  {selectedCategory !== "All"
                    ? `Available Interview Experts — ${selectedCategory}`
                    : "Available Interview Experts"}
                </h1>
                <span className="text-xs sm:text-sm text-slate-500 font-medium whitespace-nowrap">
                  (<span className="text-[#0755E8] font-bold">{filteredMentors.length}</span> verified {filteredMentors.length === 1 ? "interview expert" : "interview experts"})
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
                      className={`inline-flex items-center gap-2 bg-white border text-xs font-semibold rounded-full py-1.5 pl-3 pr-2.5 shadow-2xs transition-all cursor-pointer select-none ${
                        isSortOpen
                          ? "border-[#0755E8] text-[#0755E8] ring-2 ring-[#0755E8]/15"
                          : "border-slate-200/90 text-slate-800 hover:border-slate-300 hover:bg-slate-50/50"
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
              {isLoading ? (
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
                <div className="space-y-7">
                  {filteredCategoryGroups.map((group) => (
                    <MentorCategoryScrollRow
                      key={group.id}
                      id={group.id}
                      title={group.title}
                      subtitle={group.subtitle}
                      icon={group.icon}
                      mentors={group.mentors}
                    />
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

        {/* RIGHT COLUMN: Sticky Filter Sidebar (Desktop xl+ screens) */}
        <aside aria-label="Filters Panel" className="hidden xl:block w-[250px] shrink-0 sticky top-[80px] self-start space-y-4">
          {renderFilterPanel()}

          {/* Tips Card */}
          <div className="sidebar-main-card relative rounded-[24px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-4 space-y-2 text-left overflow-hidden">
            {/* Decorative ambient blue lighting */}
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-blue-300/35 blur-xl pointer-events-none" />
            <div className="relative z-10 space-y-2">
              <div className="flex items-center gap-1.5 text-[#0755E8]">
                <Sparkles size={14} />
                <span className="text-xs font-bold text-slate-900">Finding the Right Interview Expert</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Choose an interview expert working in your target industry or company to get the most accurate mock interview questions.
              </p>
            </div>
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
    </div>
  );
}
