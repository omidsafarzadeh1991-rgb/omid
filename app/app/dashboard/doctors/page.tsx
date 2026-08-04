import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { canManageClinic } from "@/lib/roles";
import { formatSchedules } from "@/lib/weekdays";
import { formatToman } from "@/lib/format";
import { updateDoctorCatalogAction } from "@/app/actions/clinic";
import AddDoctorForm from "./AddDoctorForm";
import AddSpecialtyForm from "./AddSpecialtyForm";
import AddServiceForm from "./AddServiceForm";
import CatalogCheckboxGroup from "./CatalogCheckboxGroup";
import ServiceRow from "./ServiceRow";

export default async function DoctorsPage() {
  const session = await requireSession();
  if (!canManageClinic(session.role)) {
    redirect("/dashboard");
  }

  const [doctors, specialties, services] = await Promise.all([
    prisma.doctor.findMany({
      where: { clinicId: session.clinicId },
      orderBy: { createdAt: "asc" },
      include: { services: true, specialties: true, schedules: true },
    }),
    prisma.specialty.findMany({
      where: { clinicId: session.clinicId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.service.findMany({
      where: { clinicId: session.clinicId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10">
      <h1 className="text-xl font-bold text-slate-900">مدیریت پزشکان</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="card animate-in p-6">
          <h2 className="mb-1 text-base font-semibold text-slate-900">
            فهرست تخصص‌ها
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            یک‌بار تعریف کنید، بعد برای هر پزشک از همین فهرست تیک بزنید.
          </p>
          {specialties.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {specialties.map((s) => (
                <span
                  key={s.id}
                  className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600"
                >
                  {s.name}
                </span>
              ))}
            </div>
          )}
          <AddSpecialtyForm />
        </section>

        <section className="card animate-in p-6" style={{ animationDelay: "0.05s" }}>
          <h2 className="mb-1 text-base font-semibold text-slate-900">
            فهرست خدمات
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            یک‌بار با قیمت تعریف کنید، بعد برای هر پزشک از همین فهرست تیک بزنید.
          </p>
          {services.length > 0 && (
            <ul className="mb-3 space-y-1.5">
              {services.map((s) => (
                <ServiceRow
                  key={s.id}
                  id={s.id}
                  name={s.name}
                  price={s.price != null ? formatToman(s.price) : null}
                  active={s.active}
                />
              ))}
            </ul>
          )}
          <AddServiceForm />
        </section>
      </div>

      <section className="card animate-in p-6" style={{ animationDelay: "0.1s" }}>
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
                className="flex flex-col gap-3 rounded-xl border border-slate-200 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-800">{doctor.name}</p>
                    <p className="text-xs text-slate-500">
                      هر نوبت {doctor.slotMinutes} دقیقه
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatSchedules(doctor.schedules)}
                    </p>
                    {doctor.specialties.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {doctor.specialties.map((s) => (
                          <span
                            key={s.id}
                            className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700"
                          >
                            {s.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {doctor.services.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {doctor.services.map((s) => (
                          <span
                            key={s.id}
                            className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600"
                          >
                            {s.name}
                            {s.price != null && (
                              <span className="text-amber-700"> · {formatToman(s.price)}</span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Link href={`/book/${doctor.id}`} className="btn btn-primary btn-sm shrink-0">
                    ثبت نوبت
                  </Link>
                </div>

                <details className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <summary className="cursor-pointer text-xs font-medium text-slate-600">
                    ویرایش تخصص‌ها و خدمات
                  </summary>
                  <form
                    action={async (formData: FormData) => {
                      "use server";
                      const serviceIds = formData.getAll("serviceIds").map(String);
                      const specialtyIds = formData.getAll("specialtyIds").map(String);
                      await updateDoctorCatalogAction(doctor.id, serviceIds, specialtyIds);
                    }}
                    className="mt-3 space-y-3"
                  >
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-slate-600">تخصص‌ها</p>
                      <CatalogCheckboxGroup
                        name="specialtyIds"
                        items={specialties.map((s) => ({ id: s.id, label: s.name }))}
                        defaultSelectedIds={doctor.specialties.map((s) => s.id)}
                        emptyMessage="هنوز تخصصی تعریف نشده."
                      />
                    </div>
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-slate-600">خدمات</p>
                      <CatalogCheckboxGroup
                        name="serviceIds"
                        items={services
                          .filter((s) => s.active || doctor.services.some((ds) => ds.id === s.id))
                          .map((s) => ({
                            id: s.id,
                            label: s.active ? s.name : `${s.name} (غیرفعال)`,
                          }))}
                        defaultSelectedIds={doctor.services.map((s) => s.id)}
                        emptyMessage="هنوز خدمتی تعریف نشده."
                      />
                    </div>
                    <button type="submit" className="btn btn-secondary btn-sm">
                      ذخیره
                    </button>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        )}
        <AddDoctorForm
          specialties={specialties.map((s) => ({ id: s.id, name: s.name }))}
          services={services.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name }))}
        />
      </section>
    </main>
  );
}
