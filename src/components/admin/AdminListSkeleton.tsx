import { Skeleton } from "@/components/ui/Skeleton";

export function AdminListSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="card p-4 flex items-center gap-4">
          <Skeleton className="h-11 w-11 rounded-lg" />
          <div className="flex-1 flex flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function GoogleSheetSourceSkeleton() {
  return <AdminListSkeleton items={3} />;
}
