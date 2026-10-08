import React, { useMemo, useState, useEffect, useRef, useDeferredValue } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "../lib/axios";
import { MentorJobCard, MentorProfile } from "../components/MentorJobCard";
import { getProfileImageUrl } from "../lib/imageUtils";
import { calculateProfessionalExperience, getCurrentCompany, getJobTitle } from "../lib/expertUtils";
import { Search, Users, Sparkles, X, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

const ITEMS_PER_PAGE = 20;

export default function FindMentor() {
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("recommended");
  const [currentPage, setCurrentPage] = useState(1);
  const listTopRef = useRef<HTMLDivElement>(null);

  // Fetch verified active experts from API
  const { data: expertsData = [], isLoading } = useQuery({
    queryKey: ["allMentorsList"],
    queryFn: async () => {
      const response = await axios.get("/api/expert/verified");
      return Array.isArray(response.data) ? response.data : response.data.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Map backend experts to MentorProfile
  const allMentors = useMemo(() => {
    if (!Array.isArray(expertsData)) return [];

    return expertsData.map((expert: any) => {
      const cat = expert.category || expert.professionalDetails?.industry || "Software Engineering";
      
      const skills = (() => {
        if (Array.isArray(expert.skillsAndExpertise?.tools) && expert.skillsAndExpertise.tools.length) {
          return expert.skillsAndExpertise.tools;
        }
        if (Array.isArray(expert.expertSkills) && expert.expertSkills.length) {
          return expert.expertSkills.map((s: any) => (typeof s === "string" ? s : s.skillName));
        }
        if (Array.isArray(expert.skills) && expert.skills.length) {
          return expert.skills;
        }
        return [cat, "Interview Prep", "System Design"];
      })();

      const exp = (() => {
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
        name: expert.personalInformation?.userName || "Verified Mentor",
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
        minOriginalPrice: expert.minOriginalPrice,
        maxOriginalPrice: expert.maxOriginalPrice,
        skills: skills,
        experience: exp,
        activeTime: expert.availability?.nextAvailable || "Available Today",
        totalSessions: expert.metrics?.totalSessions || 15,
        category: cat,
        bio: expert.personalInformation?.bio || "",
        level: expert.professionalDetails?.level || "Senior",
        allTags: [cat, ...skills, expert.professionalDetails?.industry].filter(Boolean).map(s => s.toString())
      } as MentorProfile;
    });
  }, [expertsData]);

  // Extract unique categories for filter chips
  const categories = useMemo(() => {
    const set = new Set<string>();
    allMentors.forEach((m) => {
      if (m.category?.trim()) set.add(m.category.trim());
    });
    return ["All", ...Array.from(set).sort()];
  }, [allMentors]);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, deferredSearch, sortBy]);

  // Filter and sort mentors
  const filteredMentors = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();
    const isAll = selectedCategory === "All";
    const selectedCatLower = selectedCategory.toLowerCase();

    return allMentors
      .filter((mentor) => {
        // Category filter
        if (!isAll && mentor.category?.toLowerCase() !== selectedCatLower) {
          return false;
        }

        // Text search query (matches name, role, company, skills, or category)
        if (q) {
          const matchName = mentor.name.toLowerCase().includes(q);
          const matchRole = mentor.role.toLowerCase().includes(q);
          const matchCompany = mentor.company?.toLowerCase().includes(q);
          const matchCategory = mentor.category?.toLowerCase().includes(q);
          const matchSkills = mentor.skills?.some(s => s.toLowerCase().includes(q));

          if (!matchName && !matchRole && !matchCompany && !matchCategory && !matchSkills) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "rating") {
          return (b.rating || 0) - (a.rating || 0);
        }
        if (sortBy === "sessions") {
          return (b.totalSessions || 0) - (a.totalSessions || 0);
        }
        if (sortBy === "price-low") {
          return (a.minPrice || parseInt(a.price) || 0) - (b.minPrice || parseInt(b.price) || 0);
        }
        if (sortBy === "price-high") {
          return (b.minPrice || parseInt(b.price) || 0) - (a.minPrice || parseInt(a.price) || 0);
        }
        // Default: recommended (high rating + session count)
        return ((b.rating || 0) * 10 + (b.totalSessions || 0)) - ((a.rating || 0) * 10 + (a.totalSessions || 0));
      });
  }, [allMentors, selectedCategory, deferredSearch, sortBy]);

  // Pagination calculations
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
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Generate pagination number array with ellipsis
  const paginationPages = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, currentPage]);

  return (
    <div ref={listTopRef} className="w-full font-sans space-y-6 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-slate-100 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles size={13} className="text-blue-600" />
            Top 1% Verified Mentors
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Find a Mentor
          </h1>
          <p className="text-slate-500 text-sm mt-1 max-w-xl">
            Book 1-on-1 mock interviews, system design drills, and resume reviews with industry hiring managers.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200/70 rounded-2xl px-4 py-3 shrink-0 text-center sm:text-right">
          <p className="text-2xl font-black text-blue-600 leading-none">
            {isLoading ? "--" : allMentors.length}
          </p>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">
            Available Mentors
          </p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-[24px] p-4 sm:p-5 border border-slate-100 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by mentor name, role, company, or skills (e.g. React, Google, System Design)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/80 focus:border-blue-500 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <ArrowUpDown size={15} className="text-slate-400 hidden sm:block" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3.5 py-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/80 focus:border-blue-500 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer transition-all"
            >
              <option value="recommended">Sort: Recommended</option>
              <option value="rating">Sort: Highest Rated</option>
              <option value="sessions">Sort: Most Sessions</option>
              <option value="price-low">Sort: Price (Low to High)</option>
              <option value="price-high">Sort: Price (High to Low)</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Results Summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Showing <span className="text-slate-900">{filteredMentors.length > 0 ? startIndex + 1 : 0}</span> to{" "}
          <span className="text-slate-900">{Math.min(startIndex + ITEMS_PER_PAGE, filteredMentors.length)}</span> of{" "}
          <span className="text-blue-600 font-extrabold">{filteredMentors.length}</span> mentors
          {selectedCategory !== "All" && ` in ${selectedCategory}`}
          {searchQuery && ` for "${searchQuery}"`}
        </p>

        <div className="flex items-center gap-3">
          {totalPages > 1 && (
            <span className="text-xs font-semibold text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
          )}
          {(selectedCategory !== "All" || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory("All");
                setSearchQuery("");
              }}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Mentor Cards Grid - Straight Vertical List */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm h-64 shimmer-shining"
            />
          ))}
        </div>
      ) : filteredMentors.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-5">
            {paginatedMentors.map((mentor) => (
              <div key={mentor.id} className="w-full flex animate-in fade-in duration-200">
                <MentorJobCard mentor={mentor} />
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-white rounded-[24px] p-4 sm:p-5 border border-slate-100 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
              
              {/* Previous & First Page Button */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-start">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="px-2.5 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all flex items-center gap-1"
                  title="First Page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
              </div>

              {/* Page Number Pills */}
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {paginationPages.map((page, idx) => {
                  if (page === "ellipsis") {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 text-xs font-bold">
                        ...
                      </span>
                    );
                  }

                  const isCurrent = page === currentPage;
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`min-w-[36px] h-9 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30 scale-105"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/70"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              {/* Next & Last Page Button */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-end">
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all flex items-center gap-1"
                  title="Last Page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-[24px] p-12 border border-slate-100 shadow-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
            <Users size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            No mentors found
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-5">
            We couldn't find any mentors matching your search or category filters. Try resetting the filters to explore all experts.
          </p>
          <button
            onClick={() => {
              setSelectedCategory("All");
              setSearchQuery("");
            }}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            Show All Mentors
          </button>
        </div>
      )}
    </div>
  );
}

