import { Link } from "react-router-dom";
import { Calendar, ArrowRight, ShieldCheck, Star, Zap } from "lucide-react";
import interviewIllustration from "@/assets/illustrations/interview.svg";

export default function BookExpertsCtaSection() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <Link
        to="/signup"
        className="group relative overflow-hidden rounded-[28px] border border-blue-100 bg-gradient-to-br from-blue-50 via-indigo-50/40 to-white p-7 sm:p-9 md:p-11 shadow-[0_20px_60px_-30px_rgba(0,79,203,0.35)] hover:shadow-[0_25px_70px_-25px_rgba(0,79,203,0.4)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col lg:flex-row lg:items-center gap-9"
      >
        {/* Decorative dot grid + glow */}
        <div
          className="absolute top-0 right-0 w-72 h-72 opacity-[0.25] pointer-events-none"
          style={{ backgroundImage: `radial-gradient(circle at 2px 2px, #004fcb 1px, transparent 0)`, backgroundSize: "22px 22px" }}
        />
        <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-blue-200/30 blur-3xl pointer-events-none" />

        {/* Text block */}
        <div className="relative z-10 flex-1 max-w-lg">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#004fcb] text-white text-xs font-bold uppercase tracking-wider mb-5">
            <Calendar className="w-3.5 h-3.5" />
            Book experts
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-[40px] font-bold tracking-tight leading-[1.1] text-slate-900 mb-4">
            Book a session with <span className="text-[#004fcb]">verified</span> experts
          </h2>
          <p className="text-base md:text-lg text-slate-600 leading-relaxed max-w-md mb-7">
            Choose your category, pick an expert, and book a time that works for you. Get a realistic mock interview and detailed feedback.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <ShieldCheck className="w-4 h-4 text-[#004fcb]" />
              Verified Experts
            </span>
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Star className="w-4 h-4 text-[#004fcb]" />
              Real Interviews
            </span>
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Zap className="w-4 h-4 text-[#004fcb]" />
              Actionable Feedback
            </span>
          </div>
        </div>

        {/* Illustration */}
        <div className="relative z-10 w-full max-w-[280px] sm:max-w-[340px] lg:w-[300px] lg:max-w-none mx-auto lg:mx-0 shrink-0">
          <img src={interviewIllustration} alt="" className="w-full h-auto select-none pointer-events-none" draggable={false} />
        </div>

        {/* CTA button */}
        <div className="relative z-10 shrink-0 w-full lg:w-auto lg:self-center">
          <span className="w-full lg:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 bg-[#004fcb] text-white text-base font-bold tracking-tight rounded-xl group-hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20">
            Book an expert
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </span>
        </div>
      </Link>
    </section>
  );
}
