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
  { icon: ShieldCheck, title: "Verified Experts", subtitle: "Industry professionals", color: "text-[#0755E8]", bg: "bg-[#EAF2FF]" },
  { icon: Star, title: "Real Interviews", subtitle: "Real-world practice", color: "text-[#0755E8]", bg: "bg-[#EAF2FF]" },
  { icon: MessagesSquare, title: "Actionable Feedback", subtitle: "Improve & grow faster", color: "text-emerald-600", bg: "bg-emerald-50" },
  { icon: Lock, title: "100% Safe & Secure", subtitle: "Your data is protected", color: "text-orange-600", bg: "bg-orange-50" },
];

const processSteps = [
  { 
    number: "01", 
    icon: UserPlus, 
    title: "Sign up & choose your role", 
    description: "Create your profile and tell us what role you're preparing for.", 
    color: "text-[#0755E8]", 
    bg: "bg-[#EAF2FF]"
  },
  { 
    number: "02", 
    icon: Search, 
    title: "Pick a category & expert", 
    description: "Choose a category and book a session with a verified expert.", 
    color: "text-[#0755E8]", 
    bg: "bg-[#EAF2FF]"
  },
  { 
    number: "03", 
    icon: CalendarCheck, 
    title: "Book date & time slot", 
    description: "Select a convenient time that works best for you.", 
    color: "text-emerald-600", 
    bg: "bg-emerald-50"
  },
  { 
    number: "04", 
    icon: Video, 
    title: "Attend session & get feedback", 
    description: "Join the session, practice, and get detailed feedback.", 
    color: "text-orange-600", 
    bg: "bg-orange-50"
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
      <section className="relative overflow-hidden bg-white">

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 md:pt-10">
          <div className="grid lg:grid-cols-2 items-center gap-10 lg:gap-12">
            {/* Left: copy */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 mb-4">
                <Rocket className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Your career. Our mission.</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-[42px] font-extrabold tracking-tight leading-[1.18] text-slate-900">
                Your first interview <br className="hidden sm:inline" />
                shouldn&apos;t be the real one.
              </h1>
              <p className="mt-3.5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-lg mx-auto lg:mx-0 font-normal">
                Practice with verified HR &amp; tech experts. Get detailed feedback. Land your dream role with confidence.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3.5 justify-center lg:justify-start items-center w-full">
                <Link
                  to="/signup"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#0755E8] hover:bg-[#0645C7] text-white text-sm font-bold tracking-tight rounded-xl shadow-md shadow-[#0755E8]/20 transition-all active:scale-[0.98]"
                >
                  Get started free
                  <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
                </Link>
                <Link
                  to="/watch-mock"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white border border-slate-200 text-slate-700 text-sm font-bold tracking-tight rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs"
                >
                  <PlayCircle className="w-4.5 h-4.5 text-[#0755E8]" strokeWidth={2.2} />
                  How it works
                </Link>
              </div>
              <div className="mt-5 flex items-center justify-center lg:justify-start gap-3">
                <div className="flex -space-x-2.5">
                  {avatarUrls.map((src) => (
                    <img
                      key={src}
                      src={src}
                      alt=""
                      className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-xs"
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <span className="font-bold text-slate-800">4.9/5</span>
                  <span className="text-slate-500 font-normal">from 10,000+ learners</span>
                </div>
              </div>
            </div>

            {/* Right: photo + floating stat cards */}
            <div className="relative mx-auto max-w-sm sm:max-w-md lg:max-w-none lg:w-full">
              <div className="relative z-10 w-full aspect-4/3 rounded-2xl overflow-hidden border border-slate-100 shadow-md">
                <img
                  src={mainBannerImage}
                  alt="Candidate practicing a mock interview on a laptop"
                  className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                  draggable={false}
                />
              </div>

              <div className="hidden sm:flex absolute -top-4 left-2 lg:-left-6 z-20 items-center gap-3 bg-white rounded-xl shadow-[0_8px_24px_-6px_rgba(0,0,0,0.08)] border border-slate-100 px-3.5 py-2.5 hover:-translate-y-0.5 transition-all duration-300">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4 text-[#0755E8]" />
                </div>
                <div className="leading-tight">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">Mock Interviews</p>
                  <p className="text-base font-extrabold text-slate-900 tracking-tight">10K+</p>
                  <p className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Sessions Completed</p>
                </div>
              </div>

              <div className="hidden sm:flex absolute top-1/2 -translate-y-1/2 -left-4 lg:-left-8 z-20 items-center gap-3 bg-white rounded-xl shadow-[0_8px_24px_-6px_rgba(0,0,0,0.08)] border border-slate-100 px-3.5 py-2.5 hover:-translate-y-0.5 transition-all duration-300">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="leading-tight">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">Success Rate</p>
                  <p className="text-base font-extrabold text-slate-900 tracking-tight">92%</p>
                  <p className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Got Placed</p>
                </div>
              </div>

              <div className="hidden sm:flex absolute -bottom-4 right-2 lg:-right-6 z-20 items-center gap-3 bg-white rounded-xl shadow-[0_8px_24px_-6px_rgba(0,0,0,0.08)] border border-slate-100 px-3.5 py-2.5 hover:-translate-y-0.5 transition-all duration-300">
                <div className="leading-tight text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">Top Experts</p>
                  <p className="text-base font-extrabold text-slate-900 tracking-tight">500+</p>
                  <p className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Verified Experts</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-[#EAF2FF] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-[#0755E8]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust bullet strip */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 md:mt-10 pb-6 md:pb-8">
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs px-5 py-5 md:px-8 md:py-6 grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6 hover:shadow-sm transition-all duration-300">
            {trustBullets.map(({ icon: Icon, title, subtitle, color, bg }) => (
              <div key={title} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="leading-tight min-w-0">
                  <p className="text-[13px] font-bold text-slate-900 leading-snug">{title}</p>
                  <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">{subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="relative bg-white py-12 md:py-16 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 md:mb-12">
            <div className="flex items-center justify-center gap-2.5 mb-2">
              <span className="h-px w-6 bg-slate-200" aria-hidden />
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">The process</p>
              <span className="h-px w-6 bg-slate-200" aria-hidden />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Simple steps to career success
            </h2>
            <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto font-normal">
              Get matched and practice with industry veterans in four straightforward steps.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
            {processSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="relative">
                  <div className="h-full rounded-2xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-xs relative overflow-hidden flex flex-col hover:border-slate-300 transition-all">
                    
                    <div className={`w-10 h-10 rounded-xl ${step.bg} flex items-center justify-center mb-3.5`}>
                      <Icon className={`w-5 h-5 ${step.color}`} strokeWidth={2} />
                    </div>
                    <span className={`text-[11px] font-extrabold uppercase tracking-wider ${step.color}`}>{step.number}</span>
                    <h3 className="mt-1.5 text-sm sm:text-[15px] font-bold text-slate-900 leading-snug tracking-tight">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-[12.5px] text-slate-500 leading-relaxed font-normal">{step.description}</p>
                  </div>
                  {i < processSteps.length - 1 && (
                    <div className="hidden lg:flex absolute top-1/2 -right-3.5 -translate-y-1/2 z-20 items-center justify-center bg-white border border-slate-200 shadow-xs rounded-full w-7 h-7">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" strokeWidth={2.5} />
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
