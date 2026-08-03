"use client";

import { useActionState } from "react";
import {
  resetStaffPasswordAction,
  type ResetStaffPasswordFormState,
} from "@/app/actions/clinic";

const initialState: ResetStaffPasswordFormState = undefined;

export default function ResetPasswordForm({ staffId }: { staffId: string }) {
  const [state, action, pending] = useActionState(
    resetStaffPasswordAction,
    initialState
  );

  return (
    <form action={action} dir="rtl" className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="staffId" value={staffId} />

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          رمز عبور جدید (حداقل ۸ کاراکتر)
        </label>
        <input
          name="newPassword"
          type="password"
          required
          dir="ltr"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div className="flex items-end">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <input type="checkbox" name="mustChangePassword" defaultChecked />
          کاربر در اولین ورود مجبور به تغییر رمز عبور شود
        </label>
      </div>

      {state?.message && (
        <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}
      {state?.success && (
        <p className="sm:col-span-2 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">
          {state.success}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-dark sm:col-span-2">
        {pending ? "در حال ذخیره..." : "تنظیم رمز عبور جدید"}
      </button>
    </form>
  );
}
