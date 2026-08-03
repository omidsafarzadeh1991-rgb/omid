import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { canManageClinic } from "@/lib/roles";
import AddStaffForm from "./AddStaffForm";
import ToggleActiveButton from "./ToggleActiveButton";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "مالک سامانه",
  ADMIN: "مدیر کلینیک",
  RECEPTIONIST: "منشی",
};

export default async function StaffPage() {
  const session = await requireSession();
  if (!canManageClinic(session.role)) {
    redirect("/dashboard");
  }

  const staff = await prisma.staffUser.findMany({
    where: { clinicId: session.clinicId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10">
      <h1 className="text-xl font-bold text-slate-900">مدیریت کارمندان</h1>

      <section className="card animate-in p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          کارمندان این کلینیک
        </h2>
        <ul className="mb-6 divide-y divide-slate-100">
          {staff.map((member) => (
            <li key={member.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                {member.profilePictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.profilePictureUrl}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-500">
                    {member.firstName.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-medium text-slate-800">
                    {member.firstName} {member.lastName ?? ""}
                    {!member.active && (
                      <span className="mr-2 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">
                        غیرفعال
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500" dir="ltr">
                    {member.username}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                  {ROLE_LABELS[member.role] ?? member.role}
                </span>
                {member.role !== "OWNER" && (
                  <>
                    <Link
                      href={`/dashboard/staff/${member.id}`}
                      className="text-xs font-medium text-teal-700 hover:underline"
                    >
                      ویرایش
                    </Link>
                    <ToggleActiveButton staffId={member.id} active={member.active} />
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
        <AddStaffForm />
      </section>
    </main>
  );
}
