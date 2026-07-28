import { Link } from "react-router-dom";
import { MessageSquare, Sparkles, ArrowRight } from "lucide-react";
import checklistIllustration from "@/assets/illustrations/checklist.svg";
import groupVideoIllustration from "@/assets/illustrations/group-video.svg";

export default function MockInterviewCardsSection() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div className="rounded-2xl bg-white border border-slate-200/80 p-7 md:p-9 shadow-sm hover:shadow-md hover:border-[#004fcb]/20 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-5 md:gap-6">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider mb-4">
              <MessageSquare className="w-3.5 h-3.5" />
              Mock interviews
            </div>
            <h3 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2.5">Practice like the real thing</h3>
            <p className="text-slate-600 text-[15px] md:text-base mb-7 leading-relaxed">
              HR rounds, technical interviews, and behavioral questions—all with real experts who give you honest, actionable feedback.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 text-[#004fcb] text-[15px] font-bold tracking-tight hover:text-blue-700 transition-colors"
            >
              Start practicing
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="hidden sm:block shrink-0 w-[110px] md:w-[140px]">
            <img src={checklistIllustration} alt="" className="w-full h-auto select-none pointer-events-none" draggable={false} />
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200/80 p-7 md:p-9 shadow-sm hover:shadow-md hover:border-[#004fcb]/20 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-5 md:gap-6">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#004fcb]/10 text-[#004fcb] text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Book experts
            </div>
            <h3 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2.5">Book live mock sessions</h3>
            <p className="text-slate-600 text-[15px] md:text-base mb-7 leading-relaxed">
              Choose your slot, pick a verified expert, and practice with real-time feedback. Join via Google Meet and get detailed feedback after each session.
            </p>
            <Link
              to="/book-session"
              className="inline-flex items-center gap-2 text-[#004fcb] text-[15px] font-bold tracking-tight hover:text-blue-700 transition-colors"
            >
              Book a session
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="hidden sm:block shrink-0 w-[110px] md:w-[140px]">
            <img src={groupVideoIllustration} alt="" className="w-full h-auto select-none pointer-events-none" draggable={false} />
          </div>
        </div>
      </div>
    </section>
  );
}
