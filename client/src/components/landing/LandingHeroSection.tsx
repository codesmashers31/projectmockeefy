import { Link } from "react-router-dom";
import {
  Rocket,
  ArrowRight,
  PlayCircle,
  Star,
  ShieldCheck,
  MessagesSquare,
  Lock,
  TrendingUp,
  UserPlus,
  Search,
  CalendarCheck,
  Video,
} from "lucide-react";
import mainBannerImage from "@/assets/mainbanner.png";

const trustBullets = [
  { icon: ShieldCheck, title: "Verified Experts", subtitle: "Industry professionals", color: "text-blue-600", bg: "bg-blue-50" },
  { icon: Star, title: "Real Interviews", subtitle: "Real-world practice", color: "text-purple-600", bg: "bg-purple-50" },
  { icon: MessagesSquare, title: "Actionable Feedback", subtitle: "Improve & grow faster", color: "text-emerald-600", bg: "bg-emerald-50" },
  { icon: Lock, title: "100% Safe & Secure", subtitle: "Your data is protected", color: "text-orange-600", bg: "bg-orange-50" },
];

const processSteps = [
  { 
    number: "01", 
    icon: UserPlus, 
    title: "Sign up & choose your role", 
    description: "Create your profile and tell us what role you're preparing for.", 
    color: "text-blue-600", 
    bg: "bg-blue-50", 
    accentBar: "from-blue-500 to-indigo-500",
    hoverBorder: "hover:border-blue-300/80", 
    shadow: "hover:shadow-blue-500/5",
    glow: "group-hover/step:bg-blue-50/30"
  },
  { 
    number: "02", 
    icon: Search, 
    title: "Pick a category & expert", 
    description: "Choose a category and book a session with a verified expert.", 
    color: "text-purple-600", 
    bg: "bg-purple-50", 
    accentBar: "from-purple-500 to-indigo-500",
    hoverBorder: "hover:border-purple-300/80", 
    shadow: "hover:shadow-purple-500/5",
    glow: "group-hover/step:bg-purple-50/30"
  },
  { 
    number: "03", 
    icon: CalendarCheck, 
    title: "Book date & time slot", 
    description: "Select a convenient time that works best for you.", 
    color: "text-emerald-600", 
    bg: "bg-emerald-50", 
    accentBar: "from-emerald-500 to-teal-500",
    hoverBorder: "hover:border-emerald-300/80", 
    shadow: "hover:shadow-emerald-500/5",
    glow: "group-hover/step:bg-emerald-50/30"
  },
  { 
    number: "04", 
    icon: Video, 
    title: "Attend session & get feedback", 
    description: "Join the session, practice, and get detailed feedback.", 
    color: "text-orange-600", 
    bg: "bg-orange-50", 
    accentBar: "from-orange-500 to-amber-500",
    hoverBorder: "hover:border-orange-300/80", 
    shadow: "hover:shadow-orange-500/5",
    glow: "group-hover/step:bg-orange-50/30"
  },
];

const avatarUrls = [
  "/media/avatars/300-1.png",
  "/media/avatars/300-5.png",
  "/media/avatars/300-12.png",
  "/media/avatars/300-20.png",
];

export default function LandingHeroSection() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-blue-50/50 to-indigo-50/60">
        <div className="absolute inset-0 opacity-[0.35] pointer-events-none" aria-hidden>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, #94a3b8 1px, transparent 0)`,
              backgroundSize: "28px 28px",
              maskImage: "radial-gradient(ellipse 60% 50% at 100% 0%, black 40%, transparent 80%)",
            }}
          />
        </div>
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-200/30 blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -right-24 w-96 h-96 rounded-full bg-purple-200/30 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 md:pt-12">
          <div className="grid lg:grid-cols-2 items-center gap-10 lg:gap-10">
            {/* Left: copy */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 mb-5">
                <Rocket className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-600">Your career. Our mission.</span>
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-[50px] font-bold tracking-tighter leading-[1.08] text-slate-900">
                Your first interview
                <span className="block mt-1 bg-gradient-to-r from-[#004fcb] to-purple-600 bg-clip-text text-transparent">
                  shouldn&apos;t be the real one.
                </span>
              </h1>
              <p className="mt-5 text-lg sm:text-xl text-slate-600 leading-relaxed max-w-lg mx-auto lg:mx-0">
                Practice with verified HR &amp; tech experts. Get detailed feedback. Land your dream role with confidence.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
                <Link
                  to="/signup"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#004fcb] to-indigo-600 text-white text-base font-bold tracking-tight rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-xl shadow-blue-900/20 transition-all active:scale-[0.98]"
                >
                  Get started free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/watch-mock"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-slate-200 text-slate-800 text-base font-semibold tracking-tight rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-all"
                >
                  <PlayCircle className="w-4.5 h-4.5 text-[#004fcb]" />
                  How it works
                </Link>
              </div>
              <div className="mt-6 flex items-center justify-center lg:justify-start gap-3">
                <div className="flex -space-x-3">
                  {avatarUrls.map((src) => (
                    <img
                      key={src}
                      src={src}
                      alt=""
                      className="w-9 h-9 rounded-full border-2 border-white object-cover shadow-sm"
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <span className="font-semibold text-slate-700">4.9/5</span>
                  <span className="text-slate-500">from 10,000+ learners</span>
                </div>
              </div>
            </div>

            {/* Right: photo + floating stat cards */}
            <div className="relative mx-auto max-w-sm sm:max-w-md lg:max-w-none lg:w-full">
              <div className="relative z-10 w-full aspect-4/3 rounded-3xl overflow-hidden">
                <img
                  src={mainBannerImage}
                  alt="Candidate practicing a mock interview on a laptop"
                  className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                  draggable={false}
                />
              </div>

              <div className="hidden sm:flex absolute -top-4 left-2 lg:-left-6 z-20 items-center gap-3 bg-white rounded-2xl shadow-[0_12px_32px_-10px_rgba(0,79,203,0.25)] border border-slate-100 px-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4.5 h-4.5 text-blue-600" />
                </div>
                <div className="leading-tight">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">Mock Interviews</p>
                  <p className="text-lg font-bold text-slate-900 tracking-tight">10K+</p>
                  <p className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Sessions Completed</p>
                </div>
              </div>

              <div className="hidden sm:flex absolute top-1/2 -translate-y-1/2 -left-4 lg:-left-10 z-20 items-center gap-3 bg-white rounded-2xl shadow-[0_12px_32px_-10px_rgba(16,185,129,0.25)] border border-slate-100 px-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4.5 h-4.5 text-emerald-600" />
                </div>
                <div className="leading-tight">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">Success Rate</p>
                  <p className="text-lg font-bold text-slate-900 tracking-tight">92%</p>
                  <p className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Got Placed</p>
                </div>
              </div>

              <div className="hidden sm:flex absolute -bottom-4 right-2 lg:-right-8 z-20 items-center gap-3 bg-white rounded-2xl shadow-[0_12px_32px_-10px_rgba(124,58,237,0.25)] border border-slate-100 px-4 py-3">
                <div className="leading-tight text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">Top Experts</p>
                  <p className="text-lg font-bold text-slate-900 tracking-tight">500+</p>
                  <p className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Verified Experts</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4.5 h-4.5 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust bullet strip */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 md:mt-12 pb-8 md:pb-10">
          <div className="rounded-2xl bg-white/90 backdrop-blur border border-slate-200/70 shadow-sm px-6 py-5 md:px-10 md:py-6 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {trustBullets.map(({ icon: Icon, title, subtitle, color, bg }) => (
              <div key={title} className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4.5 h-4.5 ${color}`} />
                </div>
                <div className="leading-tight min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{title}</p>
                  <p className="text-xs text-slate-500 font-medium truncate">{subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="relative bg-white py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-14">
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="h-px w-8 bg-purple-300" aria-hidden />
              <p className="text-purple-600 text-xs sm:text-sm font-bold uppercase tracking-[0.2em]">The process</p>
              <span className="h-px w-8 bg-purple-300" aria-hidden />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
              Simple steps to{" "}
              <span className="bg-gradient-to-r from-[#004fcb] to-purple-600 bg-clip-text text-transparent">
                career success
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {processSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="relative group/step">
                  <div className={`h-full rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-7 shadow-sm transition-all duration-300 relative overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-lg ${step.hoverBorder} ${step.shadow} ${step.glow}`}>
                    {/* Top Accent Line */}
                    <div className={`absolute top-0 left-0 w-full h-[3.5px] bg-gradient-to-r ${step.accentBar}`} />
                    
                    <div className={`w-12 h-12 rounded-2xl ${step.bg} flex items-center justify-center mb-4 transition-transform duration-300 group-hover/step:scale-105`}>
                      <Icon className={`w-5.5 h-5.5 ${step.color}`} strokeWidth={2} />
                    </div>
                    <span className={`text-xs font-black uppercase tracking-widest ${step.color}`}>{step.number}</span>
                    <h3 className="mt-2.5 text-[15px] sm:text-base font-bold text-slate-900 leading-snug tracking-tight">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[13px] text-slate-500 leading-relaxed">{step.description}</p>
                  </div>
                  {i < processSteps.length - 1 && (
                    <div className="hidden lg:flex absolute top-1/2 -right-5 lg:-right-6 -translate-y-1/2 z-20 items-center justify-center bg-white border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.05)] rounded-full w-10 h-10 group-hover/step:scale-110 group-hover/step:border-blue-200 transition-all duration-300">
                      <ArrowRight className="w-5 h-5 text-blue-600 group-hover/step:translate-x-0.5 transition-transform duration-300" strokeWidth={3} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
