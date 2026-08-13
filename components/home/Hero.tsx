import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/shared/FadeIn";
import { appointmentCta } from "@/lib/config";

export function Hero() {
  return (
    <section className="border-b border-border bg-muted/30">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-24 lg:px-8">
        <FadeIn>
          <span className="text-sm font-medium text-primary">
            آزمایشگاه تخصصی ترنج
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            دقت، تخصص و آرامش در تشخیص طبی
          </h1>
          <p className="mt-5 max-w-lg text-base leading-8 text-muted-foreground sm:text-lg">
            آزمایشگاه تخصصی ترنج با تیمی متخصص، فرآیندی منظم و پاسخ‌دهی
            مناسب، نمونه‌گیری و انجام آزمایش‌های تشخیص طبی را با کیفیت انجام
            می‌دهد.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href={appointmentCta.href}>{appointmentCta.label}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/services" className="group">
                مشاهده آزمایش‌ها
                <ArrowLeft
                  className="mr-1 size-4 transition-transform group-hover:-translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </Button>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-card">
            <Image
              src="/images/hero-lab.svg"
              alt="فضای نمونه آزمایشگاه تخصصی ترنج"
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
              unoptimized
            />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
