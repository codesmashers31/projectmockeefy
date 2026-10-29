import { Skeleton } from "./ui/skeleton";

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

function PageHeading() {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-10 w-32 shrink-0 rounded-lg" />
    </div>
  );
}

function FormSections() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Skeleton className="h-11 rounded-lg" />
            <Skeleton className="h-11 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ExpertPageSkeleton({ variant = "form" }: ExpertPageSkeletonProps) {
  let content;

  switch (variant) {
    case "dashboard":
      content = (
        <div className="max-w-[1400px] mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 w-32 rounded-xl" />
              <Skeleton className="h-10 w-32 rounded-xl" />
            </div>
          </div>

          {/* Info Banner */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:p-5 flex gap-4 items-start shadow-xs">
            <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-full max-w-3xl" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-[160px] rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between shadow-xs">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                  <Skeleton className="w-11 h-11 rounded-xl" />
                </div>
                <div className="pt-3 border-t border-slate-50 flex items-center gap-2">
                  <Skeleton className="h-5 w-24 rounded-md" />
                </div>
              </div>
            ))}
          </div>

          {/* 2-column main area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 space-y-5 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3.5">
                      <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-56" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-9 w-24 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
                <Skeleton className="h-5 w-32 mb-4" />
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-36" />
                      </div>
                    </div>
                    <Skeleton className="w-4 h-4 rounded" />
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-5/6" />
                <Skeleton className="h-9 w-full rounded-xl mt-2" />
              </div>
            </div>
          </div>
        </div>
      );
      break;

    case "profile":
      content = (
        <div className="h-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex-1 flex min-h-0">
            {/* Desktop Left Sidebar Tabs */}
            <div className="hidden lg:flex w-64 border-r border-slate-200 bg-white p-3 space-y-1.5 flex-col shrink-0">
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-transparent bg-slate-50/60">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-4 h-4 rounded" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <Skeleton className="w-3.5 h-3.5 rounded-full" />
                </div>
              ))}
              <div className="p-4 mt-auto border-t border-slate-100 bg-slate-50/50 rounded-xl space-y-2">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Tab Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Profile Header Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-xs">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 flex-1">
                  <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shrink-0" />
                  <div className="space-y-2 text-center sm:text-left">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                    <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-28 rounded-xl" />
                  <Skeleton className="h-10 w-28 rounded-xl" />
                </div>
              </div>

              {/* Completeness / Metric Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 shadow-xs">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>

              {/* Form Details */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-72" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="space-y-1.5">
                      <Skeleton className="h-3.5 w-24" />
                      <Skeleton className="h-11 rounded-lg" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
      break;

    case "calendar":
      content = (
        <div className="h-[calc(100vh-6.5rem)] lg:h-[calc(100vh-7.5rem)] flex flex-col min-h-0 overflow-hidden space-y-3.5">
          {/* Calendar Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="space-y-1.5">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-3.5 w-80 max-w-full" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-20 rounded-xl" />
              <Skeleton className="h-9 w-28 rounded-xl" />
            </div>
          </div>

          {/* Calendar Body */}
          <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 overflow-hidden">
            {/* Left mini calendar sidebar */}
            <div className="w-full md:w-72 lg:w-80 shrink-0 space-y-3.5">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="w-9 h-9 rounded-xl" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-8 rounded-full" />
                </div>
                <div className="border-t border-slate-100 pt-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28" />
                    <div className="flex gap-1">
                      <Skeleton className="w-6 h-6 rounded-lg" />
                      <Skeleton className="w-6 h-6 rounded-lg" />
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 35 }, (_, i) => (
                      <Skeleton key={i} className="h-7 w-7 rounded-lg mx-auto" />
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5 shadow-xs">
                <Skeleton className="h-4 w-24 mb-2" />
                <div className="flex flex-wrap gap-1.5">
                  <Skeleton className="h-7 w-16 rounded-lg" />
                  <Skeleton className="h-7 w-20 rounded-lg" />
                  <Skeleton className="h-7 w-16 rounded-lg" />
                </div>
              </div>
            </div>

            {/* Right main schedule grid */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-4 flex flex-col min-h-0 overflow-hidden shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-44 rounded-xl" />
                  <Skeleton className="h-8 w-20 rounded-xl" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-8 w-24 rounded-lg" />
                  <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
              </div>
              <div className="flex-1 grid grid-cols-7 gap-2 pt-3">
                {Array.from({ length: 7 }, (_, i) => (
                  <div key={i} className="space-y-3 border-r border-slate-100 last:border-0 pr-2">
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-20 w-full rounded-xl" />
                      {i % 2 === 0 && <Skeleton className="h-16 w-full rounded-xl" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
      break;

    case "availability":
      content = (
        <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 bg-white">
            <div className="space-y-1.5">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
            <Skeleton className="h-10 w-36 rounded-lg" />
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Settings & Blocked Dates */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <Skeleton className="h-5 w-40" />
                  <div className="space-y-3">
                    <Skeleton className="h-3 w-32" />
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-20 rounded-lg" />
                      <Skeleton className="h-9 w-20 rounded-lg" />
                    </div>
                    <Skeleton className="h-3 w-36 pt-2" />
                    <Skeleton className="h-10 rounded-lg" />
                    <Skeleton className="h-3 w-36 pt-2" />
                    <Skeleton className="h-10 rounded-lg" />
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-10 rounded-lg" />
                  <Skeleton className="h-16 rounded-lg" />
                </div>
              </div>

              {/* Right Column: Weekly Schedule */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <Skeleton className="h-5 w-44" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="space-y-3.5">
                  {Array.from({ length: 7 }, (_, i) => (
                    <div key={i} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-6 w-24 rounded-full" />
                        <Skeleton className="h-7 w-32 rounded-lg" />
                        {i % 2 === 0 && <Skeleton className="h-7 w-32 rounded-lg" />}
                      </div>
                      <Skeleton className="h-7 w-20 rounded-lg shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
      break;

    case "skills":
      content = (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 bg-white shrink-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-80 max-w-full" />
              </div>
              <Skeleton className="h-10 w-36 rounded-lg" />
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            <div className="space-y-8 max-w-5xl mx-auto">
              {/* Add New Skills Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-10 max-w-md rounded-lg" />
                </div>
                <div className="p-6 space-y-6">
                  {Array.from({ length: 3 }, (_, catIdx) => (
                    <div key={catIdx} className="space-y-2.5">
                      <Skeleton className="h-3.5 w-28 uppercase" />
                      <div className="flex flex-wrap gap-2.5">
                        {Array.from({ length: 6 }, (_, pillIdx) => (
                          <Skeleton key={pillIdx} className="h-8 w-24 rounded-full" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* My Selected Skills */}
              <div className="space-y-3">
                <Skeleton className="h-5 w-40" />
                <div className="space-y-3">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded-lg" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-32 rounded-lg" />
                        <Skeleton className="w-7 h-7 rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
      break;

    case "finance":
      content = (
        <div className="max-w-[1400px] mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
          </div>

          {/* Weekly Payout Policy Banner */}
          <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-xs">
            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3.5 w-full max-w-3xl" />
              <Skeleton className="h-3.5 w-4/5" />
            </div>
          </div>

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-[160px] rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between shadow-xs">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-8 w-28" />
                  </div>
                  <Skeleton className="w-11 h-11 rounded-xl" />
                </div>
                <div className="pt-3 border-t border-slate-50 flex items-center gap-2">
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            ))}
          </div>

          {/* 2-column Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 space-y-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <Skeleton className="h-6 w-44" />
                <Skeleton className="h-9 w-36 rounded-xl" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-11 w-44 rounded-xl" />
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
                <Skeleton className="h-5 w-36 mb-2" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
                <Skeleton className="h-5 w-36 mb-2" />
                <Skeleton className="h-40 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      );
      break;

    case "agreement":
      content = (
        <div className="w-full max-w-5xl mx-auto space-y-8 pb-16 p-4 sm:p-6 lg:p-8">
          {/* Top Banner / Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-72" />
                <Skeleton className="h-6 w-28 rounded-full" />
              </div>
              <Skeleton className="h-3.5 w-96 max-w-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28 rounded-lg" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          </div>

          {/* Declaration notice */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 flex items-start gap-3.5 shadow-xs">
            <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-full max-w-2xl" />
            </div>
          </div>

          {/* Official Document Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-8 space-y-6 shadow-sm">
            <div className="flex justify-between items-center pb-6 border-b border-slate-100">
              <div className="space-y-2">
                <Skeleton className="h-6 w-56" />
                <Skeleton className="h-3.5 w-36" />
              </div>
              <Skeleton className="w-12 h-12 rounded-xl" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-11 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-11 rounded-lg" />
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-40 w-full rounded-xl border border-dashed border-slate-200 bg-slate-50" />
            </div>

            <div className="flex items-center justify-between pt-4">
              <Skeleton className="h-5 w-60" />
              <Skeleton className="h-11 w-44 rounded-xl" />
            </div>
          </div>
        </div>
      );
      break;

    case "settings":
      content = (
        <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0 bg-white">
            <div className="space-y-1.5">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="max-w-3xl mx-auto space-y-8">
              {Array.from({ length: 3 }, (_, secIdx) => (
                <div key={secIdx} className="bg-white rounded-lg space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-lg" />
                    <Skeleton className="h-5 w-44" />
                  </div>
                  <div className="bg-slate-50/50 rounded-xl border border-slate-100 px-6 py-4 space-y-4">
                    {Array.from({ length: 3 }, (_, rowIdx) => (
                      <div key={rowIdx} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                        <div className="space-y-1.5 flex-1 pr-4">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-72 max-w-full" />
                        </div>
                        <Skeleton className="h-6 w-11 rounded-full shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
      break;

    case "reports":
      content = (
        <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 bg-white shrink-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-72 max-w-full" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-32 rounded-lg" />
                <Skeleton className="h-10 w-32 rounded-lg" />
              </div>
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-4">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-44" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-3.5 w-36" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                </div>
                <Skeleton className="h-10 w-28 rounded-lg shrink-0" />
              </div>
            ))}
          </div>
        </div>
      );
      break;

    case "list":
      content = (
        <>
          <PageHeading />
          <Skeleton className="h-14 rounded-xl" />
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-20 rounded-xl" />
            ))}
          </div>
        </>
      );
      break;

    case "form":
    default:
      content = (
        <>
          <PageHeading />
          <FormSections />
        </>
      );
  }

  return (
    <div className="min-h-full space-y-6 p-4 sm:p-6 lg:p-8" aria-busy="true" aria-label="Loading page">
      {content}
    </div>
  );
}
