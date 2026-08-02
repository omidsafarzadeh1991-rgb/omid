import { redirect } from "next/navigation";
import { requireSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import AddStaffForm from "./AddStaffForm";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "مدیر کلینیک",
  RECEPTIONIST: "منشی",
};

export default async function StaffPage() {
  const session = await requireSession();
  if (session.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const staff = await prisma.staffUser.findMany({
    where: { clinicId: session.clinicId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10">
      <h1 className="text-xl font-bold text-slate-900">مدیریت کارمندان</h1>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          کارمندان این کلینیک
        </h2>
        <ul className="mb-6 divide-y divide-slate-100">
          {staff.map((member) => (
            <li key={member.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-slate-800">{member.name}</p>
                <p className="text-xs text-slate-500" dir="ltr">
                  {member.email}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                {ROLE_LABELS[member.role] ?? member.role}
              </span>
            </li>
          ))}
        </ul>
        <AddStaffForm />
      </section>
    </main>
  );
}
