"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type RegisterFormState } from "@/app/actions/auth";

const initialState: RegisterFormState = undefined;

export default function RegisterForm() {
  const [state, action, pending] = useActionState(
    registerAction,
    initialState
  );

  return (
    <form action={action} className="space-y-4" dir="rtl">
      <div>
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
          نام مدیر / منشی اصلی
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
          ایمیل ورود
        </label>
        <input
          name="adminEmail"
          type="email"
          required
          dir="ltr"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        {state?.errors?.adminEmail && (
          <p className="mt-1 text-xs text-red-600">
            {state.errors.adminEmail[0]}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          رمز عبور (حداقل ۸ کاراکتر)
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
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-teal-600 px-4 py-2.5 font-medium text-white transition hover:bg-teal-700 disabled:opacity-60"
      >
        {pending ? "در حال ثبت‌نام..." : "ثبت‌نام و ورود"}
      </button>

      <p className="text-center text-sm text-slate-500">
        قبلاً حساب دارید؟{" "}
        <Link href="/login" className="text-teal-700 hover:underline">
          ورود
        </Link>
      </p>
    </form>
  );
}
