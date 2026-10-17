import React, { useMemo, useState, useEffect, useRef, useDeferredValue } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "../lib/axios";
import { MentorJobCard, MentorCardSkeleton, MentorProfile } from "../components/MentorJobCard";
import { getProfileImageUrl } from "../lib/imageUtils";
import {
  calculateProfessionalExperience,
  getCurrentCompany,
  getJobTitle,
} from "../lib/expertUtils";
import { useSearchParams } from "react-router-dom";
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
} from "lucide-react";

const ITEMS_PER_PAGE = 8;

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7.5 h-7.5 rounded-lg bg-[#EAF2FF] text-[#0755E8] flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[16px] sm:text-[17px] font-bold text-slate-900 tracking-tight leading-snug m-0">
                {title}
              </h3>
              <span className="text-[10.5px] font-bold text-[#0755E8] bg-[#EAF2FF] px-2 py-0.2 rounded-full">
                {mentors.length}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100/90 border border-slate-200/80 text-[10.5px] font-bold text-slate-600 select-none shadow-2xs">
                <Hand size={11} className="text-[#0755E8]" />
                <span>Drag to scroll</span>
              </span>
            </div>
            <p className="text-[12px] sm:text-[12.5px] text-slate-500 mt-0.5 leading-normal truncate">
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
            className="w-7 h-7 rounded-full border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-25 disabled:hover:bg-white text-slate-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs disabled:cursor-not-allowed"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={() => handleScroll("right")}
            disabled={!canScrollRight}
            aria-label={`Next ${title}`}
            className="w-7 h-7 rounded-full border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-25 disabled:hover:bg-white text-slate-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs disabled:cursor-not-allowed"
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
          className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto py-1.5 px-0.5 no-scrollbar select-none cursor-grab active:cursor-grabbing"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {mentors.map((mentor) => (
            <div
              key={mentor.id}
              className="w-[82%] sm:w-[calc(50%-8px)] shrink-0 flex flex-col h-auto"
            >
              <MentorJobCard mentor={mentor} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function FindMentor() {
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
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedExpRanges, setSelectedExpRanges] = useState<string[]>([]);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([]);
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState("recommended");
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

  // Fetch verified active experts from API
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
        totalSessions: expert.metrics?.totalSessions || 15,
        category: cat,
        bio: expert.personalInformation?.bio || "",
      };
    });
  }, [expertsData]);

  // Unique Categories and Companies
  const categories = useMemo(() => {
    const set = new Set<string>();
    allMentors.forEach((m) => {
      if (m.category?.trim()) set.add(m.category.trim());
    });
    return ["All", ...Array.from(set).sort()];
  }, [allMentors]);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    allMentors.forEach((m) => {
      const cat = m.category?.trim();
      if (cat) {
        map[cat] = (map[cat] || 0) + 1;
      }
    });
    return map;
  }, [allMentors]);

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
    setSelectedCompanies([]);
    setSelectedExpRanges([]);
    setSelectedPriceRanges([]);
    setAvailabilityFilter("All");
    setSortBy("recommended");
    setCurrentPage(1);
  };

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

    // 1. Category filter (supports exact matches and track groups)
    if (selectedCategory !== "All") {
      const selectedCatLower = selectedCategory.toLowerCase();
      list = list.filter((m) => {
        const cat = (m.category || "").toLowerCase();
        if (cat === selectedCatLower) return true;
        if (selectedCatLower.includes("software") || selectedCatLower.includes("web")) {
          return (
            cat.includes("software") ||
            cat.includes("web") ||
            cat.includes("mobile") ||
            cat.includes("mern") ||
            cat.includes("it") ||
            cat.includes("qa") ||
            cat.includes("testing")
          );
        }
        if (selectedCatLower.includes("cloud") || selectedCatLower.includes("devops")) {
          return (
            cat.includes("cloud") ||
            cat.includes("devops") ||
            cat.includes("cyber") ||
            cat.includes("security") ||
            cat.includes("database") ||
            cat.includes("system design")
          );
        }
        if (selectedCatLower.includes("ai") || selectedCatLower.includes("data")) {
          return (
            cat.includes("ai") ||
            cat.includes("data") ||
            cat.includes("ml") ||
            cat.includes("learning")
          );
        }
        if (selectedCatLower.includes("product") || selectedCatLower.includes("design")) {
          return (
            cat.includes("design") ||
            cat.includes("agile") ||
            cat.includes("project") ||
            cat.includes("business")
          );
        }
        if (selectedCatLower.includes("hr") || selectedCatLower.includes("behavioral")) {
          return (
            cat.includes("hr") ||
            cat.includes("human resources") ||
            cat.includes("recruit")
          );
        }
        return cat.includes(selectedCatLower) || selectedCatLower.includes(cat);
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

    // 6. Availability Filter
    if (availabilityFilter === "Today") {
      list = list.filter((m) => m.activeTime?.toLowerCase().includes("today"));
    } else if (availabilityFilter === "Week") {
      list = list.filter(
        (m) =>
          m.activeTime?.toLowerCase().includes("today") ||
          m.activeTime?.toLowerCase().includes("week")
      );
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

  // Group filtered mentors into Curated Carousel Tracks
  const filteredCategoryGroups = useMemo(() => {
    const definitions = [
      {
        id: "software-web",
        title: "Software & Web Development",
        subtitle: "Frontend, backend, mobile engineers and system architects.",
        icon: <Code2 size={16} />,
        match: (cat: string) => {
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
        match: (cat: string) => {
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
        match: (cat: string) => {
          const c = cat.toLowerCase().trim();
          return c.includes("ai") || c.includes("data") || c.includes("ml") || c.includes("learning");
        },
      },
      {
        id: "product-design",
        title: "Product, Design & Management",
        subtitle: "UI/UX product designers, agile project leads, and business strategists.",
        icon: <Palette size={16} />,
        match: (cat: string) => {
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
        match: (cat: string) => {
          const c = cat.toLowerCase().trim();
          return c.includes("hr") || c.includes("human resources") || c.includes("recruit");
        },
      },
    ];

    const groupedMentors = new Set<string>();
    const groups = definitions.map((def) => {
      const mentorsInGroup = filteredMentors.filter((m) => def.match(m.category || ""));
      mentorsInGroup.forEach((m) => groupedMentors.add(m.id));
      return {
        ...def,
        mentors: mentorsInGroup,
      };
    });

    const otherMentors = filteredMentors.filter((m) => !groupedMentors.has(m.id));
    if (otherMentors.length > 0) {
      groups.push({
        id: "other-experts",
        title: selectedCategory !== "All" ? selectedCategory : "Specialized Industry Mentors",
        subtitle: "Industry leaders and domain specialists across diverse tech domains.",
        icon: <Sparkles size={16} />,
        match: () => true,
        mentors: otherMentors,
      });
    }

    return groups.filter((g) => g.mentors.length > 0);
  }, [filteredMentors, selectedCategory]);

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
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 space-y-4 text-left">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#0755E8]" />
          <h2 className="text-sm font-bold text-slate-900 m-0">Filters</h2>
          {activeFilterCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-[#EAF2FF] text-[#0755E8] text-[10.5px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
            >
              Clear all
            </button>
          )}
          <span className="text-[11px] font-extrabold text-[#0755E8] bg-[#EAF2FF] px-2 py-0.5 rounded-full">
            {allMentors.length} Mentors
          </span>
        </div>
      </div>

      {/* 1. Track Filter (from image) */}
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
          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              const count = cat === "All" ? allMentors.length : categoryCounts[cat] || 0;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    const newCat = cat;
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
        )}
      </div>

      {/* 2. Experience */}
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
            {[
              { id: "0-2", label: "0-2 Yrs", count: expCounts["0-2"] },
              { id: "3-5", label: "3-5 Yrs", count: expCounts["3-5"] },
              { id: "6-10", label: "6-10 Yrs", count: expCounts["6-10"] },
              { id: "10+", label: "10+ Yrs", count: expCounts["10+"] },
            ].map((item) => {
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
        )}
      </div>

      {/* 3. Session Price */}
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
            {[
              { id: "under-1000", label: "Under ₹1,000", count: priceCounts["under-1000"] },
              { id: "1000-2000", label: "₹1,000 - ₹2,000", count: priceCounts["1000-2000"] },
              { id: "2000+", label: "₹2,000+", count: priceCounts["2000+"] },
            ].map((item) => {
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
        )}
      </div>

      {/* 4. Availability */}
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
            {[
              { id: "All", label: "Anytime" },
              { id: "Today", label: "Available Today" },
              { id: "Week", label: "This Week" },
            ].map((opt) => (
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
        )}
      </div>
    </div>
  );

  return (
    <div ref={listTopRef} className="w-full font-sans text-left animate-in fade-in duration-200">
      <div className="flex items-start gap-5 lg:gap-6 w-full">
        {/* CENTER COLUMN: All Experts Content */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Prominent Search Bar */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by mentor name, role, company (Google, Amazon), or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-white hover:border-slate-300 focus:bg-white border border-slate-200/90 focus:border-[#0755E8] rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#93B8FF]/20 shadow-xs transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* ======================================================== */}
          {/* SECTION 3: AVAILABLE MENTORS DIRECTORY & CARDS GRID      */}
          {/* ======================================================== */}
          <div className="space-y-4">
            {/* Header Controls: Result Count & Sort Dropdown */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 m-0">
                  Available Mentors
                </h2>
                <span className="text-xs text-slate-500 font-medium">
                  (<span className="text-[#0755E8] font-bold">{filteredMentors.length}</span> verified {filteredMentors.length === 1 ? "expert" : "experts"} across <span className="text-slate-900 font-bold">{filteredCategoryGroups.length}</span> tracks)
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Mobile Filter Button */}
                <button
                  onClick={() => setIsMobileFilterOpen(true)}
                  className="xl:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  <SlidersHorizontal size={13} />
                  <span>Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-[#0755E8] text-white text-[10px] font-bold flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* Sort Control */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl py-1.5 pl-3 pr-8 shadow-xs hover:border-slate-300 focus:outline-none focus:border-[#0755E8] cursor-pointer"
                  >
                    <option value="recommended">Sort: Relevance</option>
                    <option value="rating">Sort: Rating (High to Low)</option>
                    <option value="experience">Sort: Experience (High to Low)</option>
                    <option value="price-low">Sort: Price (Low to High)</option>
                    <option value="price-high">Sort: Price (High to Low)</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Active Filter Badges */}
            {activeFilterCount > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-xs text-slate-400 font-medium">Filtered by:</span>

                {selectedCategory !== "All" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EAF2FF] border border-[#93B8FF] text-xs font-bold text-[#0755E8]">
                    {selectedCategory}
                    <button onClick={() => setSelectedCategory("All")} className="hover:text-red-500">
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
                    <button onClick={() => toggleCompany(c)} className="hover:text-red-500">
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
                    <button onClick={() => toggleExpRange(exp)} className="hover:text-red-500">
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
                    <button onClick={() => togglePriceRange(pr)} className="hover:text-red-500">
                      <X size={12} />
                    </button>
                  </span>
                ))}

                {availabilityFilter !== "All" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
                    {availabilityFilter}
                    <button onClick={() => setAvailabilityFilter("All")} className="hover:text-red-500">
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

            {/* Mentors Grid / Empty / Error States */}
            {isLoading ? (
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-3">
                    <div className="h-6 w-48 bg-slate-100 rounded-lg animate-pulse" />
                    <div className="flex gap-4 overflow-hidden">
                      {[1, 2].map((n) => (
                        <div key={n} className="w-[82%] sm:w-[calc(50%-8px)] shrink-0">
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
                <h3 className="text-sm font-bold text-slate-900">Failed to load mentors</h3>
                <p className="text-xs text-slate-500">
                  {error instanceof Error ? error.message : "Error connecting to mentor API."}
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
                <h3 className="text-base font-bold text-slate-900">No mentors found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  We couldn't find any mentors matching your search or filters. Try resetting to explore all experts.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#073AA3] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Show All Mentors
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Sticky Filter Sidebar (Desktop xl+ screens) */}
        <aside aria-label="Filters Panel" className="hidden xl:block w-[250px] shrink-0 sticky top-[80px] self-start space-y-4">
          {renderFilterPanel()}

          {/* Tips Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-2 text-left">
            <div className="flex items-center gap-1.5 text-[#0755E8]">
              <Sparkles size={14} />
              <span className="text-xs font-bold text-slate-900">Finding the Right Mentor</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Choose a mentor working in your target industry or company to get the most accurate mock interview questions.
            </p>
          </div>
        </aside>
      </div>

      {/* Mobile Filter Drawer Modal */}
      {isMobileFilterOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filter Mentors"
          className="xl:hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsMobileFilterOpen(false)}
        >
          <div
            className="w-full max-w-md max-h-[85vh] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-900">Filter Mentors</span>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                aria-label="Close filters"
              >
                <X size={18} />
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
                Apply ({filteredMentors.length} Mentors)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
