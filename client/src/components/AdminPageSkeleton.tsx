import React from "react";
import { Sparkles } from "lucide-react";

export type AdminPageSkeletonVariant =
  | "dashboard"
  | "table"
  | "agreements"
  | "payouts"
  | "pricing"
  | "contacts"
  | "skills"
  | "form";

interface AdminPageSkeletonProps {
  variant: AdminPageSkeletonVariant;
  rows?: number;
  columns?: number;
}

function PageHeadingSkeleton({
  titleWidth = "w-44 sm:w-56",
  subtitleWidth = "w-60 sm:w-80",
}: {
  titleWidth?: string;
  subtitleWidth?: string;
}) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200/80 pb-4">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#EAF2FF] flex items-center justify-center border border-[#93B8FF]/60 shrink-0">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#0755E8]/40 animate-pulse" />
        </div>
        <div className="min-w-0 space-y-1.5">
          <div className={`h-5 sm:h-6 ${titleWidth} rounded-lg bg-slate-200/80 shimmer-shining`} />
          <div className={`h-3 sm:h-3.5 ${subtitleWidth} rounded-md bg-slate-100 shimmer-shining`} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-8 w-24 rounded-xl bg-[#EAF2FF] shimmer-shining" />
        <div className="h-8 w-20 rounded-xl bg-slate-100 shimmer-shining" />
      </div>
    </div>
  );
}

function MetricSkeletons({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="relative bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] p-5 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="h-3.5 w-24 rounded bg-slate-100 shimmer-shining" />
              <div className="h-8 w-24 rounded-lg bg-slate-200/80 shimmer-shining" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#EAF2FF] shimmer-shining shrink-0" />
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="h-4 w-16 rounded-full bg-[#EAF2FF] shimmer-shining" />
            <div className="h-3 w-20 rounded bg-slate-100 shimmer-shining" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SearchBarSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/90 backdrop-blur-xs border border-slate-200/80 rounded-2xl p-3 sm:p-3.5 shadow-xs">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-slate-100 shimmer-shining shrink-0" />
        <div className="h-8 w-full max-w-sm rounded-lg bg-slate-100 shimmer-shining" />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="h-8 w-24 rounded-xl bg-slate-100 shimmer-shining" />
        <div className="h-8 w-20 rounded-xl bg-[#EAF2FF] shimmer-shining" />
      </div>
    </div>
  );
}

function TableViewSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Table header */}
      <div className="bg-[#F8FAFC] border-b border-slate-200/80 px-6 py-4 flex items-center justify-between gap-4">
        {Array.from({ length: columns }, (_, c) => (
          <div
            key={c}
            className={`h-3.5 rounded shimmer-shining ${
              c === 0
                ? "w-32 bg-slate-200/80"
                : c === columns - 1
                ? "w-20 ml-auto bg-slate-200/80"
                : "w-24 bg-slate-200/80"
            }`}
          />
        ))}
      </div>
      {/* Table rows */}
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="px-6 py-4 flex items-center justify-between gap-4">
            {Array.from({ length: columns }, (_, c) => {
              if (c === 0) {
                return (
                  <div key={c} className="flex items-center gap-3 min-w-[180px] flex-1">
                    <div className="w-9 h-9 rounded-xl bg-slate-200/80 shimmer-shining shrink-0" />
                    <div className="space-y-1.5">
                      <div className="h-4 w-32 rounded bg-slate-200/80 shimmer-shining" />
                      <div className="h-3 w-20 rounded bg-slate-100 shimmer-shining" />
                    </div>
                  </div>
                );
              }
              if (c === columns - 1) {
                return (
                  <div key={c} className="flex items-center justify-end gap-2 shrink-0">
                    <div className="h-8 w-20 rounded-lg bg-[#EAF2FF] shimmer-shining" />
                  </div>
                );
              }
              if (c === 1) {
                return (
                  <div key={c} className="h-6 w-24 rounded-full bg-[#EAF2FF] shimmer-shining shrink-0" />
                );
              }
              return (
                <div key={c} className="h-3.5 w-24 rounded bg-slate-100 shimmer-shining shrink-0" />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminPageSkeleton({
  variant,
  rows = 6,
  columns = 5,
}: AdminPageSkeletonProps) {
  if (variant === "dashboard") {
    return (
      <div
        aria-busy="true"
        aria-label="Loading admin dashboard"
        className="sidebar-main-card relative w-full rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-3.5 sm:p-6 md:p-8 overflow-hidden pb-12 font-sans text-left animate-in fade-in duration-200"
      >
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

        <div className="relative z-10 w-full space-y-6">
          <PageHeadingSkeleton titleWidth="w-56" subtitleWidth="w-80" />
          <MetricSkeletons count={4} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main chart card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="h-4 w-44 rounded bg-slate-200/80 shimmer-shining" />
                  <div className="h-3 w-56 rounded bg-slate-100 shimmer-shining" />
                </div>
                <div className="h-7 w-24 rounded-lg bg-[#EAF2FF] shimmer-shining" />
              </div>
              <div className="h-64 w-full rounded-xl bg-slate-50 border border-slate-100 p-4 flex items-end justify-between gap-3">
                {Array.from({ length: 12 }, (_, i) => (
                  <div
                    key={i}
                    className="w-full rounded-t-lg bg-[#0755E8]/20 shimmer-shining"
                    style={{ height: `${25 + (i * 17) % 65}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Quick Activity / Category card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="h-4 w-32 rounded bg-slate-200/80 shimmer-shining" />
                <div className="h-5 w-16 rounded-full bg-[#EAF2FF] shimmer-shining" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200/60">
                    <div className="w-8 h-8 rounded-lg bg-[#EAF2FF] shimmer-shining shrink-0" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="h-3 w-28 rounded bg-slate-200/80 shimmer-shining" />
                      <div className="h-2.5 w-36 rounded bg-slate-100 shimmer-shining" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent list / table card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-4 w-44 rounded bg-slate-200/80 shimmer-shining" />
              <div className="h-6 w-24 rounded-full bg-[#EAF2FF] shimmer-shining" />
            </div>
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-200/80 shimmer-shining shrink-0" />
                    <div className="space-y-1">
                      <div className="h-3.5 w-36 rounded bg-slate-200/80 shimmer-shining" />
                      <div className="h-2.5 w-24 rounded bg-slate-100 shimmer-shining" />
                    </div>
                  </div>
                  <div className="h-6 w-20 rounded-full bg-[#EAF2FF] shimmer-shining" />
                  <div className="h-3.5 w-16 rounded bg-slate-100 shimmer-shining" />
                  <div className="h-7 w-20 rounded-lg bg-[#EAF2FF] shimmer-shining" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "pricing") {
    return (
      <div
        aria-busy="true"
        aria-label="Loading pricing rules"
        className="sidebar-main-card relative w-full rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-3.5 sm:p-6 md:p-8 overflow-hidden pb-12 font-sans text-left animate-in fade-in duration-200"
      >
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

        <div className="relative z-10 w-full space-y-6">
          <PageHeadingSkeleton titleWidth="w-52" subtitleWidth="w-80" />
          <MetricSkeletons count={4} />
          <SearchBarSkeleton />
          <TableViewSkeleton rows={rows} columns={6} />
        </div>
      </div>
    );
  }

  if (variant === "contacts") {
    return (
      <div
        aria-busy="true"
        aria-label="Loading HR contacts"
        className="sidebar-main-card relative w-full rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-3.5 sm:p-6 md:p-8 overflow-hidden pb-12 font-sans text-left animate-in fade-in duration-200"
      >
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

        <div className="relative z-10 w-full space-y-6">
          <PageHeadingSkeleton titleWidth="w-48" subtitleWidth="w-72" />
          <SearchBarSkeleton />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] p-5 space-y-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-slate-200/80 shimmer-shining shrink-0" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="h-4 w-32 rounded bg-slate-200/80 shimmer-shining" />
                    <div className="h-3 w-24 rounded bg-slate-100 shimmer-shining" />
                  </div>
                  <div className="h-6 w-16 rounded-full bg-[#EAF2FF] shimmer-shining shrink-0" />
                </div>
                <div className="bg-[#F8FAFC] border border-slate-200/70 rounded-xl p-3 space-y-2">
                  <div className="h-3 w-full rounded bg-slate-100 shimmer-shining" />
                  <div className="h-3 w-3/4 rounded bg-slate-100 shimmer-shining" />
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="h-3 w-20 rounded bg-slate-100 shimmer-shining" />
                  <div className="h-8 w-24 rounded-lg bg-[#EAF2FF] shimmer-shining" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "skills") {
    return (
      <div
        aria-busy="true"
        aria-label="Loading skill management"
        className="sidebar-main-card relative w-full rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-3.5 sm:p-6 md:p-8 overflow-hidden pb-12 font-sans text-left animate-in fade-in duration-200"
      >
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

        <div className="relative z-10 w-full space-y-6">
          <PageHeadingSkeleton titleWidth="w-52" subtitleWidth="w-80" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[18rem_1fr]">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <div className="h-4 w-28 rounded bg-slate-200/80 shimmer-shining mb-4" />
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="h-10 w-full rounded-xl bg-slate-100 shimmer-shining" />
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="h-5 w-44 rounded bg-slate-200/80 shimmer-shining" />
                <div className="h-9 w-28 rounded-xl bg-[#EAF2FF] shimmer-shining" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: rows }, (_, index) => (
                  <div key={index} className="h-16 w-full rounded-xl bg-slate-50 border border-slate-100 p-3 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="h-3.5 w-36 rounded bg-slate-200/80 shimmer-shining" />
                      <div className="h-2.5 w-24 rounded bg-slate-100 shimmer-shining" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-16 rounded-full bg-[#EAF2FF] shimmer-shining" />
                      <div className="h-7 w-14 rounded-lg bg-slate-100 shimmer-shining" />
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

  if (variant === "form") {
    return (
      <div
        aria-busy="true"
        aria-label="Loading admin configuration"
        className="sidebar-main-card relative w-full rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-3.5 sm:p-6 md:p-8 overflow-hidden pb-12 font-sans text-left animate-in fade-in duration-200"
      >
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

        <div className="relative z-10 w-full space-y-6">
          <PageHeadingSkeleton titleWidth="w-52" subtitleWidth="w-72" />
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
            <div className="space-y-2">
              <div className="h-3.5 w-32 rounded bg-slate-200/80 shimmer-shining" />
              <div className="h-10 w-full max-w-xl rounded-xl bg-slate-100 shimmer-shining" />
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="space-y-2">
                  <div className="h-3.5 w-36 rounded bg-slate-200/80 shimmer-shining" />
                  <div className="h-10 w-full rounded-xl bg-slate-100 shimmer-shining" />
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <div className="h-10 w-32 rounded-xl bg-[#0755E8]/20 shimmer-shining" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      aria-busy="true"
      aria-label="Loading admin data"
      className="sidebar-main-card relative w-full rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-3.5 sm:p-6 md:p-8 overflow-hidden pb-12 font-sans text-left animate-in fade-in duration-200"
    >
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

      <div className="relative z-10 w-full space-y-6">
        <PageHeadingSkeleton titleWidth="w-52" subtitleWidth="w-80" />
        {(variant === "payouts" || variant === "agreements") && <MetricSkeletons count={4} />}
        <SearchBarSkeleton />
        <TableViewSkeleton rows={rows} columns={columns} />
      </div>
    </div>
  );
}

interface AdminPageErrorProps {
  title: string;
  message: string;
  onRetry: () => void;
}

export function AdminPageError({ title, message, onRetry }: AdminPageErrorProps) {
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-xs">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-gray-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-xl bg-[#004fcb] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 shadow-sm"
      >
        Retry
      </button>
    </div>
  );
}
