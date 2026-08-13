import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SearchX className="size-6" aria-hidden="true" />
      </span>
      <h1 className="text-lg font-semibold text-foreground">
        صفحه مورد نظر یافت نشد
      </h1>
      <p className="max-w-sm text-sm leading-7 text-muted-foreground">
        ممکن است آدرس اشتباه باشد یا این صفحه جابه‌جا شده باشد.
      </p>
      <Button asChild>
        <Link href="/">بازگشت به صفحه اصلی</Link>
      </Button>
    </div>
  );
}
