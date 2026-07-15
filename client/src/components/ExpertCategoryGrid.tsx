import { ArrowRight } from "lucide-react";
import { getCategoryIconDetails } from "./CategorySection";

export interface CategoryStat {
  name: string;
  count: number;
  startingPrice: number | null;
}

interface ExpertCategoryGridProps {
  categories: CategoryStat[];
  onSelectCategory: (name: string) => void;
}

export const ExpertCategoryGrid = ({ categories, onSelectCategory }: ExpertCategoryGridProps) => {
  if (!categories || categories.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="flex items-end justify-between mb-5 px-0.5">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Browse by category</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Pick a domain and find your perfect mock-interview expert</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {categories.map((cat) => {
          const iconDetails = getCategoryIconDetails(cat.name);
          return (
            <button
              key={cat.name}
              onClick={() => onSelectCategory(cat.name)}
              className="group relative text-left bg-white border border-slate-200/70 rounded-3xl p-4 sm:p-5 flex flex-col gap-3 overflow-hidden shadow-[0_2px_12px_-6px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_36px_-14px_rgba(79,70,229,0.22)] hover:border-indigo-200 hover:-translate-y-1 transition-all duration-300"
            >
              {/* Decorative glow */}
              <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-transparent opacity-0 group-hover:opacity-70 blur-2xl transition-opacity duration-500 pointer-events-none" />

              <div className={`relative z-10 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl ${iconDetails.bg} flex items-center justify-center shrink-0 shadow-sm border transition-transform duration-300 group-hover:scale-110`}>
                {iconDetails.icon}
              </div>

              <div className="relative z-10 min-w-0">
                <h3 className="text-[14px] sm:text-[15px] font-bold text-slate-900 tracking-tight truncate">
                  {cat.name} {!/expert/i.test(cat.name) ? "Experts" : ""}
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  {cat.count} {cat.count === 1 ? "expert" : "experts"} available
                </p>
              </div>

              <div className="relative z-10 flex items-center justify-between mt-1 pt-3 border-t border-slate-100">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Starting from</p>
                  <p className="text-[13px] font-extrabold text-slate-900 leading-none">
                    {cat.startingPrice ? `₹${cat.startingPrice.toLocaleString("en-IN")}` : "—"}
                  </p>
                </div>
                <span className="w-7 h-7 rounded-full bg-slate-50 group-hover:bg-indigo-600 flex items-center justify-center text-slate-400 group-hover:text-white transition-all duration-300 shrink-0">
                  <ArrowRight size={13} strokeWidth={2.5} />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default ExpertCategoryGrid;
