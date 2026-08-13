import { Quote } from "lucide-react";
import { SectionTitle } from "@/components/shared/SectionTitle";
import { FadeIn } from "@/components/shared/FadeIn";

// Sample, illustrative comments — not real patient testimonials (spec §13).
const testimonials = [
  {
    quote:
      "نوبت‌دهی راحت بود و نمونه‌گیری خیلی سریع انجام شد. محیط آزمایشگاه هم آرام و تمیز بود.",
    name: "یکی از مراجعان",
  },
  {
    quote:
      "برخورد پرسنل محترمانه بود و همه مراحل رو با آرامش توضیح دادن. جواب آزمایش هم طبق زمان اعلام‌شده آماده شد.",
    name: "یکی از مراجعان",
  },
  {
    quote:
      "چند بار برای آزمایش دوره‌ای مراجعه کردم؛ هر بار فرآیند منظم و بدون معطلی بود.",
    name: "یکی از مراجعان",
  },
];

export function Testimonials() {
  return (
    <section className="bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <SectionTitle eyebrow="تجربه مراجعان" title="چند نظر کوتاه" />

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <FadeIn key={testimonial.quote} delay={index * 0.05}>
              <figure className="h-full rounded-xl border border-border bg-background p-6">
                <Quote
                  className="size-5 text-primary/60"
                  aria-hidden="true"
                />
                <blockquote className="mt-3 text-sm leading-8 text-foreground">
                  {testimonial.quote}
                </blockquote>
                <figcaption className="mt-4 text-xs font-medium text-muted-foreground">
                  {testimonial.name}
                </figcaption>
              </figure>
            </FadeIn>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          نظرات فوق نمونه و جهت نمایش طراحی سایت هستند.
        </p>
      </div>
    </section>
  );
}
