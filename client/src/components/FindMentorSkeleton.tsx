import { MentorCardSkeleton } from "./MentorJobCard";

export function FindMentorSkeleton() {
  return (
    <div className="w-full font-sans text-left animate-in fade-in duration-200">
      <div className="flex items-start gap-5 lg:gap-6 w-full">
        {/* CENTER COLUMN: Skeleton Content */}
        <div className="flex-1 min-w-0 space-y-3.5">
          {/* Header Controls Skeleton: Same line title & sort placeholder */}
          <div className="space-y-2 px-1 sm:px-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
              {/* Left: Title & Count Placeholder */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="h-6 w-48 sm:w-52 rounded-lg bg-slate-200/80 shimmer-shining" />
                <div className="h-5 w-32 sm:w-36 rounded-full bg-[#EAF2FF] shimmer-shining" />
              </div>

              {/* Controls Row Skeleton */}
              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                <div className="h-7 w-20 rounded-xl bg-slate-100 shimmer-shining xl:hidden" />
                <div className="h-7 w-32 rounded-xl bg-slate-100 shimmer-shining shrink-0 ml-auto sm:ml-0" />
              </div>
            </div>
          </div>

          {/* DIV CARD: All Tracks Category Skeletons */}
          <div className="relative bg-white border border-slate-200/90 rounded-[24px] sm:rounded-[28px] p-3.5 sm:p-6 md:p-7 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.08),0_1px_4px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.04] overflow-hidden space-y-7">
            <div className="relative z-10 space-y-7">
              {[
                { title: "w-60", subtitle: "w-80" },
                { title: "w-52", subtitle: "w-72" },
                { title: "w-48", subtitle: "w-64" },
              ].map((track, idx) => (
                <div key={idx} className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-xl bg-[#EAF2FF] shimmer-shining shrink-0" />
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <div className={`h-4.5 ${track.title} rounded bg-slate-200/80 shimmer-shining`} />
                          <div className="h-4 w-6 rounded-full bg-[#EAF2FF] shimmer-shining" />
                        </div>
                        <div className={`h-3 ${track.subtitle} rounded bg-slate-100 shimmer-shining`} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="w-7.5 h-7.5 rounded-full bg-slate-100 shimmer-shining" />
                      <div className="w-7.5 h-7.5 rounded-full bg-slate-100 shimmer-shining" />
                    </div>
                  </div>

                  <div className="flex items-stretch gap-3.5 sm:gap-4 overflow-hidden py-1.5 px-1 sm:px-1.5">
                    {[1, 2].map((cardIdx) => (
                      <div
                        key={cardIdx}
                        className="w-full sm:w-[calc(50%-8px)] shrink-0 flex flex-col h-auto"
                      >
                        <MentorCardSkeleton />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sticky Filter Sidebar Skeleton (Desktop xl+ screens) */}
        <aside
          aria-label="Filters Panel Loading"
          className="hidden xl:block w-[250px] shrink-0 sticky top-[80px] self-start space-y-4"
        >
          <div className="relative bg-white rounded-[24px] border border-slate-200/90 p-4.5 space-y-4 text-left shadow-[0_4px_20px_-4px_rgba(15,23,42,0.08),0_1px_4px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.04] overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-[#0755E8]/20 shimmer-shining" />
                  <div className="h-4 w-14 rounded bg-slate-200/80 shimmer-shining" />
                </div>
                <div className="h-5 w-24 rounded-full bg-[#EAF2FF] shimmer-shining" />
              </div>

              {/* Filter Section Skeletons */}
              {[
                { titleW: "w-24", items: 4 },
                { titleW: "w-20", items: 4 },
                { titleW: "w-16", items: 3 },
                { titleW: "w-20", items: 3 },
              ].map((sec, idx) => (
                <div key={idx} className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between py-1">
                    <div className={`h-3.5 ${sec.titleW} rounded bg-slate-200/70 shimmer-shining`} />
                    <div className="w-3.5 h-3.5 rounded bg-slate-100 shimmer-shining" />
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: sec.items }).map((_, itemIdx) => (
                      <div key={itemIdx} className="flex items-center gap-2 py-0.5">
                        <div className="w-3.5 h-3.5 rounded-full bg-slate-100 border border-slate-200/70 shimmer-shining shrink-0" />
                        <div className="h-3 w-4/5 rounded bg-slate-100 shimmer-shining" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips Card Skeleton */}
          <div className="relative bg-white rounded-[24px] border border-slate-200/90 p-4 space-y-2 text-left shadow-[0_4px_20px_-4px_rgba(15,23,42,0.08),0_1px_4px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.04] overflow-hidden">
            <div className="relative z-10 space-y-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded bg-[#0755E8]/30 shimmer-shining" />
                <div className="h-3.5 w-40 rounded bg-slate-200/80 shimmer-shining" />
              </div>
              <div className="h-3 w-full rounded bg-slate-100 shimmer-shining" />
              <div className="h-3 w-4/5 rounded bg-slate-100 shimmer-shining" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default FindMentorSkeleton;
