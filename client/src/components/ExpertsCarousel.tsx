import { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MentorJobCard, MentorProfile } from "./MentorJobCard";

interface ExpertsCarouselProps {
    title?: string;
    subtitle?: string;
    profiles: MentorProfile[];
    onSeeAll?: () => void;
}

export const ExpertsCarousel = ({ title, subtitle, profiles, onSeeAll }: ExpertsCarouselProps) => {
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
        const progress = Math.min(1, Math.max(0, api.scrollProgress()));
        setScrollProgress(progress * 100);
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

    if (profiles.length === 0) return null;

    return (
        <div
            className="relative outline-none"
            role="region"
            aria-roledescription="carousel"
            aria-label={title || "Expert carousel"}
            tabIndex={0}
            onKeyDown={handleKeyDown}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex flex-col gap-0.5 min-w-0">
                    {title ? (
                        <>
                            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight truncate">{title}</h2>
                            <p className="text-xs text-slate-500 font-semibold">{subtitle || "Top rated mentors"}</p>
                        </>
                    ) : (
                        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                            {profiles.length} {profiles.length === 1 ? "Expert" : "Experts"} Found
                        </h2>
                    )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {onSeeAll && (
                        <button
                            onClick={onSeeAll}
                            className="hidden sm:flex text-sm font-bold text-indigo-600 hover:text-indigo-700 items-center gap-1 transition-colors px-3 py-1.5 rounded-full hover:bg-indigo-50"
                        >
                            View all <ChevronRight className="w-4 h-4" />
                        </button>
                    )}

                    {/* Carousel Controls */}
                    <div className="flex gap-2">
                        <button
                            aria-label="Scroll to previous expert"
                            className={`w-9 h-9 flex items-center justify-center rounded-full border transition-all ${
                                prevBtnEnabled
                                    ? "border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 shadow-sm cursor-pointer active:scale-90"
                                    : "border-slate-100 text-slate-300 cursor-default"
                            }`}
                            onClick={scrollPrev}
                            disabled={!prevBtnEnabled}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            aria-label="Scroll to next expert"
                            className={`w-9 h-9 flex items-center justify-center rounded-full border transition-all ${
                                nextBtnEnabled
                                    ? "border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 shadow-sm cursor-pointer active:scale-90"
                                    : "border-slate-100 text-slate-300 cursor-default"
                            }`}
                            onClick={scrollNext}
                            disabled={!nextBtnEnabled}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Carousel Container */}
            <div className="overflow-hidden -mx-1 sm:-mx-2" ref={emblaRef}>
                <div className="flex py-2">
                    {profiles.map((profile) => (
                        <div
                            key={profile.id}
                            className="flex-[0_0_85%] sm:flex-[0_0_300px] min-w-0 flex justify-center px-2"
                        >
                            <MentorJobCard mentor={profile} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Scroll progress bar */}
            <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full transition-[width] duration-150 ease-out"
                    style={{ width: `${Math.max(8, scrollProgress)}%` }}
                />
            </div>
        </div>
    );
};

export default ExpertsCarousel;
