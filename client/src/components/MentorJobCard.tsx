import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Star, Briefcase, Users, Clock, Calendar, ChevronRight, Zap, Check } from "lucide-react";

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
    const isTopRated = mentor.rating >= 4.5;
    const initials = (mentor.name || 'E').trim().split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    return (
      <div
        onClick={handleCardClick}
        className="group/card relative flex flex-col gap-3.5 w-full h-full bg-white border border-slate-200/80 rounded-[28px] p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-[#2F5FFF]/35 transition-all duration-300 font-sans cursor-pointer overflow-hidden text-left"
      >
        {/* Decorative gradient glow on hover */}
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br from-indigo-200/40 via-purple-100/30 to-transparent blur-2xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none" />

        {/* Top Row: Status pill & Save heart */}
        <div className="flex items-center justify-between z-10">
          <span className="inline-flex items-center gap-1.5 bg-[#E8FBF1] text-[#0E9D5C] text-[11px] font-extrabold px-2.5 py-1 rounded-full border border-[#0E9D5C]/10">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0E9D5C] shrink-0" />
            {mentor.activeTime?.toLowerCase().includes("week") ? "Available This Week" : "Available Today"}
          </span>
          <button
            onClick={toggleSave}
            className="w-8 h-8 rounded-full bg-white border border-slate-200/60 shadow-sm flex items-center justify-center transition-all hover:scale-115 hover:bg-slate-50 focus:outline-none"
            aria-label="Save mentor"
          >
            <Heart className={`w-4 h-4 transition-colors ${isSaved ? "text-red-500 fill-red-500" : "text-slate-400 hover:text-red-500"}`} />
          </button>
        </div>

        {/* Profile Info Row: Avatar & Name details */}
        <div className="flex items-start gap-4 z-10">
          {/* Avatar Container */}
          <div className="relative shrink-0">
            <div className="w-15 h-15 rounded-full overflow-hidden border-[3px] border-[#EEF2FF] shadow-sm transition-transform duration-300 group-hover/card:scale-[1.03] flex items-center justify-center bg-[#EEF2FF] text-[#2F5FFF] font-black text-base uppercase">
              {showPlaceholder ? (
                initials
              ) : (
                <img
                  src={mentor.avatar}
                  alt={mentor.name}
                  className="w-full h-full object-cover bg-white"
                  onError={() => setAvatarFailed(true)}
                />
              )}
            </div>
            <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm" />
          </div>

          {/* Name & Job Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[17px] font-black text-slate-900 leading-tight">{mentor.name}</span>
              {mentor.isVerified && <VerifiedIcon />}
            </div>
            <p className="text-[13px] text-slate-500 font-bold mt-1 tracking-tight">{mentor.role}</p>
            {mentor.company && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white border border-slate-200/70 rounded-lg shadow-sm">
                  <CompanyLogo company={mentor.company} />
                  <span className="text-xs font-black text-slate-800">{mentor.company}</span>
                </div>
                <span className="text-[10px] font-black text-[#2F5FFF] bg-[#EAF2FF] border border-[#2F5FFF]/15 px-2.5 py-0.5 rounded-lg">
                  Ex-{mentor.company}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Highlight Badges */}
        <div className="flex items-center gap-2 flex-wrap z-10">
          <span className="flex items-center gap-1.5 text-[10.5px] font-black text-[#D9720C] bg-[#FFF6E5] border border-[#FFE8CC]/45 px-2.5 py-1 rounded-lg">
            <StarIcon size={12} filled={true} /> Top Rated Expert
          </span>
          <span className="flex items-center gap-1.5 text-[10.5px] font-black text-[#2F5FFF] bg-[#EEF2FF] border border-[#DCE8FF]/45 px-2.5 py-1 rounded-lg">
            <Zap className="w-3.5 h-3.5 text-[#2F5FFF] fill-[#2F5FFF]" /> Booked {mentor.totalSessions > 15 ? mentor.totalSessions : "20"}+ times this week
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-1 py-3.5 border-y border-slate-100/80 z-10 text-left">
          {/* Exp */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#2F5FFF] shrink-0 border border-blue-100/50">
              <Briefcase className="w-4 h-4" />
            </div>
            <div className="leading-tight">
              <div className="text-xs font-black text-slate-800">{mentor.experience || "Fresher"}</div>
              <div className="text-[9px] text-slate-400 font-bold mt-0.5 whitespace-nowrap">Years Exp.</div>
            </div>
          </div>
          {/* Sessions */}
          <div className="flex items-center gap-2 border-l border-slate-100/80 pl-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-[#0E9D5C] shrink-0 border border-emerald-100/50">
              <Users className="w-4 h-4" />
            </div>
            <div className="leading-tight">
              <div className="text-xs font-black text-slate-800">{mentor.totalSessions || 0}+</div>
              <div className="text-[9px] text-slate-400 font-bold mt-0.5">Sessions</div>
            </div>
          </div>
          {/* Rating */}
          <div className="flex items-center gap-2 border-l border-slate-100/80 pl-2">
            <div className="w-8 h-8 rounded-full bg-amber-50/70 flex items-center justify-center text-[#D9720C] shrink-0 border border-amber-100/50">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
            <div className="leading-tight">
              <div className="text-xs font-black text-slate-800">{mentor.rating > 0 ? mentor.rating.toFixed(1) : "4.9"}</div>
              <div className="text-[9px] text-slate-400 font-bold mt-0.5">({mentor.reviews || 8} Reviews)</div>
            </div>
          </div>
        </div>

        {/* Skills Tags */}
        {mentor.skills && mentor.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 z-10">
            {mentor.skills.slice(0, 5).map((skill, i) => (
              <span key={i} className="text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200/50 rounded-full px-2.5 py-0.5">
                {skill}
              </span>
            ))}
            {mentor.skills.length > 5 && (
              <span className="text-[11px] font-extrabold text-[#2F5FFF] px-1 py-0.5">
                +{mentor.skills.length - 5} more
              </span>
            )}
          </div>
        )}

        {/* Next Available slot box */}
        <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl px-3.5 py-2.5 z-10 text-left mt-auto">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#2F5FFF]" />
            <div className="leading-tight">
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Next Available</div>
              <div className="text-[11.5px] text-slate-800 font-black mt-0.5">{mentor.activeTime || "Today, 6:30 PM"}</div>
            </div>
          </div>
          <button
            onClick={handleBookNow}
            className="text-[11px] font-black text-[#2F5FFF] hover:text-blue-700 flex items-center gap-0.5"
          >
            View Slots <ChevronRight className="w-3.5 h-3.5 stroke-[3.5]" />
          </button>
        </div>

        {/* Pricing + CTA Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-1.5 pt-3.5 border-t border-slate-100 z-10 text-left">
          {/* Pricing Details */}
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-[#2F5FFF]" />
              <span>{sessionDurationText}</span>
            </div>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-[20px] font-black text-slate-900 leading-none">{cleanPrice}</span>
              <span className="text-xs text-slate-400 line-through font-bold">{originalPrice}</span>
              <span className="text-[9px] font-black px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-full shrink-0">
                {discountPercent}% OFF
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-1.5 shrink-0 sm:w-[150px]">
            <button
              onClick={handleBookNow}
              className="w-full px-4 py-2.5 bg-[#2F5FFF] hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 transition-all active:scale-[0.98] shadow-sm shadow-blue-500/10"
            >
              Book Session <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
            </button>
            <button
              onClick={handleCardClick}
              className="w-full px-4 py-2.5 bg-white border border-[#2F5FFF]/30 hover:border-[#2F5FFF] hover:bg-slate-50 text-[#2F5FFF] font-extrabold text-xs rounded-xl flex items-center justify-center transition-all active:scale-[0.98]"
            >
              View Profile
            </button>
          </div>
        </div>

        {/* Footer placement success line */}
        <div className="mt-1.5 pt-3 border-t border-slate-100 z-10 text-left">
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-extrabold">
            <Check className="w-4 h-4 text-emerald-600 stroke-[3.5] shrink-0" />
            <span>Placed {mentor.totalSessions > 0 ? mentor.totalSessions * 2 + 20 : "120"}+ Candidates</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
          </div>
          <p className="text-[11px] text-slate-400 font-bold mt-0.5">Mentored professionals at top companies</p>
        </div>
      </div>
    );
});

MentorJobCard.displayName = "MentorJobCard";
