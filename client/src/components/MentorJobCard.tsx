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

const TechSkillIcon = ({ skill }: { skill: string }) => {
  const [imgError, setImgError] = useState(false);
  
  const getIconUrl = (name: string) => {
    const n = name.toLowerCase().trim();
    const map: Record<string, string> = {
      "react": "react/react-original.svg",
      "react.js": "react/react-original.svg",
      "reactjs": "react/react-original.svg",
      "node": "nodejs/nodejs-original.svg",
      "node.js": "nodejs/nodejs-original.svg",
      "nodejs": "nodejs/nodejs-original.svg",
      "javascript": "javascript/javascript-original.svg",
      "js": "javascript/javascript-original.svg",
      "typescript": "typescript/typescript-original.svg",
      "ts": "typescript/typescript-original.svg",
      "vue": "vuejs/vuejs-original.svg",
      "vue.js": "vuejs/vuejs-original.svg",
      "angular": "angular/angular-original.svg",
      "python": "python/python-original.svg",
      "java": "java/java-original.svg",
      "c#": "csharp/csharp-original.svg",
      "c++": "cplusplus/cplusplus-original.svg",
      "aws": "amazonwebservices/amazonwebservices-original-wordmark.svg",
      "docker": "docker/docker-original.svg",
      "kubernetes": "kubernetes/kubernetes-plain.svg",
      "html": "html5/html5-original.svg",
      "css": "css3/css3-original.svg",
      "mongodb": "mongodb/mongodb-original.svg",
      "mysql": "mysql/mysql-original.svg",
      "postgresql": "postgresql/postgresql-original.svg",
      "sql": "azuresqldatabase/azuresqldatabase-original.svg",
      "next.js": "nextjs/nextjs-original.svg",
      "nextjs": "nextjs/nextjs-original.svg",
      "tailwind": "tailwindcss/tailwindcss-original.svg",
      "figma": "figma/figma-original.svg",
      "git": "git/git-original.svg",
      "go": "go/go-original.svg",
      "rust": "rust/rust-plain.svg",
      "php": "php/php-original.svg",
      "ruby": "ruby/ruby-original.svg",
      "spring": "spring/spring-original.svg"
    };
    
    if (map[n]) {
      return `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${map[n]}`;
    }
    
    // Attempt a direct guess for others
    const simple = n.replace(/[^a-z0-9]/g, '');
    return `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${simple}/${simple}-original.svg`;
  };

  if (!imgError) {
    return (
      <div 
        className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-white bg-white shadow-sm relative z-[1] hover:z-10 hover:scale-110 transition-transform cursor-help overflow-hidden"
        title={skill}
      >
        <img 
          src={getIconUrl(skill)} 
          alt={skill} 
          className="w-4 h-4 object-contain"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Fallback to letters
  const colors = [
    "bg-blue-100 text-blue-700 border-blue-200",
    "bg-rose-100 text-rose-700 border-rose-200",
    "bg-emerald-100 text-emerald-700 border-emerald-200",
    "bg-amber-100 text-amber-700 border-amber-200",
    "bg-purple-100 text-purple-700 border-purple-200",
    "bg-cyan-100 text-cyan-700 border-cyan-200",
    "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
    "bg-orange-100 text-orange-700 border-orange-200",
  ];
  let hash = 0;
  for (let c = 0; c < skill.length; c++) hash = skill.charCodeAt(c) + ((hash << 5) - hash);
  const colorClass = colors[Math.abs(hash) % colors.length];

  return (
    <div 
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-sm text-[11px] font-black relative z-[1] hover:z-10 hover:scale-110 transition-transform cursor-help ${colorClass}`}
      title={skill}
    >
      {skill.charAt(0).toUpperCase()}
    </div>
  );
};

export const MentorJobCard = React.memo(({ mentor }: { mentor: MentorProfile }) => {
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



    return (
      <div 
        onClick={handleCardClick}
        className="bg-white border border-slate-200 rounded-3xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] w-full max-w-[280px] sm:max-w-[290px] flex flex-col items-center relative hover:shadow-[0_12px_35px_rgba(124,58,237,0.08)] hover:border-purple-300 transition-all duration-300 font-sans cursor-pointer h-full justify-between gap-3.5"
      >
        {/* Heart button */}
        <button
          onClick={toggleSave}
          className="absolute top-3.5 right-3.5 transition-transform hover:scale-110 focus:outline-none z-30"
          aria-label="Save mentor"
        >
          <HeartIcon filled={isSaved} />
        </button>

        {/* Available Today / Available This Week Badge */}
        <div className="absolute top-3.5 left-3.5 inline-flex items-center gap-1 bg-[#f0fdf4] border border-[#dcfce7] text-[#166534] text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
          {mentor.activeTime?.toLowerCase().includes("week") ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0" />
              Available This Week
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0" />
              Available Today
            </>
          )}
        </div>

        {/* Top Spacer to push content below absolute tags */}
        <div className="w-full pt-5 flex flex-col items-center">
          {/* Avatar Container */}
          <div className="relative shrink-0 mb-2.5">
            <div
              className="w-[84px] h-[84px] rounded-full overflow-hidden border-[3px] border-[#DBEAFE]"
            >
              {showPlaceholder ? (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold text-xl uppercase">
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
            <span className="absolute bottom-0.5 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          </div>

          {/* Name & Verified Badge */}
          <div className="flex items-center justify-center gap-1.5 mb-0.5 w-full px-2">
            <span className="text-[16px] font-bold text-gray-900 leading-tight truncate">{mentor.name}</span>
            {mentor.isVerified && <VerifiedIcon />}
          </div>

          {/* Role */}
          <p className="text-[11px] text-gray-500 font-semibold mb-1 truncate max-w-full px-2">{mentor.role}</p>
          
          {/* Company */}
          <div className="flex items-center justify-center gap-1.5 mb-2 max-w-full px-2">
            {mentor.company && (
              <>
                <CompanyLogo company={mentor.company} />
                <span className="text-xs font-bold text-gray-600 truncate">{mentor.company}</span>
              </>
            )}
            {isExAmazon && (
              <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full shrink-0">
                Ex-Amazon
              </span>
            )}
          </div>

          {/* Category & Level Badges */}
          <div className="flex items-center justify-center gap-2 mb-3.5 flex-wrap px-2">
            {mentor.category && (
              <span className="text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 bg-purple-50 text-purple-600 border border-purple-100 rounded-md shrink-0">
                {mentor.category} Category
              </span>
            )}
            {mentor.level && (
              <span className="text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-md shrink-0">
                {mentor.level}
              </span>
            )}
          </div>



          {/* Metrics box (Centered divided box) */}
          <div className="flex items-center justify-center gap-4 py-2 border-t border-b border-slate-100 w-full px-1">
            <div className="flex items-center gap-1 text-xs text-gray-500 font-semibold">
              <StarIcon size={14} />
              <span className="text-gray-900 font-bold">{mentor.rating > 0 ? mentor.rating.toFixed(1) : "4.9"}</span>
              <span className="text-gray-400">({mentor.reviews || 8})</span>
            </div>
            
            <div className="w-px h-3 bg-slate-200" />
            
            <div className="flex items-center gap-1 text-xs text-gray-500 font-semibold">
              <PeopleIcon />
              <span className="text-gray-900 font-bold">{mentor.totalSessions || 50}+</span>
              <span className="text-gray-400">Sessions</span>
            </div>
          </div>
        </div>

        {/* Pricing + CTA + Next Available Column */}
        <div className="w-full flex flex-col items-center">
          {/* Pricing & Duration */}
          <div className="text-left w-full mb-2.5 px-1">
            <div className="flex items-center gap-1.5 mb-1 text-slate-500 font-semibold text-xs">
              <ClockIcon />
              <span>{sessionDurationText}</span>
            </div>
            <div className="flex items-baseline gap-1.5 flex-nowrap w-full overflow-hidden">
              <span className="text-xl font-extrabold text-gray-900 shrink-0">{cleanPrice}</span>
              <span className="text-[11px] text-gray-400 line-through font-medium shrink truncate">{originalPrice}</span>
              <span className="text-[9px] font-bold px-2 py-0.5 bg-[#FEE2E2] text-[#DC2626] rounded-md shrink-0">
                {discountPercent}% OFF
              </span>
            </div>
          </div>

          {/* CTA Book Session button */}
          <button
            onClick={handleBookNow}
            className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-sm py-2.5 rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform mb-2.5"
          >
            Book Session <ChevronRightIcon size={14} />
          </button>

          {/* Tech Stack Icons (Replaced Next Available Bar) */}
          <div className="w-full flex items-center justify-center mt-1">
            <div className="flex -space-x-2.5 p-1">
              {(mentor.skills || []).slice(0, 5).map((skill, i) => (
                <TechSkillIcon key={i} skill={skill} />
              ))}
              {mentor.skills && mentor.skills.length > 5 && (
                 <div className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-sm text-[10px] font-bold bg-slate-100 text-slate-600 relative z-[1]">
                   +{mentor.skills.length - 5}
                 </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
});

MentorJobCard.displayName = "MentorJobCard";
