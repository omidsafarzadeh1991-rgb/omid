import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { logoutAction } from "@/app/actions/auth";
import { canManageClinic } from "@/lib/roles";
import { countNeedsFollowUp, sweepStaleConversations } from "@/lib/conversations";
import SidebarNav from "./SidebarNav";
import CommandPalette from "./CommandPalette";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "مالک سامانه",
  ADMIN: "مدیر کلینیک",
  RECEPTIONIST: "منشی",
};

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

  await sweepStaleConversations(session.clinicId);
  const needsFollowUpCount = await countNeedsFollowUp(session.clinicId);

  return (
    <div className="flex min-h-screen flex-1 flex-col sm:flex-row" dir="rtl">
      <aside className="sidebar-dark relative flex shrink-0 flex-col p-4 sm:w-64">
        <div className="relative z-10 mb-4 flex items-center gap-3 rounded-2xl bg-white/5 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 text-lg font-bold text-white shadow-lg shadow-teal-900/40">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold text-white">{clinic.name}</p>
            <p className="text-xs text-teal-300/80">
              {ROLE_LABELS[session.role] ?? session.role}
            </p>
          </div>
        </div>

        <div className="relative z-10 mb-4">
          <CommandPalette />
        </div>

        <div className="relative z-10 flex flex-1 flex-col">
          <SidebarNav
            isAdmin={canManageClinic(session.role)}
            isOwner={session.role === "OWNER"}
            needsFollowUpCount={needsFollowUpCount}
          />
        </div>

        <div className="relative z-10 flex flex-col gap-2">
          <Link
            href="/dashboard/change-password"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            تغییر رمز عبور
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              خروج
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
