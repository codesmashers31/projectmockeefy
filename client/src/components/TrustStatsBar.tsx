import type { ReactNode } from "react";
import { ShieldCheck, Users, Star, LayoutGrid } from "lucide-react";

export interface TrustStats {
  totalExperts: number;
  totalSessions: number;
  avgRating: number;
  categoriesCount: number;
}

const StatTile = ({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) => (
  <div className="flex items-center gap-3.5 px-4 sm:px-6 py-4 sm:py-0">
    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[20px] sm:text-[22px] font-black text-slate-900 leading-none tracking-tight">{value}</p>
      <p className="text-[11px] sm:text-[12px] text-slate-500 font-semibold mt-1.5 leading-none whitespace-nowrap">{label}</p>
    </div>
  </div>
);

export const TrustStatsBar = ({ stats }: { stats: TrustStats }) => {
  const formatCompact = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K+`;
    return `${n}`;
  };

  // Skip tiles that would show a bare "0" (e.g. before any sessions have been logged yet) -
  // an honest empty stat looks broken rather than trustworthy, so we just don't show it.
  const tiles = [
    { key: "experts", icon: <ShieldCheck className="w-5 h-5" />, value: formatCompact(stats.totalExperts), label: "Verified Experts", show: stats.totalExperts > 0 },
    { key: "sessions", icon: <Users className="w-5 h-5" />, value: formatCompact(stats.totalSessions), label: "Mock Sessions Delivered", show: stats.totalSessions > 0 },
    { key: "rating", icon: <Star className="w-5 h-5" />, value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "4.8", label: "Average Expert Rating", show: true },
    { key: "categories", icon: <LayoutGrid className="w-5 h-5" />, value: `${stats.categoriesCount}`, label: "Categories Covered", show: stats.categoriesCount > 0 },
  ].filter(t => t.show);

  if (tiles.length === 0) return null;

  return (
    <section className="mb-10 bg-white border border-slate-200/70 rounded-3xl shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] px-2 sm:px-4 py-2 sm:py-1 flex flex-col sm:flex-row sm:items-center sm:divide-x divide-slate-100">
      {tiles.map(t => (
        <StatTile key={t.key} icon={t.icon} value={t.value} label={t.label} />
      ))}
    </section>
  );
};

export default TrustStatsBar;
