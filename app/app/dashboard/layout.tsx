import { requireSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { logoutAction } from "@/app/actions/auth";
import SidebarNav from "./SidebarNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const clinic = await prisma.clinic.findUniqueOrThrow({
    where: { id: session.clinicId },
  });
  const initial = clinic.name.trim().charAt(0) || "ک";

  return (
    <div className="flex min-h-screen flex-1 flex-col sm:flex-row" dir="rtl">
      <aside className="sidebar-dark relative flex shrink-0 flex-col p-4 sm:w-64">
        <div className="sidebar-glow" />

        <div className="relative z-10 mb-6 flex items-center gap-3 rounded-2xl bg-white/5 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 text-lg font-bold text-white shadow-lg shadow-teal-900/40">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold text-white">{clinic.name}</p>
            <p className="text-xs text-teal-300/80">
              {session.role === "ADMIN" ? "مدیر کلینیک" : "منشی"}
            </p>
          </div>
        </div>

        <div className="relative z-10 flex flex-1 flex-col">
          <SidebarNav isAdmin={session.role === "ADMIN"} />
        </div>

        <form action={logoutAction} className="relative z-10">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            خروج
          </button>
        </form>
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  );
}
