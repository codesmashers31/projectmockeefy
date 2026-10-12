import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bookmark,
  MapPin,
  Briefcase,
  Star,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { BookingModal } from "./BookingModal";
import { toast } from "sonner";

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
}

interface MentorJobCardProps {
  mentor: MentorProfile;
  isActive?: boolean;
}

export const MentorJobCard = React.memo(({ mentor }: MentorJobCardProps) => {
  const navigate = useNavigate();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

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
    navigate(`/book-session?expertId=${mentor.expertID}`, {
      state: {
        expertId: mentor.expertID,
        profile: { ...mentor },
      },
    });
  };

  const handleCardClick = () => {
    navigate(`/book-session?expertId=${mentor.expertID}`, {
      state: {
        expertId: mentor.expertID,
        profile: { ...mentor },
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
        toast.info("Removed from saved mentors");
      } else {
        parsed.push(mentor);
        toast.success("Saved to your shortlist");
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

  const initials = (mentor.name || "Mentor")
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
      onClick={handleCardClick}
      aria-label={`Mentor profile for ${mentor.name}`}
      className="group relative bg-white rounded-2xl border border-slate-200/90 hover:border-[#5B4BDB]/40 hover:shadow-[0_4px_20px_-4px_rgba(91,75,219,0.08)] transition-all duration-200 p-5 flex flex-col justify-between h-full cursor-pointer text-left box-border w-full"
    >
      <div className="space-y-3.5">
        {/* 1. Header: Avatar + Scannable Name & Title + Bookmark */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Standardized Avatar Container (48x48) */}
            <div className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl bg-slate-100 border border-slate-200/70 overflow-hidden shrink-0 flex items-center justify-center">
              {showPlaceholder ? (
                <span className="text-xs font-black tracking-tight text-[#5B4BDB] bg-[#F0EDFF] w-full h-full flex items-center justify-center select-none">
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
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-[15px] font-bold text-slate-900 tracking-tight leading-snug truncate">
                  {mentor.name}
                </h3>
                {mentor.isVerified && (
                  <span
                    title="Verified Mentor"
                    className="inline-flex items-center text-[#5B4BDB] shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 fill-[#F0EDFF]" />
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 font-medium truncate mt-0.5">
                <span>{mentor.role || "Mentor"}</span>
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
            title={isSaved ? "Remove from shortlist" : "Save to shortlist"}
            aria-label={isSaved ? "Remove from shortlist" : "Save to shortlist"}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100/70 transition-colors shrink-0 cursor-pointer"
          >
            <Bookmark
              className={`w-4 h-4 transition-colors ${
                isSaved ? "fill-[#5B4BDB] text-[#5B4BDB]" : "stroke-[1.8]"
              }`}
            />
          </button>
        </div>

        {/* 2. Metadata: Rating, Experience & Location */}
        <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium flex-wrap">
          <div className="flex items-center gap-1 font-bold text-slate-900 shrink-0">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
            <span>{mentor.rating > 0 ? mentor.rating.toFixed(1) : "4.9"}</span>
            <span className="text-slate-400 font-normal">
              ({mentor.reviews || 12})
            </span>
          </div>

          <span className="text-slate-300">•</span>

          <div className="flex items-center gap-1 shrink-0">
            <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{mentor.experience || "5+ yrs"}</span>
          </div>

          <span className="text-slate-300">•</span>

          <div className="flex items-center gap-1 shrink-0 text-slate-500">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{mentor.location || "Remote"}</span>
          </div>
        </div>

        {/* 3. Bio Snippet */}
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed min-h-[34px]">
          {bioText}
        </p>

        {/* 4. Skill Tags (Limited to 3 with +N more indicator) */}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          {mentor.skills && mentor.skills.length > 0 ? (
            mentor.skills.slice(0, 3).map((skill, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium"
              >
                {skill}
              </span>
            ))
          ) : (
            <>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                System Design
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                Mock Interview
              </span>
            </>
          )}
          {mentor.skills && mentor.skills.length > 3 && (
            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
              +{mentor.skills.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* 5. Pricing & Availability Row (Above buttons for clean alignment) */}
      <div className="pt-3.5 mt-3.5 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1">
            <span className="text-[16px] font-bold text-slate-900 leading-none">
              ₹{priceNum.toLocaleString("en-IN")}
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              / session
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100/70 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>{mentor.activeTime || "Available Today"}</span>
          </span>
        </div>

        {/* 6. Dedicated Bottom Action Row: Equal-width buttons inside card borders */}
        <div className="grid grid-cols-2 gap-2 w-full pt-0.5">
          <button
            type="button"
            onClick={handleViewProfile}
            className="w-full py-2 px-3 rounded-xl border border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:scale-95 text-xs font-semibold transition-all text-center cursor-pointer truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4BDB]"
          >
            View Profile
          </button>

          <button
            type="button"
            onClick={handleBookNow}
            className="w-full py-2 px-3 rounded-xl bg-[#5B4BDB] hover:bg-[#4938C8] active:bg-[#3F2FB3] text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4BDB]"
          >
            <span>Book Session</span>
            <ArrowRight size={13} className="shrink-0" />
          </button>
        </div>
      </div>

      {/* In-place Booking Box Modal */}
      {isBookingModalOpen && (
        <BookingModal
          isOpen={true}
          onClose={() => setIsBookingModalOpen(false)}
          expertId={mentor.expertID}
          initialProfile={mentor}
        />
      )}
    </article>
  );
});

MentorJobCard.displayName = "MentorJobCard";

export const MentorCardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4">
    <div className="flex items-start gap-3">
      <div className="w-12 h-12 rounded-xl bg-slate-100 shimmer-shining shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/5 bg-slate-100 rounded shimmer-shining" />
        <div className="h-3 w-4/5 bg-slate-100 rounded shimmer-shining" />
      </div>
    </div>
    <div className="h-3 w-2/3 bg-slate-100 rounded shimmer-shining" />
    <div className="h-9 w-full bg-slate-100 rounded shimmer-shining" />
    <div className="flex gap-2">
      <div className="h-5 w-16 bg-slate-100 rounded shimmer-shining" />
      <div className="h-5 w-20 bg-slate-100 rounded shimmer-shining" />
      <div className="h-5 w-14 bg-slate-100 rounded shimmer-shining" />
    </div>
    <div className="pt-3.5 border-t border-slate-100 space-y-3">
      <div className="flex justify-between items-center">
        <div className="h-5 w-20 bg-slate-100 rounded shimmer-shining" />
        <div className="h-5 w-24 bg-slate-100 rounded-full shimmer-shining" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-8 rounded-xl bg-slate-100 shimmer-shining" />
        <div className="h-8 rounded-xl bg-slate-100 shimmer-shining" />
      </div>
    </div>
  </div>
);
