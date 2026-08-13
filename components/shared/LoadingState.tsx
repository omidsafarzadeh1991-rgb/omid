import { cn } from "@/lib/utils";

interface LoadingStateProps {
  rows?: number;
  className?: string;
}

/** Simple skeleton grid used while server-fetched data (services, team) resolves. */
export function LoadingState({ rows = 6, className }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-label="در حال بارگذاری اطلاعات"
      className={cn(
        "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-56 animate-pulse rounded-xl border border-border bg-muted/60"
        />
      ))}
    </div>
  );
}
