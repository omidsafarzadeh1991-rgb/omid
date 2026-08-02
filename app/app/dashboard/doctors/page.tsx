import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { formatSchedules } from "@/lib/weekdays";
import AddDoctorForm from "./AddDoctorForm";

export default async function DoctorsPage() {
  const session = await requireSession();
  if (session.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const doctors = await prisma.doctor.findMany({
    where: { clinicId: session.clinicId },
    orderBy: { createdAt: "asc" },
    include: { services: true, schedules: true },
  });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10">
      <h1 className="text-xl font-bold text-slate-900">مدیریت پزشکان</h1>

      <section className="card animate-in p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          پزشکان ثبت‌شده
        </h2>
        {doctors.length === 0 ? (
          <p className="mb-4 text-sm text-slate-500">
            هنوز پزشکی ثبت نشده. با فرم زیر اولین پزشک را اضافه کنید.
          </p>
        ) : (
          <ul className="mb-6 grid gap-3 sm:grid-cols-2">
            {doctors.map((doctor) => (
              <li
                key={doctor.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-800">{doctor.name}</p>
                  <p className="text-xs text-slate-500">
                    هر نوبت {doctor.slotMinutes} دقیقه
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatSchedules(doctor.schedules)}
                  </p>
                  {doctor.services.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {doctor.services.map((service) => (
                        <span
                          key={service.id}
                          className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600"
                        >
                          {service.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Link href={`/book/${doctor.id}`} className="btn btn-primary btn-sm shrink-0">
                  ثبت نوبت
                </Link>
              </li>
            ))}
          </ul>
        )}
        <AddDoctorForm />
      </section>
    </main>
  );
}
