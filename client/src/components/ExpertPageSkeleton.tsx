import React from "react";
import {
  Sparkles,
  CalendarDays,
  Wallet,
  User,
  Clock,
  Award,
  FileText,
  Settings,
  BarChart3,
  CheckCircle2,
} from "lucide-react";

export type SkeletonVariant =
  | "agreement"
  | "availability"
  | "calendar"
  | "dashboard"
  | "finance"
  | "form"
  | "list"
  | "profile"
  | "reports"
  | "settings"
  | "skills";

interface ExpertPageSkeletonProps {
  variant?: SkeletonVariant;
}

function SkeletonHeader({
  icon: Icon = Sparkles,
  titleWidth = "w-44 sm:w-56",
  subtitleWidth = "w-64 sm:w-80",
  badgeWidth = "w-24",
  showAction = true,
}: {
  icon?: React.ElementType;
  titleWidth?: string;
  subtitleWidth?: string;
  badgeWidth?: string;
  showAction?: boolean;
}) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-200/80 pb-4">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#EAF2FF] flex items-center justify-center border border-[#93B8FF]/60 shrink-0">
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-[#0755E8]/50 animate-pulse" />
        </div>
        <div className="min-w-0 space-y-1.5">
          <div className={`h-5 sm:h-6 ${titleWidth} rounded-lg bg-slate-200/80 shimmer-shining`} />
          <div className={`h-3 sm:h-3.5 ${subtitleWidth} rounded-md bg-slate-100 shimmer-shining`} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {badgeWidth && (
          <div className={`h-6 ${badgeWidth} rounded-full bg-[#EAF2FF] shimmer-shining`} />
        )}
        {showAction && (
          <div className="h-8 sm:h-9 w-28 sm:w-32 rounded-xl bg-[#0755E8]/20 shimmer-shining" />
        )}
      </div>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="sidebar-main-card relative w-full h-[calc(100vh-6.5rem)] lg:h-[calc(100vh-7.5rem)] rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-3.5 sm:p-5 flex flex-col min-h-0 overflow-hidden font-sans text-left animate-in fade-in duration-200">
      {/* Decorative ambient blue lighting */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col min-h-0 flex-1 space-y-3.5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 pb-2 border-b border-slate-200/80">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#EAF2FF] flex items-center justify-center border border-[#93B8FF]/60 shrink-0">
              <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-[#0755E8]/50 animate-pulse" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="h-5 sm:h-6 w-44 sm:w-52 rounded-lg bg-slate-200/80 shimmer-shining" />
              <div className="h-3 sm:h-3.5 w-64 sm:w-96 rounded-md bg-slate-100 shimmer-shining" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-20 rounded-xl bg-slate-100 shimmer-shining" />
            <div className="h-8 w-28 rounded-xl bg-emerald-50/80 border border-emerald-100 shimmer-shining" />
          </div>
        </div>

        {/* Split Calendar Canvas */}
        <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 overflow-hidden">
          {/* Left Sidebar */}
          <aside className="w-full md:w-72 lg:w-80 shrink-0 flex flex-col gap-3.5 overflow-hidden">
            {/* Top All Calendar Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50/80 border border-blue-100 flex items-center justify-center shrink-0">
                    <CalendarDays className="w-4 h-4 text-blue-600/40 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-3.5 w-24 rounded bg-slate-200/80 shimmer-shining" />
                    <div className="h-2.5 w-16 rounded bg-slate-100 shimmer-shining" />
                  </div>
                </div>
                <div className="h-5 w-8 rounded-full bg-[#EAF2FF] shimmer-shining shrink-0" />
              </div>

              {/* Mini Month Calendar */}
              <div className="border-t border-slate-100 pt-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="h-3.5 w-28 rounded bg-slate-200/80 shimmer-shining" />
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-6 rounded-lg bg-slate-100 shimmer-shining" />
                    <div className="h-5 w-10 rounded bg-slate-100 shimmer-shining" />
                    <div className="w-6 h-6 rounded-lg bg-slate-100 shimmer-shining" />
                  </div>
                </div>

                {/* Weekday headers */}
                <div className="grid grid-cols-7 text-center gap-1">
                  {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                    <span key={i} className="text-[10px] font-bold text-slate-300">
                      {d}
                    </span>
                  ))}
                </div>

                {/* 35 mini day cells */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-7 w-7 rounded-full mx-auto shimmer-shining ${
                        i === 17
                          ? "bg-[#0755E8]/30"
                          : i === 2
                          ? "border border-blue-300 bg-blue-50/60"
                          : "bg-slate-100"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Event Status Filter Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-3 w-24 rounded bg-slate-200/70 shimmer-shining" />
                <div className="h-2.5 w-16 rounded bg-slate-100 shimmer-shining" />
              </div>

              {/* Search placeholder */}
              <div className="h-8 w-full rounded-xl bg-slate-50 border border-slate-200/70 shimmer-shining" />

              {/* Filter Rows */}
              <div className="space-y-1.5 pt-1">
                {[
                  { dot: "bg-blue-600/40", w: "w-24" },
                  { dot: "bg-emerald-500/40", w: "w-32" },
                  { dot: "bg-slate-400/40", w: "w-28" },
                  { dot: "bg-rose-500/40", w: "w-20" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50/60"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                      <div className={`h-3 ${item.w} rounded bg-slate-200/80 shimmer-shining`} />
                    </div>
                    <div className="h-4 w-6 rounded bg-slate-100 shimmer-shining" />
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Right Main Calendar Canvas */}
          <main className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] p-4 flex flex-col min-h-0 overflow-hidden">
            {/* Header Control Bar */}
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 shrink-0 gap-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-36 sm:w-44 rounded-lg bg-slate-200/80 shimmer-shining" />
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-0.5">
                  <div className="w-6 h-6 rounded-lg bg-slate-100 shimmer-shining" />
                  <div className="h-5 w-12 rounded-lg bg-slate-100 shimmer-shining" />
                  <div className="w-6 h-6 rounded-lg bg-slate-100 shimmer-shining" />
                </div>
              </div>
              <div className="flex items-center gap-1 bg-slate-100/90 rounded-xl p-1">
                <div className="h-7 w-16 rounded-lg bg-white/70 shimmer-shining" />
                <div className="h-7 w-16 rounded-lg bg-[#0755E8]/20 shimmer-shining" />
                <div className="h-7 w-16 rounded-lg bg-white/70 shimmer-shining" />
              </div>
            </div>

            {/* Week Schedule Grid */}
            <div className="flex-1 grid grid-cols-7 gap-2 pt-3 overflow-hidden">
              {Array.from({ length: 7 }).map((_, colIdx) => (
                <div
                  key={colIdx}
                  className="space-y-3 border-r border-slate-100 last:border-0 pr-2 flex flex-col"
                >
                  {/* Day header */}
                  <div className="space-y-1 pb-2 border-b border-slate-100 text-center">
                    <div className="h-3 w-10 mx-auto rounded bg-slate-200/70 shimmer-shining" />
                    <div className="h-6 w-6 mx-auto rounded-full bg-slate-100 shimmer-shining" />
                  </div>

                  {/* Calendar Appointment Cards */}
                  {colIdx % 2 === 1 ? (
                    <div className="bg-gradient-to-b from-[#F8FAFC] to-white border border-slate-200/80 rounded-xl p-2.5 sm:p-3 space-y-2 shadow-2xs">
                      <div className="h-4 w-20 rounded-md bg-[#EAF2FF] shimmer-shining" />
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200/80 shimmer-shining shrink-0" />
                        <div className="h-3.5 w-20 rounded bg-slate-200/80 shimmer-shining" />
                      </div>
                      <div className="h-3 w-14 rounded bg-slate-100 shimmer-shining" />
                      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1">
                        <div className="h-4.5 w-14 rounded bg-blue-50 border border-blue-100 shimmer-shining" />
                        <div className="h-4.5 w-14 rounded bg-rose-50 border border-rose-100 shimmer-shining" />
                      </div>
                    </div>
                  ) : colIdx === 4 ? (
                    <div className="bg-gradient-to-b from-[#F8FAFC] to-white border border-slate-200/80 rounded-xl p-2.5 sm:p-3 space-y-2 shadow-2xs">
                      <div className="h-4 w-20 rounded-md bg-[#EAF2FF] shimmer-shining" />
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200/80 shimmer-shining shrink-0" />
                        <div className="h-3.5 w-20 rounded bg-slate-200/80 shimmer-shining" />
                      </div>
                      <div className="h-3 w-14 rounded bg-slate-100 shimmer-shining" />
                      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1">
                        <div className="h-4.5 w-14 rounded bg-blue-50 border border-blue-100 shimmer-shining" />
                        <div className="h-4.5 w-16 rounded bg-emerald-50 border border-emerald-100 shimmer-shining" />
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="sidebar-main-card relative w-full rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-3.5 sm:p-6 md:p-8 overflow-hidden font-sans text-left animate-in fade-in duration-200">
      {/* Decorative ambient blue lighting */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

      <div className="w-full space-y-6 relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#EAF2FF] flex items-center justify-center border border-[#93B8FF]/60 shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#0755E8]/50 animate-pulse" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="h-6 sm:h-7 w-48 sm:w-56 rounded-lg bg-slate-200/80 shimmer-shining" />
                <div className="h-5 w-18 rounded-full bg-emerald-50/80 border border-emerald-100 shimmer-shining" />
              </div>
              <div className="h-3.5 w-64 sm:w-80 rounded-md bg-slate-100 shimmer-shining" />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-32 rounded-xl bg-slate-100 shimmer-shining" />
            <div className="h-9 w-32 rounded-xl bg-[#0755E8]/20 shimmer-shining" />
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-[#F8FAFC] border border-blue-100/90 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-[#EAF2FF] border border-[#93B8FF]/40 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-[#0755E8]/40 animate-pulse" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-full max-w-3xl rounded bg-slate-200/70 shimmer-shining" />
            <div className="h-3.5 w-4/5 rounded bg-slate-100 shimmer-shining" />
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[155px] rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-5 flex flex-col justify-between shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="h-3.5 w-24 rounded bg-slate-200/70 shimmer-shining" />
                  <div className="h-8 w-24 rounded-lg bg-slate-200/90 shimmer-shining" />
                </div>
                <div className="w-11 h-11 rounded-xl bg-[#EAF2FF] border border-[#93B8FF]/40 shimmer-shining shrink-0" />
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <div className="h-5 w-28 rounded-md bg-slate-100 shimmer-shining" />
              </div>
            </div>
          ))}
        </div>

        {/* 2-column main area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 cols: Upcoming Sessions */}
          <div className="lg:col-span-2 rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-6 space-y-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-blue-600/40 animate-pulse" />
                </div>
                <div className="h-5 w-44 rounded bg-slate-200/80 shimmer-shining" />
              </div>
              <div className="h-7 w-24 rounded-lg bg-blue-50 shimmer-shining" />
            </div>

            {/* 4 upcoming session rows */}
            <div className="space-y-3.5 divide-y divide-slate-100">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="pt-3.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-full bg-[#EAF2FF] border border-blue-100 shimmer-shining shrink-0" />
                    <div className="space-y-1.5">
                      <div className="h-4 w-36 rounded bg-slate-200/80 shimmer-shining" />
                      <div className="h-3 w-52 rounded bg-slate-100 shimmer-shining" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-20 rounded-xl bg-blue-50 shimmer-shining" />
                    <div className="h-8 w-24 rounded-xl bg-[#0755E8]/20 shimmer-shining" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right 1 col: Quick Actions */}
          <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-6 space-y-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Sparkles className="w-4 h-4 text-blue-500/40 animate-pulse" />
              <div className="h-4 w-32 rounded bg-slate-200/80 shimmer-shining" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#EAF2FF] border border-[#93B8FF]/40 shimmer-shining shrink-0" />
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-28 rounded bg-slate-200/80 shimmer-shining" />
                      <div className="h-2.5 w-36 rounded bg-slate-100 shimmer-shining" />
                    </div>
                  </div>
                  <div className="w-4 h-4 rounded bg-slate-200 shimmer-shining" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FinanceSkeleton() {
  return (
    <div className="sidebar-main-card relative w-full rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-3.5 sm:p-6 md:p-8 overflow-hidden font-sans text-left animate-in fade-in duration-200">
      {/* Decorative ambient blue lighting */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

      <div className="w-full space-y-6 relative z-10">
        <SkeletonHeader
          icon={Wallet}
          titleWidth="w-56"
          subtitleWidth="w-80"
          badgeWidth="w-24"
          showAction={false}
        />

        {/* Weekly Payout Policy Banner */}
        <div className="bg-[#F8FAFC] border border-blue-100/90 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-blue-100/60 text-blue-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-blue-600/40 animate-pulse" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-48 rounded bg-slate-200/80 shimmer-shining" />
            <div className="h-3.5 w-full max-w-3xl rounded bg-slate-200/70 shimmer-shining" />
            <div className="h-3.5 w-4/5 rounded bg-slate-100 shimmer-shining" />
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-[160px] rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-6 flex flex-col justify-between shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="h-3.5 w-28 rounded bg-slate-200/70 shimmer-shining" />
                  <div className="h-8 w-24 rounded-lg bg-slate-200/90 shimmer-shining" />
                </div>
                <div className="w-11 h-11 rounded-xl bg-[#EAF2FF] border border-[#93B8FF]/40 shimmer-shining shrink-0" />
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <div className="h-4 w-32 rounded bg-slate-100 shimmer-shining" />
              </div>
            </div>
          ))}
        </div>

        {/* 2-column Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-6 space-y-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="h-5 w-44 rounded bg-slate-200/80 shimmer-shining" />
              <div className="h-8 w-36 rounded-xl bg-slate-100 shimmer-shining" />
            </div>
            <div className="space-y-4">
              <div className="h-11 rounded-xl bg-slate-50 border border-slate-200/70 shimmer-shining" />
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="h-8 w-18 rounded-lg bg-slate-100 shimmer-shining" />
                ))}
              </div>
              <div className="h-11 w-44 rounded-xl bg-[#0755E8]/20 shimmer-shining mt-4" />
            </div>
          </div>

          <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-6 space-y-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="h-5 w-36 rounded bg-slate-200/80 shimmer-shining" />
              <div className="h-7 w-20 rounded-lg bg-[#EAF2FF] shimmer-shining" />
            </div>
            <div className="h-24 rounded-xl bg-slate-50 border border-slate-200/70 shimmer-shining" />
            <div className="h-24 rounded-xl bg-slate-50 border border-slate-200/70 shimmer-shining" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="sidebar-main-card relative w-full rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-3.5 sm:p-6 md:p-8 overflow-hidden font-sans text-left animate-in fade-in duration-200">
      {/* Decorative ambient blue lighting */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

      <div className="w-full space-y-6 relative z-10">
        <SkeletonHeader icon={User} titleWidth="w-52" subtitleWidth="w-80" showAction={false} />

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Tabs */}
          <div className="hidden lg:flex w-64 rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-4 space-y-2 flex-col shrink-0 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50/60"
              >
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-slate-200 shimmer-shining" />
                  <div className="h-4 w-28 rounded bg-slate-200/80 shimmer-shining" />
                </div>
                <div className="w-3.5 h-3.5 rounded-full bg-slate-100 shimmer-shining" />
              </div>
            ))}
          </div>

          {/* Right Content */}
          <div className="flex-1 space-y-6">
            {/* Header Card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 flex-1">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#EAF2FF] border border-[#93B8FF]/40 shimmer-shining shrink-0" />
                <div className="space-y-2 text-center sm:text-left">
                  <div className="h-6 w-48 rounded bg-slate-200/80 shimmer-shining" />
                  <div className="h-4 w-64 rounded bg-slate-100 shimmer-shining" />
                  <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
                    <div className="h-6 w-20 rounded-full bg-[#EAF2FF] shimmer-shining" />
                    <div className="h-6 w-24 rounded-full bg-emerald-50 shimmer-shining" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-9 w-28 rounded-xl bg-slate-100 shimmer-shining" />
                <div className="h-9 w-28 rounded-xl bg-[#0755E8]/20 shimmer-shining" />
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-2 shadow-2xs"
                >
                  <div className="h-3.5 w-24 rounded bg-slate-200/70 shimmer-shining" />
                  <div className="h-6 w-16 rounded bg-slate-200/90 shimmer-shining" />
                </div>
              ))}
            </div>

            {/* Form */}
            <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-6 space-y-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]">
              <div className="h-5 w-40 rounded bg-slate-200/80 shimmer-shining" />
              <div className="h-3.5 w-72 rounded bg-slate-100 shimmer-shining" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-3.5 w-24 rounded bg-slate-200/70 shimmer-shining" />
                    <div className="h-11 rounded-xl bg-slate-50 border border-slate-200/70 shimmer-shining" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AvailabilitySkeleton() {
  return (
    <div className="sidebar-main-card relative w-full rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-3.5 sm:p-6 md:p-8 overflow-hidden font-sans text-left animate-in fade-in duration-200">
      {/* Decorative ambient blue lighting */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

      <div className="w-full space-y-6 relative z-10">
        <SkeletonHeader
          icon={Clock}
          titleWidth="w-56"
          subtitleWidth="w-80"
          showAction={true}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Left */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-6 space-y-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]">
              <div className="h-5 w-40 rounded bg-slate-200/80 shimmer-shining" />
              <div className="space-y-3">
                <div className="h-3 w-32 rounded bg-slate-100 shimmer-shining" />
                <div className="flex gap-2">
                  <div className="h-9 w-20 rounded-lg bg-[#0755E8]/20 shimmer-shining" />
                  <div className="h-9 w-20 rounded-lg bg-slate-100 shimmer-shining" />
                </div>
                <div className="h-3 w-36 rounded bg-slate-100 shimmer-shining pt-2" />
                <div className="h-10 rounded-xl bg-slate-50 border border-slate-200/70 shimmer-shining" />
              </div>
            </div>
          </div>

          {/* Schedule Right */}
          <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-6 space-y-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="h-5 w-44 rounded bg-slate-200/80 shimmer-shining" />
              <div className="h-4 w-32 rounded bg-slate-100 shimmer-shining" />
            </div>
            <div className="space-y-3.5">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-24 rounded-full bg-[#EAF2FF] shimmer-shining" />
                    <div className="h-7 w-32 rounded-lg bg-white border border-slate-200 shimmer-shining" />
                    {i % 2 === 0 && (
                      <div className="h-7 w-32 rounded-lg bg-white border border-slate-200 shimmer-shining" />
                    )}
                  </div>
                  <div className="h-7 w-20 rounded-lg bg-slate-100 shimmer-shining shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkillsSkeleton() {
  return (
    <div className="sidebar-main-card relative w-full rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-3.5 sm:p-6 md:p-8 overflow-hidden font-sans text-left animate-in fade-in duration-200">
      {/* Decorative ambient blue lighting */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

      <div className="w-full space-y-6 relative z-10">
        <SkeletonHeader icon={Award} titleWidth="w-48" subtitleWidth="w-80" showAction={true} />

        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Add Skills Card */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
              <div className="h-5 w-36 rounded bg-slate-200/80 shimmer-shining" />
              <div className="h-10 max-w-md rounded-xl bg-white border border-slate-200 shimmer-shining" />
            </div>
            <div className="p-6 space-y-6">
              {Array.from({ length: 3 }).map((_, catIdx) => (
                <div key={catIdx} className="space-y-2.5">
                  <div className="h-3.5 w-28 rounded bg-slate-200/70 shimmer-shining uppercase" />
                  <div className="flex flex-wrap gap-2.5">
                    {Array.from({ length: 6 }).map((_, pillIdx) => (
                      <div
                        key={pillIdx}
                        className={`h-8 w-24 rounded-full shimmer-shining ${
                          pillIdx === 0
                            ? "bg-[#0755E8]/20"
                            : pillIdx % 2 === 0
                            ? "bg-[#EAF2FF]"
                            : "bg-slate-100"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Skills */}
          <div className="space-y-3">
            <div className="h-5 w-40 rounded bg-slate-200/80 shimmer-shining" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl border border-slate-200/80 bg-white flex items-center justify-between shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#EAF2FF] shimmer-shining shrink-0" />
                    <div className="h-4 w-32 rounded bg-slate-200/80 shimmer-shining" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-28 rounded-lg bg-slate-100 shimmer-shining" />
                    <div className="w-7 h-7 rounded-lg bg-rose-50 shimmer-shining" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AgreementSkeleton() {
  return (
    <div className="sidebar-main-card relative w-full rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-3.5 sm:p-6 md:p-8 overflow-hidden font-sans text-left animate-in fade-in duration-200">
      {/* Decorative ambient blue lighting */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

      <div className="w-full max-w-5xl mx-auto space-y-6 relative z-10 pb-8">
        <SkeletonHeader
          icon={FileText}
          titleWidth="w-72"
          subtitleWidth="w-96"
          badgeWidth="w-28"
          showAction={true}
        />

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 flex items-start gap-3.5 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-blue-600/40 animate-pulse" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-48 rounded bg-slate-200/80 shimmer-shining" />
            <div className="h-3 w-full max-w-2xl rounded bg-slate-100 shimmer-shining" />
          </div>
        </div>

        {/* Document Card */}
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 space-y-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-center pb-5 border-b border-slate-100">
            <div className="space-y-2">
              <div className="h-6 w-56 rounded bg-slate-200/80 shimmer-shining" />
              <div className="h-3.5 w-36 rounded bg-slate-100 shimmer-shining" />
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#EAF2FF] shimmer-shining shrink-0" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="h-3.5 w-24 rounded bg-slate-200/70 shimmer-shining" />
              <div className="h-11 rounded-xl bg-slate-50 border border-slate-200/70 shimmer-shining" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3.5 w-24 rounded bg-slate-200/70 shimmer-shining" />
              <div className="h-11 rounded-xl bg-slate-50 border border-slate-200/70 shimmer-shining" />
            </div>
          </div>

          <div className="space-y-3 pt-3">
            <div className="h-4 w-full rounded bg-slate-200/70 shimmer-shining" />
            <div className="h-4 w-full rounded bg-slate-200/70 shimmer-shining" />
            <div className="h-4 w-4/5 rounded bg-slate-100 shimmer-shining" />
            <div className="h-4 w-full rounded bg-slate-200/70 shimmer-shining" />
            <div className="h-4 w-3/4 rounded bg-slate-100 shimmer-shining" />
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="h-3.5 w-32 rounded bg-slate-200/70 shimmer-shining" />
            <div className="h-32 w-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
              <div className="h-6 w-48 rounded bg-slate-200/60 shimmer-shining" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="h-5 w-60 rounded bg-slate-200/80 shimmer-shining" />
            <div className="h-11 w-44 rounded-xl bg-[#0755E8]/20 shimmer-shining" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReportsSkeleton() {
  return (
    <div className="sidebar-main-card relative w-full rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-3.5 sm:p-6 md:p-8 overflow-hidden font-sans text-left animate-in fade-in duration-200">
      {/* Decorative ambient blue lighting */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

      <div className="w-full space-y-6 relative z-10">
        <SkeletonHeader
          icon={BarChart3}
          titleWidth="w-48"
          subtitleWidth="w-72"
          showAction={true}
        />

        <div className="space-y-3.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#EAF2FF] border border-[#93B8FF]/40 shimmer-shining shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-4.5 w-44 sm:w-56 rounded bg-slate-200/80 shimmer-shining" />
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-32 rounded bg-slate-100 shimmer-shining" />
                    <div className="h-5 w-20 rounded-full bg-emerald-50 shimmer-shining" />
                  </div>
                </div>
              </div>
              <div className="h-9 w-28 rounded-xl bg-slate-100 shimmer-shining shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="sidebar-main-card relative w-full rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-3.5 sm:p-6 md:p-8 overflow-hidden font-sans text-left animate-in fade-in duration-200">
      {/* Decorative ambient blue lighting */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

      <div className="w-full space-y-6 relative z-10">
        <SkeletonHeader
          icon={Settings}
          titleWidth="w-44"
          subtitleWidth="w-72"
          showAction={true}
        />

        <div className="max-w-3xl mx-auto space-y-6">
          {Array.from({ length: 3 }).map((_, secIdx) => (
            <div
              key={secIdx}
              className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-6 space-y-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-[#EAF2FF] flex items-center justify-center shrink-0">
                  <Settings className="w-4 h-4 text-[#0755E8]/40 animate-pulse" />
                </div>
                <div className="h-5 w-44 rounded bg-slate-200/80 shimmer-shining" />
              </div>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, rowIdx) => (
                  <div
                    key={rowIdx}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                  >
                    <div className="space-y-1.5 flex-1 pr-4">
                      <div className="h-4 w-40 rounded bg-slate-200/80 shimmer-shining" />
                      <div className="h-3 w-64 sm:w-80 rounded bg-slate-100 shimmer-shining" />
                    </div>
                    <div className="h-6 w-11 rounded-full bg-slate-200 shimmer-shining shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="sidebar-main-card relative w-full rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-3.5 sm:p-6 md:p-8 overflow-hidden font-sans text-left animate-in fade-in duration-200">
      {/* Decorative ambient blue lighting */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

      <div className="w-full space-y-6 relative z-10">
        <SkeletonHeader icon={Sparkles} titleWidth="w-52" subtitleWidth="w-80" showAction={true} />

        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="space-y-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]"
            >
              <div className="h-5 w-40 rounded bg-slate-200/80 shimmer-shining" />
              <div className="h-4 w-full max-w-xl rounded bg-slate-100 shimmer-shining" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                <div className="h-11 rounded-xl bg-slate-50 border border-slate-200/70 shimmer-shining" />
                <div className="h-11 rounded-xl bg-slate-50 border border-slate-200/70 shimmer-shining" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="sidebar-main-card relative w-full rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-3.5 sm:p-6 md:p-8 overflow-hidden font-sans text-left animate-in fade-in duration-200">
      {/* Decorative ambient blue lighting */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

      <div className="w-full space-y-6 relative z-10">
        <SkeletonHeader icon={Sparkles} titleWidth="w-52" subtitleWidth="w-80" showAction={true} />
        <div className="h-12 rounded-2xl bg-white border border-slate-200/80 shimmer-shining" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-20 rounded-2xl bg-white border border-slate-200/80 p-4 flex items-center justify-between shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAF2FF] shimmer-shining shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-4 w-40 rounded bg-slate-200/80 shimmer-shining" />
                  <div className="h-3 w-28 rounded bg-slate-100 shimmer-shining" />
                </div>
              </div>
              <div className="h-8 w-24 rounded-xl bg-slate-100 shimmer-shining" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ExpertPageSkeleton({ variant = "form" }: ExpertPageSkeletonProps) {
  switch (variant) {
    case "dashboard":
      return <DashboardSkeleton />;
    case "calendar":
      return <CalendarSkeleton />;
    case "finance":
      return <FinanceSkeleton />;
    case "profile":
      return <ProfileSkeleton />;
    case "availability":
      return <AvailabilitySkeleton />;
    case "skills":
      return <SkillsSkeleton />;
    case "agreement":
      return <AgreementSkeleton />;
    case "reports":
      return <ReportsSkeleton />;
    case "settings":
      return <SettingsSkeleton />;
    case "list":
      return <ListSkeleton />;
    case "form":
    default:
      return <FormSkeleton />;
  }
}
