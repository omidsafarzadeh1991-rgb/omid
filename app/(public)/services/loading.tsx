import { LoadingState } from "@/components/shared/LoadingState";

export default function ServicesLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="h-9 w-56 animate-pulse rounded-md bg-muted" />
      <div className="mt-4 h-11 max-w-xl animate-pulse rounded-md bg-muted" />
      <LoadingState className="mt-10" rows={6} />
    </div>
  );
}
