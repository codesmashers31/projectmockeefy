import { ArrowRight, Sparkles } from "lucide-react";

interface ExpertHeroSearchProps {
  totalExperts: number;
  onExplore: () => void;
}

export const ExpertHeroSearch = ({ totalExperts, onExplore }: ExpertHeroSearchProps) => {
  return (
    <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#04122e] via-[#0a1f4d] to-[#1e1b6b] px-6 sm:px-10 py-10 sm:py-14 mb-10 shadow-[0_20px_60px_-20px_rgba(30,27,107,0.45)]">
      {/* Decorative blobs */}
      <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-indigo-500/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-28 -left-20 w-80 h-80 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10 max-w-2xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm mb-5">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span className="text-[11px] font-bold text-white/90 tracking-wide uppercase">
            {totalExperts > 0 ? `${totalExperts}+ verified experts` : "Verified industry experts"}
          </span>
        </div>

        <h1 className="text-[28px] sm:text-[38px] leading-[1.1] font-extrabold text-white tracking-tight mb-3">
          Practice with experts who've<br className="hidden sm:block" /> been in the room.
        </h1>
        <p className="text-[14px] sm:text-[15px] text-indigo-100/80 font-medium mb-8 max-w-xl">
          Book a real mock interview with verified professionals from top companies — get honest feedback, sharpen your answers, and walk in ready.
        </p>

        <button
          onClick={onExplore}
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-white hover:bg-blue-50 text-[#0a1f4d] text-[14px] font-bold rounded-2xl transition-all active:scale-[0.97] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.35)]"
        >
          Explore Experts <ArrowRight size={15} />
        </button>
      </div>
    </section>
  );
};

export default ExpertHeroSearch;
