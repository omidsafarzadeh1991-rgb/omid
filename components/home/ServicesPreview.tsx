import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Service } from "@prisma/client";
import { SectionTitle } from "@/components/shared/SectionTitle";
import { ServiceCard } from "@/components/shared/ServiceCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { FadeIn } from "@/components/shared/FadeIn";
import { Button } from "@/components/ui/button";

interface ServicesPreviewProps {
  services: Service[];
}

export function ServicesPreview({ services }: ServicesPreviewProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <SectionTitle
        eyebrow="خدمات آزمایشگاهی"
        title="آزمایش‌های پرکاربرد"
        description="بخشی از خدمات تشخیصی آزمایشگاه تخصصی ترنج؛ فهرست کامل در صفحه خدمات قابل مشاهده است."
      />

      {services.length === 0 ? (
        <EmptyState
          className="mt-10"
          title="در حال حاضر خدمتی ثبت نشده است"
          description="به‌زودی فهرست آزمایش‌ها در این بخش نمایش داده می‌شود."
        />
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <FadeIn key={service.id} delay={index * 0.05}>
              <ServiceCard service={service} />
            </FadeIn>
          ))}
        </div>
      )}

      <div className="mt-10 flex justify-center">
        <Button asChild variant="outline">
          <Link href="/services" className="group">
            مشاهده همه خدمات
            <ArrowLeft
              className="mr-1 size-4 transition-transform group-hover:-translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </Button>
      </div>
    </section>
  );
}
