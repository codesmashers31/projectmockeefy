import React, { useMemo, useRef, useState } from "react";
import { MentorJobCard, MentorProfile } from "./MentorJobCard";
import { 
  AlertCircle, Search, X, SlidersHorizontal, Crown, Zap, Check, ChevronLeft, ChevronRight,
  Award, Layers, Terminal, Globe, Smartphone, Cloud, Cpu, ShieldCheck, Database, CheckSquare, 
  Users, Network, Sparkles, UserCheck, Briefcase, Palette, Clock, Calendar
} from "lucide-react";
import axios from '../lib/axios';
import { getProfileImageUrl } from "../lib/imageUtils";
import { useQuery } from "@tanstack/react-query";
import { calculateAge, calculateProfessionalExperience, getCurrentCompany, getJobTitle } from "../lib/expertUtils";
import ExpertCard from "./ExpertCard";

const categoryDescriptions: Record<string, string> = {
  "IT": "Learn from industry-leading software engineers, architects, and tech leaders.",
  "MERN Stack": "Master React, Node.js, Express, and MongoDB with hands-on developers.",
  "Software Engineering": "Improve your coding skills, system design, and ace your coding interviews.",
  "Web Development": "Build modern, fast, and responsive websites using modern frontend frameworks.",
  "Mobile Development": "Develop premium iOS and Android applications using React Native, Flutter, or native swift/kotlin.",
  "DevOps & Cloud": "Deploy and scale your applications with Docker, Kubernetes, AWS, and GCP.",
  "Data Science & ML": "Deep dive into Python, data analytics, neural networks, and AI modeling.",
  "Cyber Security": "Protect applications, audit security vulnerability, and manage IAM access controls.",
  "Database Administration": "Optimize your database queries, indexing strategies, and database schemas.",
  "QA & Testing": "Write automated test suites, run selenium/cypress, and configure CI/CD pipelines.",
  "Agile & Scrum": "Learn scrum master methodologies, project delivery, and team management.",
  "System Design": "Design scalable microservices, load balancers, caching layers, and database sharding.",
  "Generative AI": "Build apps with LLMs, prompt engineering, OpenAI, and LangChain.",
  "HR & Recruitment": "Ace your behavioral interviews, polish your resume, and negotiate your salary.",
  "Business & Management": "Learn startup operations, product launch strategies, and sales pipelines.",
  "UI/UX Design": "Create stunning user experiences, mockups, color palettes, and Figma layouts."
};

const getCategoryDescription = (cat: string) => {
  const t = cat.toLowerCase().trim();
  for (const [key, desc] of Object.entries(categoryDescriptions)) {
    if (t.includes(key.toLowerCase()) || key.toLowerCase().includes(t)) {
      return desc;
    }
  }
  return "Connect with handpicked industry experts for personalized mock interviews and mentorship.";
};

const getCategoryIconDetails = (title: string) => {
  const t = title.toLowerCase().trim();
  if (t === "it" || t === "top rated experts") {
    return { icon: <Award className="w-5 h-5 text-amber-500" />, bg: "bg-amber-50 border-amber-100/50" };
  }
  if (t.includes("mern") || t.includes("full stack")) {
    return { icon: <Layers className="w-5 h-5 text-indigo-600" />, bg: "bg-indigo-50 border-indigo-100/50" };
  }
  if (t.includes("software")) {
    return { icon: <Terminal className="w-5 h-5 text-blue-600" />, bg: "bg-blue-50 border-blue-100/50" };
  }
  if (t.includes("web")) {
    return { icon: <Globe className="w-5 h-5 text-emerald-600" />, bg: "bg-emerald-50 border-emerald-100/50" };
  }
  if (t.includes("mobile")) {
    return { icon: <Smartphone className="w-5 h-5 text-purple-600" />, bg: "bg-purple-50 border-purple-100/50" };
  }
  if (t.includes("devops") || t.includes("cloud")) {
    return { icon: <Cloud className="w-5 h-5 text-cyan-600" />, bg: "bg-cyan-50 border-cyan-100/50" };
  }
  if (t.includes("data science") || t.includes("ml")) {
    return { icon: <Cpu className="w-5 h-5 text-teal-600" />, bg: "bg-teal-50 border-teal-100/50" };
  }
  if (t.includes("cyber") || t.includes("security")) {
    return { icon: <ShieldCheck className="w-5 h-5 text-rose-600" />, bg: "bg-rose-50 border-rose-100/50" };
  }
  if (t.includes("database") || t.includes("db")) {
    return { icon: <Database className="w-5 h-5 text-slate-600" />, bg: "bg-slate-50 border-slate-200/50" };
  }
  if (t.includes("qa") || t.includes("test")) {
    return { icon: <CheckSquare className="w-5 h-5 text-amber-600" />, bg: "bg-amber-50 border-amber-100/50" };
  }
  if (t.includes("agile") || t.includes("project")) {
    return { icon: <Users className="w-5 h-5 text-orange-600" />, bg: "bg-orange-50 border-orange-100/50" };
  }
  if (t.includes("system design")) {
    return { icon: <Network className="w-5 h-5 text-violet-600" />, bg: "bg-violet-50 border-violet-100/50" };
  }
  if (t.includes("ai")) {
    return { icon: <Sparkles className="w-5 h-5 text-pink-600" />, bg: "bg-pink-50 border-pink-100/50" };
  }
  if (t.includes("hr")) {
    return { icon: <UserCheck className="w-5 h-5 text-pink-500" />, bg: "bg-pink-50 border-pink-100/50" };
  }
  if (t.includes("business")) {
    return { icon: <Briefcase className="w-5 h-5 text-blue-700" />, bg: "bg-blue-50 border-blue-100/50" };
  }
  if (t.includes("design")) {
    return { icon: <Palette className="w-5 h-5 text-fuchsia-600" />, bg: "bg-fuchsia-50 border-fuchsia-100/50" };
  }
  return { icon: <Award className="w-5 h-5 text-indigo-600" />, bg: "bg-indigo-50 border-indigo-100/50" };
};

/** One backend category section: header + count + arrows + horizontal carousel of MentorJobCards */
const CategoryRow: React.FC<{ title: string; profiles: MentorProfile[] }> = ({ title, profiles }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: -1 | 1) => rowRef.current?.scrollBy({ left: dir * 400, behavior: "smooth" });
  const iconDetails = getCategoryIconDetails(title);
  const desc = getCategoryDescription(title);
  const displayTitle = title === "IT" ? "Top Rated Experts" : `${title} Experts`;

  return (
    <section className="w-full mb-6 bg-white border border-slate-200/80 rounded-[28px] p-5 sm:p-7 shadow-sm text-left">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
        <div className="flex items-start gap-4">
          <div className={`w-11 h-11 rounded-2xl ${iconDetails.bg} flex items-center justify-center shrink-0 shadow-sm border`}>
            {iconDetails.icon}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight m-0">
                {displayTitle}
              </h2>
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-slate-50 border border-slate-200/60 text-[10px] font-extrabold text-slate-500">
                {profiles.length} Experts
              </span>
            </div>
            <p className="text-[12.5px] text-slate-500 font-medium mt-1 leading-relaxed max-w-2xl">
              {desc}
            </p>
          </div>
        </div>
        {/* Scroll controls */}
        <div className="flex gap-1.5 shrink-0 self-center md:self-start">
          <button
            onClick={() => scroll(-1)}
            className="w-8.5 h-8.5 rounded-full bg-white border border-slate-200/80 flex items-center justify-center hover:bg-slate-50 text-slate-500 shadow-sm cursor-pointer transition-colors focus:outline-none"
            aria-label={`Scroll ${displayTitle} left`}
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
          </button>
          <button
            onClick={() => scroll(1)}
            className="w-8.5 h-8.5 rounded-full bg-white border border-slate-200/80 flex items-center justify-center hover:bg-slate-50 text-slate-500 shadow-sm cursor-pointer transition-colors focus:outline-none"
            aria-label={`Scroll ${displayTitle} right`}
          >
            <ChevronRight className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* List - Horizontal scrollable */}
      <div
        ref={rowRef}
        className="flex gap-4.5 overflow-x-auto pt-3 pb-4 px-1 scrollbar-none scroll-smooth snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {profiles.map((mentor) => (
          <div key={mentor.id} className="min-w-[85%] max-w-[85%] md:min-w-[calc(50%-9px)] md:max-w-[calc(50%-9px)] snap-start flex animate-in fade-in duration-300">
            <MentorJobCard mentor={mentor} />
          </div>
        ))}
      </div>
    </section>
  );
};

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
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Additional advanced filters: company, expert level, max price
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [maxPriceFilter, setMaxPriceFilter] = useState<number | null>(null);

  // New design states and refs
  const [activeTab, setActiveTab] = useState<string>("Featured");

  const listingSectionRef = useRef<HTMLDivElement>(null);
  const tabCarouselRef = useRef<HTMLDivElement>(null);

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

  // Backend category order (from /api/categories); fallback to categories found in expert data
  const backendCategoryOrder = useMemo(() => {
    let raw: any[] = [];
    if (categoriesData?.success && Array.isArray(categoriesData?.data)) {
      raw = categoriesData.data;
    } else if (Array.isArray(categoriesData)) {
      raw = categoriesData;
    }
    return raw
      .map((c: any) => (typeof c === "string" ? c : c?.name))
      .filter(Boolean) as string[];
  }, [categoriesData]);

  // Group experts by category (backend-driven listing)
  const groupedByCategory = useMemo(() => {
    const groups: { [key: string]: MentorProfile[] } = {};
    filteredProfiles.forEach((profile) => {
      const cat = profile.category || "IT";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(profile);
    });
    return groups;
  }, [filteredProfiles]);

  // Categories that actually have experts, ordered by the backend category list
  const activeCategoriesWithData = useMemo(() => {
    const present = Object.keys(groupedByCategory);
    const ordered = backendCategoryOrder.filter((c) => present.includes(c));
    const rest = present.filter((c) => !ordered.includes(c)).sort();
    return [...ordered, ...rest];
  }, [groupedByCategory, backendCategoryOrder]);

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

  // Tab filtered Experts (Featured, Top Rated, Available Today, New)
  const tabExperts = useMemo(() => {
    let list = allProfiles.filter(p => p.isVerified);
    if (activeTab === "Top Rated") {
      return [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 10);
    } else if (activeTab === "Available Today") {
      const todayProfiles = list.filter(p => p.activeTime?.toLowerCase().includes("today"));
      return todayProfiles.length > 0 ? todayProfiles.slice(0, 10) : list.slice(0, 10);
    } else if (activeTab === "New") {
      return [...list].reverse().slice(0, 10);
    } else {
      // "Featured"
      return list.filter(p => (p.rating || 0) >= 4.5).slice(0, 10);
    }
  }, [allProfiles, activeTab]);

  const scrollTabLeft = () => {
    tabCarouselRef.current?.scrollBy({ left: -400, behavior: "smooth" });
  };
  const scrollTabRight = () => {
    tabCarouselRef.current?.scrollBy({ left: 400, behavior: "smooth" });
  };

  if (isExpertsLoading || isCategoriesLoading) {
    return (
      <div className="w-full text-left space-y-6 animate-in fade-in duration-300">
        {/* Search bar skeleton */}
        <div className="flex gap-4.5 items-center mb-6">
          <div className="flex-1 h-12 rounded-2xl shimmer-shining border border-slate-100/50" />
          <div className="w-28 h-12 rounded-2xl shimmer-shining border border-slate-100/50" />
        </div>

        {/* Promo banner skeleton */}
        <div className="h-48 sm:h-56 rounded-3xl shimmer-shining border border-slate-100/50" />

        {/* Category list row skeletons */}
        {[1, 2].map((i) => (
          <div key={i} className="w-full bg-white border border-slate-200/80 rounded-[28px] p-5 sm:p-7 space-y-5">
            {/* Category header skeleton */}
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl shimmer-shining border border-slate-100/50 shrink-0" />
              <div className="space-y-2">
                <div className="h-5 w-44 rounded-lg shimmer-shining" />
                <div className="h-3 w-72 rounded-lg shimmer-shining" />
              </div>
            </div>
            {/* Category cards carousel skeleton */}
            <div className="flex gap-4.5 overflow-hidden pt-3">
              <div className="min-w-[85%] md:min-w-[calc(50%-9px)] h-[240px] rounded-[24px] border border-slate-100/50 shimmer-shining shrink-0" />
              <div className="min-w-[85%] md:min-w-[calc(50%-9px)] h-[240px] rounded-[24px] border border-slate-100/50 shimmer-shining shrink-0" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
    <div ref={listingSectionRef} className="w-full scroll-mt-24">

      {/* Search and Filters Row */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 flex items-center gap-2.5 bg-white border border-slate-200/85 rounded-2xl px-4 py-3 shadow-sm">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search experts by name, role, company, skills..."
            className="w-full bg-transparent border-none outline-none text-sm text-[#141A33] placeholder-slate-400 font-semibold"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setIsFilterModalOpen(true)}
          className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200/85 rounded-2xl text-sm font-bold text-[#141A33] hover:bg-slate-50 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
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

      {/* PROMO BANNER */}
      {!isFilteringActive && (
        <div className="mb-6 bg-gradient-to-br from-[#FFF6EA] to-[#FFEBD6] border border-[#FCE3C2] rounded-3xl p-6 sm:p-7 flex flex-col md:flex-row items-stretch md:items-center gap-7 shadow-sm">
          <div className="flex-1 min-w-[200px] text-left">
            <div className="text-sm text-[#8A5A1E] font-bold">With</div>
            <div className="flex items-center gap-2.5 my-1">
              <span className="font-extrabold text-3xl text-[#B5651D] tracking-tight">PRO</span>
              <div className="w-7 h-7 rounded-full bg-[#D9720C] flex items-center justify-center">
                <Crown className="w-4 h-4 text-white fill-white" />
              </div>
            </div>
            <div className="font-black text-[15px] text-[#141A33] mb-4">you get booked faster</div>
            <button className="inline-flex bg-[#D9720C] hover:bg-[#C2620A] text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-all shadow-md shadow-amber-600/10 active:scale-[0.98]">
              Become a Pro
            </button>
          </div>
          <div className="hidden md:block w-px self-stretch bg-[#F1D3AC]" />
          <div className="flex-[1.4] min-w-[260px] text-left">
            <div className="font-black text-sm text-[#141A33] mb-3.5">What you will get</div>
            <div className="space-y-2">
              {["Hidden expert invitations", "AI-enhanced profile", "Auto-match with mentors"].map((f, i) => (
                <div key={i} className="flex items-center justify-between py-1 border-b border-[#F1D3AC]/30 last:border-0">
                  <span className="flex-1 text-[13px] text-[#4A5170] font-bold flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-[#D9720C] fill-[#D9720C]" />
                    {f}
                  </span>
                  <span className="text-[#C7B79A] font-bold mx-2">—</span>
                  <span className="w-14 h-6.5 rounded-lg bg-white flex items-center justify-center shadow-sm">
                    <Check className="w-3.5 h-3.5 text-[#D9720C] stroke-[3]" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}




      {/* Experts List Container */}
      <div className="mt-2">
        {isExpertsLoading || isCategoriesLoading ? (
          null
        ) : isExpertsError ? (
          <div className="text-center py-20 bg-rose-50/50 rounded-[24px] border border-rose-100/50">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-4" />
            <h3 className="text-sm font-black text-rose-900 uppercase tracking-widest">Handshake Error</h3>
            <p className="text-[10px] text-rose-500 font-bold uppercase mt-1">
              {expertsError instanceof Error ? expertsError.message : "Failure Connecting"}
            </p>
          </div>
        ) : (
          <div className="w-full text-left space-y-8">

            {/* FEATURED TABS CAROUSEL — hidden while searching/filtering */}
            {!isFilteringActive && tabExperts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3.5">
                  <div className="flex gap-6 overflow-x-auto">
                    {["Featured", "Top Rated", "Available Today", "New"].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`font-extrabold text-[15.5px] pb-2.5 border-b-[2.5px] whitespace-nowrap transition-colors cursor-pointer focus:outline-none ${
                          activeTab === tab
                            ? "text-[#141A33] border-[#2F5FFF]"
                            : "text-[#8B93B2] border-transparent hover:text-[#4A5170]"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2.5">
                    <button
                      onClick={scrollTabLeft}
                      className="w-9 h-9 rounded-full bg-white border border-[#E3E8F5] flex items-center justify-center cursor-pointer text-[#4A5170] hover:bg-slate-50 transition-colors focus:outline-none"
                      aria-label="Scroll featured experts left"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={scrollTabRight}
                      className="w-9 h-9 rounded-full bg-white border border-[#E3E8F5] flex items-center justify-center cursor-pointer text-[#4A5170] hover:bg-slate-50 transition-colors focus:outline-none"
                      aria-label="Scroll featured experts right"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div
                  ref={tabCarouselRef}
                  className="flex gap-[18px] overflow-x-auto pb-1.5 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {tabExperts.map((mentor) => (
                    <div key={mentor.id} className="min-w-[330px] max-w-[330px] sm:min-w-[420px] sm:max-w-[420px]">
                      <ExpertCard mentor={mentor} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CATEGORY-BASED LISTING (backend categories) */}
            {activeCategoriesWithData.length === 0 ? (
              <div className="text-center py-[60px] text-[#8B93B2] font-bold">
                No experts match your search — try a different keyword.
              </div>
            ) : (
              activeCategoriesWithData.map((cat) => (
                <CategoryRow key={cat} title={cat} profiles={groupedByCategory[cat]} />
              ))
            )}
          </div>
        )}
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
    </>
  );
});

export default CoachSessionCard;
