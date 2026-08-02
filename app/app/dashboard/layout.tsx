import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { logoutAction } from "@/app/actions/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const clinic = await prisma.clinic.findUniqueOrThrow({
    where: { id: session.clinicId },
  });

  return (
    <div className="flex min-h-screen flex-1 flex-col sm:flex-row" dir="rtl">
      <aside className="flex shrink-0 flex-col border-b border-slate-100 bg-white p-4 sm:w-56 sm:border-b-0 sm:border-l">
        <p className="mb-1 font-bold text-slate-900">{clinic.name}</p>
        <p className="mb-6 text-xs text-slate-500">
          {session.role === "ADMIN" ? "مدیر کلینیک" : "منشی"}
        </p>
        <nav className="flex flex-1 flex-col gap-1 text-sm">
          <Link
            href="/dashboard"
            className="rounded-lg px-3 py-2 text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700"
          >
            داشبورد
          </Link>
          {session.role === "ADMIN" && (
            <>
              <Link
                href="/dashboard/doctors"
                className="rounded-lg px-3 py-2 text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700"
              >
                پزشکان
              </Link>
              <Link
                href="/dashboard/staff"
                className="rounded-lg px-3 py-2 text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700"
              >
                کارمندان
              </Link>
            </>
          )}
        </nav>
        <form action={logoutAction}>
          <button type="submit" className="btn btn-secondary btn-sm w-full">
            خروج
          </button>
        </form>
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  );
}
