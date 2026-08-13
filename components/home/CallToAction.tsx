import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/shared/FadeIn";
import { appointmentCta } from "@/lib/config";

export function CallToAction() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <FadeIn>
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-primary px-6 py-14 text-center sm:px-12">
          <h2 className="max-w-xl text-2xl font-bold tracking-tight text-primary-foreground sm:text-3xl">
            برای نمونه‌گیری، نوبت خود را رزرو کنید
          </h2>
          <p className="max-w-md text-sm leading-7 text-primary-foreground/85">
            درخواست شما پس از بررسی توسط تیم آزمایشگاه تأیید نهایی می‌شود.
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link href={appointmentCta.href}>{appointmentCta.label}</Link>
          </Button>
        </div>
      </FadeIn>
    </section>
  );
}
