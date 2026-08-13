"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log for observability only — never render the raw error/stack to the user.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </span>
      <h1 className="text-lg font-semibold text-foreground">
        مشکلی پیش آمد
      </h1>
      <p className="max-w-sm text-sm leading-7 text-muted-foreground">
        در بارگذاری این صفحه خطایی رخ داد. لطفاً دوباره تلاش کنید.
      </p>
      <Button onClick={reset}>تلاش دوباره</Button>
    </div>
  );
}
