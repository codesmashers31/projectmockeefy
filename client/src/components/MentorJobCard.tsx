import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, MapPin, FileText, Briefcase, Star, Clock, ChevronRight, Check, Zap } from "lucide-react";
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
        const saved = localStorage.getItem("savedExperts");
        if (saved) {
            const parsed = JSON.parse(saved);
            return parsed.some((m: MentorProfile) => m.expertID === mentor.expertID);
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
                profile: { ...mentor }
            }
        });
    };

    const handleCardClick = () => {
        navigate(`/book-session?expertId=${mentor.expertID}`, {
            state: {
                expertId: mentor.expertID,
                profile: { ...mentor }
            }
        });
    };

    const toggleSave = (e: React.MouseEvent) => {
        e.stopPropagation();
        const saved = localStorage.getItem("savedExperts");
        let parsed: MentorProfile[] = saved ? JSON.parse(saved) : [];

        if (isSaved) {
            parsed = parsed.filter((m) => m.expertID !== mentor.expertID);
        } else {
            parsed.push(mentor);
        }

        localStorage.setItem("savedExperts", JSON.stringify(parsed));
        setIsSaved(!isSaved);
        window.dispatchEvent(new Event("storage"));
    };

    const showPlaceholder = !mentor.avatar || 
                            mentor.avatar.includes("default-avatar.png") || 
                            mentor.avatar.includes("mockeefy.png") || 
                            avatarFailed;

    const priceNum = mentor.price && mentor.price !== "₹—" 
      ? parseInt(mentor.price.toString().replace(/[^\d]/g, "")) 
      : (mentor.minPrice || 999);
    
    let originalPriceVal = mentor.minOriginalPrice && mentor.minOriginalPrice > priceNum 
      ? mentor.minOriginalPrice 
      : Math.round(priceNum * 1.30);
    
    const discountPercent = Math.round(((originalPriceVal - priceNum) / originalPriceVal) * 100);
    const initials = (mentor.name || 'MT').trim().split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    // Bio fallback
    const bioText = mentor.bio && mentor.bio.trim().length > 10 
      ? mentor.bio 
      : `${mentor.experience || '5+ Years'} of hands-on industry experience in ${mentor.role || mentor.category || 'Tech'} at ${mentor.company || 'Top Tech Companies'}. Mentoring professionals for interview preparation.`;

    return (
      <div
        onClick={handleCardClick}
        className="w-full bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-[0_2px_6px_-3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer text-left font-sans"
      >
        <div className="space-y-2">
          {/* 1. TOP HEADER ROW: Title + Company + Rating (Left) and Avatar/Logo (Right) */}
          <div className="flex items-start justify-between gap-2.5">
            <div className="min-w-0 flex-1">
              <h3 className="text-[14.5px] sm:text-[15px] font-bold text-slate-900 leading-snug m-0 truncate" title={mentor.role || mentor.name}>
                {mentor.role || mentor.name}
              </h3>

              <p className="text-[12px] sm:text-[12.5px] text-slate-700 font-medium mt-0.5 m-0 truncate flex items-center gap-1.5" title={mentor.name}>
                <span className="font-semibold text-slate-800">{mentor.company || mentor.name}</span>
                <span className="flex items-center gap-1 text-slate-700 font-medium ml-0.5">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {mentor.rating > 0 ? mentor.rating.toFixed(1) : "4.9"}
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500 font-normal">{mentor.reviews || 12} Reviews</span>
              </p>
            </div>

            {/* Right Side Avatar / Logo Box */}
            <div className="relative shrink-0">
              <div className="w-10.5 h-10.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center p-0.5 overflow-hidden shadow-2xs">
                {showPlaceholder ? (
                  <span className="text-xs font-black tracking-tight text-slate-600">{initials}</span>
                ) : (
                  <img
                    src={mentor.avatar}
                    alt={mentor.name}
                    className="w-full h-full object-cover object-top rounded-lg"
                    onError={() => setAvatarFailed(true)}
                  />
                )}
              </div>
            </div>
          </div>

          {/* 2. METADATA ROW: Experience | Location | Price */}
          <div className="flex items-center gap-2.5 text-slate-600 text-[12px] font-medium flex-wrap pt-0">
            <div className="flex items-center gap-1 shrink-0">
              <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{mentor.experience || "0-1 Yrs"}</span>
            </div>

            <span className="text-slate-200">|</span>

            <div className="flex items-center gap-1 shrink-0">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{mentor.location || "Remote"}</span>
            </div>

            <span className="text-slate-200">|</span>

            <div className="flex items-center gap-1 shrink-0 font-semibold text-slate-800">
              <span>₹{priceNum.toLocaleString("en-IN")}</span>
              <span className="text-[10.5px] text-slate-400 line-through font-normal">₹{originalPriceVal.toLocaleString("en-IN")}</span>
              <span className="text-[10.5px] text-emerald-700 font-bold">({discountPercent}% OFF)</span>
            </div>
          </div>

          {/* 3. DESCRIPTION / BIO ROW WITH FILE ICON */}
          <div className="flex items-start gap-1.5 text-[12px] text-slate-600 leading-snug">
            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <p className="m-0 line-clamp-1 text-slate-600 font-normal">
              {bioText}
            </p>
          </div>

          {/* 4. SKILLS ROW: Dot-separated skill list */}
          <div className="text-[11.5px] text-slate-500 font-normal flex items-center gap-1.5 flex-wrap">
            {mentor.skills && mentor.skills.length > 0 ? (
              mentor.skills.slice(0, 5).map((skill, idx) => (
                <React.Fragment key={idx}>
                  <span>{skill}</span>
                  {idx < Math.min(mentor.skills.length - 1, 4) && (
                    <span className="text-slate-300 font-bold">•</span>
                  )}
                </React.Fragment>
              ))
            ) : (
              <span>Technical Prep • System Design • Problem Solving • Architecture</span>
            )}
            {mentor.skills && mentor.skills.length > 5 && (
              <span className="text-slate-400 text-[10.5px] font-normal ml-0.5">
                +{mentor.skills.length - 5} more
              </span>
            )}
          </div>
        </div>

        {/* 5. FOOTER: Time on Left, Save & Book on Right */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <span className="text-[11.5px] text-slate-400 font-normal">
            {mentor.activeTime || "Available Today"}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleSave}
              className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 text-xs font-semibold py-1 px-1.5 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
              aria-label="Save mentor"
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-slate-800 text-slate-800" : "text-slate-600 stroke-[1.8]"}`} />
              <span>Save</span>
            </button>

            <button
              onClick={handleViewProfile}
              className="px-3 py-1 rounded-lg border border-black text-black hover:bg-black hover:text-white active:scale-95 text-[11.5px] font-bold transition-all cursor-pointer"
            >
              View Profile
            </button>

            <button
              onClick={handleBookNow}
              className="px-3 py-1 rounded-lg border border-black text-black hover:bg-black hover:text-white active:scale-95 text-[11.5px] font-bold transition-all cursor-pointer"
            >
              Book Session
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
      </div>
    );
  });

MentorJobCard.displayName = "MentorJobCard";


