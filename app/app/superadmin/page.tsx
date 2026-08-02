import { requireSuperadmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { superadminLogoutAction } from "@/app/actions/superadmin";
import CreateClinicForm from "./CreateClinicForm";

export default async function SuperadminPage() {
  await requireSuperadmin();

  const clinics = await prisma.clinic.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { doctors: true, staff: true, appointments: true } },
    },
  });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">مدیر کل سامانه</h1>
          <p className="text-sm text-slate-500">
            ساخت و مدیریت حساب کلینیک‌ها
          </p>
        </div>
        <form action={superadminLogoutAction}>
          <button type="submit" className="btn btn-secondary btn-sm">
            خروج
          </button>
        </form>
      </header>

      <section className="card animate-in p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          ساخت کلینیک جدید
        </h2>
        <CreateClinicForm />
      </section>

      <section className="card animate-in p-6" style={{ animationDelay: "0.1s" }}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          کلینیک‌های ثبت‌شده ({clinics.length})
        </h2>
        {clinics.length === 0 ? (
          <p className="text-sm text-slate-500">هنوز کلینیکی ساخته نشده.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {clinics.map((clinic) => (
              <li key={clinic.id} className="py-3">
                <p className="font-medium text-slate-800">{clinic.name}</p>
                <p className="text-sm text-slate-500">
                  {clinic._count.doctors} پزشک · {clinic._count.staff} کاربر ·{" "}
                  {clinic._count.appointments} نوبت فعال
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
