import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import AddDoctorForm from "./AddDoctorForm";

export default async function DoctorsPage() {
  const session = await requireSession();
  if (session.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const doctors = await prisma.doctor.findMany({
    where: { clinicId: session.clinicId },
    orderBy: { createdAt: "asc" },
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
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-800">{doctor.name}</p>
                  <p className="text-xs text-slate-500">
                    {Math.floor(doctor.workStartMin / 60)}:
                    {String(doctor.workStartMin % 60).padStart(2, "0")} تا{" "}
                    {Math.floor(doctor.workEndMin / 60)}:
                    {String(doctor.workEndMin % 60).padStart(2, "0")} — هر{" "}
                    {doctor.slotMinutes} دقیقه
                  </p>
                </div>
                <Link href={`/book/${doctor.id}`} className="btn btn-primary btn-sm">
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
