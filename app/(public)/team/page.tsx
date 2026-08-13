import type { Metadata } from "next";
import { DoctorCard } from "@/components/shared/DoctorCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { getAllDoctors } from "@/lib/data/doctors";

export const metadata: Metadata = {
  title: "تیم تخصصی",
  description: "معرفی متخصصان و کارشناسان آزمایشگاه تخصصی ترنج.",
};

export default async function TeamPage() {
  const doctors = await getAllDoctors();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          تیم تخصصی
        </h1>
        <p className="mt-3 text-base leading-8 text-muted-foreground">
          آزمایشگاه تخصصی ترنج با همکاری متخصصان و کارشناسان علوم آزمایشگاهی
          فعالیت می‌کند.
        </p>
      </div>

      {doctors.length === 0 ? (
        <EmptyState className="mt-10" title="در حال حاضر اطلاعاتی ثبت نشده است" />
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((doctor) => (
            <DoctorCard key={doctor.id} doctor={doctor} />
          ))}
        </div>
      )}
    </div>
  );
}
