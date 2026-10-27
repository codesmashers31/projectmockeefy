import React from "react";
import { Sparkles } from "lucide-react";

export function SessionCardSkeleton() {
  return (
    <article className="relative bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] p-4 sm:p-5 flex flex-col justify-between h-full w-full text-left box-border">
      <div className="space-y-3 flex-1 flex flex-col">
        {/* 1. Header: Avatar + Expert Name & Role + Status Badge */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Avatar skeleton */}
            <div className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-slate-200/80 shimmer-shining shrink-0" />

            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <div className="h-4 w-36 sm:w-44 rounded-md bg-slate-200/80 shimmer-shining" />
                <div className="w-4 h-4 rounded-full bg-[#0755E8]/20 shimmer-shining shrink-0" />
              </div>
              <div className="h-3 w-28 sm:w-32 rounded-md bg-slate-100 shimmer-shining" />
            </div>
          </div>

          {/* Status or Countdown Badge placeholder */}
          <div className="h-6 w-28 sm:w-32 rounded-full bg-[#EAF2FF] shimmer-shining shrink-0" />
        </div>

        {/* 2. Integrated Schedule & Details Box */}
        <div className="bg-[#F8FAFC] border border-slate-200/70 rounded-2xl p-3 sm:p-3.5 space-y-2.5 mt-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-3.5 w-24 rounded bg-slate-200/80 shimmer-shining" />
              <span className="text-slate-300">•</span>
              <div className="h-3.5 w-16 rounded bg-slate-100 shimmer-shining" />
            </div>
            <div className="h-5 w-12 rounded-lg bg-[#EAF2FF] shimmer-shining shrink-0" />
          </div>

          {/* Topic Row */}
          <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2">
            <div className="h-4 w-11 rounded bg-[#EAF2FF] shimmer-shining shrink-0" />
            <div className="h-3.5 w-4/5 rounded bg-slate-200/70 shimmer-shining" />
          </div>
        </div>
      </div>

      {/* 3. Action Row */}
      <div className="w-full pt-3.5 mt-3.5 border-t border-slate-100 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-2 h-2 rounded-full bg-slate-200 shimmer-shining shrink-0" />
          <div className="h-3 w-44 rounded bg-slate-100 shimmer-shining" />
        </div>
        <div className="h-8 w-24 rounded-xl bg-[#EAF2FF] shimmer-shining shrink-0" />
      </div>
    </article>
  );
}

export function MySessionsSkeleton() {
  return (
    <div className="sidebar-main-card relative w-full rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-3.5 sm:p-6 md:p-8 overflow-hidden pb-12 font-sans text-left animate-in fade-in duration-200">
      {/* Decorative ambient blue lighting */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

      <div className="w-full space-y-5 sm:space-y-6 relative z-10">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#EAF2FF] flex items-center justify-center border border-[#93B8FF]/60 shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#0755E8]/40 animate-pulse" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <div className="h-5 sm:h-6 w-36 sm:w-44 rounded-lg bg-slate-200/80 shimmer-shining" />
              <div className="h-3 sm:h-3.5 w-60 sm:w-72 rounded-md bg-slate-100 shimmer-shining" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-6 w-20 rounded-full bg-[#EAF2FF] shimmer-shining" />
            <div className="h-6 w-20 rounded-xl bg-slate-100 shimmer-shining" />
          </div>
        </div>

        {/* Status Filter Tabs Skeleton */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 px-0.5 no-scrollbar">
          <div className="h-8 w-16 rounded-xl bg-[#0755E8]/20 shimmer-shining shrink-0" />
          <div className="h-8 w-28 rounded-xl bg-slate-100/90 shimmer-shining shrink-0" />
          <div className="h-8 w-28 rounded-xl bg-slate-100/90 shimmer-shining shrink-0" />
          <div className="h-8 w-28 rounded-xl bg-slate-100/90 shimmer-shining shrink-0" />
        </div>

        {/* Session Cards Grid Skeleton (2 columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
          {Array.from({ length: 4 }).map((_, index) => (
            <SessionCardSkeleton key={`session-skel-${index}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default MySessionsSkeleton;
