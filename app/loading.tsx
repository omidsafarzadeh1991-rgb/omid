import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div
      role="status"
      aria-label="در حال بارگذاری"
      className="flex min-h-[50vh] items-center justify-center"
    >
      <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
    </div>
  );
}
