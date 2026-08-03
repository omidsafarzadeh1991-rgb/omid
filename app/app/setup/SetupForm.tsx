"use client";

import { useActionState } from "react";
import { setupAction, type SetupFormState } from "@/app/actions/setup";

const initialState: SetupFormState = undefined;

export default function SetupForm() {
  const [state, action, pending] = useActionState(setupAction, initialState);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" dir="rtl">
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          رمز راه‌اندازی
        </label>
        <input
          name="setupPassword"
          type="password"
          required
          dir="ltr"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        {state?.errors?.setupPassword && (
          <p className="mt-1 text-xs text-red-600">
            {state.errors.setupPassword[0]}
          </p>
        )}
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          نام کلینیک
        </label>
        <input
          name="clinicName"
          required
          placeholder="مثلاً کلینیک دندان‌پزشکی سلامت"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        {state?.errors?.clinicName && (
          <p className="mt-1 text-xs text-red-600">
            {state.errors.clinicName[0]}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          نام مدیر کلینیک
        </label>
        <input
          name="adminName"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        {state?.errors?.adminName && (
          <p className="mt-1 text-xs text-red-600">
            {state.errors.adminName[0]}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          نام کاربری ورود (انگلیسی)
        </label>
        <input
          name="adminUsername"
          required
          dir="ltr"
          placeholder="مثلاً: owner"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        {state?.errors?.adminUsername && (
          <p className="mt-1 text-xs text-red-600">
            {state.errors.adminUsername[0]}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          ایمیل (اختیاری)
        </label>
        <input
          name="adminEmail"
          type="email"
          dir="ltr"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        {state?.errors?.adminEmail && (
          <p className="mt-1 text-xs text-red-600">
            {state.errors.adminEmail[0]}
          </p>
        )}
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          رمز عبور مدیر کلینیک (حداقل ۸ کاراکتر)
        </label>
        <input
          name="adminPassword"
          type="password"
          required
          dir="ltr"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        {state?.errors?.adminPassword && (
          <p className="mt-1 text-xs text-red-600">
            {state.errors.adminPassword[0]}
          </p>
        )}
      </div>

      {state?.message && (
        <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary sm:col-span-2"
      >
        {pending ? "در حال راه‌اندازی..." : "راه‌اندازی و ورود"}
      </button>
    </form>
  );
}
