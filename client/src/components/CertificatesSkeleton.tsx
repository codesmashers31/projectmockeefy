import React from "react";
import { Award, Sparkles } from "lucide-react";

export function CertificateCardSkeleton() {
  return (
    <article className="relative bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] p-3.5 sm:p-4.5 flex flex-col justify-between h-full w-full text-left box-border">
      <div className="space-y-3 flex-1 flex flex-col">
        {/* Certificate Visual Thumbnail Preview Frame Skeleton */}
        <div className="w-full flex items-center justify-center bg-slate-50/80 rounded-xl p-2 sm:p-2.5 border border-slate-100/80">
          <div className="w-full max-w-[260px] sm:max-w-[290px] aspect-[1000/707] rounded-lg sm:rounded-xl bg-slate-200/70 shimmer-shining border border-slate-200/90" />
        </div>

        {/* 1. Header: Award icon + Title & Subtitle + Verified Badge */}
        <div className="flex items-start justify-between gap-2.5 pt-0.5">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-[#EAF2FF] border border-[#93B8FF]/40 shimmer-shining shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-4 w-44 sm:w-52 rounded-md bg-slate-200/80 shimmer-shining" />
              <div className="h-3 w-32 sm:w-36 rounded-md bg-slate-100 shimmer-shining" />
            </div>
          </div>
          <div className="h-6 w-28 rounded-full bg-emerald-50/80 border border-emerald-100 shimmer-shining shrink-0" />
        </div>

        {/* 2. Structured Certificate Credential Details Box */}
        <div className="bg-[#F8FAFC] border border-slate-200/70 rounded-2xl p-3 sm:p-3.5 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="h-2.5 w-16 rounded bg-slate-200/60 shimmer-shining" />
              <div className="h-3.5 w-24 rounded bg-slate-200/80 shimmer-shining" />
            </div>
            <div className="space-y-1">
              <div className="h-2.5 w-16 rounded bg-slate-200/60 shimmer-shining" />
              <div className="h-3.5 w-24 rounded bg-slate-200/80 shimmer-shining" />
            </div>
          </div>
          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
            <div className="h-3 w-40 rounded bg-slate-200/70 shimmer-shining" />
            <div className="h-4.5 w-16 rounded-md bg-amber-50 shimmer-shining shrink-0" />
          </div>
        </div>
      </div>

      {/* 3. Certificate Action Row */}
      <div className="w-full pt-3.5 mt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="h-5 w-28 rounded-md bg-slate-100 shimmer-shining" />
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-8 w-16 rounded-xl bg-slate-100 shimmer-shining" />
          <div className="h-8 w-28 rounded-xl bg-slate-100 shimmer-shining" />
        </div>
      </div>
    </article>
  );
}

export function MasterCertificateBannerSkeleton() {
  return (
    <div className="rounded-2xl border p-4 sm:p-5 relative overflow-hidden bg-gradient-to-r from-[#06182B] via-[#0A2540] to-[#0B2A4A] text-white border-amber-500/20 shadow-md">
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-amber-300/40 animate-pulse" />
          </div>
          <div className="min-w-0 space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <div className="h-4.5 w-44 rounded-full bg-amber-400/20 animate-pulse" />
              <div className="h-4 w-32 rounded bg-white/10 animate-pulse" />
            </div>
            <div className="h-5 sm:h-6 w-3/4 max-w-md rounded-lg bg-white/15 animate-pulse" />
            <div className="h-3.5 w-4/5 max-w-xl rounded bg-white/10 animate-pulse" />
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
          <div className="hidden sm:block w-28 aspect-[1000/707] rounded-lg bg-white/10 border border-amber-400/20 animate-pulse shrink-0" />
          <div className="h-9 w-18 rounded-xl bg-white/10 border border-white/10 animate-pulse" />
          <div className="h-9 w-36 rounded-xl bg-amber-400/20 border border-amber-400/30 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function CategoryFilterTabsSkeleton() {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 px-0.5 no-scrollbar">
      <div className="h-8 w-28 rounded-xl bg-[#0755E8]/20 shimmer-shining shrink-0" />
      <div className="h-8 w-20 rounded-xl bg-slate-100 shimmer-shining shrink-0" />
      <div className="h-8 w-24 rounded-xl bg-slate-100 shimmer-shining shrink-0" />
      <div className="h-8 w-24 rounded-xl bg-slate-100 shimmer-shining shrink-0" />
    </div>
  );
}

export function CertificatesSkeleton() {
  return (
    <div className="relative w-full bg-white border border-slate-200/90 rounded-2xl sm:rounded-[28px] p-3.5 sm:p-6 md:p-8 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.08),0_1px_4px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.04] overflow-hidden pb-12 font-sans text-left animate-in fade-in duration-200">
      <div className="w-full space-y-6 relative z-10">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#EAF2FF] flex items-center justify-center border border-[#93B8FF]/60 shrink-0">
              <Award className="w-4 h-4 sm:w-5 sm:h-5 text-[#0755E8]/40 animate-pulse" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <div className="h-5 sm:h-6 w-36 sm:w-44 rounded-lg bg-slate-200/80 shimmer-shining" />
              <div className="h-3 sm:h-3.5 w-60 sm:w-80 rounded-md bg-slate-100 shimmer-shining" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-6 w-28 rounded-full bg-[#EAF2FF] shimmer-shining" />
            <div className="h-6 w-16 rounded-full bg-slate-100 shimmer-shining" />
          </div>
        </div>

        {/* Master Certificate Milestone Banner Skeleton */}
        <MasterCertificateBannerSkeleton />

        {/* Category Filter Tabs Skeleton */}
        <CategoryFilterTabsSkeleton />

        {/* Certificate Cards Grid Skeleton (4 cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <CertificateCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default CertificatesSkeleton;
