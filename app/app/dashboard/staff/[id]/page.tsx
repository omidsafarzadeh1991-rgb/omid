import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { canManageClinic } from "@/lib/roles";
import EditStaffForm from "./EditStaffForm";
import ResetPasswordForm from "./ResetPasswordForm";

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  if (!canManageClinic(session.role)) {
    redirect("/dashboard");
  }

  const staff = await prisma.staffUser.findFirst({
    where: { id, clinicId: session.clinicId },
  });
  if (!staff || staff.role === "OWNER") {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <h1 className="text-xl font-bold text-slate-900">
        ویرایش کارمند: {staff.firstName} {staff.lastName ?? ""}
      </h1>

      <section className="card animate-in p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">اطلاعات پروفایل</h2>
        <EditStaffForm
          staff={{
            id: staff.id,
            firstName: staff.firstName,
            lastName: staff.lastName ?? "",
            email: staff.email ?? "",
            mobile: staff.mobile ?? "",
            birthDate: toDateInputValue(staff.birthDate),
            personnelCode: staff.personnelCode ?? "",
            hireDate: toDateInputValue(staff.hireDate),
            notes: staff.notes ?? "",
            role: staff.role as "ADMIN" | "RECEPTIONIST",
            profilePictureUrl: staff.profilePictureUrl,
          }}
        />
      </section>

      <section className="card animate-in p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          تنظیم رمز عبور جدید
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          نیازی به دانستن رمز عبور فعلی نیست؛ همین‌جا یک رمز موقت جدید بدهید و در
          صورت نیاز کاربر را مجبور به تغییرش در اولین ورود کنید.
        </p>
        <ResetPasswordForm staffId={staff.id} />
      </section>
    </main>
  );
}
