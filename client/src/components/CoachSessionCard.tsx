import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MentorJobCard, MentorProfile } from "./MentorJobCard";
import { 
  AlertCircle, Search, X, SlidersHorizontal, ChevronLeft, ChevronRight, ArrowRight, ChevronDown, ChevronUp, Star, CheckCircle2, Check,
  Award, Layers, Terminal, Globe, Smartphone, Cloud, Cpu, ShieldCheck, Database, CheckSquare, 
  Users, Network, Sparkles, UserCheck, Briefcase, Palette, Clock, Calendar
} from "lucide-react";
import axios from '../lib/axios';
import { getProfileImageUrl } from "../lib/imageUtils";
import { useQuery } from "@tanstack/react-query";
import { calculateAge, calculateProfessionalExperience, getCurrentCompany, getJobTitle } from "../lib/expertUtils";
import ExpertCard from "./ExpertCard";

const categoryDescriptions: Record<string, string> = {
  "IT": "Learn from industry-leading software engineers, architects, and tech leaders.",
  "MERN Stack": "Master React, Node.js, Express, and MongoDB with hands-on developers.",
  "Software Engineering": "Improve your coding skills, system design, and ace your coding interviews.",
  "Web Development": "Build modern, fast, and responsive websites using modern frontend frameworks.",
  "Mobile Development": "Develop premium iOS and Android applications using React Native, Flutter, or native swift/kotlin.",
  "DevOps & Cloud": "Deploy and scale your applications with Docker, Kubernetes, AWS, and GCP.",
  "Data Science & ML": "Deep dive into Python, data analytics, neural networks, and AI modeling.",
  "Cyber Security": "Protect applications, audit security vulnerability, and manage IAM access controls.",
  "Database Administration": "Optimize your database queries, indexing strategies, and database schemas.",
  "QA & Testing": "Write automated test suites, run selenium/cypress, and configure CI/CD pipelines.",
  "Agile & Scrum": "Learn scrum master methodologies, project delivery, and team management.",
  "System Design": "Design scalable microservices, load balancers, caching layers, and database sharding.",
  "Generative AI": "Build apps with LLMs, prompt engineering, OpenAI, and LangChain.",
  "HR & Recruitment": "Ace your behavioral interviews, polish your resume, and negotiate your salary.",
  "Business & Management": "Learn startup operations, product launch strategies, and sales pipelines.",
  "UI/UX Design": "Create stunning user experiences, mockups, color palettes, and Figma layouts."
};

const getCategoryDescription = (cat: string) => {
  const t = cat.toLowerCase().trim();
  for (const [key, desc] of Object.entries(categoryDescriptions)) {
    if (t.includes(key.toLowerCase()) || key.toLowerCase().includes(t)) {
      return desc;
    }
  }
  return "Connect with handpicked industry experts for personalized mock interviews and mentorship.";
};

const getCategoryIconDetails = (title: string) => {
  const t = title.toLowerCase().trim();
  if (t === "it" || t === "top rated experts") {
    return { icon: <Award className="w-5 h-5 text-amber-500" />, bg: "bg-amber-50 border-amber-100/50" };
  }
  if (t.includes("mern") || t.includes("full stack")) {
    return { icon: <Layers className="w-5 h-5 text-indigo-600" />, bg: "bg-indigo-50 border-indigo-100/50" };
  }
  if (t.includes("software")) {
    return { icon: <Terminal className="w-5 h-5 text-blue-600" />, bg: "bg-blue-50 border-blue-100/50" };
  }
  if (t.includes("web")) {
    return { icon: <Globe className="w-5 h-5 text-emerald-600" />, bg: "bg-emerald-50 border-emerald-100/50" };
  }
  if (t.includes("mobile")) {
    return { icon: <Smartphone className="w-5 h-5 text-purple-600" />, bg: "bg-purple-50 border-purple-100/50" };
  }
  if (t.includes("devops") || t.includes("cloud")) {
    return { icon: <Cloud className="w-5 h-5 text-cyan-600" />, bg: "bg-cyan-50 border-cyan-100/50" };
  }
  if (t.includes("data science") || t.includes("ml")) {
    return { icon: <Cpu className="w-5 h-5 text-teal-600" />, bg: "bg-teal-50 border-teal-100/50" };
  }
  if (t.includes("cyber") || t.includes("security")) {
    return { icon: <ShieldCheck className="w-5 h-5 text-rose-600" />, bg: "bg-rose-50 border-rose-100/50" };
  }
  if (t.includes("database") || t.includes("db")) {
    return { icon: <Database className="w-5 h-5 text-slate-600" />, bg: "bg-slate-50 border-slate-200/50" };
  }
  if (t.includes("qa") || t.includes("test")) {
    return { icon: <CheckSquare className="w-5 h-5 text-amber-600" />, bg: "bg-amber-50 border-amber-100/50" };
  }
  if (t.includes("agile") || t.includes("project")) {
    return { icon: <Users className="w-5 h-5 text-orange-600" />, bg: "bg-orange-50 border-orange-100/50" };
  }
  if (t.includes("system design")) {
    return { icon: <Network className="w-5 h-5 text-violet-600" />, bg: "bg-violet-50 border-violet-100/50" };
  }
  if (t.includes("ai")) {
    return { icon: <Sparkles className="w-5 h-5 text-pink-600" />, bg: "bg-pink-50 border-pink-100/50" };
  }
  if (t.includes("hr")) {
    return { icon: <UserCheck className="w-5 h-5 text-pink-500" />, bg: "bg-pink-50 border-pink-100/50" };
  }
  if (t.includes("business")) {
    return { icon: <Briefcase className="w-5 h-5 text-blue-700" />, bg: "bg-blue-50 border-blue-100/50" };
  }
  if (t.includes("design")) {
    return { icon: <Palette className="w-5 h-5 text-fuchsia-600" />, bg: "bg-fuchsia-50 border-fuchsia-100/50" };
  }
  return { icon: <Award className="w-5 h-5 text-indigo-600" />, bg: "bg-indigo-50 border-indigo-100/50" };
};

/** One backend category section: header + count + side arrows + horizontal carousel with bottom dots */
const CategoryRow: React.FC<{ title: string; profiles: MentorProfile[] }> = ({ title, profiles }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const iconDetails = getCategoryIconDetails(title);
  const desc = getCategoryDescription(title);
  const displayTitle = title === "IT" ? "Top Rated Experts" : `${title} Experts`;

  const handleScroll = () => {
    if (!rowRef.current) return;
    const scrollLeft = rowRef.current.scrollLeft;
    const width = rowRef.current.clientWidth;
    if (width > 0) {
      const newIndex = Math.round(scrollLeft / width);
      setActiveIndex(Math.min(Math.max(newIndex, 0), profiles.length - 1));
    }
  };

  const scrollToIndex = (index: number) => {
    if (!rowRef.current) return;
    const targetIndex = Math.min(Math.max(index, 0), profiles.length - 1);
    const width = rowRef.current.clientWidth;
    rowRef.current.scrollTo({ left: targetIndex * width, behavior: "smooth" });
    setActiveIndex(targetIndex);
  };

  const scroll = (dir: -1 | 1) => {
    scrollToIndex(activeIndex + dir);
  };

  return (
    <section className="w-full mb-8 bg-gradient-to-b from-slate-50/40 via-white to-white border border-slate-200/90 rounded-[30px] p-5 sm:p-7 shadow-[0_4px_24px_-10px_rgba(0,0,0,0.06)] hover:shadow-lg hover:border-blue-300/60 transition-all duration-300 text-left">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl ${iconDetails.bg} flex items-center justify-center shrink-0 shadow-sm border`}>
            {iconDetails.icon}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight leading-snug m-0">
                {displayTitle}
              </h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11.5px] font-black text-emerald-800 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {profiles.length} Active {profiles.length === 1 ? 'Expert' : 'Experts'}
              </span>
            </div>
            <p className="text-[14px] sm:text-[15px] text-slate-600 font-semibold mt-1.5 leading-relaxed max-w-2xl">
              {desc}
            </p>
          </div>
        </div>
      </div>

      {/* Carousel Container with Side Navigation Buttons */}
      <div className="relative group px-0">
        {profiles.length > 3 && (
          <>
            {/* Left Button on side of card */}
            <button
              onClick={() => scroll(-1)}
              disabled={activeIndex === 0}
              className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white border border-slate-200/90 shadow-md flex items-center justify-center text-slate-700 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              aria-label="Previous expert"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            </button>

            {/* Right Button on side of card */}
            <button
              onClick={() => scroll(1)}
              disabled={activeIndex >= profiles.length - 3}
              className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white border border-slate-200/90 shadow-md flex items-center justify-center text-slate-700 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              aria-label="Next expert"
            >
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </>
        )}

        {/* List - 1 mentor per row */}
        <div
          ref={rowRef}
          onScroll={handleScroll}
          className="flex gap-4 sm:gap-4.5 overflow-x-auto pt-2 pb-2 px-1 scrollbar-none scroll-smooth snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {profiles.map((mentor) => (
            <div
              key={mentor.id}
              className="w-full min-w-full max-w-full shrink-0 snap-start flex animate-in fade-in duration-300"
            >
              <MentorJobCard mentor={mentor} />
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Dots below the mentor */}
      {profiles.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3 pt-1">
          {Array.from({ length: profiles.length }).map((_, idx) => {
            const isActive = activeIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => scrollToIndex(idx)}
                className={`transition-all duration-300 cursor-pointer ${
                  isActive
                    ? "w-6 h-2 rounded-full bg-blue-600 shadow-sm shadow-blue-500/30"
                    : "w-2 h-2 rounded-full bg-slate-300 hover:bg-slate-400"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            );
          })}
        </div>
      )}
    </section>
  );
};

const promoStyles = `
@keyframes mkFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@keyframes mkFloatTilt{0%,100%{transform:rotate(-2deg) translateY(0)}50%{transform:rotate(-2deg) translateY(-12px)}}
@keyframes mkSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes mkPulse{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:.95;transform:scale(1.08)}}
@keyframes mkTwinkle{0%,100%{opacity:0;transform:scale(.3) rotate(0deg)}50%{opacity:1;transform:scale(1) rotate(90deg)}}
@keyframes mkOrb{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-9px) scale(1.06)}}
@keyframes mkPing{0%{transform:scale(1);opacity:.8}100%{transform:scale(2.2);opacity:0}}
@keyframes mkCardSheen{0%{transform:translateX(-200px) skewX(-18deg)}55%,100%{transform:translateX(1100px) skewX(-18deg)}}
`;

const Twinkle: React.FC<{ fill: string; size: number; style: React.CSSProperties }> = ({ fill, size, style }) => (
  <svg width={size} height={size} viewBox="-10 -10 20 20" style={style}>
    <path d="M0 -9 L2.2 -2.2 L9 0 L2.2 2.2 L0 9 L-2.2 2.2 L-9 0 L-2.2 -2.2 Z" fill={fill} />
  </svg>
);

const promoCompanies = ["google.com|Google", "amazon.com|Amazon", "microsoft.com|Microsoft", "zoho.com|Zoho"].map(s => {
  const [domain, name] = s.split("|");
  return { name, icon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64` };
});

const PromoCarousel = () => {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  React.useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIdx(i => (i + 1) % 3), 6000);
    return () => clearInterval(t);
  }, [paused]);

  const sheen: React.CSSProperties = {
    position: "absolute", top: 0, bottom: 0, left: 0, width: 140, zIndex: 4,
    background: "linear-gradient(100deg,transparent,rgba(255,255,255,.09),transparent)",
    animation: "mkCardSheen 4.5s linear infinite",
  };
  const innerShadow: React.CSSProperties = {
    position: "absolute", inset: 0,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.12), inset 0 0 80px rgba(0,0,0,.3)",
  };

  return (
    <div
      className="relative w-full mb-4 text-left group"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <style>{promoStyles}</style>
      <div className="relative rounded-2xl sm:rounded-[22px] overflow-hidden border border-slate-700/20 shadow-md">
        <div className="flex" style={{ transition: "transform .65s cubic-bezier(.7,0,.25,1)", transform: `translateX(-${idx * 100}%)` }}>

          {/* ============ SLIDE 1 : PRO ============ */}
          <div className="relative flex items-center justify-between gap-4 box-border py-3.5 sm:py-4 px-5 sm:px-7" style={{ flex: "0 0 100%", background: "linear-gradient(135deg, #1c132e 0%, #261741 50%, #170d29 100%)", minHeight: 92 }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
              <div style={innerShadow} />
              <div style={sheen} />
            </div>
            
            {/* Left side info */}
            <div className="relative z-[2] flex flex-col justify-center gap-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full backdrop-blur-sm bg-black/40 border border-amber-400/30 text-[9.5px] font-black tracking-wider text-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  PREMIUM UPGRADE
                </span>
                <span className="text-base sm:text-lg font-black text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(180deg,#ffe9a3 0%,#ffcf3f 60%,#f5a623 100%)" }}>
                  Mockeefy PRO
                </span>
              </div>
              <p className="m-0 text-[12px] sm:text-[13px] font-medium text-purple-100/90 leading-tight">
                Unlimited mock interviews, priority booking with top FAANG engineers & AI scorecards.
              </p>
            </div>

            {/* Right side CTA & Pills */}
            <div className="relative z-[2] flex items-center gap-3 shrink-0">
              <div className="hidden lg:flex items-center gap-2">
                {["⚡ Unlimited Mocks", "⭐ Priority Booking", "📊 AI Reports"].map((t, i) => (
                  <span key={i} className="text-[11.5px] font-bold text-white/90 bg-white/10 px-2.5 py-1 rounded-lg backdrop-blur-xs border border-white/10">
                    {t}
                  </span>
                ))}
              </div>
              <button className="px-4 py-2 rounded-xl border-none cursor-pointer text-xs font-black text-[#2e1c02] transition-all hover:scale-105 active:scale-95 shadow-md shadow-amber-500/25" style={{ background: "linear-gradient(180deg,#ffd868 0%,#f5a623 100%)" }}>
                Upgrade to Pro
              </button>
            </div>
          </div>

          {/* ============ SLIDE 2 : EXPERTS ============ */}
          <div className="relative flex items-center justify-between gap-4 box-border py-3.5 sm:py-4 px-5 sm:px-7" style={{ flex: "0 0 100%", background: "linear-gradient(135deg, #0d261e 0%, #133a2d 50%, #0a1f18 100%)", minHeight: 92 }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
              <div style={innerShadow} />
              <div style={sheen} />
            </div>

            {/* Left side info */}
            <div className="relative z-[2] flex flex-col justify-center gap-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-400/40 text-[9.5px] font-black tracking-wider text-emerald-300">
                  <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-400">
                    <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping" />
                  </span>
                  LIVE NOW
                </span>
                <span className="text-base sm:text-lg font-black text-white">
                  Practice with Engineers from <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(90deg,#5be3a8,#ffd23f)" }}>Top Companies</span>
                </span>
              </div>
              <p className="m-0 text-[12px] sm:text-[13px] font-medium text-emerald-100/90 leading-tight">
                Book 1-on-1 technical, system design, and behavioral mock rounds with hiring managers.
              </p>
            </div>

            {/* Right side logos & CTA */}
            <div className="relative z-[2] flex items-center gap-3 shrink-0">
              <div className="hidden lg:flex items-center gap-1.5">
                {promoCompanies.map(c => (
                  <span key={c.name} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/95 shadow-xs">
                    <img src={c.icon} alt={c.name} className="w-3.5 h-3.5 rounded object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    <span className="text-[11px] font-black text-slate-800">{c.name}</span>
                  </span>
                ))}
              </div>
              <button className="px-4 py-2 rounded-xl border-none cursor-pointer text-xs font-black text-[#03251c] transition-all hover:scale-105 active:scale-95 shadow-md shadow-emerald-500/25" style={{ background: "linear-gradient(180deg,#5df0c3 0%,#20cf95 100%)" }}>
                Book Expert
              </button>
            </div>
          </div>

          {/* ============ SLIDE 3 : CERTIFICATE ============ */}
          <div className="relative flex items-center justify-between gap-4 box-border py-3.5 sm:py-4 px-5 sm:px-7" style={{ flex: "0 0 100%", background: "linear-gradient(135deg, #24122d 0%, #351a42 50%, #1b0c22 100%)", minHeight: 92 }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
              <div style={innerShadow} />
              <div style={sheen} />
            </div>

            {/* Left side info */}
            <div className="relative z-[2] flex flex-col justify-center gap-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-pink-950/70 border border-pink-400/40 text-[9.5px] font-black tracking-wider text-pink-300">
                  <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                  GET CERTIFIED
                </span>
                <span className="text-base sm:text-lg font-black text-white">
                  Earn a Verified <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(90deg,#ffcf3f,#ff8fd0)" }}>Interview-Ready Certificate</span>
                </span>
              </div>
              <p className="m-0 text-[12px] sm:text-[13px] font-medium text-pink-100/90 leading-tight">
                Pass expert technical rounds and add shareable credentials to your LinkedIn & resume.
              </p>
            </div>

            {/* Right side CTA */}
            <div className="relative z-[2] flex items-center gap-3 shrink-0">
              <div className="hidden lg:flex items-center gap-2">
                {["✓ Graded", "✓ Shareable", "✓ QR Verified"].map(t => (
                  <span key={t} className="text-[11.5px] font-bold text-amber-100 bg-white/10 px-2.5 py-1 rounded-lg backdrop-blur-xs border border-white/10">
                    {t}
                  </span>
                ))}
              </div>
              <button className="px-4 py-2 rounded-xl border-none cursor-pointer text-xs font-black text-[#360d2c] transition-all hover:scale-105 active:scale-95 shadow-md shadow-pink-500/25" style={{ background: "linear-gradient(180deg,#ffb3dd 0%,#ff7ec2 100%)" }}>
                Get Certified
              </button>
            </div>
          </div>

        </div>

        {/* Side arrow controls */}
        <button
          onClick={() => { setIdx(i => (i + 2) % 3); setPaused(true); }}
          aria-label="Previous slide"
          className="absolute left-1.5 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-black/40 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95"
        >
          <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
        <button
          onClick={() => { setIdx(i => (i + 1) % 3); setPaused(true); }}
          aria-label="Next slide"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-black/40 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95"
        >
          <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>

        {/* Dots inside the bottom center of the banner */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-xs border border-white/10">
          {[0, 1, 2].map(i => (
            <button
              key={i}
              onClick={() => { setIdx(i); setPaused(true); }}
              aria-label={`Go to slide ${i + 1}`}
              className="border-none cursor-pointer transition-all duration-300 p-0"
              style={{
                width: i === idx ? 14 : 5, height: 4, borderRadius: 99,
                background: i === idx ? "linear-gradient(90deg,#ffd558,#ffb01f)" : "rgba(255,255,255,0.4)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const CoachSessionCard = React.memo(function CoachSessionCard() {
  // Query experts
  const {
    data: expertsData,
    isLoading: isExpertsLoading,
    isError: isExpertsError,
    error: expertsError
  } = useQuery({
    queryKey: ["experts"],
    queryFn: async () => {
      const res = await axios.get("/api/expert/verified");
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Query categories
  const {
    data: categoriesData,
    isLoading: isCategoriesLoading
  } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await axios.get("/api/categories");
      return res.data;
    },
    staleTime: 1000 * 60 * 60,
  });

  // Parse verified experts profiles
  const allProfiles = useMemo<MentorProfile[]>(() => {
    if (isExpertsLoading && !expertsData) return [];
    let rawExperts: any[] = [];
    if (expertsData?.success && Array.isArray(expertsData?.data)) {
      rawExperts = expertsData.data;
    } else if (Array.isArray(expertsData)) {
      rawExperts = expertsData;
    }

    return rawExperts.map((expert: any) => {
      const cat = expert.personalInformation?.category || "IT";
      let exp = "";
      if (expert.professionalDetails?.totalExperience) {
        exp = expert.professionalDetails.totalExperience === 1 ? "1 year" : `${expert.professionalDetails.totalExperience} years`;
      } else {
        exp = calculateProfessionalExperience(expert.professionalDetails) || (calculateAge(expert.personalInformation?.dob) - 22 > 0 ? `${calculateAge(expert.personalInformation?.dob) - 22}+ years` : "Fresher");
      }

      const skills = (() => {
        if (expert.expertSkills && expert.expertSkills.length > 0) {
          return expert.expertSkills
            .filter((s: any) => s.isEnabled && s.skillName)
            .map((s: any) => s.skillName);
        }
        return [...(expert.skillsAndExpertise?.domains || []), ...(expert.skillsAndExpertise?.tools || [])];
      })();

      return {
        id: expert._id || expert.userId,
        expertID: expert._id || expert.userId,
        name: expert.personalInformation?.userName || "Expert",
        role: getJobTitle(expert.professionalDetails, cat),
        company: getCurrentCompany(expert.professionalDetails, cat),
        location: expert.personalInformation?.city || "Online",
        rating: expert.metrics?.avgRating || 0,
        reviews: expert.metrics?.totalReviews || 0,
        avatar: getProfileImageUrl(expert.profileImage),
        isVerified: expert.status === "Active" || expert.status === "verified",
        price: expert.price ? String(expert.price) : "799",
        minPrice: expert.minPrice,
        maxPrice: expert.maxPrice,
        minOriginalPrice: expert.minOriginalPrice,
        maxOriginalPrice: expert.maxOriginalPrice,
        skills: skills,
        experience: exp,
        activeTime: expert.availability?.nextAvailable || "Available Today",
        totalSessions: expert.metrics?.totalSessions || 0,
        category: cat,
        bio: expert.personalInformation?.bio || "",
        level: expert.professionalDetails?.level || "Intermediate",
        allTags: [cat, ...skills, expert.professionalDetails?.industry].filter(Boolean).map(s => s.toString())
      } as MentorProfile & { category: string, allTags: string[], level?: string, minPrice?: number, maxPrice?: number, minOriginalPrice?: number, maxOriginalPrice?: number };
    });
  }, [expertsData, isExpertsLoading]);

  // Extract unique skills from database profiles dynamically
  const uniqueSkills = useMemo(() => {
    const set = new Set<string>();
    allProfiles.forEach((p) => {
      if (Array.isArray(p.skills)) {
        p.skills.forEach(s => { if (s?.trim()) set.add(s.trim()); });
      }
    });
    return Array.from(set).sort();
  }, [allProfiles]);

  // Extract categories dynamically
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    allProfiles.forEach((p) => {
      if (p.category && p.category.trim() !== "") {
        set.add(p.category.trim());
      }
    });
    const categoriesArray = Array.from(set).sort();
    const hasIT = categoriesArray.includes("IT");
    if (hasIT) {
      const filtered = categoriesArray.filter(cat => cat !== "IT");
      return ["IT", ...filtered];
    }
    return categoriesArray;
  }, [allProfiles]);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillSearchQuery, setSkillSearchQuery] = useState("");
  const [maxExperience, setMaxExperience] = useState<number>(15);
  const [selectedExpRanges, setSelectedExpRanges] = useState<string[]>([]);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([]);
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("All"); // "All", "Today", "Week"
  const [sortOption, setSortOption] = useState<string>("recommended");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Expanded sections state for sidebar
  const [expandedSections, setExpandedSections] = useState({
    company: true,
    role: true,
    experience: true,
    price: true,
    availability: true
  });
  const [showMoreCompanies, setShowMoreCompanies] = useState(false);
  const [showMoreCategories, setShowMoreCategories] = useState(false);

  // Additional advanced filters: company, expert level, max price
  const navigate = useNavigate();
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [maxPriceFilter, setMaxPriceFilter] = useState<number | null>(null);

  const listingSectionRef = useRef<HTMLDivElement>(null);

  // Toggle filter range selections
  const toggleExpRange = (range: string) => {
    setSelectedExpRanges(prev =>
      prev.includes(range) ? prev.filter(r => r !== range) : [...prev, range]
    );
  };

  const togglePriceRange = (range: string) => {
    setSelectedPriceRanges(prev =>
      prev.includes(range) ? prev.filter(r => r !== range) : [...prev, range]
    );
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Active filter count logic
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategories.length > 0) count += selectedCategories.length;
    if (selectedSkills.length > 0) count += selectedSkills.length;
    if (selectedCompanies.length > 0) count += selectedCompanies.length;
    if (selectedExpRanges.length > 0) count += selectedExpRanges.length;
    if (selectedPriceRanges.length > 0) count += selectedPriceRanges.length;
    if (availabilityFilter !== "All") count++;
    if (sortOption !== "recommended") count++;
    if (selectedLevels.length > 0) count++;
    return count;
  }, [selectedCategories, selectedSkills, selectedCompanies, selectedExpRanges, selectedPriceRanges, availabilityFilter, sortOption, selectedLevels]);

  const isFilteringActive = useMemo(() => {
    return searchQuery.trim() !== "" || activeFilterCount > 0;
  }, [searchQuery, activeFilterCount]);

  // Clear all filters
  const handleReset = () => {
    setSearchQuery("");
    setSelectedCategories([]);
    setSelectedSkills([]);
    setSkillSearchQuery("");
    setMaxExperience(15);
    setSelectedExpRanges([]);
    setSelectedPriceRanges([]);
    setAvailabilityFilter("All");
    setSortOption("recommended");
    setSelectedCompanies([]);
    setSelectedLevels([]);
    setMaxPriceFilter(null);
  };

  // Toggle Category Selection
  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  // Toggle Skill Selection
  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  // Toggle Company Selection
  const toggleCompany = (company: string) => {
    setSelectedCompanies(prev =>
      prev.includes(company) ? prev.filter(c => c !== company) : [...prev, company]
    );
  };

  // Dynamic counts calculation for sidebar
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    allProfiles.forEach(p => {
      if (p.category) {
        map[p.category] = (map[p.category] || 0) + 1;
      }
    });
    return map;
  }, [allProfiles]);

  const companyCounts = useMemo(() => {
    const map: Record<string, number> = {};
    allProfiles.forEach(p => {
      if (p.company) {
        map[p.company] = (map[p.company] || 0) + 1;
      }
    });
    return map;
  }, [allProfiles]);

  const expCounts = useMemo(() => {
    const counts = { "0-2": 0, "3-5": 0, "6-10": 0, "10+": 0 };
    allProfiles.forEach(p => {
      const match = (p.experience || "").match(/\d+/);
      const exp = match ? parseInt(match[0], 10) : 0;
      if (exp <= 2) counts["0-2"]++;
      else if (exp <= 5) counts["3-5"]++;
      else if (exp <= 10) counts["6-10"]++;
      else counts["10+"]++;
    });
    return counts;
  }, [allProfiles]);

  const priceCounts = useMemo(() => {
    const counts = { "under-1000": 0, "1000-2000": 0, "2000-3000": 0, "above-3000": 0 };
    allProfiles.forEach(p => {
      const price = p.minPrice ?? parseInt((p.price || "0").toString().replace(/[^\d]/g, ""), 10) ?? 0;
      if (price < 1000) counts["under-1000"]++;
      else if (price <= 2000) counts["1000-2000"]++;
      else if (price <= 3000) counts["2000-3000"]++;
      else counts["above-3000"]++;
    });
    return counts;
  }, [allProfiles]);

  const availabilityCounts = useMemo(() => {
    const todayCount = allProfiles.filter(p => p.activeTime?.toLowerCase().includes("today")).length;
    const weekCount = allProfiles.filter(p => p.activeTime?.toLowerCase().includes("today") || p.activeTime?.toLowerCase().includes("week")).length;
    return { today: todayCount, week: weekCount };
  }, [allProfiles]);

  // Filtered skills list based on nested skills search
  const filteredSkillsList = useMemo(() => {
    const query = skillSearchQuery.trim().toLowerCase();
    if (!query) return uniqueSkills;
    return uniqueSkills.filter(s => s.toLowerCase().includes(query));
  }, [uniqueSkills, skillSearchQuery]);

  // Filtered experts selector logic
  const filteredProfiles = useMemo(() => {
    let list = [...allProfiles];

    // 1. Text Search query (name, role, company, skills)
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const name = (p.name || "").toLowerCase();
        const role = (p.role || "").toLowerCase();
        const company = (p.company || "").toLowerCase();
        const skills = (p.skills || []).join(" ").toLowerCase();
        return name.includes(q) || role.includes(q) || company.includes(q) || skills.includes(q);
      });
    }

    // 2. Categories checkbox filters
    if (selectedCategories.length > 0) {
      list = list.filter(p => p.category && selectedCategories.includes(p.category));
    }

    // 3. Skills checkbox filters
    if (selectedSkills.length > 0) {
      list = list.filter(p => p.skills && p.skills.some(s => selectedSkills.includes(s)));
    }

    // 4. Experience Ranges filter
    if (selectedExpRanges.length > 0) {
      list = list.filter(p => {
        const match = (p.experience || "").match(/\d+/);
        const exp = match ? parseInt(match[0], 10) : 0;
        return selectedExpRanges.some(r => {
          if (r === "0-2") return exp <= 2;
          if (r === "3-5") return exp >= 3 && exp <= 5;
          if (r === "6-10") return exp >= 6 && exp <= 10;
          if (r === "10+") return exp >= 10;
          return true;
        });
      });
    }

    // 5. Availability filter
    if (availabilityFilter === "Today") {
      list = list.filter(p => p.activeTime?.toLowerCase().includes("today"));
    } else if (availabilityFilter === "Week") {
      list = list.filter(p => p.activeTime?.toLowerCase().includes("today") || p.activeTime?.toLowerCase().includes("week"));
    }

    // 5b. Company filter
    if (selectedCompanies.length > 0) {
      list = list.filter(p => p.company && selectedCompanies.includes(p.company));
    }

    // 5c. Price Ranges filter
    if (selectedPriceRanges.length > 0) {
      list = list.filter(p => {
        const price = p.minPrice ?? parseInt((p.price || "0").toString().replace(/[^\d]/g, ""), 10) ?? 0;
        return selectedPriceRanges.some(r => {
          if (r === "under-1000") return price < 1000;
          if (r === "1000-2000") return price >= 1000 && price <= 2000;
          if (r === "2000-3000") return price >= 2000 && price <= 3000;
          if (r === "above-3000") return price > 3000;
          return true;
        });
      });
    }

    const hasPhoto = (p: MentorProfile) => {
      return Boolean(
        p.avatar &&
        !p.avatar.includes("default-avatar.png") &&
        !p.avatar.includes("mockeefy.png")
      );
    };

    // 6. Sorting logic (Prioritize mentors with real profile photo, then user selected sort)
    list.sort((a, b) => {
      const aPhoto = hasPhoto(a) ? 1 : 0;
      const bPhoto = hasPhoto(b) ? 1 : 0;
      if (aPhoto !== bPhoto) {
        return bPhoto - aPhoto; // Mentors with actual photos come first
      }

      if (sortOption === "price-asc") {
        return parseInt(a.price || "0") - parseInt(b.price || "0");
      } else if (sortOption === "price-desc") {
        return parseInt(b.price || "0") - parseInt(a.price || "0");
      } else if (sortOption === "rating-desc") {
        return (b.rating || 0) - (a.rating || 0);
      } else {
        // Default "recommended"
        const scoreA = (a.rating || 0) * 10 + (a.totalSessions || 0);
        const scoreB = (b.rating || 0) * 10 + (b.totalSessions || 0);
        return scoreB - scoreA;
      }
    });

    return list;
  }, [allProfiles, searchQuery, selectedCategories, selectedSkills, selectedExpRanges, selectedPriceRanges, availabilityFilter, sortOption, selectedCompanies]);

  // Unique companies present in the verified experts dataset
  const uniqueCompanies = useMemo(() => {
    const set = new Set<string>();
    allProfiles.forEach(p => { if (p.company && p.company.trim()) set.add(p.company.trim()); });
    return Array.from(set).sort();
  }, [allProfiles]);

  if (isExpertsLoading || isCategoriesLoading) {
    return (
      <div className="w-full text-left space-y-6 animate-in fade-in duration-300">
        <div className="flex gap-4.5 items-center mb-6">
          <div className="flex-1 h-12 rounded-2xl shimmer-shining border border-slate-100/50" />
          <div className="w-28 h-12 rounded-2xl shimmer-shining border border-slate-100/50" />
        </div>
        <div className="h-48 sm:h-56 rounded-3xl shimmer-shining border border-slate-100/50" />
      </div>
    );
  }

  // Common Filter Content (rendered in Right Sidebar and in Mobile Modal)
  const renderFilterPanel = () => (
    <div className="bg-white rounded-[22px] border border-slate-200/90 shadow-sm p-4 sm:p-5 text-left space-y-5 divide-y divide-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-blue-600" />
          <h3 className="text-base font-black text-slate-900 m-0">Filters</h3>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-black">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={handleReset}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
          >
            Clear all
          </button>
        )}
      </div>

      {/* 1. Company Type / Top Companies */}
      {uniqueCompanies.length > 0 && (
        <div className="pt-4">
          <button
            onClick={() => toggleSection("company")}
            className="w-full flex items-center justify-between text-left text-sm font-black text-slate-900 mb-2.5 cursor-pointer"
          >
            <span>Company</span>
            {expandedSections.company ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {expandedSections.company && (
            <div className="space-y-2">
              {(showMoreCompanies ? uniqueCompanies : uniqueCompanies.slice(0, 4)).map((comp) => {
                const checked = selectedCompanies.includes(comp);
                const count = companyCounts[comp] || 0;
                return (
                  <label
                    key={comp}
                    onClick={() => toggleCompany(comp)}
                    className="flex items-center gap-2.5 text-[13px] font-semibold text-slate-700 hover:text-slate-900 cursor-pointer select-none"
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${checked ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-white"}`}>
                      {checked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="truncate">{comp}</span>
                    <span className="text-slate-400 text-xs font-normal">({count})</span>
                  </label>
                );
              })}

              {uniqueCompanies.length > 4 && (
                <button
                  onClick={() => setShowMoreCompanies(!showMoreCompanies)}
                  className="text-xs font-black text-blue-600 hover:underline pt-1 cursor-pointer block"
                >
                  {showMoreCompanies ? "View Less" : `View More (${uniqueCompanies.length - 4})`}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. Role Category */}
      <div className="pt-4">
        <button
          onClick={() => toggleSection("role")}
          className="w-full flex items-center justify-between text-left text-sm font-black text-slate-900 mb-2.5 cursor-pointer"
        >
          <span>Role category</span>
          {expandedSections.role ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {expandedSections.role && (
          <div className="space-y-2">
            {(showMoreCategories ? uniqueCategories : uniqueCategories.slice(0, 4)).map((cat) => {
              const checked = selectedCategories.includes(cat);
              const count = categoryCounts[cat] || 0;
              return (
                <label
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className="flex items-center gap-2.5 text-[13px] font-semibold text-slate-700 hover:text-slate-900 cursor-pointer select-none"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${checked ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-white"}`}>
                    {checked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="truncate">{cat}</span>
                  <span className="text-slate-400 text-xs font-normal">({count})</span>
                </label>
              );
            })}

            {uniqueCategories.length > 4 && (
              <button
                onClick={() => setShowMoreCategories(!showMoreCategories)}
                className="text-xs font-black text-blue-600 hover:underline pt-1 cursor-pointer block"
              >
                {showMoreCategories ? "View Less" : `View More (${uniqueCategories.length - 4})`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Experience */}
      <div className="pt-4">
        <button
          onClick={() => toggleSection("experience")}
          className="w-full flex items-center justify-between text-left text-sm font-black text-slate-900 mb-2.5 cursor-pointer"
        >
          <span>Experience</span>
          {expandedSections.experience ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {expandedSections.experience && (
          <div className="space-y-2">
            {[
              { id: "0-2", label: "0-2 Yrs", count: expCounts["0-2"] },
              { id: "3-5", label: "3-5 Yrs", count: expCounts["3-5"] },
              { id: "6-10", label: "6-10 Yrs", count: expCounts["6-10"] },
              { id: "10+", label: "10+ Yrs", count: expCounts["10+"] }
            ].map((item) => {
              const checked = selectedExpRanges.includes(item.id);
              return (
                <label
                  key={item.id}
                  onClick={() => toggleExpRange(item.id)}
                  className="flex items-center gap-2.5 text-[13px] font-semibold text-slate-700 hover:text-slate-900 cursor-pointer select-none"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${checked ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-white"}`}>
                    {checked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span>{item.label}</span>
                  <span className="text-slate-400 text-xs font-normal">({item.count})</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Stipend / Price */}
      <div className="pt-4">
        <button
          onClick={() => toggleSection("price")}
          className="w-full flex items-center justify-between text-left text-sm font-black text-slate-900 mb-2.5 cursor-pointer"
        >
          <span>Stipend / Price</span>
          {expandedSections.price ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {expandedSections.price && (
          <div className="space-y-2">
            {[
              { id: "under-1000", label: "Under ₹1,000", count: priceCounts["under-1000"] },
              { id: "1000-2000", label: "₹1,000 - ₹2,000", count: priceCounts["1000-2000"] },
              { id: "2000-3000", label: "₹2,000 - ₹3,000", count: priceCounts["2000-3000"] },
              { id: "above-3000", label: "₹3,000+", count: priceCounts["above-3000"] }
            ].map((item) => {
              const checked = selectedPriceRanges.includes(item.id);
              return (
                <label
                  key={item.id}
                  onClick={() => togglePriceRange(item.id)}
                  className="flex items-center gap-2.5 text-[13px] font-semibold text-slate-700 hover:text-slate-900 cursor-pointer select-none"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${checked ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-white"}`}>
                    {checked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span>{item.label}</span>
                  <span className="text-slate-400 text-xs font-normal">({item.count})</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Availability */}
      <div className="pt-4">
        <button
          onClick={() => toggleSection("availability")}
          className="w-full flex items-center justify-between text-left text-sm font-black text-slate-900 mb-2.5 cursor-pointer"
        >
          <span>Availability</span>
          {expandedSections.availability ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {expandedSections.availability && (
          <div className="space-y-2">
            <label
              onClick={() => setAvailabilityFilter(availabilityFilter === "Today" ? "All" : "Today")}
              className="flex items-center gap-2.5 text-[13px] font-semibold text-slate-700 hover:text-slate-900 cursor-pointer select-none"
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${availabilityFilter === "Today" ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-white"}`}>
                {availabilityFilter === "Today" && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <span>Available Today</span>
              <span className="text-slate-400 text-xs font-normal">({availabilityCounts.today})</span>
            </label>

            <label
              onClick={() => setAvailabilityFilter(availabilityFilter === "Week" ? "All" : "Week")}
              className="flex items-center gap-2.5 text-[13px] font-semibold text-slate-700 hover:text-slate-900 cursor-pointer select-none"
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${availabilityFilter === "Week" ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-white"}`}>
                {availabilityFilter === "Week" && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <span>Available This Week</span>
              <span className="text-slate-400 text-xs font-normal">({availabilityCounts.week})</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div ref={listingSectionRef} className="w-full scroll-mt-24">

        {/* COMBINED CONTAINER: Carousel on top + (Mentor cards + Filter bar) below */}
        <div className="w-full max-w-[860px] mx-auto space-y-3.5">

          {/* TOP PROMO BANNER CAROUSEL — width equals mentor card + filter bar */}
          <div className="w-full animate-in fade-in duration-300">
            <PromoCarousel />
          </div>

          {/* MAIN LAYOUT: Mentors Area (Left) + Filter Panel (Right) */}
          <div className="flex flex-col xl:flex-row items-start gap-5 w-full">

            {/* LEFT / CENTER CONTENT */}
            <div className="flex-1 min-w-0 max-w-[580px] space-y-3.5">

              {/* SEARCH & CONTROLS BAR */}
            <div className="w-full space-y-3 text-left">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {/* Search Input Box */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search mentors by name, company (e.g. Tesla, Google), role, or skill..."
                    className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm font-semibold shadow-xs focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Mobile Filter Button + Sort Dropdown */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Mobile Filters Button (visible on < xl screens) */}
                  <button
                    onClick={() => setIsFilterModalOpen(true)}
                    className={`xl:hidden flex items-center gap-2 px-4 py-3 rounded-2xl border font-bold text-sm transition-all cursor-pointer shadow-xs active:scale-95 ${
                      activeFilterCount > 0
                        ? "bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100/70"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Filters</span>
                    {activeFilterCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>

                  {/* Sort Dropdown */}
                  <div className="relative">
                    <select
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value)}
                      className="appearance-none bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-2xl py-3 pl-3.5 pr-8 shadow-xs hover:border-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="recommended">Recommended</option>
                      <option value="rating-desc">Rating: High to Low</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Active Filter Chips */}
              {isFilteringActive && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-xs font-bold text-slate-400 mr-1">Active:</span>

                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
                      Search: "{searchQuery}"
                      <button onClick={() => setSearchQuery("")} className="hover:text-red-500 cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {selectedCompanies.map((comp) => (
                    <span key={comp} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-xs font-bold text-purple-700">
                      {comp}
                      <button onClick={() => toggleCompany(comp)} className="hover:text-red-500 cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}

                  {selectedCategories.map((cat) => (
                    <span key={cat} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700">
                      {cat}
                      <button onClick={() => toggleCategory(cat)} className="hover:text-red-500 cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}

                  {selectedExpRanges.map((exp) => (
                    <span key={exp} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
                      Exp: {exp} yrs
                      <button onClick={() => toggleExpRange(exp)} className="hover:text-red-500 cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}

                  {selectedPriceRanges.map((pr) => (
                    <span key={pr} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
                      Price: {pr}
                      <button onClick={() => togglePriceRange(pr)} className="hover:text-red-500 cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}

                  {availabilityFilter !== "All" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-700">
                      Available: {availabilityFilter}
                      <button onClick={() => setAvailabilityFilter("All")} className="hover:text-red-500 cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  <button
                    onClick={handleReset}
                    className="text-xs font-black text-rose-600 hover:text-rose-700 underline ml-2 cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {/* Mentors Grid Container */}
            <div id="mentors-section" className="scroll-mt-20">
              {isExpertsError ? (
                <div className="text-center py-20 bg-rose-50/50 rounded-[24px] border border-rose-100/50">
                  <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-4" />
                  <h3 className="text-sm font-black text-rose-900 uppercase tracking-widest">Handshake Error</h3>
                  <p className="text-[10px] text-rose-500 font-bold uppercase mt-1">
                    {expertsError instanceof Error ? expertsError.message : "Failure Connecting"}
                  </p>
                </div>
              ) : (
                <div className="w-full text-left">
                  {/* Heading */}
                  <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl sm:text-[23px] font-black text-slate-900 tracking-tight leading-snug m-0">
                        Mentors to explore
                      </h2>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-black text-emerald-800 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {filteredProfiles.length} {filteredProfiles.length === 1 ? "Mentor" : "Mentors"}
                      </span>
                    </div>
                  </div>

                  {/* Mentors Grid: 2 columns when sidebar is on the right */}
                  {filteredProfiles.length === 0 ? (
                    <div className="text-center py-16 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3">
                      <p className="text-slate-600 font-bold text-base">No mentors found matching your criteria</p>
                      <button
                        onClick={handleReset}
                        className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 cursor-pointer shadow-sm"
                      >
                        Reset Filters
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-4 sm:gap-5">
                        {(isFilteringActive ? filteredProfiles : filteredProfiles.slice(0, 8)).map((mentor) => (
                          <MentorJobCard key={mentor.id} mentor={mentor} />
                        ))}
                      </div>

                      {/* Show All Mentors Button */}
                      {!isFilteringActive && filteredProfiles.length > 8 && (
                        <div className="flex items-center justify-center pt-8 pb-12">
                          <button
                            onClick={() => navigate("/mentors")}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                          >
                            <span>Show All Mentors ({filteredProfiles.length})</span>
                            <ArrowRight className="w-4.5 h-4.5" strokeWidth={2.5} />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDEBAR: Filter Panel (sticky, visible on xl+ screens) */}
          <aside className="hidden xl:block w-[260px] shrink-0 sticky top-[80px] max-h-[calc(100vh-100px)] overflow-y-auto pr-1 no-scrollbar">
            {renderFilterPanel()}
          </aside>

        </div>
      </div>
    </div>

      {/* MOBILE FILTER MODAL / DRAWER (for < xl screens) */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white rounded-[28px] shadow-2xl border border-slate-100 overflow-hidden text-left animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-black text-slate-900 m-0">Filters</h3>
                {activeFilterCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-black">
                    {activeFilterCount} active
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {renderFilterPanel()}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={handleReset}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Reset All
              </button>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-500/25 transition-all cursor-pointer"
              >
                Apply ({filteredProfiles.length} Mentors)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default CoachSessionCard;


