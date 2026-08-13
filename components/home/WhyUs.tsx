import { ShieldCheck, Users, ListChecks, Sparkles } from "lucide-react";
import { SectionTitle } from "@/components/shared/SectionTitle";
import { FadeIn } from "@/components/shared/FadeIn";

const reasons = [
  {
    icon: ShieldCheck,
    title: "دقت و کیفیت",
    description:
      "پایبندی به استانداردهای کنترل کیفیت در تمام مراحل نمونه‌گیری و انجام آزمایش.",
  },
  {
    icon: Users,
    title: "تیم متخصص",
    description:
      "همکاری با متخصصان و کارشناسان آزمایشگاهی با تجربه در حوزه تشخیص طبی.",
  },
  {
    icon: ListChecks,
    title: "فرآیند منظم",
    description:
      "از پذیرش تا اعلام نتیجه، فرآیندی شفاف و قابل پیگیری برای مراجعان.",
  },
  {
    icon: Sparkles,
    title: "محیط آرام و حرفه‌ای",
    description:
      "فضایی تمیز و آرام برای تجربه‌ای بدون استرس در زمان نمونه‌گیری.",
  },
];

export function WhyUs() {
  return (
    <section className="bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <SectionTitle
          eyebrow="چرا ترنج"
          title="رویکرد ما به تشخیص طبی"
        />

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((reason, index) => (
            <FadeIn key={reason.title} delay={index * 0.05}>
              <div className="h-full rounded-xl border border-border bg-background p-6">
                <span className="flex size-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <reason.icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  {reason.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {reason.description}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
