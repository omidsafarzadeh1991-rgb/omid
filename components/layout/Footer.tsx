import Link from "next/link";
import { FlaskConical, Phone, Mail, MapPin, Clock } from "lucide-react";
import {
  siteConfig,
  contactInfo,
  navigation,
  medicalDisclaimer,
} from "@/lib/config";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <FlaskConical className="size-5" aria-hidden="true" />
              </span>
              <span className="text-base font-semibold">{siteConfig.name}</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-7 text-muted-foreground">
              {siteConfig.description}
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-foreground">دسترسی سریع</h2>
            <ul className="mt-4 space-y-2.5">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-foreground">اطلاعات تماس</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{contactInfo.address}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="size-4 shrink-0" aria-hidden="true" />
                <a
                  href={`tel:${contactInfo.phone.replace(/[^0-9+]/g, "")}`}
                  className="transition-colors hover:text-foreground"
                >
                  {contactInfo.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="size-4 shrink-0" aria-hidden="true" />
                <a
                  href={`mailto:${contactInfo.email}`}
                  className="transition-colors hover:text-foreground"
                >
                  {contactInfo.email}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{contactInfo.workingHours[0].days}: {contactInfo.workingHours[0].hours}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-xs leading-6 text-muted-foreground">
            {medicalDisclaimer}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            © {year} {siteConfig.name}. تمامی حقوق محفوظ است.
          </p>
        </div>
      </div>
    </footer>
  );
}
