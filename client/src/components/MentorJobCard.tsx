import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bookmark,
  MapPin,
  Star,
  BadgeCheck,
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  Code2,
  FlaskConical,
  Eye,
  Database,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { BookingModal } from "./BookingModal";
import { getProfileImageUrl } from "../lib/imageUtils";

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
  const [isBioExpanded, setIsBioExpanded] = useState(false);

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
    navigate(`/expert-profile/${mentorId}`);
  };

  const handleCardClick = () => {
    navigate(`/expert-profile/${mentorId}`);
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
  const nameDisplay = mentor.name || "Sudhan";
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

  const bioText =
    mentor.bio && mentor.bio.trim().length > 10
      ? mentor.bio
      : `${expDisplay} of experience in ${roleDisplay}${companyDisplay ? ` at ${companyDisplay}` : ""}. Focuses on technical mock interviews and...`;

  const skillsList =
    mentor.skills && mentor.skills.length > 0
      ? mentor.skills
      : ["A/B Testing", "Computer Vision"];

  const displaySkills = skillsList.slice(0, 2);
  const moreSkillsCount = skillsList.length > 2 ? skillsList.length - 2 : 14;

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
      className="group relative bg-white rounded-[20px] sm:rounded-[22px] border border-[#E2ECF9] hover:border-[#1865F2]/50 shadow-[0_2px_12px_-4px_rgba(20,40,90,0.05)] hover:shadow-[0_8px_24px_-6px_rgba(24,101,242,0.12)] transition-all duration-200 p-2.5 sm:p-3 flex flex-col justify-between gap-2 sm:gap-2.5 h-full w-full cursor-pointer text-left box-border overflow-hidden scroll-mt-28"
    >
      {/* Decorative ambient blue wave in bottom-right corner matching reference */}
      <div className="absolute -bottom-3 -right-3 w-16 h-14 bg-gradient-to-tl from-[#D8E8FD]/35 to-transparent rounded-br-[20px] sm:rounded-br-[22px] pointer-events-none -z-0" />

      <div className="space-y-2 sm:space-y-2.5 flex-1 flex flex-col relative z-10">
        {/* 1. Profile Header */}
        <div className="flex items-start justify-between gap-1.5 sm:gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
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
                    <span className="text-xs sm:text-sm font-extrabold tracking-tight text-[#1865F2] bg-[#EAF2FF] w-full h-full flex items-center justify-center select-none">
                      {initials}
                    </span>
                  ) : (
                    <img
                      src={avatarUrl}
                      alt={nameDisplay}
                      className="w-full h-full object-cover object-top"
                      onError={() => setAvatarFailed(true)}
                    />
                  )}
                </div>
              </div>

              {/* Online Green Indicator Dot at bottom right of frame */}
              <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#10B981] border-2 border-white shadow-2xs" />
            </div>

            {/* Name & Designation */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 min-w-0">
                <h3
                  title={nameDisplay}
                  className="text-[13.5px] sm:text-[14.5px] font-bold text-[#0B1536] tracking-tight truncate leading-tight"
                >
                  {nameDisplay}
                </h3>
                <span title="Verified Interview Expert" className="inline-flex items-center shrink-0">
                  <BadgeCheck className="w-3.5 h-3.5 text-white fill-[#1865F2]" />
                </span>
              </div>

              {/* Designation: "Web Developer • Zoho" */}
              <p className="text-[10.5px] sm:text-[11px] text-[#475569] font-medium leading-snug mt-0.5 truncate">
                <span>{roleDisplay}</span>
                {companyDisplay && (
                  <>
                    <span className="text-slate-400 font-normal mx-1">•</span>
                    <span className="text-[#334155]">{companyDisplay}</span>
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
            className="w-7 h-7 rounded-lg border border-[#E2ECF9] bg-white hover:bg-slate-50 text-[#0B1536] flex items-center justify-center shadow-2xs transition-colors shrink-0 cursor-pointer"
          >
            <Bookmark
              className={`w-3 h-3 transition-colors ${
                isSaved ? "fill-[#1865F2] text-[#1865F2]" : "text-[#0B1536] stroke-[2]"
              }`}
            />
          </button>
        </div>

        {/* 2. Statistics Row: Rating | Experience | Location in one horizontal row */}
        <div className="w-full bg-[#F4F8FE] rounded-full py-0.5 sm:py-1 px-2 sm:px-2.5 border border-[#E6EFFD] flex items-center justify-between text-[10px] sm:text-[10.5px] text-[#0B1536]">
          {/* Rating: ⭐ 5.0 (1) */}
          <div className="flex items-center gap-0.5 sm:gap-1 font-bold shrink-0">
            <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-400 text-amber-400 shrink-0" />
            <span className="font-extrabold text-[#0B1536]">
              {ratingDisplay}
            </span>
            <span className="text-[#64748B] font-normal text-[8.5px] sm:text-[9px]">
              ({reviewsCount})
            </span>
          </div>

          <div className="w-[1px] h-2.5 bg-[#CBDCF7] shrink-0" />

          {/* Experience: 📅 5 yrs */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 font-semibold text-[#0B1536]">
            <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#1865F2] shrink-0" />
            <span>{expDisplay}</span>
          </div>

          <div className="w-[1px] h-2.5 bg-[#CBDCF7] shrink-0" />

          {/* Location: 📍 Chennai */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 font-semibold text-[#0B1536] min-w-0">
            <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#1865F2] shrink-0" />
            <span className="truncate max-w-[65px] sm:max-w-[78px]">{locationDisplay}</span>
          </div>
        </div>

        {/* 3. Bio Section: subtle light-blue container, blue vertical accent on left, expand/collapse arrow on right */}
        <div className="bg-[#F2F6FE] rounded-xl p-1.5 sm:p-2 px-2 sm:px-2.5 border border-[#E4EDFC] flex items-center justify-between gap-1.5 min-h-[38px] sm:min-h-[40px]">
          {/* Slim blue vertical accent */}
          <div className="w-[2.5px] self-stretch min-h-[22px] rounded-full bg-[#1865F2] shrink-0" />

          {/* Bio Text */}
          <p
            className={`text-[10px] sm:text-[10.5px] text-[#334155] leading-snug font-normal flex-1 transition-all ${
              isBioExpanded ? "" : "line-clamp-2"
            }`}
          >
            {bioText}
          </p>

          {/* Expand / Collapse Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsBioExpanded(!isBioExpanded);
            }}
            title={isBioExpanded ? "Collapse bio" : "Expand bio"}
            aria-label={isBioExpanded ? "Collapse bio" : "Expand bio"}
            className="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-[#E2ECFC] hover:bg-[#D5E3FA] text-[#334155] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          >
            {isBioExpanded ? (
              <ChevronUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#1E293B] stroke-[2.2]" />
            ) : (
              <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#1E293B] stroke-[2.2]" />
            )}
          </button>
        </div>

        {/* 4. Skills Section */}
        <div className="space-y-1 sm:space-y-1.5">
          {/* Header: </> Skills and +14 more → */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 font-bold text-[11px] sm:text-[11.5px] text-[#0B1536]">
              <Code2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#1865F2] stroke-[2.5]" />
              <span>Skills</span>
            </div>

            {/* "+14 more →" link */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleViewProfile(e);
              }}
              className="text-[#1865F2] hover:text-[#0C46BC] bg-[#EAF2FE] hover:bg-[#DCEBFE] text-[8.5px] sm:text-[9px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-0.5 transition-colors cursor-pointer"
            >
              <span>+{moreSkillsCount} more</span>
              <span className="text-[8.5px] sm:text-[9px]">→</span>
            </div>
          </div>

          {/* Skill Pills */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap overflow-hidden pt-0.5">
            {displaySkills.map((skill, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full bg-[#EDF4FF] text-[#1E293B] text-[9.5px] sm:text-[10px] font-semibold border border-[#D8E6FD] shadow-2xs shrink-0 max-w-[48%]"
              >
                {getSkillIcon(skill)}
                <span className="truncate">{skill}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Area: Pricing & Availability + Action Buttons */}
      <div className="space-y-1.5 sm:space-y-2 pt-0.5 relative z-10">
        {/* 5. Pricing and Availability + Book Session Button Row */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Compact Pricing & Availability pill */}
          <div className="flex-1 min-w-0 h-[34px] sm:h-[35px] bg-[#F4F8FE] border border-[#E2ECF9] rounded-xl px-1.5 sm:px-2 flex items-center justify-between gap-0.5 sm:gap-1 overflow-hidden">
            {/* Calendar Icon + Price */}
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
              <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#1865F2] shrink-0" />
              <span className="text-[11.5px] sm:text-[12.5px] font-extrabold text-[#0B1536] leading-none whitespace-nowrap">
                ₹{priceNum.toLocaleString("en-IN")}
              </span>
              <span className="text-[8px] sm:text-[8.5px] text-[#64748B] font-medium leading-none whitespace-nowrap">
                / session
              </span>
            </div>

            {/* Vertical Separator */}
            <div className="w-[1px] h-2.5 sm:h-3 bg-[#CBDCF7] shrink-0" />

            {/* Green Online Dot + Available Today */}
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shrink-0" />
              <span className="text-[8.5px] sm:text-[9.5px] font-semibold text-[#0E9D5C] whitespace-nowrap truncate">
                {mentor.activeTime || "Available Today"}
              </span>
            </div>
          </div>

          {/* Book Session → Prominent Blue Gradient Button */}
          <button
            type="button"
            onClick={handleBookNow}
            className="group shrink-0 h-[34px] sm:h-[35px] px-2 sm:px-2.5 rounded-xl bg-gradient-to-r from-[#1E6BFE] to-[#0A56E8] hover:from-[#175FEA] hover:to-[#0848C9] active:scale-[0.98] text-white font-bold text-[10px] sm:text-[10.5px] shadow-[0_2px_8px_rgba(24,101,242,0.22)] transition-all flex items-center justify-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B8FF]"
          >
            <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white shrink-0" />
            <span className="whitespace-nowrap">Book Session</span>
            <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* 6. View Profile Button */}
        <button
          type="button"
          onClick={handleViewProfile}
          className="w-full h-[34px] sm:h-[35px] rounded-full border-[1.5px] border-[#0755E8] bg-white hover:bg-[#EAF2FF] text-[#0755E8] hover:text-[#0645C7] hover:border-[#0645C7] active:scale-[0.99] text-[10.5px] sm:text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-[0_2px_8px_rgba(7,85,232,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B8FF]"
        >
          <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#0755E8] stroke-[2.2]" />
          <span>View Profile</span>
        </button>
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

      {/* 3. Bio Box Skeleton */}
      <div className="h-8.5 sm:h-9.5 w-full bg-[#F2F6FE] border border-[#E4EDFC] rounded-xl shimmer-shining" />

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
