import { Skeleton } from "./ui/Skeleton";

type AdminPageSkeletonVariant =
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

function PageHeadingSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-7 w-64 max-w-full" />
      <Skeleton className="h-4 w-96 max-w-full" />
    </div>
  );
}

function MetricSkeletons({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-xl border border-gray-200 bg-white p-5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-4 h-8 w-24" />
          <Skeleton className="mt-3 h-3 w-36 max-w-full" />
        </div>
      ))}
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
      <div aria-busy="true" aria-label="Loading admin dashboard" className="space-y-8 rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <PageHeadingSkeleton />
        <MetricSkeletons />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-100 p-6 lg:col-span-2">
            <Skeleton className="mb-6 h-5 w-44" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="rounded-xl border border-gray-100 p-6">
            <Skeleton className="mb-6 h-5 w-36" />
            <div className="space-y-6">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-8 w-full" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-5 w-44" />
            <div className="overflow-hidden rounded-xl border border-gray-200 p-4">
              <div className="space-y-4">
                {Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                    {Array.from({ length: 5 }, (_, column) => (
                      <Skeleton key={column} className="h-8 w-full" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "pricing") {
    return (
      <div aria-busy="true" aria-label="Loading pricing rules" className="space-y-8">
        <PageHeadingSkeleton />
        <MetricSkeletons />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-5">
          <div className="space-y-4">
            {Array.from({ length: rows }, (_, row) => (
              <div key={row} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {Array.from({ length: 6 }, (_, column) => (
                  <Skeleton key={column} className="h-10 w-full" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "contacts") {
    return (
      <div aria-busy="true" aria-label="Loading HR contacts" className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <PageHeadingSkeleton />
          <Skeleton className="h-10 w-36 shrink-0" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="space-y-4 rounded-2xl border border-gray-200 p-5">
              <div className="flex gap-4">
                <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "skills") {
    return (
      <div aria-busy="true" aria-label="Loading skill management" className="space-y-6">
        <PageHeadingSkeleton />
        <div className="grid grid-cols-1 gap-6 rounded-xl border border-gray-200 bg-white p-6 md:grid-cols-[16rem_1fr]">
          <div className="space-y-3">
            <Skeleton className="mb-5 h-4 w-28" />
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-11 w-full rounded-xl" />
            ))}
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-6 w-48 max-w-full" />
              <Skeleton className="h-10 w-28" />
            </div>
            {Array.from({ length: rows }, (_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div aria-busy="true" aria-label="Loading admin configuration" className="space-y-6">
        <PageHeadingSkeleton />
        <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full max-w-xl" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
    );
  }

  return (
    <div aria-busy="true" aria-label="Loading admin data" className="space-y-6">
      <PageHeadingSkeleton />
      {variant === "payouts" && <MetricSkeletons />}
      {variant === "agreements" && <MetricSkeletons />}
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-5">
        <div className="space-y-4">
          {Array.from({ length: rows }, (_, row) => (
            <div key={row} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
              {Array.from({ length: columns }, (_, column) => (
                <Skeleton key={column} className="h-10 w-full" />
              ))}
            </div>
          ))}
        </div>
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
    <div role="alert" className="rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-gray-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-lg bg-[#004fcb] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
      >
        Retry
      </button>
    </div>
  );
}
