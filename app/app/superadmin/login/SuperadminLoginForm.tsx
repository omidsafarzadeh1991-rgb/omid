"use client";

import { useActionState } from "react";
import {
  superadminLoginAction,
  type SuperadminLoginFormState,
} from "@/app/actions/superadmin";

const initialState: SuperadminLoginFormState = undefined;

export default function SuperadminLoginForm() {
  const [state, action, pending] = useActionState(
    superadminLoginAction,
    initialState
  );

  return (
    <form action={action} className="space-y-4" dir="rtl">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          رمز عبور مدیر کل
        </label>
        <input
          name="password"
          type="password"
          required
          dir="ltr"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      {state?.message && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-dark w-full">
        {pending ? "در حال ورود..." : "ورود"}
      </button>
    </form>
  );
}
