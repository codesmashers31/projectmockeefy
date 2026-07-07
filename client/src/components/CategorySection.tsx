import { useRef, useState, useEffect } from "react";
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

const getCategoryIconDetails = (title: string) => {
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
    const rowRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(true);
    const [activeDot, setActiveDot] = useState(0);

    const checkScroll = () => {
        if (rowRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
            setShowLeftArrow(scrollLeft > 0);
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
            
            if (scrollWidth > clientWidth) {
                const percentage = scrollLeft / (scrollWidth - clientWidth);
                const dotIndex = Math.min(4, Math.round(percentage * 4));
                setActiveDot(dotIndex);
            }
        }
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [profiles]);

    const scroll = (direction: 'left' | 'right') => {
        if (rowRef.current) {
            const scrollAmount = 320;
            rowRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
            setTimeout(checkScroll, 350);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!rowRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - rowRef.current.offsetLeft);
        setScrollLeft(rowRef.current.scrollLeft);
    };

    const handleMouseLeave = () => setIsDragging(false);
    const handleMouseUp = () => setIsDragging(false);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !rowRef.current) return;
        e.preventDefault();
        const x = e.pageX - rowRef.current.offsetLeft;
        const walk = (x - startX) * 1.5;
        rowRef.current.scrollLeft = scrollLeft - walk;
        checkScroll();
    };

    const iconDetails = getCategoryIconDetails(title);

    return (
        <section className="relative w-auto mb-10 transition-all duration-300 group/section">
            {/* Header - Mockup Style */}
            <div className="flex items-center justify-between mb-5 text-left">
                <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl ${iconDetails.bg} flex items-center justify-center shrink-0 shadow-sm border`}>
                        {iconDetails.icon}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-xl font-extrabold text-gray-900 tracking-tight leading-none">
                            {title === "IT" ? "Top Rated Experts" : `${title} Experts`}
                        </h2>
                        <span className="block text-xs text-slate-500 font-medium mt-2.5 truncate">
                            Connect with verified experts in {title} and accelerate your career
                        </span>
                    </div>
                </div>
            </div>

            {/* Scroll Wrapper */}
            <div className="relative pt-2 pb-2 w-full">
                {/* Horizontal scroll on all devices */}
                <div
                    ref={rowRef}
                    className={`
                        flex flex-row gap-8 overflow-x-auto pb-2.5 scrollbar-hide snap-x snap-mandatory
                        ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}
                    `}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    onScroll={checkScroll}
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
                >
                    {profiles.map((profile) => (
                        <div key={profile.id} className="snap-start shrink-0 w-[280px] sm:w-[290px] flex">
                            <MentorJobCard mentor={profile} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Controls (Arrows + Dots) */}
            <div className="flex justify-center items-center gap-5 mt-4 pb-3">
                <button
                    onClick={() => scroll('left')}
                    className={`
                        w-9 h-9 rounded-full border border-slate-200 bg-white
                        flex items-center justify-center text-slate-600 hover:text-[#4F46E5] hover:border-indigo-200 transition-all shadow-sm hover:shadow
                        ${!showLeftArrow ? 'opacity-30 cursor-not-allowed' : 'opacity-100 hover:scale-105 active:scale-95'}
                    `}
                    disabled={!showLeftArrow}
                    aria-label="Previous"
                >
                    <ChevronLeft size={16} strokeWidth={2.5} />
                </button>

                {/* Dots indicator */}
                <div className="flex justify-center items-center gap-1.5">
                    {[0, 1, 2, 3, 4].map((index) => (
                        <span
                            key={index}
                            className={`h-2 rounded-full transition-all duration-300 ${activeDot === index ? "w-4 bg-indigo-600" : "w-2 bg-gray-200"}`}
                        />
                    ))}
                </div>

                <button
                    onClick={() => scroll('right')}
                    className={`
                        w-9 h-9 rounded-full border border-slate-200 bg-white
                        flex items-center justify-center text-slate-600 hover:text-[#4F46E5] hover:border-indigo-200 transition-all shadow-sm hover:shadow
                        ${!showRightArrow ? 'opacity-30 cursor-not-allowed' : 'opacity-100 hover:scale-105 active:scale-95'}
                    `}
                    disabled={!showRightArrow}
                    aria-label="Next"
                >
                    <ChevronRight size={16} strokeWidth={2.5} />
                </button>
            </div>
        </section>
    );
};
