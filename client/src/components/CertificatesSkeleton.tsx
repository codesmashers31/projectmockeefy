import React from "react";
import { Award, CheckCircle2, Download, Sparkles, X } from "lucide-react";

export function CertificatesSkeleton() {
  return (
    <div className="w-full font-sans text-left animate-in fade-in duration-200">
      <div className="w-full space-y-6 sm:space-y-8">
        {/* 1. HEADER SKELETON */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[#EAF2FF] border border-[#93B8FF]/30 flex items-center justify-center text-[#0755E8]/40 shrink-0">
              <Award className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-2 min-w-0">
              <div className="h-6 w-48 sm:w-64 rounded-lg bg-slate-200 animate-pulse" />
              <div className="h-3.5 w-64 sm:w-80 rounded bg-slate-100 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-36 rounded-full bg-white border border-[#E2E8F0] animate-pulse" />
            <div className="h-8 w-20 rounded-full bg-white border border-[#E2E8F0] animate-pulse" />
          </div>
        </div>

        {/* 2. MASTER CREDENTIAL MILESTONE SKELETON */}
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-[0_4px_20px_rgba(23,43,77,0.06)]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4 min-w-0 flex-1">
              <div className="w-12 h-12 rounded-xl bg-[#EAF2FF] border border-[#93B8FF]/30 flex items-center justify-center text-[#0755E8]/40 shrink-0">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-2 min-w-0 flex-1">
                <div className="h-4 w-36 rounded bg-slate-200 animate-pulse" />
                <div className="h-5 w-72 max-w-full rounded bg-slate-200 animate-pulse" />
                <div className="h-3.5 w-96 max-w-full rounded bg-slate-100 animate-pulse" />
              </div>
            </div>
            <div className="w-full sm:w-48 space-y-2">
              <div className="h-3.5 w-full rounded bg-slate-100 animate-pulse" />
              <div className="h-2 w-full rounded-full bg-[#E2E8F0] animate-pulse" />
            </div>
          </div>
        </div>

        {/* 3. TABS SKELETON */}
        <div className="flex items-center gap-2">
          <div className="h-9 w-32 rounded-xl bg-[#0755E8]/20 animate-pulse" />
          <div className="h-9 w-24 rounded-xl bg-white border border-[#E2E8F0] animate-pulse" />
          <div className="h-9 w-24 rounded-xl bg-white border border-[#E2E8F0] animate-pulse" />
        </div>

        {/* 4. CARDS GRID SKELETON */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-[0_4px_20px_rgba(23,43,77,0.06)] space-y-4"
            >
              <div className="w-full aspect-[1000/707] rounded-xl bg-[#F5F8FF] border border-[#E2E8F0] flex items-center justify-center">
                <div className="w-3/4 h-3/4 rounded-lg bg-slate-200/60 animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-48 rounded bg-slate-200 animate-pulse" />
                <div className="h-3 w-32 rounded bg-slate-100 animate-pulse" />
              </div>
              <div className="h-16 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CertificatesSkeleton;
