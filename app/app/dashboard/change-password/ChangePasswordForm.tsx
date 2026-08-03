"use client";

import { useActionState } from "react";
import {
  changePasswordAction,
  type ChangePasswordFormState,
} from "@/app/actions/auth";

const initialState: ChangePasswordFormState = undefined;

export default function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initialState);

  return (
    <form action={action} dir="rtl" className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          رمز عبور جدید
        </label>
        <input
          name="newPassword"
          type="password"
          required
          dir="ltr"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        {state?.errors?.newPassword && (
          <p className="mt-1 text-xs text-red-600">{state.errors.newPassword[0]}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          تکرار رمز عبور جدید
        </label>
        <input
          name="confirmPassword"
          type="password"
          required
          dir="ltr"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        {state?.errors?.confirmPassword && (
          <p className="mt-1 text-xs text-red-600">{state.errors.confirmPassword[0]}</p>
        )}
      </div>

      {state?.message && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "در حال ذخیره..." : "ذخیره و ادامه"}
      </button>
    </form>
  );
}
