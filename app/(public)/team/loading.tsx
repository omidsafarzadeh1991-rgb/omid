import { LoadingState } from "@/components/shared/LoadingState";

export default function TeamLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="h-9 w-40 animate-pulse rounded-md bg-muted" />
      <LoadingState className="mt-10" rows={3} />
    </div>
  );
}
