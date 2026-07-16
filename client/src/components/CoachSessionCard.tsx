import React, { useMemo, useRef, useState } from "react";
import { MentorJobCard, MentorProfile } from "./MentorJobCard";
import { CategorySection } from "./CategorySection";
import { AlertCircle, Search, X, ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import axios from '../lib/axios';
import { getProfileImageUrl } from "../lib/imageUtils";
import { useQuery } from "@tanstack/react-query";
import { calculateAge, calculateProfessionalExperience, getCurrentCompany, getJobTitle } from "../lib/expertUtils";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { ExpertsCarousel } from "./ExpertsCarousel";

const CoachSessionCard = React.memo(function CoachSessionCard() {
  // Query experts
  const {
    data: expertsData,
    isLoading: isExpertsLoading,
    isError: isExpertsError,
    error: expertsError
  } = useQuery({
    queryKey: ["experts"],
    queryFn: async () => {
      const res = await axios.get("/api/expert/verified");
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Query categories
  const {
    data: categoriesData,
    isLoading: isCategoriesLoading
  } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await axios.get("/api/categories");
      return res.data;
    },
    staleTime: 1000 * 60 * 60,
  });

  // Parse verified experts profiles
  const allProfiles = useMemo<MentorProfile[]>(() => {
    if (isExpertsLoading && !expertsData) return [];
    let rawExperts: any[] = [];
    if (expertsData?.success && Array.isArray(expertsData?.data)) {
      rawExperts = expertsData.data;
    } else if (Array.isArray(expertsData)) {
      rawExperts = expertsData;
    }

    return rawExperts.map((expert: any) => {
      const cat = expert.personalInformation?.category || "IT";
      let exp = "";
      if (expert.professionalDetails?.totalExperience) {
        exp = expert.professionalDetails.totalExperience === 1 ? "1 year" : `${expert.professionalDetails.totalExperience} years`;
      } else {
        exp = calculateProfessionalExperience(expert.professionalDetails) || (calculateAge(expert.personalInformation?.dob) - 22 > 0 ? `${calculateAge(expert.personalInformation?.dob) - 22}+ years` : "Fresher");
      }

      const skills = (() => {
        if (expert.expertSkills && expert.expertSkills.length > 0) {
          return expert.expertSkills
            .filter((s: any) => s.isEnabled && s.skillName)
            .map((s: any) => s.skillName);
        }
        return [...(expert.skillsAndExpertise?.domains || []), ...(expert.skillsAndExpertise?.tools || [])];
      })();

      return {
        id: expert._id || expert.userId,
        expertID: expert._id || expert.userId,
        name: expert.personalInformation?.userName || "Expert",
        role: getJobTitle(expert.professionalDetails, cat),
        company: getCurrentCompany(expert.professionalDetails, cat),
        location: expert.personalInformation?.city || "Online",
        rating: expert.metrics?.avgRating || 0,
        reviews: expert.metrics?.totalReviews || 0,
        avatar: getProfileImageUrl(expert.profileImage),
        isVerified: expert.status === "Active" || expert.status === "verified",
        price: expert.price ? String(expert.price) : "799",
        minPrice: expert.minPrice,
        maxPrice: expert.maxPrice,
        minOriginalPrice: expert.minOriginalPrice,
        maxOriginalPrice: expert.maxOriginalPrice,
        skills: skills,
        experience: exp,
        activeTime: expert.availability?.nextAvailable || "Available Today",
        totalSessions: expert.metrics?.totalSessions || 0,
        category: cat,
        bio: expert.personalInformation?.bio || "",
        level: expert.professionalDetails?.level || "Intermediate",
        allTags: [cat, ...skills, expert.professionalDetails?.industry].filter(Boolean).map(s => s.toString())
      } as MentorProfile & { category: string, allTags: string[], level?: string, minPrice?: number, maxPrice?: number, minOriginalPrice?: number, maxOriginalPrice?: number };
    });
  }, [expertsData, isExpertsLoading]);

  // Extract unique skills from database profiles dynamically
  const uniqueSkills = useMemo(() => {
    const set = new Set<string>();
    allProfiles.forEach((p) => {
      if (Array.isArray(p.skills)) {
        p.skills.forEach(s => { if (s?.trim()) set.add(s.trim()); });
      }
    });
    return Array.from(set).sort();
  }, [allProfiles]);

  // Extract categories dynamically
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    allProfiles.forEach((p) => {
      if (p.category && p.category.trim() !== "") {
        set.add(p.category.trim());
      }
    });
    const categoriesArray = Array.from(set).sort();
    const hasIT = categoriesArray.includes("IT");
    if (hasIT) {
      const filtered = categoriesArray.filter(cat => cat !== "IT");
      return ["IT", ...filtered];
    }
    return categoriesArray;
  }, [allProfiles]);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillSearchQuery, setSkillSearchQuery] = useState("");
  const [maxExperience, setMaxExperience] = useState<number>(15);
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("All"); // "All", "Today", "Week"
  const [sortOption, setSortOption] = useState<string>("recommended");
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Additional advanced filters: company, expert level, max price
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [maxPriceFilter, setMaxPriceFilter] = useState<number | null>(null);

  const listingSectionRef = useRef<HTMLDivElement>(null);

  // Active filter count logic
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategories.length > 0) count++;
    if (selectedSkills.length > 0) count++;
    if (maxExperience < 15) count++;
    if (availabilityFilter !== "All") count++;
    if (sortOption !== "recommended") count++;
    if (selectedCompanies.length > 0) count++;
    if (selectedLevels.length > 0) count++;
    if (maxPriceFilter !== null) count++;
    return count;
  }, [selectedCategories, selectedSkills, maxExperience, availabilityFilter, sortOption, selectedCompanies, selectedLevels, maxPriceFilter]);

  const isFilteringActive = useMemo(() => {
    return searchQuery.trim() !== "" || activeFilterCount > 0;
  }, [searchQuery, activeFilterCount]);

  // Quick Dropdown Toolbar states
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Close toolbar dropdowns on click outside
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".relative")) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Clear all filters
  const handleReset = () => {
    setSearchQuery("");
    setSelectedCategories([]);
    setSelectedSkills([]);
    setSkillSearchQuery("");
    setMaxExperience(15);
    setAvailabilityFilter("All");
    setSortOption("recommended");
    setSelectedCompanies([]);
    setSelectedLevels([]);
    setMaxPriceFilter(null);
  };

  // Toggle Category Selection
  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  // Toggle Skill Selection
  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  // Toggle Company Selection
  const toggleCompany = (company: string) => {
    setSelectedCompanies(prev =>
      prev.includes(company) ? prev.filter(c => c !== company) : [...prev, company]
    );
  };

  // Toggle Expert Level Selection
  const toggleLevel = (level: string) => {
    setSelectedLevels(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  // Filtered skills list based on nested skills search
  const filteredSkillsList = useMemo(() => {
    const query = skillSearchQuery.trim().toLowerCase();
    if (!query) return uniqueSkills;
    return uniqueSkills.filter(s => s.toLowerCase().includes(query));
  }, [uniqueSkills, skillSearchQuery]);

  // Filtered experts selector logic
  const filteredProfiles = useMemo(() => {
    let list = [...allProfiles];

    // 1. Text Search query (name, role, company, skills)
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const name = (p.name || "").toLowerCase();
        const role = (p.role || "").toLowerCase();
        const company = (p.company || "").toLowerCase();
        const skills = (p.skills || []).join(" ").toLowerCase();
        return name.includes(q) || role.includes(q) || company.includes(q) || skills.includes(q);
      });
    }

    // 2. Categories checkbox filters
    if (selectedCategories.length > 0) {
      list = list.filter(p => p.category && selectedCategories.includes(p.category));
    }

    // 3. Skills checkbox filters
    if (selectedSkills.length > 0) {
      list = list.filter(p => p.skills && p.skills.some(s => selectedSkills.includes(s)));
    }

    // 4. Experience Slider filter
    list = list.filter(p => {
      const match = (p.experience || "").match(/\d+/);
      const expYears = match ? parseInt(match[0], 10) : 0;
      return expYears <= maxExperience;
    });

    // 5. Availability filter
    if (availabilityFilter === "Today") {
      list = list.filter(p => p.activeTime?.toLowerCase().includes("today"));
    } else if (availabilityFilter === "Week") {
      list = list.filter(p => p.activeTime?.toLowerCase().includes("today") || p.activeTime?.toLowerCase().includes("week"));
    }

    // 5b. Company filter
    if (selectedCompanies.length > 0) {
      list = list.filter(p => p.company && selectedCompanies.includes(p.company));
    }

    // 5c. Expert Level filter
    if (selectedLevels.length > 0) {
      list = list.filter(p => p.level && selectedLevels.includes(p.level));
    }

    // 5d. Max Price filter
    if (maxPriceFilter !== null) {
      list = list.filter(p => {
        const effectivePrice = p.minPrice ?? parseInt((p.price || "0").toString().replace(/[^\d]/g, "")) ?? 0;
        return effectivePrice <= maxPriceFilter;
      });
    }

    // 6. Sorting logic
    if (sortOption === "price-asc") {
      list.sort((a, b) => parseInt(a.price || "0") - parseInt(b.price || "0"));
    } else if (sortOption === "price-desc") {
      list.sort((a, b) => parseInt(b.price || "0") - parseInt(a.price || "0"));
    } else if (sortOption === "rating-desc") {
      list.sort((a, b) => b.rating - a.rating);
    }

    return list;
  }, [allProfiles, searchQuery, selectedCategories, selectedSkills, maxExperience, availabilityFilter, sortOption, selectedCompanies, selectedLevels, maxPriceFilter]);

  // Group experts by category
  const groupedByCategory = useMemo(() => {
    const groups: { [key: string]: MentorProfile[] } = {};
    filteredProfiles.forEach((profile) => {
      const cat = profile.category || "IT";
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(profile);
    });
    return groups;
  }, [filteredProfiles]);

  const activeCategoriesWithData = useMemo(() => {
    return uniqueCategories.filter(cat => groupedByCategory[cat] && groupedByCategory[cat].length > 0);
  }, [uniqueCategories, groupedByCategory]);

  // Unique companies present in the verified experts dataset (for the Company filter)
  const uniqueCompanies = useMemo(() => {
    const set = new Set<string>();
    allProfiles.forEach(p => { if (p.company && p.company.trim()) set.add(p.company.trim()); });
    return Array.from(set).sort();
  }, [allProfiles]);

  // Unique expert levels present in the dataset (for the Expert Level filter)
  const uniqueLevels = useMemo(() => {
    const set = new Set<string>();
    allProfiles.forEach(p => { if (p.level && p.level.trim()) set.add(p.level.trim()); });
    return Array.from(set).sort();
  }, [allProfiles]);

  // Price bounds derived from live data, used to bound the Max Price slider
  const priceBounds = useMemo(() => {
    const prices = allProfiles
      .map(p => p.minPrice ?? parseInt((p.price || "0").toString().replace(/[^\d]/g, ""), 10))
      .filter(n => typeof n === "number" && !isNaN(n) && n > 0);
    if (prices.length === 0) return { min: 0, max: 5000 };
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [allProfiles]);

  // Featured Experts rail — highly rated verified experts, derived client-side (no extra API calls)
  const featuredProfiles = useMemo(() => {
    const highlyRated = allProfiles.filter(p => p.isVerified && (p.rating || 0) >= 4.5);
    return (highlyRated.length >= 4 ? highlyRated : allProfiles).slice(0, 10);
  }, [allProfiles]);

  const toggleDropdown = (dropdown: string) => {
    setActiveDropdown(prev => prev === dropdown ? null : dropdown);
  };

  return (
    <>
    <div ref={listingSectionRef} className="w-full scroll-mt-24">

      {/* Main column: search bar + results */}
      <div className="w-full bg-white border border-slate-200/80 rounded-[24px] shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] flex flex-col">

      {/* Search Bar */}
      <div className="shrink-0 bg-white z-30 px-6 md:px-8 py-3 border-b border-slate-200/50">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search experts by name, role, company, skills..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#4F46E5] placeholder-slate-400 font-semibold"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            {activeFilterCount > 0 && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3.5 py-2.5 border border-red-100 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-200 transition-colors shadow-sm cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}

            <button
              onClick={() => setIsFilterModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm cursor-pointer ml-auto sm:ml-0"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#4F46E5]" />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#4F46E5] text-white text-[10px] font-black">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4 sm:p-5">
        <div className="w-full space-y-6">

        {/* Featured Experts carousel */}
        {!isFilteringActive && featuredProfiles.length > 0 && (
          <ExpertsCarousel title="Featured Experts" subtitle="Hand-picked, highly rated mentors" profiles={featuredProfiles} />
        )}

        {/* Promo banner */}
        {!isFilteringActive && (
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-[24px] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/40 blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <p className="text-sm font-bold text-gray-900">Get 3x more callbacks with Mockeefy Premium</p>
              <p className="text-xs text-gray-600 mt-1">Priority booking, unlimited mocks, and expert feedback for ₹159</p>
            </div>
            <button className="relative z-10 shrink-0 px-5 py-2.5 bg-gradient-to-r from-[#4F46E5] to-[#4338CA] hover:from-[#4338CA] hover:to-[#3730A3] text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 hover:shadow-lg transition-all">
              Upgrade now
            </button>
          </div>
        )}

        {/* Experts List Container */}
        <div>
          {isExpertsLoading || isCategoriesLoading ? (
            <div className="space-y-6">
              {[1, 2].map(i => (
                <div key={i} className="bg-white border border-slate-200/60 rounded-[24px] p-6 space-y-4 animate-pulse">
                  <div className="h-4 bg-slate-100 rounded w-48 mb-6"></div>
                  <div className="flex gap-4 overflow-hidden">
                    <div className="w-[300px] h-80 bg-slate-50 rounded-2xl shrink-0"></div>
                    <div className="w-[300px] h-80 bg-slate-50 rounded-2xl shrink-0"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : isExpertsError ? (
            <div className="text-center py-20 bg-rose-50/50 rounded-2xl border border-rose-100/50">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-4" />
              <h3 className="text-sm font-black text-rose-900 uppercase tracking-widest">Handshake Error</h3>
              <p className="text-[10px] text-rose-500 font-bold uppercase mt-1">{expertsError instanceof Error ? expertsError.message : "Failure Connecting"}</p>
            </div>
          ) : isFilteringActive ? (
            filteredProfiles.length === 0 ? (
              <div className="text-center py-16 bg-slate-50/50 rounded-[24px] border border-slate-200/50">
                <p className="text-sm font-bold text-slate-500">No experts matching your active filters.</p>
              </div>
            ) : (
              <div className="w-full space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">
                    Search Results ({filteredProfiles.length} experts found)
                  </h3>
                </div>
                {filteredProfiles.map((mentor) => (
                  <MentorJobCard key={mentor.id} mentor={mentor} />
                ))}
              </div>
            )
          ) : activeCategoriesWithData.length === 0 ? (
            <div className="text-center py-16 bg-slate-50/50 rounded-[24px] border border-slate-200/50">
              <p className="text-sm font-bold text-slate-500">No experts found.</p>
            </div>
          ) : (
            <div className="w-full space-y-4">
              {activeCategoriesWithData.map((cat) => (
                <CategorySection
                  key={cat}
                  title={cat}
                  profiles={groupedByCategory[cat]}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom Trust Signals Bar */}
        <div className="mt-4 bg-slate-50/60 border border-slate-100 rounded-3xl p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3.5 text-left">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 11 2 2 4-4" stroke="currentColor" strokeWidth="2.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">Verified Experts</p>
              <p className="text-xs text-slate-500 font-medium mt-1">100% Background Verified</p>
            </div>
          </div>
          <div className="flex items-center gap-3.5 text-left">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">Top Professionals</p>
              <p className="text-xs text-slate-500 font-medium mt-1">From FAANG & Top Companies</p>
            </div>
          </div>
          <div className="flex items-center gap-3.5 text-left">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">Trusted by 10K+ Users</p>
              <p className="text-xs text-slate-500 font-medium mt-1">Successful Career Transitions</p>
            </div>
          </div>
          <div className="flex items-center gap-3.5 text-left">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">Secure Sessions</p>
              <p className="text-xs text-slate-500 font-medium mt-1">Safe & Private 1:1 Sessions</p>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Advanced Filters Modal Overlay (mobile/tablet) */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-slate-100/50 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between p-6 border-b border-slate-100">
              <div className="text-left">
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Advanced Search Filters</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">Refine your search for the perfect mentor.</p>
              </div>
              <button 
                onClick={() => setIsFilterModalOpen(false)}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
              {/* 1. Sort Options */}
              <div className="space-y-2.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Sort By</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "recommended", label: "Recommended" },
                    { value: "rating-desc", label: "Top Rated" },
                    { value: "price-asc", label: "Price: Low to High" },
                    { value: "price-desc", label: "Price: High to Low" }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSortOption(opt.value)}
                      className={`px-4 py-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                        sortOption === opt.value
                          ? 'border-[#4F46E5] bg-indigo-50/50 text-[#4F46E5]'
                          : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Availability */}
              <div className="space-y-2.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Availability</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "All", label: "All Dates" },
                    { value: "Today", label: "Available Today" },
                    { value: "Week", label: "Available This Week" }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setAvailabilityFilter(opt.value)}
                      className={`px-3 py-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                        availabilityFilter === opt.value
                          ? 'border-[#4F46E5] bg-indigo-50/50 text-[#4F46E5]'
                          : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Experience */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Max Experience</label>
                  <span className="text-xs font-bold text-[#4F46E5] bg-indigo-50 px-2 py-0.5 rounded-md">
                    Up to {maxExperience} Years
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={15}
                  step={1}
                  value={maxExperience}
                  onChange={(e) => setMaxExperience(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#4F46E5]"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                  <span>1 Year</span>
                  <span>15+ Years</span>
                </div>
              </div>

              {/* 4. Categories */}
              <div className="space-y-2.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Categories</label>
                <div className="flex flex-wrap gap-2">
                  {uniqueCategories.map(cat => {
                    const isSelected = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#4F46E5] bg-indigo-50/50 text-[#4F46E5]'
                            : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Skills */}
              <div className="space-y-2.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Skills</label>
                <input
                  type="text"
                  placeholder="Search skills..."
                  value={skillSearchQuery}
                  onChange={(e) => setSkillSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-[#4F46E5] placeholder-slate-400 font-semibold"
                />
                <div className="max-h-36 overflow-y-auto space-y-2 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                  {filteredSkillsList.length > 0 ? (
                    filteredSkillsList.map(skill => {
                      const isSelected = selectedSkills.includes(skill);
                      return (
                        <label key={skill} className="flex items-center gap-2.5 cursor-pointer py-0.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSkill(skill)}
                            className="rounded border-slate-300 text-[#4F46E5] focus:ring-[#4F46E5] w-3.5 h-3.5 cursor-pointer"
                          />
                          <span className="text-xs font-semibold text-slate-700 select-none">{skill}</span>
                        </label>
                      );
                    })
                  ) : (
                    <p className="text-[11px] text-slate-400 italic py-2 text-center">No skills matching query</p>
                  )}
                </div>
              </div>

              {/* 6. Expert Level */}
              {uniqueLevels.length > 0 && (
                <div className="space-y-2.5">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Expert Level</label>
                  <div className="flex flex-wrap gap-2">
                    {uniqueLevels.map(level => {
                      const isSelected = selectedLevels.includes(level);
                      return (
                        <button
                          key={level}
                          onClick={() => toggleLevel(level)}
                          className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#4F46E5] bg-indigo-50/50 text-[#4F46E5]'
                              : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                          }`}
                        >
                          {level}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 7. Company */}
              {uniqueCompanies.length > 0 && (
                <div className="space-y-2.5">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Company</label>
                  <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-0.5">
                    {uniqueCompanies.map(company => {
                      const isSelected = selectedCompanies.includes(company);
                      return (
                        <button
                          key={company}
                          onClick={() => toggleCompany(company)}
                          className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#4F46E5] bg-indigo-50/50 text-[#4F46E5]'
                              : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                          }`}
                        >
                          {company}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 8. Price Range */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Max Price</label>
                  <span className="text-xs font-bold text-[#4F46E5] bg-indigo-50 px-2 py-0.5 rounded-md">
                    Up to ₹{(maxPriceFilter ?? priceBounds.max).toLocaleString("en-IN")}
                  </span>
                </div>
                <input
                  type="range"
                  min={priceBounds.min}
                  max={priceBounds.max}
                  step={Math.max(1, Math.round((priceBounds.max - priceBounds.min) / 50) || 1)}
                  value={maxPriceFilter ?? priceBounds.max}
                  onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#4F46E5]"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                  <span>₹{priceBounds.min.toLocaleString("en-IN")}</span>
                  <span>₹{priceBounds.max.toLocaleString("en-IN")}+</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-slate-100 bg-slate-50/40">
              <button
                onClick={handleReset}
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors shadow-sm cursor-pointer"
              >
                Clear All
              </button>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="px-5 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
              >
                Apply Filters
              </button>
            </div>

          </div>
        </div>
      )}
      </div>
    </div>
    </>
  );
});

export default CoachSessionCard;
