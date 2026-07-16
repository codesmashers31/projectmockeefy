import { useState } from "react";
import {
  ChevronDown, Terminal, Globe,
  Smartphone, Cloud, Database, ShieldCheck, CheckSquare,
  Users, Network, Cpu, Sparkles, UserCheck, Briefcase,
  Palette, Award, Layers
} from "lucide-react";
import { MentorJobCard, MentorProfile } from "./MentorJobCard";

interface CategorySectionProps {
    title: string;
    profiles: MentorProfile[];
    onSeeAll?: () => void;
}

export const getCategoryIconDetails = (title: string) => {
  const t = title.toLowerCase().trim();
  if (t === "it" || t === "top rated experts") {
    return { icon: <Award className="w-5 h-5 text-amber-500" />, bg: "bg-amber-50 border-amber-100/50" };
  }
  if (t.includes("mern") || t.includes("full stack")) {
    return { icon: <Layers className="w-5 h-5 text-indigo-600" />, bg: "bg-indigo-50 border-indigo-100/50" };
  }
  if (t.includes("software")) {
    return { icon: <Terminal className="w-5 h-5 text-blue-600" />, bg: "bg-blue-50 border-blue-100/50" };
  }
  if (t.includes("web")) {
    return { icon: <Globe className="w-5 h-5 text-emerald-600" />, bg: "bg-emerald-50 border-emerald-100/50" };
  }
  if (t.includes("mobile")) {
    return { icon: <Smartphone className="w-5 h-5 text-purple-600" />, bg: "bg-purple-50 border-purple-100/50" };
  }
  if (t.includes("devops") || t.includes("cloud")) {
    return { icon: <Cloud className="w-5 h-5 text-cyan-600" />, bg: "bg-cyan-50 border-cyan-100/50" };
  }
  if (t.includes("data science") || t.includes("ml")) {
    return { icon: <Cpu className="w-5 h-5 text-teal-600" />, bg: "bg-teal-50 border-teal-100/50" };
  }
  if (t.includes("cyber") || t.includes("security")) {
    return { icon: <ShieldCheck className="w-5 h-5 text-rose-600" />, bg: "bg-rose-50 border-rose-100/50" };
  }
  if (t.includes("database") || t.includes("db")) {
    return { icon: <Database className="w-5 h-5 text-slate-600" />, bg: "bg-slate-50 border-slate-200/50" };
  }
  if (t.includes("qa") || t.includes("test")) {
    return { icon: <CheckSquare className="w-5 h-5 text-amber-600" />, bg: "bg-amber-50 border-amber-100/50" };
  }
  if (t.includes("agile") || t.includes("project")) {
    return { icon: <Users className="w-5 h-5 text-orange-600" />, bg: "bg-orange-50 border-orange-100/50" };
  }
  if (t.includes("system design")) {
    return { icon: <Network className="w-5 h-5 text-violet-600" />, bg: "bg-violet-50 border-violet-100/50" };
  }
  if (t.includes("ai")) {
    return { icon: <Sparkles className="w-5 h-5 text-pink-600" />, bg: "bg-pink-50 border-pink-100/50" };
  }
  if (t.includes("hr")) {
    return { icon: <UserCheck className="w-5 h-5 text-pink-500" />, bg: "bg-pink-50 border-pink-100/50" };
  }
  if (t.includes("business")) {
    return { icon: <Briefcase className="w-5 h-5 text-blue-700" />, bg: "bg-blue-50 border-blue-100/50" };
  }
  if (t.includes("design")) {
    return { icon: <Palette className="w-5 h-5 text-fuchsia-600" />, bg: "bg-fuchsia-50 border-fuchsia-100/50" };
  }
  return { icon: <Award className="w-5 h-5 text-indigo-600" />, bg: "bg-indigo-50 border-indigo-100/50" };
};

const PAGE_SIZE = 5;

export const CategorySection = ({ title, profiles }: CategorySectionProps) => {
    const [expanded, setExpanded] = useState(false);
    const iconDetails = getCategoryIconDetails(title);
    const visibleProfiles = expanded ? profiles : profiles.slice(0, PAGE_SIZE);
    const hasMore = profiles.length > PAGE_SIZE;

    return (
        <section
            className="w-full mb-6 bg-white border border-slate-200 rounded-[28px] p-5 sm:p-7 shadow-sm"
            aria-label={`${title} experts`}
        >
            {/* Header */}
            <div className="flex items-center gap-3.5 mb-5 text-left">
                <div className={`w-11 h-11 rounded-2xl ${iconDetails.bg} flex items-center justify-center shrink-0 shadow-sm border`}>
                    {iconDetails.icon}
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
                    {title === "IT" ? "Top Rated Experts" : `${title} Experts`}
                </h2>
                <span className="text-xs text-slate-400 font-semibold">({profiles.length})</span>
            </div>

            {/* List */}
            <div className="flex flex-col gap-4">
                {visibleProfiles.map((profile) => (
                    <MentorJobCard key={profile.id} mentor={profile} />
                ))}
            </div>

            {hasMore && (
                <button
                    onClick={() => setExpanded(prev => !prev)}
                    className="mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 border border-slate-200 rounded-xl hover:bg-indigo-50 transition-colors"
                >
                    {expanded ? "Show less" : `Show ${profiles.length - PAGE_SIZE} more`}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                </button>
            )}
        </section>
    );
};
