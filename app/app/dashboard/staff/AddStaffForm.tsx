"use client";

import { useActionState } from "react";
import {
  createStaffAction,
  type CreateStaffFormState,
} from "@/app/actions/clinic";

const initialState: CreateStaffFormState = undefined;

export default function AddStaffForm() {
  const [state, action, pending] = useActionState(
    createStaffAction,
    initialState
  );

  return (
    <form
      action={action}
      dir="rtl"
      className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          نام
        </label>
        <input
          name="name"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        {state?.errors?.name && (
          <p className="mt-1 text-xs text-red-600">{state.errors.name[0]}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          نقش
        </label>
        <select
          name="role"
          defaultValue="RECEPTIONIST"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="RECEPTIONIST">منشی (فقط ثبت و دیدن نوبت‌ها)</option>
          <option value="ADMIN">مدیر کلینیک (دسترسی کامل)</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          ایمیل ورود
        </label>
        <input
          name="email"
          type="email"
          required
          dir="ltr"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        {state?.errors?.email && (
          <p className="mt-1 text-xs text-red-600">{state.errors.email[0]}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          رمز عبور اولیه (حداقل ۸ کاراکتر)
        </label>
        <input
          name="password"
          type="password"
          required
          dir="ltr"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        {state?.errors?.password && (
          <p className="mt-1 text-xs text-red-600">
            {state.errors.password[0]}
          </p>
        )}
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
        {pending ? "در حال افزودن..." : "افزودن کارمند"}
      </button>
    </form>
  );
}
