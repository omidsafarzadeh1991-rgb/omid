import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Doctor } from "@prisma/client";
import { SectionTitle } from "@/components/shared/SectionTitle";
import { DoctorCard } from "@/components/shared/DoctorCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { FadeIn } from "@/components/shared/FadeIn";
import { Button } from "@/components/ui/button";

interface TeamPreviewProps {
  doctors: Doctor[];
}

export function TeamPreview({ doctors }: TeamPreviewProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <SectionTitle
        eyebrow="تیم تخصصی"
        title="با متخصصان آزمایشگاه آشنا شوید"
      />

      {doctors.length === 0 ? (
        <EmptyState
          className="mt-10"
          title="در حال حاضر اطلاعاتی ثبت نشده است"
        />
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((doctor, index) => (
            <FadeIn key={doctor.id} delay={index * 0.05}>
              <DoctorCard doctor={doctor} />
            </FadeIn>
          ))}
        </div>
      )}

      <div className="mt-10 flex justify-center">
        <Button asChild variant="outline">
          <Link href="/team" className="group">
            مشاهده همه اعضای تیم
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
