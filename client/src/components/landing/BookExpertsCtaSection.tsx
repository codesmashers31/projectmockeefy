import { Link } from "react-router-dom";
import { Calendar, ArrowRight, ShieldCheck, Star, Zap } from "lucide-react";
import interviewIllustration from "@/assets/illustrations/interview.svg";

export default function BookExpertsCtaSection() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <Link
        to="/signup"
        className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 md:p-10 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-300 flex flex-col lg:flex-row lg:items-center gap-8"
      >

        {/* Text block */}
        <div className="relative z-10 flex-1 max-w-lg">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            Book experts
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-[32px] font-extrabold tracking-tight leading-snug text-slate-900 mb-3">
            Book a session with <span className="text-blue-600">verified</span> experts
          </h2>
          <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed max-w-md mb-6 font-normal">
            Choose your category, pick an expert, and book a time that works for you. Get a realistic mock interview and detailed feedback.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Verified Experts
            </span>
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Star className="w-4 h-4 text-blue-600" />
              Real Interviews
            </span>
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Zap className="w-4 h-4 text-blue-600" />
              Actionable Feedback
            </span>
          </div>
        </div>

        {/* Illustration */}
        <div className="relative z-10 w-full max-w-[240px] sm:max-w-[280px] lg:w-[260px] lg:max-w-none mx-auto lg:mx-0 shrink-0">
          <img src={interviewIllustration} alt="" className="w-full h-auto select-none pointer-events-none" draggable={false} />
        </div>

        {/* CTA button */}
        <div className="relative z-10 shrink-0 w-full lg:w-auto lg:self-center">
          <span className="w-full lg:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 text-white text-sm font-bold tracking-tight rounded-xl group-hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20 active:scale-95">
            Book an expert
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </span>
        </div>
      </Link>
    </section>
  );
}
