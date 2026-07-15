import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import {
  ChevronRight, ChevronLeft, Code, Terminal, Globe,
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

export const CategorySection = ({ title, profiles, onSeeAll }: CategorySectionProps) => {
    const [emblaRef, emblaApi] = useEmblaCarousel({
        align: "start",
        containScroll: "trimSnaps",
        loop: false,
        dragFree: false,
        skipSnaps: false,
    });
    const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
    const [nextBtnEnabled, setNextBtnEnabled] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [scrollProgress, setScrollProgress] = useState(0);

    const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
    const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

    const onSelect = useCallback((api: any) => {
        setPrevBtnEnabled(api.canScrollPrev());
        setNextBtnEnabled(api.canScrollNext());
        setSelectedIndex(api.selectedScrollSnap());
    }, []);

    const onScroll = useCallback((api: any) => {
        setScrollProgress(Math.min(1, Math.max(0, api.scrollProgress())) * 100);
    }, []);

    useEffect(() => {
        if (!emblaApi) return;
        onSelect(emblaApi);
        emblaApi.on("select", onSelect);
        emblaApi.on("reInit", onSelect);
        emblaApi.on("scroll", onScroll);
    }, [emblaApi, onSelect, onScroll]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowLeft") scrollPrev();
        if (e.key === "ArrowRight") scrollNext();
    };

    const iconDetails = getCategoryIconDetails(title);

    return (
        <section
            className="relative w-auto mb-10 bg-white border border-slate-200 rounded-[28px] p-5 sm:p-7 outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/60 focus-visible:ring-offset-2 transition-all duration-300 group/section"
            role="region"
            aria-roledescription="carousel"
            aria-label={`${title} experts`}
            tabIndex={0}
            onKeyDown={handleKeyDown}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-5 text-left gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl ${iconDetails.bg} flex items-center justify-center shrink-0 shadow-sm border`}>
                        {iconDetails.icon}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight leading-none truncate">
                            {title === "IT" ? "Top Rated Experts" : `${title} Experts`}
                        </h2>
                        <span className="block text-xs text-slate-500 font-medium mt-2.5 truncate">
                            Connect with verified experts in {title} and accelerate your career
                        </span>
                    </div>
                </div>

                {/* Carousel Controls */}
                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={scrollPrev}
                        disabled={!prevBtnEnabled}
                        aria-label="Previous"
                        className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
                            prevBtnEnabled
                                ? "border-slate-200 bg-white text-slate-600 hover:text-[#4F46E5] hover:border-indigo-200 shadow-sm hover:shadow active:scale-90 cursor-pointer"
                                : "border-slate-100 text-slate-300 cursor-default"
                        }`}
                    >
                        <ChevronLeft size={16} strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={scrollNext}
                        disabled={!nextBtnEnabled}
                        aria-label="Next"
                        className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
                            nextBtnEnabled
                                ? "border-slate-200 bg-white text-slate-600 hover:text-[#4F46E5] hover:border-indigo-200 shadow-sm hover:shadow active:scale-90 cursor-pointer"
                                : "border-slate-100 text-slate-300 cursor-default"
                        }`}
                    >
                        <ChevronRight size={16} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Carousel */}
            <div className="relative">
                <div className="overflow-hidden -mx-1 sm:-mx-2" ref={emblaRef}>
                    <div className="flex py-3">
                        {profiles.map((profile, index) => (
                            <div
                                key={profile.id}
                                className="flex-[0_0_82%] sm:flex-[0_0_340px] min-w-0 flex justify-center px-2 sm:px-3"
                            >
                                <MentorJobCard mentor={profile} isActive={index === selectedIndex} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Removed edge fades to eliminate white overlay and shadow lines */}
            </div>

            {/* Scroll progress bar */}
            <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full transition-[width] duration-150 ease-out"
                    style={{ width: `${Math.max(8, scrollProgress)}%` }}
                />
            </div>
        </section>
    );
};
