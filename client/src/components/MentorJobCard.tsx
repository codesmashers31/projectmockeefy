import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bookmark,
  MapPin,
  Star,
  BadgeCheck,
  ArrowRight,
  Calendar,
  Briefcase,
  Code2,
  FlaskConical,
  Eye,
  Database,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { BookingModal } from "./BookingModal";
import { getProfileImageUrl } from "../lib/imageUtils";
import { formatDisplayName } from "../lib/utils";

// Types
export interface MentorProfile {
  id: string;
  expertID: string;
  name: string;
  role: string;
  company?: string;
  location: string;
  rating: number;
  reviews: number;
  avatar: string;
  activeTime?: string;
  isVerified: boolean;
  price: string;
  minPrice?: number;
  maxPrice?: number;
  minOriginalPrice?: number;
  maxOriginalPrice?: number;
  skills: string[];
  experience: string;
  totalSessions: number;
  category?: string;
  allTags?: string[];
  bio?: string;
  level?: string;
  levels?: string[];
  availability?: any;
  rawExpert?: any;
}

interface MentorJobCardProps {
  mentor: MentorProfile;
  isActive?: boolean;
}

export const MentorJobCard = React.memo(({ mentor }: MentorJobCardProps) => {
  const navigate = useNavigate();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [showAllSkills, setShowAllSkills] = useState(false);

  const mentorId = mentor.expertID || mentor.id || (mentor as any)._id;

  const [isSaved, setIsSaved] = useState(() => {
    try {
      const saved = localStorage.getItem("savedExperts");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.some((m: MentorProfile) => m.expertID === mentor.expertID);
      }
    } catch (e) {
      // Ignore JSON error
    }
    return false;
  });

  const handleBookNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBookingModalOpen(true);
  };

  const handleViewProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/expert-profile/${mentorId}`, {
      state: {
        initialExpert: mentor.rawExpert || mentor,
      },
    });
  };

  const handleCardClick = () => {
    navigate(`/expert-profile/${mentorId}`, {
      state: {
        initialExpert: mentor.rawExpert || mentor,
      },
    });
  };

  const toggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const saved = localStorage.getItem("savedExperts");
      let parsed: MentorProfile[] = saved ? JSON.parse(saved) : [];

      if (isSaved) {
        parsed = parsed.filter((m) => m.expertID !== mentor.expertID);
        toast.info("Removed from Saved Interview Experts");
      } else {
        parsed.push(mentor);
        toast.success("Added to Saved Interview Experts");
      }

      localStorage.setItem("savedExperts", JSON.stringify(parsed));
      setIsSaved(!isSaved);
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("saved-experts-updated"));
    } catch (e) {
      console.error("Failed to toggle save", e);
    }
  };

  const avatarUrl = getProfileImageUrl(
    mentor.avatar || (mentor as any).profileImage,
    mentor.name
  );

  const priceNum =
    mentor.minPrice !== undefined && mentor.minPrice !== null
      ? mentor.minPrice
      : mentor.price && mentor.price !== "₹—"
      ? parseInt(mentor.price.toString().replace(/[^\d]/g, ""), 10) || 1
      : 1;

  const initials = (mentor.name || "Sudhan")
    .trim()
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const roleDisplay = mentor.role || "Web Developer";
  const companyDisplay = mentor.company || "Zoho";
  const nameDisplay = formatDisplayName(mentor.name || "Sudhan");
  const ratingDisplay = mentor.rating > 0 ? mentor.rating.toFixed(1) : "5.0";
  const reviewsCount = mentor.reviews !== undefined && mentor.reviews !== null ? mentor.reviews : 1;

  const expDisplay = (() => {
    if (!mentor.experience) return "5 yrs";
    const cleaned = mentor.experience.trim();
    if (cleaned.toLowerCase().includes("yr")) return cleaned;
    const num = cleaned.replace(/[^\d]/g, "");
    return num ? `${num} yrs` : "5 yrs";
  })();

  const locationDisplay = mentor.location || "Chennai";

  const skillsList = React.useMemo(() => {
    const rawDomains = Array.isArray(mentor.rawExpert?.skillsAndExpertise?.domains)
      ? mentor.rawExpert.skillsAndExpertise.domains
      : [];
    const rawTools = Array.isArray(mentor.rawExpert?.skillsAndExpertise?.tools)
      ? mentor.rawExpert.skillsAndExpertise.tools
      : [];
    const combined = Array.from(
      new Set([...(mentor.skills || []), ...rawDomains, ...rawTools])
    ).filter(Boolean);

    return combined.length > 0 ? combined : ["Interview Prep", "System Design"];
  }, [mentor.skills, mentor.rawExpert]);

  const displayedSkills = showAllSkills ? skillsList : skillsList.slice(0, 2);
  const remainingCount = skillsList.length - 2;

  const getSkillIcon = (skill: string) => {
    const s = skill.toLowerCase();
    if (s.includes("a/b") || s.includes("test") || s.includes("qa") || s.includes("experiment") || s.includes("lab")) {
      return <FlaskConical className="w-3 h-3 text-[#1865F2] shrink-0" />;
    }
    if (s.includes("vision") || s.includes("image") || s.includes("ui") || s.includes("design") || s.includes("ux")) {
      return <Eye className="w-3 h-3 text-[#1865F2] shrink-0" />;
    }
    if (s.includes("data") || s.includes("sql") || s.includes("backend") || s.includes("db")) {
      return <Database className="w-3 h-3 text-[#1865F2] shrink-0" />;
    }
    return <Code2 className="w-3 h-3 text-[#1865F2] shrink-0" />;
  };

  return (
    <article
      id={`expert-card-${mentorId}`}
      data-expert-id={mentorId}
      data-expert-name={mentor.name}
      onClick={handleCardClick}
      aria-label={`Interview expert profile for ${nameDisplay}`}
      className="group relative bg-white rounded-[22px] border border-slate-200/90 hover:border-[#0755E8]/40 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_24px_-4px_rgba(7,85,232,0.12)] hover:-translate-y-0.5 transition-all duration-300 p-3 sm:p-3.5 flex flex-col justify-between gap-2.5 sm:gap-3 h-full w-full cursor-pointer text-left box-border overflow-hidden scroll-mt-28"
    >
      {/* Decorative ambient blue wave in bottom-right corner */}
      <div className="absolute -bottom-3 -right-3 w-20 h-16 bg-gradient-to-tl from-blue-100/40 via-indigo-50/20 to-transparent rounded-br-[22px] pointer-events-none -z-0" />

      <div className="space-y-2.5 sm:space-y-3 flex-1 flex flex-col relative z-10">
        {/* 1. Profile Header with Spark Accent & Bookmark */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Avatar Frame with Spark Accents & Online Dot */}
            <div className="relative shrink-0">
              {/* Three blue spark rays on top-left of avatar container */}
              <div className="absolute -top-1 -left-1 w-3 h-3 pointer-events-none select-none text-[#2563EB]">
                <svg viewBox="0 0 16 16" fill="none" className="w-full h-full stroke-current" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="2" y1="9" x2="0.5" y2="9" />
                  <line x1="3.5" y1="4.5" x2="1.5" y2="2.5" />
                  <line x1="9" y1="2" x2="9" y2="0.5" />
                </svg>
              </div>

              {/* Glowing light-blue border wrapper with rounded square corners */}
              <div className="p-0.5 rounded-[14px] border-2 border-[#D3E4FF] bg-white shadow-2xs">
                <div className="w-[40px] h-[40px] sm:w-[42px] sm:h-[42px] rounded-[11px] bg-slate-100 overflow-hidden flex items-center justify-center">
                  {avatarFailed || !avatarUrl ? (
                    <span className="text-xs sm:text-sm font-extrabold tracking-tight text-[#0755E8] bg-[#EAF2FF] w-full h-full flex items-center justify-center select-none">
                      {initials}
                    </span>
                  ) : (
                    <img
                      src={avatarUrl}
                      alt={nameDisplay}
                      className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                      onError={() => setAvatarFailed(true)}
                    />
                  )}
                </div>
              </div>

              {/* Online Green Indicator Dot at bottom right of frame */}
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#10B981] border-2 border-white shadow-2xs" />
            </div>

            {/* Name & Designation */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <h3
                  title={nameDisplay}
                  className="text-[14px] sm:text-[15px] font-bold text-slate-900 group-hover:text-[#0755E8] transition-colors tracking-tight truncate leading-tight capitalize"
                >
                  {nameDisplay}
                </h3>
                <span title="Verified Interview Expert" className="inline-flex items-center shrink-0">
                  <BadgeCheck className="w-4 h-4 text-white fill-[#0755E8]" />
                </span>
              </div>

              {/* Designation: "Senior Agile & Project Management Lead • Google" */}
              <p className="text-[11px] sm:text-[11.5px] text-slate-500 font-medium leading-snug mt-0.5 truncate">
                <span>{roleDisplay}</span>
                {companyDisplay && (
                  <>
                    <span className="text-slate-300 font-normal mx-1">•</span>
                    <span className="text-slate-700 font-semibold">{companyDisplay}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Bookmark Button */}
          <button
            onClick={toggleSave}
            title={isSaved ? "Remove from Saved Interview Experts" : "Save to Interview Experts"}
            aria-label={isSaved ? "Remove from Saved Interview Experts" : "Save to Interview Experts"}
            className="w-7.5 h-7.5 rounded-xl border border-slate-200/90 bg-white hover:bg-blue-50/60 active:scale-95 text-slate-600 hover:text-[#0755E8] hover:border-blue-200 flex items-center justify-center shadow-2xs transition-all shrink-0 cursor-pointer"
          >
            <Bookmark
              className={`w-3.5 h-3.5 transition-colors ${
                isSaved ? "fill-[#0755E8] text-[#0755E8]" : "text-slate-600 stroke-[2.2]"
              }`}
            />
          </button>
        </div>

        {/* 2. Statistics Row: Rating | Experience | Location */}
        <div className="w-full bg-slate-50/90 group-hover:bg-blue-50/25 rounded-xl py-1 sm:py-1.5 px-2.5 border border-slate-200/70 flex items-center justify-between text-[10.5px] sm:text-[11px] text-slate-700 transition-colors">
          {/* Rating */}
          <div className="flex items-center gap-1 font-bold shrink-0">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
            <span className="font-extrabold text-slate-900">
              {ratingDisplay}
            </span>
            <span className="text-slate-400 font-normal text-[9.5px]">
              ({reviewsCount})
            </span>
          </div>

          <div className="w-[1px] h-3 bg-slate-200 shrink-0" />

          {/* Experience */}
          <div className="flex items-center gap-1 shrink-0 font-semibold text-slate-700">
            <Calendar className="w-3 h-3 text-[#0755E8] shrink-0" />
            <span>{expDisplay}</span>
          </div>

          <div className="w-[1px] h-3 bg-slate-200 shrink-0" />

          {/* Location */}
          <div className="flex items-center gap-1 shrink-0 font-semibold text-slate-700 min-w-0">
            <MapPin className="w-3 h-3 text-[#0755E8] shrink-0" />
            <span className="truncate max-w-[70px] sm:max-w-[85px]">{locationDisplay}</span>
          </div>
        </div>

        {/* Professional Domain Section */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 font-bold text-[10px] sm:text-[10.5px] text-slate-800">
              <Briefcase className="w-3 h-3 text-[#0755E8] stroke-[2.5]" />
              <span>Professional Domain</span>
            </div>
          </div>

          {/* Domain Badges */}
          <div className="flex items-center gap-1 flex-wrap">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EAF2FF] text-[#0755E8] text-[9.5px] font-bold border border-[#BFDBFE] shadow-2xs"
            >
              Domain: {mentor.category || "IT"}
            </span>
            {displayedSkills.map((skill, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50/70 text-[#0755E8] text-[9px] font-medium border border-blue-200/60"
              >
                {skill}
              </span>
            ))}
            {skillsList.length > 2 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAllSkills((prev) => !prev);
                }}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-100 hover:bg-blue-100 text-[#0755E8] hover:text-[#0645C7] text-[8.5px] font-bold border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer select-none"
              >
                {showAllSkills ? "Show less" : `+${remainingCount} more`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Area: Pricing + Action Buttons */}
      <div className="space-y-2 pt-2 relative z-10 border-t border-slate-100">
        {/* Pricing Row */}
        <div className="flex items-center justify-between px-0.5">
          {/* Price */}
          <div className="flex flex-col shrink-0">
            <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 leading-none">
              Per Session
            </span>
            <span className="text-[16px] sm:text-[17px] font-black text-slate-900 leading-tight mt-0.5 tracking-tight">
              ₹{priceNum.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          {/* View Profile Button */}
          <button
            type="button"
            onClick={handleViewProfile}
            className="w-full h-[33px] sm:h-[34px] rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] text-slate-700 font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B8FF]"
          >
            <User className="w-3.5 h-3.5 text-slate-500 stroke-[2.2] shrink-0" />
            <span className="whitespace-nowrap">View Profile</span>
          </button>

          {/* Book Session Button */}
          <button
            type="button"
            onClick={handleBookNow}
            className="group w-full h-[33px] sm:h-[34px] rounded-xl bg-gradient-to-r from-[#0755E8] to-[#0440B3] hover:from-[#0645C7] hover:to-[#033496] active:scale-[0.98] text-white font-bold text-[11px] shadow-[0_3px_10px_rgba(7,85,232,0.25)] hover:shadow-[0_5px_16px_rgba(7,85,232,0.36)] transition-all flex items-center justify-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B8FF]"
          >
            <Calendar className="w-3.5 h-3.5 text-white shrink-0" />
            <span className="whitespace-nowrap">Book Session</span>
            <ArrowRight className="w-3.5 h-3.5 text-white shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* Booking Modal (Step 1 modal view on Book Session) */}
      {isBookingModalOpen && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          expertId={mentorId}
          initialProfile={mentor}
        />
      )}
    </article>
  );
});

MentorJobCard.displayName = "MentorJobCard";

export const MentorCardSkeleton = () => (
  <div className="relative bg-white border border-[#E2ECF9] rounded-[20px] sm:rounded-[22px] p-2.5 sm:p-3 flex flex-col justify-between gap-2 sm:gap-2.5 h-full w-full overflow-hidden shadow-xs">
    <div className="space-y-2 sm:space-y-2.5">
      {/* 1. Header Skeleton */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="p-0.5 rounded-[14px] border-2 border-[#D3E4FF] bg-white">
            <div className="w-[40px] h-[40px] sm:w-[42px] sm:h-[42px] rounded-[11px] bg-slate-100 shimmer-shining" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="h-3.5 w-3/5 bg-slate-200/80 rounded shimmer-shining" />
            <div className="h-3 w-4/5 bg-slate-100 rounded shimmer-shining" />
          </div>
        </div>
        <div className="w-7 h-7 rounded-lg bg-slate-100 border border-[#E2ECF9] shimmer-shining shrink-0" />
      </div>

      {/* 2. Stats Pill Skeleton */}
      <div className="h-5 sm:h-5.5 w-full bg-[#F4F8FE] border border-[#E6EFFD] rounded-full shimmer-shining" />

      {/* 4. Skills Skeleton */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <div className="h-3 w-12 bg-slate-100 rounded shimmer-shining" />
          <div className="h-3 w-12 bg-slate-100 rounded-full shimmer-shining" />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-20 bg-[#EDF4FF] border border-[#D8E6FD] rounded-full shimmer-shining" />
          <div className="h-5 w-24 bg-[#EDF4FF] border border-[#D8E6FD] rounded-full shimmer-shining" />
        </div>
      </div>
    </div>

    {/* 5 & 6. Bottom Actions Skeleton */}
    <div className="space-y-1.5 sm:space-y-2 pt-0.5">
      <div className="flex items-center gap-1.5">
        <div className="h-[34px] sm:h-[35px] flex-1 bg-[#F4F8FE] border border-[#E2ECF9] rounded-xl shimmer-shining" />
        <div className="h-[34px] sm:h-[35px] w-24 bg-blue-100/60 rounded-xl shimmer-shining" />
      </div>
      <div className="h-[34px] sm:h-[35px] w-full bg-slate-100 border border-slate-200 rounded-full shimmer-shining" />
    </div>
  </div>
);
