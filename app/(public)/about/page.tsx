import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Microscope, Clock, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/shared/SectionTitle";
import { appointmentCta, siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "درباره ما",
  description:
    "آشنایی با آزمایشگاه تخصصی ترنج، ارزش‌ها و رویکرد ما در ارائه خدمات تشخیص طبی.",
};

const values = [
  {
    icon: ShieldCheck,
    title: "کیفیت",
    description:
      "رعایت پروتکل‌های استاندارد نمونه‌گیری و آزمایش، از پذیرش تا گزارش نتیجه.",
  },
  {
    icon: Microscope,
    title: "دقت",
    description:
      "توجه به جزئیات در تمام مراحل کاری برای کاهش خطای انسانی و فنی.",
  },
  {
    icon: Clock,
    title: "پاسخ‌دهی مناسب",
    description: "تلاش برای اعلام نتایج در بازه زمانی اعلام‌شده برای هر آزمایش.",
  },
  {
    icon: HeartHandshake,
    title: "تجربه مراجعه آرام",
    description:
      "برخورد محترمانه و فضایی آرام برای کاهش استرس مراجعان در زمان نمونه‌گیری.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        درباره {siteConfig.name}
      </h1>
      <p className="mt-5 text-base leading-8 text-muted-foreground">
        آزمایشگاه تخصصی ترنج در زمینه نمونه‌گیری و انجام آزمایش‌های تشخیص طبی
        فعالیت می‌کند. تمرکز اصلی ما بر رعایت استانداردهای کیفی، فرآیندی منظم و
        تجربه‌ای آرام برای مراجعان است.
      </p>
      <p className="mt-4 text-base leading-8 text-muted-foreground">
        از لحظه پذیرش تا اعلام نتیجه، تلاش می‌کنیم مسیر کاری برای مراجعان
        شفاف و قابل پیگیری باشد و پاسخ‌گویی به سوالات آن‌ها در اولویت باشد.
      </p>

      <div className="mt-14">
        <SectionTitle align="start" title="ارزش‌ها و رویکرد کاری" />
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {values.map((value) => (
            <div
              key={value.title}
              className="rounded-xl border border-border p-6"
            >
              <span className="flex size-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <value.icon className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-base font-semibold text-foreground">
                {value.title}
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-14 flex flex-col items-center gap-4 rounded-2xl border border-border bg-muted/40 px-6 py-12 text-center">
        <h2 className="text-xl font-semibold text-foreground">
          آماده نمونه‌گیری هستید؟
        </h2>
        <p className="max-w-md text-sm leading-7 text-muted-foreground">
          نوبت خود را ثبت کنید تا کارشناسان ما زمان دقیق مراجعه را با شما هماهنگ کنند.
        </p>
        <Button asChild size="lg">
          <Link href={appointmentCta.href}>{appointmentCta.label}</Link>
        </Button>
      </div>
    </div>
  );
}
