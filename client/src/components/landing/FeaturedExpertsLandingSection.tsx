import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { MentorJobCard, MentorProfile } from "@/components/MentorJobCard";
import { getProfileImageUrl } from "@/lib/imageUtils";
import { calculateProfessionalExperience, getCurrentCompany, getJobTitle } from "@/lib/expertUtils";
import { Sparkles, ArrowRight, Search } from "lucide-react";

export default function FeaturedExpertsLandingSection() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const { data: expertsData = [], isLoading } = useQuery({
    queryKey: ["featuredLandingMentors"],
    queryFn: async () => {
      const response = await axios.get("/api/expert/verified");
      return Array.isArray(response.data) ? response.data : response.data.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const allMentors = useMemo(() => {
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
        allTags: [cat, ...skills, expert.professionalDetails?.industry].filter(Boolean).map((s) => s.toString()),
      } as MentorProfile;
    });
  }, [expertsData]);

  // Categories for pills
  const categories = useMemo(() => {
    const set = new Set<string>();
    allMentors.forEach((m) => {
      if (m.category?.trim()) set.add(m.category.trim());
    });
    return ["All", ...Array.from(set).slice(0, 6)];
  }, [allMentors]);

  // Filtered top mentors
  const displayedMentors = useMemo(() => {
    let list = [...allMentors];
    if (selectedCategory !== "All") {
      list = list.filter((m) => m.category?.toLowerCase() === selectedCategory.toLowerCase());
    }
    return list.slice(0, 4);
  }, [allMentors, selectedCategory]);

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
      {/* Header with Title and View All */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 md:mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Top Verified Mentors
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
            Featured Mentors &amp; Experts
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-xl font-normal">
            Practice mock interviews, get portfolio reviews, and receive 1-on-1 career guidance.
          </p>
        </div>

        <Link
          to="/signup"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline shrink-0 group"
        >
          <span>Explore all mentors</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Category Pills */}
      {categories.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/70"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {/* Mentors Grid matching FindMentor */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs h-48 shimmer-shining"
            />
          ))}
        </div>
      ) : displayedMentors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedMentors.map((mentor) => (
            <MentorJobCard key={mentor.id} mentor={mentor} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50/70 rounded-2xl border border-slate-200/80">
          <p className="text-slate-600 font-medium text-sm">No experts currently listed for this category.</p>
        </div>
      )}

      {/* Bottom CTA to view all */}
      <div className="mt-8 text-center">
        <Link
          to="/signup"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-bold tracking-tight rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs"
        >
          <Search className="w-4 h-4 text-blue-600" />
          <span>Browse All Available Mentors</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
