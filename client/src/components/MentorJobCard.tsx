import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

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

// SVG Icons — no emojis
const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? "#EF4444" : "none"} stroke={filled ? "#EF4444" : "#4F46E5"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-colors">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const VerifiedIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0">
    <circle cx="12" cy="12" r="10" fill="#4F46E5"/>
    <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

const PeopleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
  </svg>
);

const StarIcon = ({ filled = true, size = 16 }: { filled?: boolean, size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#FBBF24" : "none"} stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

const ClockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#4F46E5]">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const ChevronRightIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#22c55e] shrink-0">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" strokeWidth="3" />
  </svg>
);

// Company logos as SVG
const CompanyLogo = ({ company }: { company: string }) => {
  const name = (company || "").toLowerCase();
  if (name.includes("amazon")) return (
    <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0">
      <text x="1" y="16" fontSize="14" fontWeight="900" fill="#FF9900" fontFamily="Arial">a</text>
      <path d="M3 17.5 Q12 21 21 17.5" stroke="#FF9900" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M19.5 16.5 L22 17.5 L20 19" stroke="#FF9900" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  if (name.includes("microsoft")) return (
    <svg width="15" height="15" viewBox="0 0 18 18" className="shrink-0">
      <rect x="0" y="0" width="8.5" height="8.5" fill="#F25022"/>
      <rect x="9.5" y="0" width="8.5" height="8.5" fill="#7FBA00"/>
      <rect x="0" y="9.5" width="8.5" height="8.5" fill="#00A4EF"/>
      <rect x="9.5" y="9.5" width="8.5" height="8.5" fill="#FFB900"/>
    </svg>
  );
  if (name.includes("google")) return (
    <svg width="15" height="15" viewBox="0 0 24 24" className="shrink-0">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
  if (name.includes("meta") || name.includes("facebook")) return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#0866FF" className="shrink-0">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15.5v-4.5H9.5V11H11V9.5c0-1.66 1.01-2.5 2.5-2.5.71 0 1.5.13 1.5.13V8.5h-.84c-.83 0-1.16.52-1.16 1.04V11h2l-.32 2H13v4.5h-2z"/>
    </svg>
  );
  return null;
};

interface MentorJobCardProps {
    mentor: MentorProfile;
    /**
     * Tri-state, only meaningful inside a centered-snap carousel:
     * - `undefined` (default): plain grid/list usage - full-strength appearance, unchanged from before.
     * - `true`: this card is the carousel's centered/focused card - subtle scale + ring highlight.
     * - `false`: this card is an inactive neighbor inside a carousel - slightly receded so the centered card pops.
     */
    isActive?: boolean;
}

export const MentorJobCard = React.memo(({ mentor, isActive }: MentorJobCardProps) => {
    const navigate = useNavigate();
    const [avatarFailed, setAvatarFailed] = useState(false);
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
        navigate(`/book-session`, {
            state: {
                expertId: mentor.expertID,
                profile: { ...mentor }
            }
        });
    };

    const handleCardClick = () => {
        navigate(`/book-session`, {
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

    // Price Calculations
    const hasPriceRange = mentor.minPrice !== undefined && mentor.maxPrice !== undefined && mentor.minPrice !== mentor.maxPrice && mentor.minPrice > 0;
    
    let cleanPrice = "";
    let originalPrice = "";
    let discountPercent = 0;

    if (hasPriceRange) {
      cleanPrice = `₹${mentor.minPrice!.toLocaleString("en-IN")} - ₹${mentor.maxPrice!.toLocaleString("en-IN")}`;
      
      const minOrig = mentor.minOriginalPrice || Math.round(mentor.minPrice! / 0.77);
      const maxOrig = mentor.maxOriginalPrice || Math.round(mentor.maxPrice! / 0.77);
      
      originalPrice = `₹${minOrig.toLocaleString("en-IN")} - ₹${maxOrig.toLocaleString("en-IN")}`;
      
      // Average discount percent
      const avgPrice = (mentor.minPrice! + mentor.maxPrice!) / 2;
      const avgOrig = (minOrig + maxOrig) / 2;
      discountPercent = Math.round(((avgOrig - avgPrice) / avgOrig) * 100);
    } else {
      const priceNum = mentor.price && mentor.price !== "₹—" ? parseInt(mentor.price.toString().replace(/[^\d]/g, "")) : 799;
      cleanPrice = `₹${priceNum.toLocaleString("en-IN")}`;

      // Check if originalPrice was returned directly from database
      let originalPriceVal = 0;
      if (mentor.minOriginalPrice && mentor.minOriginalPrice > priceNum) {
        originalPriceVal = mentor.minOriginalPrice;
      } else {
        if (priceNum === 999) {
          originalPriceVal = 1299;
        } else if (priceNum === 899) {
          originalPriceVal = 1199;
        } else if (priceNum === 1099) {
          originalPriceVal = 1499;
        } else if (priceNum === 699) {
          originalPriceVal = 999;
        } else {
          originalPriceVal = Math.round(priceNum / 0.77);
        }
      }
      originalPrice = `₹${originalPriceVal.toLocaleString("en-IN")}`;
      discountPercent = Math.round(((originalPriceVal - priceNum) / originalPriceVal) * 100);
    }

    const isExAmazon = (mentor.company || "").toLowerCase().includes("amazon");
    const sessionDurationText = mentor.activeTime?.toLowerCase().includes("45") ? "45 mins session" : "60 mins session";



    const isTopRated = mentor.rating >= 4.8;

    return (
      <div
        onClick={handleCardClick}
        className="group/card relative flex flex-col gap-4 w-full bg-white border border-slate-200/70 rounded-[24px] px-5 py-5 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-indigo-200 transition-all duration-300 font-sans cursor-pointer overflow-hidden"
      >
        {/* Decorative gradient glow on hover */}
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br from-indigo-200/40 via-purple-100/30 to-transparent blur-2xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none" />

        {/* Save button */}
        <button
          onClick={toggleSave}
          className="absolute top-3.5 right-3.5 z-10 w-8 h-8 rounded-full bg-white/70 backdrop-blur-sm border border-white/60 shadow-sm flex items-center justify-center transition-all hover:scale-110 hover:bg-white focus:outline-none"
          aria-label="Save mentor"
        >
          <HeartIcon filled={isSaved} />
        </button>

        {/* Avatar */}
        <div className="relative shrink-0 z-10">
          <div className="w-14 h-14 rounded-full overflow-hidden border-[3px] border-[#DBEAFE] shadow-sm transition-transform duration-300 group-hover/card:scale-[1.04]">
            {showPlaceholder ? (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold text-lg uppercase">
                {(mentor.name || 'E').trim().charAt(0).toUpperCase()}
              </div>
            ) : (
              <img
                src={mentor.avatar}
                alt={mentor.name}
                className="w-full h-full object-cover bg-white"
                onError={() => setAvatarFailed(true)}
              />
            )}
          </div>
          <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm" />
        </div>

        {/* Main info */}
        <div className="relative z-10 flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[15px] font-bold text-gray-900 truncate">{mentor.name}</span>
            {mentor.isVerified && <VerifiedIcon />}
            {isTopRated && (
              <span className="text-[9px] font-black uppercase tracking-widest text-white px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shadow-sm">
                Top Rated
              </span>
            )}
            {isExAmazon && (
              <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                Ex-Amazon
              </span>
            )}
          </div>

          <p className="text-[13px] text-gray-600 font-medium mt-0.5 truncate flex items-center gap-1.5">
            {mentor.role}
            {mentor.company && (
              <>
                <span className="text-gray-300">·</span>
                <CompanyLogo company={mentor.company} />
                <span>{mentor.company}</span>
              </>
            )}
          </p>

          <div className="flex items-center gap-3 mt-1.5 flex-wrap text-[12px] text-gray-500 font-medium">
            <span className="flex items-center gap-1">
              <StarIcon size={12} />
              <span className="text-gray-800 font-bold">{mentor.rating > 0 ? mentor.rating.toFixed(1) : "4.9"}</span>
              ({mentor.reviews || 8})
            </span>
            <span className="flex items-center gap-1">
              <PeopleIcon />
              {mentor.totalSessions || 50}+ sessions
            </span>
            <span className="flex items-center gap-1 text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              {mentor.activeTime?.toLowerCase().includes("week") ? "Available This Week" : "Available Today"}
            </span>
            {mentor.category && (
              <span className="text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                {mentor.category}
              </span>
            )}
            {mentor.level && (
              <span className="text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                {mentor.level}
              </span>
            )}
          </div>

          {(mentor.skills && mentor.skills.length > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {mentor.skills.slice(0, 6).map((skill, i) => (
                <span key={i} className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-2.5 py-0.5">
                  {skill}
                </span>
              ))}
              {mentor.skills.length > 6 && (
                <span className="text-[11px] font-semibold text-slate-400 px-1 py-0.5">
                  +{mentor.skills.length - 6} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Pricing + CTA */}
        <div className="relative z-10 shrink-0 flex flex-col items-start text-left w-full gap-1.5 pt-3 border-t border-slate-100 justify-between">
          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
            <ClockIcon />
            <span>{sessionDurationText}</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-extrabold text-gray-900">{cleanPrice}</span>
            <span className="text-[11px] text-gray-400 line-through font-medium">{originalPrice}</span>
            <span className="text-[9px] font-bold px-2 py-0.5 bg-[#FEE2E2] text-[#DC2626] rounded-full shrink-0">
              {discountPercent}% OFF
            </span>
          </div>
          <button
            onClick={handleBookNow}
            className="w-full mt-1 px-4 py-2.5 bg-gradient-to-r from-[#4F46E5] to-[#4338CA] hover:from-[#4338CA] hover:to-[#3730A3] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 flex items-center justify-center gap-1.5 active:scale-[0.98]"
          >
            Book Session <ChevronRightIcon size={12} />
          </button>
        </div>
      </div>
    );
});

MentorJobCard.displayName = "MentorJobCard";
