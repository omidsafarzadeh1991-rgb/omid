import { requireSessionAllowingPasswordChange } from "@/lib/dal";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  await requireSessionAllowingPasswordChange();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-10">
      <div className="card animate-in p-6" dir="rtl">
        <h1 className="mb-2 text-xl font-bold text-slate-900">تغییر رمز عبور</h1>
        <p className="mb-6 text-sm text-slate-500">
          قبل از ادامه، باید یک رمز عبور جدید برای حساب خود انتخاب کنید.
        </p>
        <ChangePasswordForm />
      </div>
    </main>
  );
}
