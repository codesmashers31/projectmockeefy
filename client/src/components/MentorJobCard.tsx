import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bookmark,
  MapPin,
  Briefcase,
  Star,
  CheckCircle2,
  ArrowRight,
  Heart,
} from "lucide-react";
import { toast } from "sonner";
import { BookingModal } from "./BookingModal";

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
    } catch (e) {
      console.error("Failed to toggle save", e);
    }
  };

  const showPlaceholder =
    !mentor.avatar ||
    mentor.avatar.includes("default-avatar.png") ||
    mentor.avatar.includes("mockeefy.png") ||
    avatarFailed;

  const priceNum =
    mentor.price && mentor.price !== "₹—"
      ? parseInt(mentor.price.toString().replace(/[^\d]/g, ""), 10) || 799
      : mentor.minPrice || 799;

  const initials = (mentor.name || "Interview Expert")
    .trim()
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const bioText =
    mentor.bio && mentor.bio.trim().length > 10
      ? mentor.bio
      : `${mentor.experience || "5+ Years"} of experience in ${
          mentor.role || mentor.category || "Software Engineering"
        }${
          mentor.company ? ` at ${mentor.company}` : ""
        }. Focuses on technical mock interviews and system design drills.`;

  return (
    <article
      id={`expert-card-${mentorId}`}
      data-expert-id={mentorId}
      data-expert-name={mentor.name}
      onClick={handleCardClick}
      aria-label={`Interview expert profile for ${mentor.name}`}
      className="group relative bg-white rounded-2xl border border-slate-200/80 hover:border-[#0755E8]/40 hover:shadow-[0_4px_18px_-4px_rgba(7,85,232,0.1)] transition-all duration-200 p-4 sm:p-4.5 flex flex-col justify-between h-full w-full cursor-pointer text-left box-border scroll-mt-28"
    >
      <div className="space-y-2.5 flex-1 flex flex-col">
        {/* 1. Header: Avatar + Scannable Name & Title + Bookmark */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Standardized Avatar Container (44x44) */}
            <div className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 border border-slate-200/70 overflow-hidden shrink-0 flex items-center justify-center">
              {showPlaceholder ? (
                <span className="text-xs font-black tracking-tight text-[#0755E8] bg-[#EAF2FF] w-full h-full flex items-center justify-center select-none">
                  {initials}
                </span>
              ) : (
                <img
                  src={mentor.avatar}
                  alt={mentor.name}
                  className="w-full h-full object-cover object-top"
                  onError={() => setAvatarFailed(true)}
                />
              )}
            </div>

            {/* Easily Scannable Name and Professional Title */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <h3
                  title={mentor.name}
                  className="text-[15px] sm:text-[16px] font-bold text-slate-900 tracking-tight leading-snug truncate min-w-0"
                >
                  {mentor.name}
                </h3>
                {mentor.isVerified && (
                  <span
                    title="Verified Interview Expert"
                    className="inline-flex items-center text-[#0755E8] shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 fill-[#EAF2FF]" />
                  </span>
                )}
              </div>

              {/* Sensible wrapping for job title & company: standardized 2-line height */}
              <p className="text-[12.5px] sm:text-[13px] text-slate-600 font-medium leading-snug mt-0.5 line-clamp-2 break-words min-h-[34px] sm:min-h-[36px]">
                <span>{mentor.role || "Interview Expert"}</span>
                {mentor.company && (
                  <>
                    <span className="text-slate-400 font-normal mx-1">•</span>
                    <span className="font-semibold text-slate-800">
                      {mentor.company}
                    </span>
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#0755E8] hover:bg-blue-50/70 transition-colors shrink-0 cursor-pointer"
          >
            <Bookmark
              className={`w-4 h-4 transition-colors ${
                isSaved ? "fill-[#0755E8] text-[#0755E8]" : "stroke-[1.8]"
              }`}
            />
          </button>
        </div>

        {/* 2. Metadata: Rating, Experience & Location with clear contrast */}
        <div className="flex items-center gap-2 text-[12px] sm:text-[12.5px] text-slate-600 font-medium flex-wrap">
          <div className="flex items-center gap-1 font-bold text-slate-900 shrink-0">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
            <span>{mentor.rating > 0 ? mentor.rating.toFixed(1) : "4.9"}</span>
            <span className="text-slate-400 font-normal text-[11px] sm:text-[11.5px]">
              ({mentor.reviews || 12})
            </span>
          </div>

          <span className="text-slate-300">•</span>

          <div className="flex items-center gap-1 shrink-0">
            <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{mentor.experience || "5+ yrs"}</span>
          </div>

          <span className="text-slate-300">•</span>

          <div className="flex items-center gap-1 shrink-0 text-slate-600">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{mentor.location || "Remote"}</span>
          </div>
        </div>

        {/* 3. Bio Snippet: Standardized 2-line height */}
        <p className="text-[12px] sm:text-[12.5px] text-slate-500 font-normal line-clamp-2 leading-relaxed min-h-[34px] sm:min-h-[36px]">
          {bioText}
        </p>

        {/* 4. Skill Tags: Guaranteed Single Line with 1+more or n+more */}
        <div className="flex items-center gap-1.5 flex-nowrap overflow-hidden pt-0.5">
          {mentor.skills && mentor.skills.length > 0 ? (
            <>
              {mentor.skills.slice(0, 2).map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-slate-100/90 text-slate-600 text-[11px] font-medium shrink-0 max-w-[110px] truncate whitespace-nowrap"
                >
                  {skill}
                </span>
              ))}
              {mentor.skills.length > 2 && (
                <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0 whitespace-nowrap">
                  +{mentor.skills.length - 2} more
                </span>
              )}
            </>
          ) : (
            <>
              <span className="px-2 py-0.5 rounded-md bg-slate-100/90 text-slate-600 text-[11px] font-medium shrink-0 whitespace-nowrap">
                System Design
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100/90 text-slate-600 text-[11px] font-medium shrink-0 whitespace-nowrap">
                Mock Interview
              </span>
            </>
          )}
        </div>
      </div>

      {/* 5. Pricing & Availability Row (Clean spacing, no empty dead space) */}
      <div className="pt-2.5 mt-2.5 border-t border-slate-100 space-y-2">
        <div className="flex items-center justify-between gap-1.5 min-w-0">
          <div className="flex items-baseline gap-1 shrink-0 whitespace-nowrap">
            <span className="text-[14px] sm:text-[15px] font-bold text-slate-900 leading-none">
              ₹{priceNum.toLocaleString("en-IN")}
            </span>
            <span className="text-[10px] sm:text-[10.5px] text-slate-400 font-medium">
              / session
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0 min-w-0 justify-end">
            {(() => {
              const displayLevels = Array.isArray(mentor.levels) && mentor.levels.length > 0
                ? mentor.levels
                : mentor.level
                ? [mentor.level]
                : [];
              if (displayLevels.length === 0) return null;
              const primary = mentor.level || displayLevels[0];
              const remaining = displayLevels.length - 1;

              return (
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    title={displayLevels.join(", ")}
                    className="inline-flex items-center text-[9px] sm:text-[9.5px] font-bold text-[#0755E8] bg-[#EAF2FF] px-1.5 py-0.5 rounded-full border border-[#93B8FF]/40 shrink-0 max-w-[95px] sm:max-w-[110px] truncate leading-none"
                  >
                    {primary}
                  </span>
                  {remaining > 0 && (
                    <span
                      title={`Supported Levels:\n• ${displayLevels.join("\n• ")}`}
                      className="inline-flex items-center text-[8.5px] sm:text-[9px] font-bold text-[#0755E8] bg-[#EAF2FF] px-1 py-0.5 rounded-full border border-[#93B8FF]/40 shrink-0 cursor-help leading-none"
                    >
                      +{remaining}
                    </span>
                  )}
                </div>
              );
            })()}
            <span className="inline-flex items-center gap-1 text-[9px] sm:text-[9.5px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100/80 shrink-0 whitespace-nowrap leading-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>{mentor.activeTime || "Available Today"}</span>
            </span>
          </div>
        </div>

        {/* 6. Dedicated Bottom Action Row: Smart, refined action buttons */}
        <div className="grid grid-cols-2 gap-2 w-full pt-0.5">
          <button
            type="button"
            onClick={handleViewProfile}
            className="w-full h-8.5 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 hover:text-slate-900 active:scale-[0.98] text-[12px] sm:text-[12.5px] font-semibold transition-all text-center cursor-pointer truncate shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B8FF]"
          >
            View Profile
          </button>

          <button
            type="button"
            onClick={handleBookNow}
            className="group w-full h-8.5 px-2.5 rounded-lg bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#073AA3] active:scale-[0.98] text-white text-[12px] sm:text-[12.5px] font-semibold shadow-xs hover:shadow-sm hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-1 cursor-pointer truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B8FF]"
          >
            <span>Book Session</span>
            <ArrowRight size={13} className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
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
  <div className="relative bg-gradient-to-b from-[#f0f5ff]/60 via-white to-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between h-full w-full space-y-3 overflow-hidden shadow-xs">
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-100 shimmer-shining shrink-0" />
          <div className="flex-1 min-w-0 space-y-1.5 pt-0.5">
            <div className="h-4 w-3/5 bg-slate-200/80 rounded shimmer-shining" />
            <div className="h-3 w-4/5 bg-slate-100 rounded shimmer-shining" />
          </div>
        </div>
        <div className="w-7 h-7 rounded-lg bg-slate-100 shimmer-shining shrink-0" />
      </div>

      <div className="flex items-center gap-2">
        <div className="h-3.5 w-16 bg-slate-100 rounded shimmer-shining" />
        <div className="h-3.5 w-16 bg-slate-100 rounded shimmer-shining" />
        <div className="h-3.5 w-14 bg-slate-100 rounded shimmer-shining" />
      </div>

      <div className="space-y-1">
        <div className="h-3 w-full bg-slate-100 rounded shimmer-shining" />
        <div className="h-3 w-4/5 bg-slate-100 rounded shimmer-shining" />
      </div>

      <div className="flex items-center gap-1.5 pt-0.5">
        <div className="h-5 w-20 bg-slate-100 rounded-md shimmer-shining" />
        <div className="h-5 w-20 bg-slate-100 rounded-md shimmer-shining" />
      </div>
    </div>

    <div className="pt-2.5 mt-2.5 border-t border-slate-100 space-y-2">
      <div className="flex justify-between items-center">
        <div className="h-5 w-20 bg-slate-200/70 rounded shimmer-shining" />
        <div className="h-4.5 w-24 bg-emerald-50 rounded-full shimmer-shining" />
      </div>
      <div className="grid grid-cols-2 gap-2 w-full pt-0.5">
        <div className="h-8.5 rounded-lg bg-slate-100 shimmer-shining" />
        <div className="h-8.5 rounded-lg bg-[#0755E8]/30 shimmer-shining" />
      </div>
    </div>
  </div>
);
