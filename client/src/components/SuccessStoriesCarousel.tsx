import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Quote, Star, Briefcase } from "lucide-react";

interface SuccessStory {
  name: string;
  outcome: string;
  company: string;
  quote: string;
  rating: number;
}

// NOTE: illustrative sample stories - swap with real candidate testimonials when available.
const STORIES: SuccessStory[] = [
  {
    name: "Ananya R.",
    outcome: "Placed as Frontend Engineer",
    company: "a Series-B fintech startup",
    quote: "Three mock interviews in and my answers went from rambling to structured. The feedback after each session was more useful than anything I'd read online.",
    rating: 5,
  },
  {
    name: "Karthik S.",
    outcome: "Placed as Backend Developer",
    company: "a global product company",
    quote: "My mentor picked apart my system design answers line by line. Walked into my real interview and it felt like I'd already done it once before.",
    rating: 5,
  },
  {
    name: "Priya M.",
    outcome: "Placed as Product Manager",
    company: "a Series-C SaaS company",
    quote: "Booking was quick and the expert actually worked in the role I was interviewing for. That context made the feedback land differently.",
    rating: 4.8,
  },
  {
    name: "Rohit V.",
    outcome: "Placed as Data Analyst",
    company: "a mid-size analytics firm",
    quote: "I was nervous about behavioral rounds. My mock session pointed out three habits I didn't know were hurting my answers.",
    rating: 4.9,
  },
  {
    name: "Sneha K.",
    outcome: "Placed as UX Designer",
    company: "a design-led consumer brand",
    quote: "Got paired with a design lead who reviewed my portfolio live during the session. Worth every rupee.",
    rating: 5,
  },
];

export const SuccessStoriesCarousel = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps" });
  const [prevEnabled, setPrevEnabled] = useState(false);
  const [nextEnabled, setNextEnabled] = useState(false);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = useCallback((api: any) => {
    setPrevEnabled(api.canScrollPrev());
    setNextEnabled(api.canScrollNext());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect(emblaApi);
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  return (
    <section className="relative mb-10">
      <div className="flex items-center justify-between mb-5 px-0.5">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Success stories</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Candidates who practiced here before landing the offer</p>
        </div>
        <div className="hidden sm:flex gap-2">
          <button
            onClick={scrollPrev}
            disabled={!prevEnabled}
            className={`w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 transition-all ${prevEnabled ? "hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600" : "opacity-30 cursor-not-allowed"}`}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={scrollNext}
            disabled={!nextEnabled}
            className={`w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 transition-all ${nextEnabled ? "hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600" : "opacity-30 cursor-not-allowed"}`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-5 pb-2">
          {STORIES.map((story, i) => (
            <div key={i} className="flex-[0_0_280px] sm:flex-[0_0_340px] min-w-0">
              <div className="h-full bg-white border border-slate-200/70 rounded-3xl p-6 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.05)] flex flex-col">
                <Quote className="w-7 h-7 text-indigo-200 mb-3" />
                <p className="text-[13.5px] text-slate-700 font-medium leading-relaxed mb-5 flex-1">
                  &ldquo;{story.quote}&rdquo;
                </p>
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      size={13}
                      className={idx < Math.round(story.rating) ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}
                    />
                  ))}
                </div>
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-[13px] font-bold text-slate-900">{story.name}</p>
                  <div className="flex items-center gap-1.5 mt-1 text-slate-500">
                    <Briefcase className="w-3 h-3 shrink-0" />
                    <p className="text-[11px] font-semibold truncate">{story.outcome} · {story.company}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SuccessStoriesCarousel;
