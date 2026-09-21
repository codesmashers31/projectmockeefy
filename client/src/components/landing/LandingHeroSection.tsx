import { Link } from "react-router-dom";
import {
  Rocket,
  ArrowRight,
  PlayCircle,
  Star,
  ShieldCheck,
  FileText,
  BarChart2,
  Lock,
  TrendingUp,
  Users,
} from "lucide-react";
import mainBannerImage from "@/assets/mainbanner.png";

const trustBullets = [
  {
    icon: ShieldCheck,
    title: "Verified Experts",
    subtitle: "Learn from industry professionals",
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
  },
  {
    icon: FileText,
    title: "Real Interviews",
    subtitle: "Practice with real questions",
    iconColor: "text-purple-600",
    iconBg: "bg-purple-50",
  },
  {
    icon: BarChart2,
    title: "Actionable Feedback",
    subtitle: "Know your strengths",
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
  },
  {
    icon: Lock,
    title: "100% Safe & Secure",
    subtitle: "Your data is protected",
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
  },
];

const studentAvatars = [
  "/media/avatars/300-1.png",
  "/media/avatars/300-2.png",
  "/media/avatars/300-3.png",
  "/media/avatars/300-4.png",
  "/media/avatars/300-5.png",
];

export default function LandingHeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/20 via-white to-white pt-8 sm:pt-12 md:pt-14 pb-14 md:pb-20">
      {/* Subtle organic light backdrop glow behind illustration */}
      <div
        className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-blue-100/35 blur-3xl pointer-events-none -z-0"
        aria-hidden
      />
      <div
        className="absolute -top-20 -left-20 w-[450px] h-[450px] rounded-full bg-indigo-50/40 blur-3xl pointer-events-none -z-0"
        aria-hidden
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 items-center gap-10 lg:gap-8">
          {/* Left Column: Copy & CTAs */}
          <div className="lg:col-span-6 text-center lg:text-left">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50/90 border border-blue-100/80 mb-6">
              <Rocket className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                Practice &bull; Learn &bull; Grow
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black tracking-tight leading-[1.08] text-slate-900">
              Your first interview{" "}
              <span className="block mt-1">
                <span className="text-[#004fcb]">shouldn&apos;t</span> be the real one.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-lg mx-auto lg:mx-0">
              Take mock interviews with verified experts, get real feedback, and build the confidence to land your dream role.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3.5 justify-center lg:justify-start items-center">
              <Link
                to="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#004fcb] hover:bg-blue-700 text-white font-bold text-sm sm:text-base tracking-tight rounded-full shadow-[0_10px_25px_-5px_rgba(0,79,203,0.35)] transition-all active:scale-[0.98]"
              >
                Get started free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/watch-mock"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-white border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold text-sm sm:text-base tracking-tight rounded-full shadow-sm transition-all"
              >
                <PlayCircle className="w-4.5 h-4.5 text-[#004fcb]" />
                Watch how it works
              </Link>
            </div>

            {/* Ratings & Social Proof */}
            <div className="mt-8">
              <div className="flex items-center justify-center lg:justify-start gap-3">
                <div className="flex -space-x-2">
                  {studentAvatars.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt="Student"
                      className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm"
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <span className="font-bold text-slate-900">4.9/5</span>
                  <span className="text-slate-500 text-xs sm:text-sm">from 10,000+ students</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-center lg:justify-start gap-2.5 text-xs text-slate-400 font-medium">
                <span className="w-6 h-px bg-slate-200" aria-hidden />
                <span>Trusted by students across India</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Image & Floating Cards */}
          <div className="lg:col-span-6 relative mx-auto max-w-md sm:max-w-lg lg:max-w-none w-full">
            <div className="relative z-10 w-full flex items-center justify-center">
              <img
                src={mainBannerImage}
                alt="Student taking a mock interview on a laptop"
                className="w-full h-auto max-h-[460px] object-contain select-none pointer-events-none drop-shadow-[0_20px_35px_rgba(0,0,0,0.08)]"
                draggable={false}
              />
            </div>

            {/* Floating Card 1: 10K+ Mock Interviews (Top Left) */}
            <div className="hidden sm:flex absolute -top-2 left-0 lg:-left-4 z-20 items-center gap-3 bg-white rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.06)] border border-slate-100/90 px-4 py-3 hover:-translate-y-0.5 transition-transform">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <BarChart2 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="leading-tight">
                <p className="text-base font-bold text-slate-900 tracking-tight">10K+</p>
                <p className="text-[11px] font-medium text-slate-500 whitespace-nowrap">Mock Interviews</p>
              </div>
            </div>

            {/* Floating Card 2: 92% Success Rate (Middle Left) */}
            <div className="hidden sm:flex absolute top-1/2 -translate-y-1/2 -left-2 lg:-left-8 z-20 items-center gap-3 bg-white rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.06)] border border-slate-100/90 px-4 py-3 hover:-translate-y-0.5 transition-transform">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="leading-tight">
                <p className="text-base font-bold text-slate-900 tracking-tight">92%</p>
                <p className="text-[11px] font-medium text-slate-500 whitespace-nowrap">Success Rate</p>
              </div>
            </div>

            {/* Floating Card 3: 500+ Verified Experts (Right side) */}
            <div className="hidden sm:flex absolute top-1/3 -right-2 lg:-right-6 z-20 items-center gap-3 bg-white rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.06)] border border-slate-100/90 px-4 py-3 hover:-translate-y-0.5 transition-transform">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div className="leading-tight">
                <p className="text-base font-bold text-slate-900 tracking-tight">500+</p>
                <p className="text-[11px] font-medium text-slate-500 whitespace-nowrap">Verified Experts</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Floating 4-Column Trust Strip */}
        <div className="mt-14 md:mt-18">
          <div className="rounded-[28px] bg-white border border-slate-100 shadow-[0_15px_40px_rgba(0,0,0,0.04)] p-6 sm:p-7 md:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x lg:divide-slate-100">
            {trustBullets.map(({ icon: Icon, title, subtitle, iconColor, iconBg }, index) => (
              <div
                key={title}
                className={`flex items-center gap-4 ${index > 0 ? "lg:pl-8" : ""}`}
              >
                <div className={`w-12 h-12 rounded-full ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="leading-tight min-w-0">
                  <h4 className="text-[15px] font-bold text-slate-900 leading-snug">{title}</h4>
                  <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
