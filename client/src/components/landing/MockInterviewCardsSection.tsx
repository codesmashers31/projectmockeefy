import { Link } from "react-router-dom";
import { MessageSquare, Sparkles, ArrowRight } from "lucide-react";
import checklistIllustration from "@/assets/illustrations/checklist.svg";
import groupVideoIllustration from "@/assets/illustrations/group-video.svg";

export default function MockInterviewCardsSection() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-7">
        <div className="rounded-2xl bg-white border border-slate-200/80 p-6 md:p-8 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-300 flex items-center gap-5 md:gap-6">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider mb-3.5">
              <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
              Mock interviews
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug mb-2">Practice like the real thing</h3>
            <p className="text-slate-600 text-xs sm:text-sm mb-5 leading-relaxed font-normal">
              HR rounds, technical interviews, and behavioral questions—all with real experts who give you honest, actionable feedback.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center gap-1.5 text-blue-600 text-xs sm:text-sm font-bold tracking-tight hover:text-blue-700 transition-colors group"
            >
              Start practicing
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="hidden sm:block shrink-0 w-[95px] md:w-[120px]">
            <img src={checklistIllustration} alt="" className="w-full h-auto select-none pointer-events-none" draggable={false} />
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200/80 p-6 md:p-8 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-300 flex items-center gap-5 md:gap-6">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold uppercase tracking-wider mb-3.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Book experts
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug mb-2">Book live mock sessions</h3>
            <p className="text-slate-600 text-xs sm:text-sm mb-5 leading-relaxed font-normal">
              Choose your slot, pick a verified expert, and practice with real-time feedback. Join via Google Meet and get detailed feedback after each session.
            </p>
            <Link
              to="/book-session"
              className="inline-flex items-center gap-1.5 text-blue-600 text-xs sm:text-sm font-bold tracking-tight hover:text-blue-700 transition-colors group"
            >
              Book a session
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="hidden sm:block shrink-0 w-[95px] md:w-[120px]">
            <img src={groupVideoIllustration} alt="" className="w-full h-auto select-none pointer-events-none" draggable={false} />
          </div>
        </div>
      </div>
    </section>
  );
}
