import React, { useMemo, useRef, useState } from "react";
import { MentorJobCard, MentorProfile } from "./MentorJobCard";
import { 
  AlertCircle, Search, X, SlidersHorizontal, ChevronLeft, ChevronRight,
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

/** One backend category section: header + count + arrows + horizontal carousel of MentorJobCards */
const CategoryRow: React.FC<{ title: string; profiles: MentorProfile[] }> = ({ title, profiles }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: -1 | 1) => rowRef.current?.scrollBy({ left: dir * 400, behavior: "smooth" });
  const iconDetails = getCategoryIconDetails(title);
  const desc = getCategoryDescription(title);
  const displayTitle = title === "IT" ? "Top Rated Experts" : `${title} Experts`;

  return (
    <section className="w-full mb-6 bg-white border border-slate-200/80 rounded-[28px] p-5 sm:p-7 shadow-sm text-left">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
        <div className="flex items-start gap-4">
          <div className={`w-11 h-11 rounded-2xl ${iconDetails.bg} flex items-center justify-center shrink-0 shadow-sm border`}>
            {iconDetails.icon}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight m-0">
                {displayTitle}
              </h2>
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-slate-50 border border-slate-200/60 text-[10px] font-extrabold text-slate-500">
                {profiles.length} Experts
              </span>
            </div>
            <p className="text-[12.5px] text-slate-500 font-medium mt-1 leading-relaxed max-w-2xl">
              {desc}
            </p>
          </div>
        </div>
        {/* Scroll controls */}
        <div className="flex gap-1.5 shrink-0 self-center md:self-start">
          <button
            onClick={() => scroll(-1)}
            className="w-8.5 h-8.5 rounded-full bg-white border border-slate-200/80 flex items-center justify-center hover:bg-slate-50 text-slate-500 shadow-sm cursor-pointer transition-colors focus:outline-none"
            aria-label={`Scroll ${displayTitle} left`}
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
          </button>
          <button
            onClick={() => scroll(1)}
            className="w-8.5 h-8.5 rounded-full bg-white border border-slate-200/80 flex items-center justify-center hover:bg-slate-50 text-slate-500 shadow-sm cursor-pointer transition-colors focus:outline-none"
            aria-label={`Scroll ${displayTitle} right`}
          >
            <ChevronRight className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* List - Horizontal scrollable */}
      <div
        ref={rowRef}
        className="flex gap-4.5 overflow-x-auto pt-3 pb-4 px-1 scrollbar-none scroll-smooth snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {profiles.map((mentor) => (
          <div key={mentor.id} className="min-w-[85%] max-w-[85%] md:min-w-[calc(50%-9px)] md:max-w-[calc(50%-9px)] snap-start flex animate-in fade-in duration-300">
            <MentorJobCard mentor={mentor} />
          </div>
        ))}
      </div>
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

const promoCompanies = ["google.com|Google", "amazon.com|Amazon", "hcltech.com|HCLTech", "zoho.com|Zoho"].map(s => {
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
    position: "absolute", top: 0, bottom: 0, left: 0, width: 130, zIndex: 4,
    background: "linear-gradient(100deg,transparent,rgba(255,255,255,.09),transparent)",
    animation: "mkCardSheen 4s linear infinite",
  };
  const innerShadow: React.CSSProperties = {
    position: "absolute", inset: 0,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.1), inset 0 0 80px rgba(0,0,0,.35)",
  };

  return (
    <div
      className="relative mb-6 text-left"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <style>{promoStyles}</style>
      <div className="relative rounded-3xl overflow-hidden" style={{ boxShadow: "0 30px 70px -20px rgba(5,12,60,.55), inset 0 1px 0 rgba(255,255,255,.15)" }}>
        <div className="flex" style={{ transition: "transform .65s cubic-bezier(.7,0,.25,1)", transform: `translateX(-${idx * 100}%)` }}>

          {/* ============ SLIDE 1 : PRO ============ */}
          <div className="relative flex flex-wrap items-stretch gap-6 box-border" style={{ flex: "0 0 100%", background: "#211636", padding: "18px 26px", minHeight: 210 }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
              <div style={innerShadow} />
              <div style={sheen} />
            </div>
            <div className="relative z-[2] flex flex-col justify-center gap-[11px]" style={{ flex: "1 1 280px", minWidth: 240 }}>
              <div className="self-start flex items-center gap-[7px] px-3.5 py-[7px] rounded-full backdrop-blur-sm" style={{ background: "rgba(10,15,60,.5)", border: "1px solid rgba(255,255,255,.22)" }}>
                <span className="w-[7px] h-[7px] rounded-full" style={{ background: "#ffcf3f", boxShadow: "0 0 8px #ffcf3f" }} />
                <span className="text-[11px] font-extrabold tracking-[.14em] text-[#e8ecff]">PREMIUM UPGRADE</span>
              </div>
              <h1 className="m-0 text-[28px] font-extrabold tracking-[-.02em] text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(180deg,#ffe9a3 0%,#ffcf3f 55%,#f5a623 100%)" }}>
                Mockeefy PRO
              </h1>
              <p className="m-0 text-[13px] leading-[1.55] font-semibold text-[#e4dcff]">
                Crack your dream job faster — unlimited mock interviews, priority access to top experts, and AI-powered feedback on every session.
              </p>
              <button className="self-start mt-1 px-[26px] py-3 border-none rounded-xl cursor-pointer text-sm font-extrabold text-[#3a2500] transition-transform hover:-translate-y-0.5" style={{ background: "linear-gradient(180deg,#ffd558 0%,#ffb01f 100%)", boxShadow: "0 10px 24px -6px rgba(255,170,20,.55), inset 0 1px 0 rgba(255,255,255,.55)" }}>
                Upgrade to Pro
              </button>
            </div>
            <div className="relative z-[2] flex flex-col justify-center gap-2" style={{ flex: "1 1 300px", minWidth: 260 }}>
              <div className="text-[11px] font-extrabold tracking-[.16em] text-[#d4c8f5] mb-0.5">PRO BENEFITS YOU WILL UNLOCK</div>
              {[
                { title: "Unlimited mock interviews", sub: "Practice as much as you need, no session caps" },
                { title: "Priority expert booking", sub: "Skip the queue for top-rated interviewers" },
                { title: "AI feedback reports", sub: "Detailed scorecards after every session" },
              ].map((b, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl backdrop-blur-sm transition-colors" style={{ background: "rgba(8,10,50,.42)", border: "1px solid rgba(255,255,255,.14)" }}>
                  <div className="flex-1 flex flex-col gap-0.5">
                    <div className="flex items-center gap-[7px]">
                      <svg width="11" height="13" viewBox="0 0 12 14"><path d="M7 0 L0 8 H4.5 L4 14 L11 6 H6.5 Z" fill="#ffd23f" /></svg>
                      <span className="text-[12.5px] font-extrabold text-white">{b.title}</span>
                    </div>
                    <span className="text-[10.5px] font-semibold text-[#c0c9f5]">{b.sub}</span>
                  </div>
                  <div className="flex-none w-[22px] h-[22px] rounded-full flex items-center justify-center" style={{ background: "linear-gradient(180deg,#ffd558,#f5a623)", boxShadow: "0 4px 10px rgba(245,166,35,.5), inset 0 1px 0 rgba(255,255,255,.5)" }}>
                    <svg width="11" height="9" viewBox="0 0 13 10"><path d="M1 5 L4.6 8.6 L12 1" fill="none" stroke="#4a2f00" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ============ SLIDE 2 : EXPERTS ============ */}
          <div className="relative flex flex-wrap items-center gap-6 box-border" style={{ flex: "0 0 100%", background: "#142a22", padding: "18px 26px", minHeight: 210 }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
              <div style={innerShadow} />
              <div style={sheen} />
            </div>
            <div className="relative z-[2] flex flex-col gap-2.5" style={{ flex: "1 1 340px", minWidth: 280 }}>
              <div className="self-start flex items-center gap-2 px-3.5 py-[7px] rounded-full" style={{ background: "rgba(4,25,40,.55)", border: "1px solid rgba(120,255,230,.3)" }}>
                <span className="relative w-2 h-2 rounded-full" style={{ background: "#2fe6a8" }}>
                  <span className="absolute inset-0 rounded-full" style={{ background: "#2fe6a8", animation: "mkPing 1.8s ease-out infinite" }} />
                </span>
                <span className="text-[11px] font-extrabold tracking-[.14em] text-[#c8fff0]">LIVE NOW</span>
              </div>
              <h1 className="m-0 text-[22px] leading-[1.2] font-extrabold tracking-[-.02em] text-white">
                Real interviews with experts working at{" "}
                <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(90deg,#5be3a8,#ffd23f)" }}>top companies</span>
              </h1>
              <p className="m-0 text-[12.5px] leading-[1.5] font-semibold text-[#c4ead9]">
                Book real-time mock interviews with engineers and hiring managers from the world's leading tech companies.
              </p>
              <div className="flex flex-wrap gap-2.5">
                {promoCompanies.map(c => (
                  <span key={c.name} className="flex items-center gap-1.5 px-2.5 py-[5px] rounded-full bg-white" style={{ boxShadow: "0 4px 14px rgba(0,20,15,.35)" }}>
                    <span className="flex-none w-[18px] h-[18px] rounded" style={{ backgroundImage: `url(${c.icon})`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" }} />
                    <span className="text-[11px] font-extrabold text-[#1c2b28]">{c.name}</span>
                  </span>
                ))}
              </div>
              <button className="self-start mt-0.5 px-[22px] py-2.5 border-none rounded-[10px] cursor-pointer text-[13px] font-extrabold text-[#02281e] transition-transform hover:-translate-y-0.5" style={{ background: "linear-gradient(180deg,#5df0c3 0%,#20cf95 100%)", boxShadow: "0 10px 24px -6px rgba(30,210,150,.5), inset 0 1px 0 rgba(255,255,255,.5)" }}>
                Book an Expert
              </button>
            </div>
            <div className="relative z-[1] hidden md:flex items-center justify-center" style={{ flex: "1 1 340px", minWidth: 300, minHeight: 180 }}>
              <div className="absolute w-[200px] h-[200px] rounded-full" style={{ border: "1.5px dashed rgba(120,255,230,.3)", animation: "mkSpin 26s linear infinite" }} />
              {/* interviewer card */}
              <div className="relative w-[290px] rounded-[20px] p-[22px] backdrop-blur-md" style={{ zoom: 0.72, background: "rgba(6,26,42,.75)", border: "1px solid rgba(120,255,230,.25)", boxShadow: "0 24px 50px -14px rgba(0,20,30,.7)", animation: "mkFloat 5s ease-in-out infinite" }}>
                <div className="flex items-center gap-3.5">
                  <div className="relative w-14 h-14 rounded-full flex items-center justify-center text-[19px] font-extrabold text-white" style={{ background: "linear-gradient(135deg,#2fbf8f,#0e7a5a)" }}>
                    AR
                    <span className="absolute bottom-[1px] right-[1px] w-[13px] h-[13px] rounded-full" style={{ background: "#2fe6a8", border: "2.5px solid #061a2a" }} />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-base font-extrabold text-white">Senior Engineer</span>
                    <span className="text-[12.5px] font-bold text-[#7de8d2]">FAANG · 9 yrs experience</span>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <div className="flex justify-between gap-2.5 text-[11.5px] font-bold text-[#bfe6ea]">
                    <span className="whitespace-nowrap">System design round</span>
                    <span className="whitespace-nowrap text-[#5be3c8]">In session</span>
                  </div>
                  <div className="h-[7px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.1)" }}>
                    <div className="h-full rounded-full" style={{ width: "64%", background: "linear-gradient(90deg,#5be3c8,#2fbf8f)" }} />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <span className="flex-1 text-center py-[9px] rounded-[10px] text-xs font-extrabold text-[#dffbf4]" style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)" }}>★ 4.9 rating</span>
                  <span className="flex-1 text-center py-[9px] rounded-[10px] text-xs font-extrabold text-[#dffbf4]" style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)" }}>1,200+ sessions</span>
                </div>
              </div>
              {/* floating avatar bubbles */}
              <div className="absolute flex items-center justify-center text-sm font-extrabold text-white rounded-full" style={{ top: "6%", left: "8%", width: 46, height: 46, background: "linear-gradient(135deg,#ffb86b,#ff7a59)", border: "2px solid rgba(255,255,255,.35)", animation: "mkOrb 4.2s ease-in-out infinite" }}>JK</div>
              <div className="absolute flex items-center justify-center text-[12.5px] font-extrabold text-white rounded-full" style={{ bottom: "8%", left: "4%", width: 40, height: 40, background: "linear-gradient(135deg,#5be3c8,#1d9e8f)", border: "2px solid rgba(255,255,255,.35)", animation: "mkOrb 5s ease-in-out 1s infinite" }}>MP</div>
              <div className="absolute flex items-center justify-center text-[13px] font-extrabold text-white rounded-full" style={{ top: "12%", right: "6%", width: 42, height: 42, background: "linear-gradient(135deg,#b18cff,#6a3fe0)", border: "2px solid rgba(255,255,255,.35)", animation: "mkOrb 4.6s ease-in-out .5s infinite" }}>SD</div>
              <Twinkle fill="#7de8d2" size={15} style={{ position: "absolute", bottom: "18%", right: "12%", animation: "mkTwinkle 2.6s ease-in-out infinite" }} />
            </div>
          </div>

          {/* ============ SLIDE 3 : CERTIFICATE ============ */}
          <div className="relative flex flex-wrap items-center gap-6 box-border" style={{ flex: "0 0 100%", background: "#261431", padding: "18px 26px", minHeight: 210 }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
              <div style={innerShadow} />
              <div style={sheen} />
            </div>
            <div className="relative z-[2] flex flex-col gap-2.5" style={{ flex: "1 1 340px", minWidth: 280 }}>
              <div className="self-start flex items-center gap-[7px] px-3.5 py-[7px] rounded-full" style={{ background: "rgba(30,8,60,.55)", border: "1px solid rgba(255,190,120,.35)" }}>
                <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 0 L7.6 4.2 L12 4.6 L8.7 7.5 L9.8 12 L6 9.5 L2.2 12 L3.3 7.5 L0 4.6 L4.4 4.2 Z" fill="#ffcf3f" /></svg>
                <span className="text-[11px] font-extrabold tracking-[.14em] text-[#ffe6c4]">GET CERTIFIED</span>
              </div>
              <h1 className="m-0 text-[22px] leading-[1.2] font-extrabold tracking-[-.02em] text-white">
                Earn a verified{" "}
                <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(90deg,#ffcf3f,#ff8fd0)" }}>interview-ready certificate</span>
              </h1>
              <p className="m-0 text-[12.5px] leading-[1.5] font-semibold text-[#e6d4f5]">
                Pass expert-graded mock interviews and earn a shareable certificate — add it to LinkedIn and your resume.
              </p>
              <div className="flex flex-wrap gap-2.5">
                {["Expert graded", "Shareable link", "QR verified"].map(t => (
                  <span key={t} className="px-2.5 py-[5px] rounded-full text-[11px] font-extrabold text-[#ffe9c8]" style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,190,120,.3)" }}>✓ {t}</span>
                ))}
              </div>
              <button className="self-start mt-0.5 px-[22px] py-2.5 border-none rounded-[10px] cursor-pointer text-[13px] font-extrabold text-[#3a1030] transition-transform hover:-translate-y-0.5" style={{ background: "linear-gradient(180deg,#ffb3dd 0%,#ff7ec2 100%)", boxShadow: "0 10px 24px -6px rgba(255,110,190,.5), inset 0 1px 0 rgba(255,255,255,.55)" }}>
                Start Certification
              </button>
            </div>
            <div className="relative z-[1] hidden md:flex items-center justify-center" style={{ flex: "1 1 340px", minWidth: 300, minHeight: 200 }}>
              <div className="absolute w-[300px] h-[300px] rounded-full" style={{ background: "radial-gradient(circle,rgba(255,200,80,.2),rgba(255,110,190,.14) 50%,transparent 70%)", animation: "mkPulse 4s ease-in-out infinite" }} />
              {/* certificate card */}
              <div className="relative w-[330px] rounded-2xl overflow-hidden" style={{ zoom: 0.72, background: "linear-gradient(160deg,#ffffff 0%,#fbfbfd 60%,#f4f4f7 100%)", padding: "26px 28px 22px", boxShadow: "0 26px 55px -14px rgba(10,2,25,.85), inset 0 1px 0 rgba(255,255,255,.9)", animation: "mkFloatTilt 5s ease-in-out infinite" }}>
                <div className="absolute pointer-events-none rounded-[11px]" style={{ inset: 9, border: "1px solid rgba(230,180,80,.55)" }} />
                <div className="absolute pointer-events-none rounded-lg" style={{ inset: 13, border: "1px solid rgba(230,180,80,.2)" }} />
                <span className="absolute" style={{ top: 9, left: 9, width: 14, height: 14, borderTop: "2px solid #e6b450", borderLeft: "2px solid #e6b450", borderRadius: "11px 0 0 0" }} />
                <span className="absolute" style={{ top: 9, right: 9, width: 14, height: 14, borderTop: "2px solid #e6b450", borderRight: "2px solid #e6b450", borderRadius: "0 11px 0 0" }} />
                <span className="absolute" style={{ bottom: 9, left: 9, width: 14, height: 14, borderBottom: "2px solid #e6b450", borderLeft: "2px solid #e6b450", borderRadius: "0 0 0 11px" }} />
                <span className="absolute" style={{ bottom: 9, right: 9, width: 14, height: 14, borderBottom: "2px solid #e6b450", borderRight: "2px solid #e6b450", borderRadius: "0 0 11px 0" }} />
                <div className="relative flex flex-col gap-[7px] items-center text-center">
                  <svg width="36" height="27" viewBox="0 0 34 26">
                    <defs>
                      <linearGradient id="mkCertCrown" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff3c4" /><stop offset=".5" stopColor="#ffd23f" /><stop offset="1" stopColor="#f09a10" /></linearGradient>
                    </defs>
                    <path d="M3 24 L1 5 L10 13 L17 2 L24 13 L33 5 L31 24 Z" fill="url(#mkCertCrown)" stroke="#c47a08" strokeWidth="1.4" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[9.5px] font-extrabold tracking-[.32em] text-[#a8842f]">MOCKEEFY CERTIFIED</span>
                  <span className="text-[23px] font-extrabold tracking-[-.01em] text-[#241d33]">Java Developer</span>
                  <div className="flex items-center gap-[9px] w-full my-0.5">
                    <span className="flex-1 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(230,180,80,.5))" }} />
                    <Twinkle fill="#e6b450" size={10} style={{}} />
                    <span className="flex-1 h-px" style={{ background: "linear-gradient(90deg,rgba(230,180,80,.5),transparent)" }} />
                  </div>
                  <span className="text-[11px] font-semibold text-[#6e6880] leading-[1.5]">Cleared expert-graded technical rounds<br />with distinction · Verified by Mockeefy</span>
                  <div className="w-full flex justify-between items-end mt-1.5">
                    <div className="flex flex-col gap-0.5 text-left">
                      <span className="text-sm font-extrabold italic text-[#241d33]">Your Name</span>
                      <span className="text-[9px] font-bold tracking-[.14em] text-[#a8842f]">CREDENTIAL ID · MK-2481</span>
                    </div>
                    <svg width="52" height="52" viewBox="0 0 52 52">
                      <defs>
                        <linearGradient id="mkCertRibbon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffdf7a" /><stop offset="1" stopColor="#f5a623" /></linearGradient>
                      </defs>
                      <circle cx="26" cy="23" r="17" fill="none" stroke="#e6b450" strokeWidth="1.4" strokeDasharray="3 2.4" />
                      <circle cx="26" cy="23" r="14" fill="url(#mkCertRibbon)" />
                      <path d="M19 35 L16 50 L23 45.5 L26 51 L29 45.5 L36 50 L33 35 Z" fill="#c9880e" />
                      <path d="M20.5 23 L24 26.5 L31.5 18.5" fill="none" stroke="#4a2f00" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>
              <Twinkle fill="#ffcf3f" size={17} style={{ position: "absolute", top: "12%", left: "14%", animation: "mkTwinkle 2.6s ease-in-out infinite" }} />
              <Twinkle fill="#ff8fd0" size={13} style={{ position: "absolute", bottom: "14%", right: "12%", animation: "mkTwinkle 2.9s ease-in-out 1.4s infinite" }} />
              <div className="absolute" style={{ top: "16%", right: "14%", width: 12, height: 12, transform: "rotate(45deg)", borderRadius: 3, background: "linear-gradient(135deg,#ffe9a3,#f5a623)", boxShadow: "0 4px 12px rgba(245,166,35,.6)", animation: "mkOrb 4.2s ease-in-out infinite" }} />
            </div>
          </div>

        </div>
      </div>

      {/* controls: arrows + dots below the banner */}
      <div className="flex justify-center items-center gap-4 mt-3.5">
        <button
          onClick={() => { setIdx(i => (i + 2) % 3); setPaused(true); }}
          aria-label="Previous slide"
          className="w-8 h-8 rounded-full cursor-pointer flex items-center justify-center transition-colors hover:bg-slate-200/60"
          style={{ border: "1px solid rgba(90,80,120,.3)", background: "rgba(90,80,120,.08)" }}
        >
          <ChevronLeft className="w-4 h-4 text-[#4a4360] stroke-[2.4]" />
        </button>
        <div className="flex items-center gap-[9px]">
          {[0, 1, 2].map(i => (
            <button
              key={i}
              onClick={() => { setIdx(i); setPaused(true); }}
              aria-label={`Go to slide ${i + 1}`}
              className="border-none cursor-pointer transition-all duration-300"
              style={{
                width: i === idx ? 26 : 9, height: 9, borderRadius: 99,
                background: i === idx ? "linear-gradient(90deg,#ffd558,#ffb01f)" : "rgba(90,80,120,.3)",
              }}
            />
          ))}
        </div>
        <button
          onClick={() => { setIdx(i => (i + 1) % 3); setPaused(true); }}
          aria-label="Next slide"
          className="w-8 h-8 rounded-full cursor-pointer flex items-center justify-center transition-colors hover:bg-slate-200/60"
          style={{ border: "1px solid rgba(90,80,120,.3)", background: "rgba(90,80,120,.08)" }}
        >
          <ChevronRight className="w-4 h-4 text-[#4a4360] stroke-[2.4]" />
        </button>
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
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("All"); // "All", "Today", "Week"
  const [sortOption, setSortOption] = useState<string>("recommended");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Additional advanced filters: company, expert level, max price
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [maxPriceFilter, setMaxPriceFilter] = useState<number | null>(null);

  // New design states and refs
  const [activeTab, setActiveTab] = useState<string>("Featured");

  const listingSectionRef = useRef<HTMLDivElement>(null);
  const tabCarouselRef = useRef<HTMLDivElement>(null);

  // Active filter count logic
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategories.length > 0) count++;
    if (selectedSkills.length > 0) count++;
    if (maxExperience < 15) count++;
    if (availabilityFilter !== "All") count++;
    if (sortOption !== "recommended") count++;
    if (selectedCompanies.length > 0) count++;
    if (selectedLevels.length > 0) count++;
    if (maxPriceFilter !== null) count++;
    return count;
  }, [selectedCategories, selectedSkills, maxExperience, availabilityFilter, sortOption, selectedCompanies, selectedLevels, maxPriceFilter]);

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

  // Toggle Expert Level Selection
  const toggleLevel = (level: string) => {
    setSelectedLevels(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

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

    // 4. Experience Slider filter
    list = list.filter(p => {
      const match = (p.experience || "").match(/\d+/);
      const expYears = match ? parseInt(match[0], 10) : 0;
      return expYears <= maxExperience;
    });

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

    // 5c. Expert Level filter
    if (selectedLevels.length > 0) {
      list = list.filter(p => p.level && selectedLevels.includes(p.level));
    }

    // 5d. Max Price filter
    if (maxPriceFilter !== null) {
      list = list.filter(p => {
        const effectivePrice = p.minPrice ?? parseInt((p.price || "0").toString().replace(/[^\d]/g, "")) ?? 0;
        return effectivePrice <= maxPriceFilter;
      });
    }

    // 6. Sorting logic
    if (sortOption === "price-asc") {
      list.sort((a, b) => parseInt(a.price || "0") - parseInt(b.price || "0"));
    } else if (sortOption === "price-desc") {
      list.sort((a, b) => parseInt(b.price || "0") - parseInt(a.price || "0"));
    } else if (sortOption === "rating-desc") {
      list.sort((a, b) => b.rating - a.rating);
    }

    return list;
  }, [allProfiles, searchQuery, selectedCategories, selectedSkills, maxExperience, availabilityFilter, sortOption, selectedCompanies, selectedLevels, maxPriceFilter]);

  // Backend category order (from /api/categories); fallback to categories found in expert data
  const backendCategoryOrder = useMemo(() => {
    let raw: any[] = [];
    if (categoriesData?.success && Array.isArray(categoriesData?.data)) {
      raw = categoriesData.data;
    } else if (Array.isArray(categoriesData)) {
      raw = categoriesData;
    }
    return raw
      .map((c: any) => (typeof c === "string" ? c : c?.name))
      .filter(Boolean) as string[];
  }, [categoriesData]);

  // Group experts by category (backend-driven listing)
  const groupedByCategory = useMemo(() => {
    const groups: { [key: string]: MentorProfile[] } = {};
    filteredProfiles.forEach((profile) => {
      const cat = profile.category || "IT";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(profile);
    });
    return groups;
  }, [filteredProfiles]);

  // Categories that actually have experts, ordered by the backend category list
  const activeCategoriesWithData = useMemo(() => {
    const present = Object.keys(groupedByCategory);
    const ordered = backendCategoryOrder.filter((c) => present.includes(c));
    const rest = present.filter((c) => !ordered.includes(c)).sort();
    return [...ordered, ...rest];
  }, [groupedByCategory, backendCategoryOrder]);

  // Unique companies present in the verified experts dataset (for the Company filter)
  const uniqueCompanies = useMemo(() => {
    const set = new Set<string>();
    allProfiles.forEach(p => { if (p.company && p.company.trim()) set.add(p.company.trim()); });
    return Array.from(set).sort();
  }, [allProfiles]);

  // Unique expert levels present in the dataset (for the Expert Level filter)
  const uniqueLevels = useMemo(() => {
    const set = new Set<string>();
    allProfiles.forEach(p => { if (p.level && p.level.trim()) set.add(p.level.trim()); });
    return Array.from(set).sort();
  }, [allProfiles]);

  // Price bounds derived from live data, used to bound the Max Price slider
  const priceBounds = useMemo(() => {
    const prices = allProfiles
      .map(p => p.minPrice ?? parseInt((p.price || "0").toString().replace(/[^\d]/g, ""), 10))
      .filter(n => typeof n === "number" && !isNaN(n) && n > 0);
    if (prices.length === 0) return { min: 0, max: 5000 };
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [allProfiles]);

  // Tab filtered Experts (Featured, Top Rated, Available Today, New)
  const tabExperts = useMemo(() => {
    let list = allProfiles.filter(p => p.isVerified);
    if (activeTab === "Top Rated") {
      return [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 10);
    } else if (activeTab === "Available Today") {
      const todayProfiles = list.filter(p => p.activeTime?.toLowerCase().includes("today"));
      return todayProfiles.length > 0 ? todayProfiles.slice(0, 10) : list.slice(0, 10);
    } else if (activeTab === "New") {
      return [...list].reverse().slice(0, 10);
    } else {
      // "Featured"
      return list.filter(p => (p.rating || 0) >= 4.5).slice(0, 10);
    }
  }, [allProfiles, activeTab]);

  const scrollTabLeft = () => {
    tabCarouselRef.current?.scrollBy({ left: -400, behavior: "smooth" });
  };
  const scrollTabRight = () => {
    tabCarouselRef.current?.scrollBy({ left: 400, behavior: "smooth" });
  };

  if (isExpertsLoading || isCategoriesLoading) {
    return (
      <div className="w-full text-left space-y-6 animate-in fade-in duration-300">
        {/* Search bar skeleton */}
        <div className="flex gap-4.5 items-center mb-6">
          <div className="flex-1 h-12 rounded-2xl shimmer-shining border border-slate-100/50" />
          <div className="w-28 h-12 rounded-2xl shimmer-shining border border-slate-100/50" />
        </div>

        {/* Promo banner skeleton */}
        <div className="h-48 sm:h-56 rounded-3xl shimmer-shining border border-slate-100/50" />

        {/* Category list row skeletons */}
        {[1, 2].map((i) => (
          <div key={i} className="w-full bg-white border border-slate-200/80 rounded-[28px] p-5 sm:p-7 space-y-5">
            {/* Category header skeleton */}
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl shimmer-shining border border-slate-100/50 shrink-0" />
              <div className="space-y-2">
                <div className="h-5 w-44 rounded-lg shimmer-shining" />
                <div className="h-3 w-72 rounded-lg shimmer-shining" />
              </div>
            </div>
            {/* Category cards carousel skeleton */}
            <div className="flex gap-4.5 overflow-hidden pt-3">
              <div className="min-w-[85%] md:min-w-[calc(50%-9px)] h-[240px] rounded-[24px] border border-slate-100/50 shimmer-shining shrink-0" />
              <div className="min-w-[85%] md:min-w-[calc(50%-9px)] h-[240px] rounded-[24px] border border-slate-100/50 shimmer-shining shrink-0" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
    <div ref={listingSectionRef} className="w-full scroll-mt-24">

      {/* PROMO BANNER CAROUSEL */}
      {!isFilteringActive && <PromoCarousel />}

      {/* Search and Filters Row */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 flex items-center gap-2.5 bg-white border border-slate-200/85 rounded-2xl px-4 py-3 shadow-sm">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search experts by name, role, company, skills..."
            className="w-full bg-transparent border-none outline-none text-sm text-[#141A33] placeholder-slate-400 font-semibold"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setIsFilterModalOpen(true)}
          className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200/85 rounded-2xl text-sm font-bold text-[#141A33] hover:bg-slate-50 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
        >
          <SlidersHorizontal className="w-4 h-4 text-[#4F46E5]" />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#4F46E5] text-white text-[10px] font-black">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>




      {/* Experts List Container */}
      <div className="mt-2">
        {isExpertsLoading || isCategoriesLoading ? (
          null
        ) : isExpertsError ? (
          <div className="text-center py-20 bg-rose-50/50 rounded-[24px] border border-rose-100/50">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-4" />
            <h3 className="text-sm font-black text-rose-900 uppercase tracking-widest">Handshake Error</h3>
            <p className="text-[10px] text-rose-500 font-bold uppercase mt-1">
              {expertsError instanceof Error ? expertsError.message : "Failure Connecting"}
            </p>
          </div>
        ) : (
          <div className="w-full text-left space-y-8">

            {/* FEATURED TABS CAROUSEL — hidden while searching/filtering */}
            {!isFilteringActive && tabExperts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3.5">
                  <div className="flex gap-6 overflow-x-auto">
                    {["Featured", "Top Rated", "Available Today", "New"].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`font-extrabold text-[15.5px] pb-2.5 border-b-[2.5px] whitespace-nowrap transition-colors cursor-pointer focus:outline-none ${
                          activeTab === tab
                            ? "text-[#141A33] border-[#2F5FFF]"
                            : "text-[#8B93B2] border-transparent hover:text-[#4A5170]"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2.5">
                    <button
                      onClick={scrollTabLeft}
                      className="w-9 h-9 rounded-full bg-white border border-[#E3E8F5] flex items-center justify-center cursor-pointer text-[#4A5170] hover:bg-slate-50 transition-colors focus:outline-none"
                      aria-label="Scroll featured experts left"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={scrollTabRight}
                      className="w-9 h-9 rounded-full bg-white border border-[#E3E8F5] flex items-center justify-center cursor-pointer text-[#4A5170] hover:bg-slate-50 transition-colors focus:outline-none"
                      aria-label="Scroll featured experts right"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div
                  ref={tabCarouselRef}
                  className="flex gap-[18px] overflow-x-auto pb-1.5 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {tabExperts.map((mentor) => (
                    <div key={mentor.id} className="min-w-[330px] max-w-[330px] sm:min-w-[420px] sm:max-w-[420px]">
                      <ExpertCard mentor={mentor} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CATEGORY-BASED LISTING (backend categories) */}
            {activeCategoriesWithData.length === 0 ? (
              <div className="text-center py-[60px] text-[#8B93B2] font-bold">
                No experts match your search — try a different keyword.
              </div>
            ) : (
              activeCategoriesWithData.map((cat) => (
                <CategoryRow key={cat} title={cat} profiles={groupedByCategory[cat]} />
              ))
            )}
          </div>
        )}
      </div>



      {/* Advanced Filters Modal Overlay (mobile/tablet) */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-slate-100/50 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between p-6 border-b border-slate-100">
              <div className="text-left">
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Advanced Search Filters</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">Refine your search for the perfect mentor.</p>
              </div>
              <button 
                onClick={() => setIsFilterModalOpen(false)}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
              {/* 1. Sort Options */}
              <div className="space-y-2.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Sort By</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "recommended", label: "Recommended" },
                    { value: "rating-desc", label: "Top Rated" },
                    { value: "price-asc", label: "Price: Low to High" },
                    { value: "price-desc", label: "Price: High to Low" }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSortOption(opt.value)}
                      className={`px-4 py-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                        sortOption === opt.value
                          ? 'border-[#4F46E5] bg-indigo-50/50 text-[#4F46E5]'
                          : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Availability */}
              <div className="space-y-2.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Availability</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "All", label: "All Dates" },
                    { value: "Today", label: "Available Today" },
                    { value: "Week", label: "Available This Week" }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setAvailabilityFilter(opt.value)}
                      className={`px-3 py-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                        availabilityFilter === opt.value
                          ? 'border-[#4F46E5] bg-indigo-50/50 text-[#4F46E5]'
                          : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Experience */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Max Experience</label>
                  <span className="text-xs font-bold text-[#4F46E5] bg-indigo-50 px-2 py-0.5 rounded-md">
                    Up to {maxExperience} Years
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={15}
                  step={1}
                  value={maxExperience}
                  onChange={(e) => setMaxExperience(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#4F46E5]"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                  <span>1 Year</span>
                  <span>15+ Years</span>
                </div>
              </div>

              {/* 4. Categories */}
              <div className="space-y-2.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Categories</label>
                <div className="flex flex-wrap gap-2">
                  {uniqueCategories.map(cat => {
                    const isSelected = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#4F46E5] bg-indigo-50/50 text-[#4F46E5]'
                            : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Skills */}
              <div className="space-y-2.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Skills</label>
                <input
                  type="text"
                  placeholder="Search skills..."
                  value={skillSearchQuery}
                  onChange={(e) => setSkillSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-[#4F46E5] placeholder-slate-400 font-semibold"
                />
                <div className="max-h-36 overflow-y-auto space-y-2 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                  {filteredSkillsList.length > 0 ? (
                    filteredSkillsList.map(skill => {
                      const isSelected = selectedSkills.includes(skill);
                      return (
                        <label key={skill} className="flex items-center gap-2.5 cursor-pointer py-0.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSkill(skill)}
                            className="rounded border-slate-300 text-[#4F46E5] focus:ring-[#4F46E5] w-3.5 h-3.5 cursor-pointer"
                          />
                          <span className="text-xs font-semibold text-slate-700 select-none">{skill}</span>
                        </label>
                      );
                    })
                  ) : (
                    <p className="text-[11px] text-slate-400 italic py-2 text-center">No skills matching query</p>
                  )}
                </div>
              </div>

              {/* 6. Expert Level */}
              {uniqueLevels.length > 0 && (
                <div className="space-y-2.5">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Expert Level</label>
                  <div className="flex flex-wrap gap-2">
                    {uniqueLevels.map(level => {
                      const isSelected = selectedLevels.includes(level);
                      return (
                        <button
                          key={level}
                          onClick={() => toggleLevel(level)}
                          className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#4F46E5] bg-indigo-50/50 text-[#4F46E5]'
                              : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                          }`}
                        >
                          {level}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 7. Company */}
              {uniqueCompanies.length > 0 && (
                <div className="space-y-2.5">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Company</label>
                  <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-0.5">
                    {uniqueCompanies.map(company => {
                      const isSelected = selectedCompanies.includes(company);
                      return (
                        <button
                          key={company}
                          onClick={() => toggleCompany(company)}
                          className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#4F46E5] bg-indigo-50/50 text-[#4F46E5]'
                              : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                          }`}
                        >
                          {company}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 8. Price Range */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Max Price</label>
                  <span className="text-xs font-bold text-[#4F46E5] bg-indigo-50 px-2 py-0.5 rounded-md">
                    Up to ₹{(maxPriceFilter ?? priceBounds.max).toLocaleString("en-IN")}
                  </span>
                </div>
                <input
                  type="range"
                  min={priceBounds.min}
                  max={priceBounds.max}
                  step={Math.max(1, Math.round((priceBounds.max - priceBounds.min) / 50) || 1)}
                  value={maxPriceFilter ?? priceBounds.max}
                  onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#4F46E5]"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                  <span>₹{priceBounds.min.toLocaleString("en-IN")}</span>
                  <span>₹{priceBounds.max.toLocaleString("en-IN")}+</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-slate-100 bg-slate-50/40">
              <button
                onClick={handleReset}
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors shadow-sm cursor-pointer"
              >
                Clear All
              </button>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="px-5 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
              >
                Apply Filters
              </button>
            </div>

          </div>
        </div>
      )}
      </div>
    </>
  );
});

export default CoachSessionCard;
