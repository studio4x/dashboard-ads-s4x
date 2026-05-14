import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "rectangle" | "circle" | "rounded";
}

export function Skeleton({ className, variant = "rounded" }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-slate-200",
        variant === "rectangle" && "rounded-none",
        variant === "rounded" && "rounded-md",
        variant === "circle" && "rounded-full",
        className
      )}
    />
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="card p-6 flex flex-col gap-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

export function ChartCardSkeleton() {
  return (
    <div className="card p-6 flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-[240px] w-full" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="bg-slate-50 p-4 border-bottom border-slate-100 flex gap-4">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      <div className="p-0">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 border-b border-slate-50 flex gap-4">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
