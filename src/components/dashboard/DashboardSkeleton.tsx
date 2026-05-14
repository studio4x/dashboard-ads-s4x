import { Skeleton, MetricCardSkeleton, ChartCardSkeleton } from "@/components/ui/Skeleton";

export function DashboardSkeleton() {
  return (
    <div className="p-6 flex flex-col gap-8 animate-fade-in">
      {/* Header Skeleton */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-8 w-40" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>

      {/* Bottom Chart / Table */}
      <ChartCardSkeleton />
    </div>
  );
}
