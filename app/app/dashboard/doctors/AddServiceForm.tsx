"use client";

import { useActionState } from "react";
import {
  createServiceAction,
  type CreateServiceFormState,
} from "@/app/actions/clinic";

const initialState: CreateServiceFormState = undefined;

export default function AddServiceForm() {
  const [state, action, pending] = useActionState(
    createServiceAction,
    initialState
  );

  return (
    <form action={action} dir="rtl" className="flex flex-col gap-2 sm:flex-row">
      <input
        name="name"
        required
        placeholder="مثلاً ویزیت عمومی"
        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
      />
      <input
        name="price"
        placeholder="قیمت به تومان (اختیاری)"
        dir="ltr"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 sm:w-48"
      />
      <button type="submit" disabled={pending} className="btn btn-secondary btn-sm">
        {pending ? "در حال افزودن..." : "افزودن خدمت"}
      </button>
      {state?.message && (
        <p className="w-full text-xs text-red-600">{state.message}</p>
      )}
    </form>
  );
}
