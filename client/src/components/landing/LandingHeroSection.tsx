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
    bg: "bg-blue-50"
  },
  { 
    number: "02", 
    icon: Search, 
    title: "Pick a category & expert", 
    description: "Choose a category and book a session with a verified expert.", 
    color: "text-purple-600", 
    bg: "bg-purple-50"
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

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 md:pt-12">
          <div className="grid lg:grid-cols-2 items-center gap-10 lg:gap-10">
            {/* Left: copy */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 mb-5">
                <Rocket className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-600">Your career. Our mission.</span>
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-[54px] font-extrabold tracking-tight leading-[1.1] text-slate-900">
                Your first interview <br className="hidden sm:inline" />
                shouldn&apos;t be the real one.
              </h1>
              <p className="mt-5 text-lg sm:text-xl text-slate-600 leading-relaxed max-w-lg mx-auto lg:mx-0">
                Practice with verified HR &amp; tech experts. Get detailed feedback. Land your dream role with confidence.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center w-full">
                <Link
                  to="/signup"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#004fcb] to-indigo-600 text-white text-base font-extrabold tracking-tight rounded-full hover:opacity-95 transition-all active:scale-[0.98]"
                >
                  Get started free
                  <ArrowRight className="w-4.5 h-4.5" strokeWidth={2.5} />
                </Link>
                <Link
                  to="/watch-mock"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border border-slate-200 text-slate-700 text-base font-bold tracking-tight rounded-full hover:bg-slate-50 hover:border-slate-350 transition-all shadow-sm shadow-slate-100"
                >
                  <PlayCircle className="w-5 h-5 text-[#004fcb]" strokeWidth={2.5} />
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

              <div className="hidden sm:flex absolute -top-4 left-2 lg:-left-6 z-20 items-center gap-3 bg-white rounded-2xl shadow-[0_12px_32px_-10px_rgba(0,79,203,0.25)] border border-slate-100 px-4 py-3 hover:-translate-y-1 hover:scale-[1.03] transition-all duration-300">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4.5 h-4.5 text-blue-600" />
                </div>
                <div className="leading-tight">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">Mock Interviews</p>
                  <p className="text-lg font-bold text-slate-900 tracking-tight">10K+</p>
                  <p className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Sessions Completed</p>
                </div>
              </div>

              <div className="hidden sm:flex absolute top-1/2 -translate-y-1/2 -left-4 lg:-left-10 z-20 items-center gap-3 bg-white rounded-2xl shadow-[0_12px_32px_-10px_rgba(16,185,129,0.25)] border border-slate-100 px-4 py-3 hover:-translate-y-1 hover:scale-[1.03] transition-all duration-300">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4.5 h-4.5 text-emerald-600" />
                </div>
                <div className="leading-tight">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">Success Rate</p>
                  <p className="text-lg font-bold text-slate-900 tracking-tight">92%</p>
                  <p className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Got Placed</p>
                </div>
              </div>

              <div className="hidden sm:flex absolute -bottom-4 right-2 lg:-right-8 z-20 items-center gap-3 bg-white rounded-2xl shadow-[0_12px_32px_-10px_rgba(124,58,237,0.25)] border border-slate-100 px-4 py-3 hover:-translate-y-1 hover:scale-[1.03] transition-all duration-300">
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
          <div className="rounded-[28px] bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-6 py-6 md:px-10 md:py-7 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300">
            {trustBullets.map(({ icon: Icon, title, subtitle, color, bg }) => (
              <div key={title} className="flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4.5 h-4.5 ${color}`} />
                </div>
                <div className="leading-tight min-w-0">
                  <p className="text-[14px] font-extrabold text-slate-900 leading-snug">{title}</p>
                  <p className="text-[11.5px] text-slate-500 font-medium truncate mt-0.5">{subtitle}</p>
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
              <span className="h-px w-8 bg-slate-200" aria-hidden />
              <p className="text-slate-500 text-xs sm:text-sm font-bold uppercase tracking-[0.2em]">The process</p>
              <span className="h-px w-8 bg-slate-200" aria-hidden />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
              Simple steps to career success
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {processSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="relative">
                  <div className="h-full rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-7 shadow-sm relative overflow-hidden flex flex-col">
                    
                    <div className={`w-12 h-12 rounded-2xl ${step.bg} flex items-center justify-center mb-4`}>
                      <Icon className={`w-5.5 h-5.5 ${step.color}`} strokeWidth={2} />
                    </div>
                    <span className={`text-xs font-black uppercase tracking-widest ${step.color}`}>{step.number}</span>
                    <h3 className="mt-2.5 text-[15px] sm:text-base font-bold text-slate-900 leading-snug tracking-tight">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[13px] text-slate-500 leading-relaxed">{step.description}</p>
                  </div>
                  {i < processSteps.length - 1 && (
                    <div className="hidden lg:flex absolute top-1/2 -right-5 lg:-right-6 -translate-y-1/2 z-20 items-center justify-center bg-white border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.05)] rounded-full w-10 h-10">
                      <ArrowRight className="w-5 h-5 text-blue-600" strokeWidth={3} />
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
