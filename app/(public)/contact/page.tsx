import type { Metadata } from "next";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { contactInfo, siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "تماس با ما",
  description:
    "راه‌های ارتباطی، آدرس و ساعات کاری آزمایشگاه تخصصی ترنج.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        تماس با ما
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-8 text-muted-foreground">
        برای هماهنگی نمونه‌گیری، سوالات عمومی یا پیگیری، می‌توانید از راه‌های
        زیر با {siteConfig.name} در تماس باشید.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <div className="flex items-start gap-4 rounded-xl border border-border p-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <MapPin className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">آدرس</h2>
              <p className="mt-1 text-sm leading-7 text-muted-foreground">
                {contactInfo.addressLine2} — {contactInfo.address}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-xl border border-border p-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Phone className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">تلفن</h2>
              <p className="mt-1 text-sm leading-7 text-muted-foreground">
                <a href={`tel:${contactInfo.phone.replace(/[^0-9+]/g, "")}`}>
                  {contactInfo.phone}
                </a>
                {" / "}
                <a href={`tel:${contactInfo.mobile.replace(/[^0-9+]/g, "")}`}>
                  {contactInfo.mobile}
                </a>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-xl border border-border p-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Mail className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">ایمیل</h2>
              <p className="mt-1 text-sm leading-7 text-muted-foreground">
                <a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-xl border border-border p-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Clock className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                ساعات کاری
              </h2>
              <ul className="mt-1 space-y-1 text-sm leading-7 text-muted-foreground">
                {contactInfo.workingHours.map((item) => (
                  <li key={item.days}>
                    {item.days}: {item.hours}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <iframe
            src={contactInfo.mapEmbedUrl}
            title={`نقشه موقعیت ${siteConfig.name}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-80 w-full lg:h-full"
          />
        </div>
      </div>
    </div>
  );
}
