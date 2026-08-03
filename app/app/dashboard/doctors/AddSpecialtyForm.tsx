"use client";

import { useActionState } from "react";
import {
  createSpecialtyAction,
  type CreateSpecialtyFormState,
} from "@/app/actions/clinic";

const initialState: CreateSpecialtyFormState = undefined;

export default function AddSpecialtyForm() {
  const [state, action, pending] = useActionState(
    createSpecialtyAction,
    initialState
  );

  return (
    <form action={action} dir="rtl" className="flex flex-col gap-2 sm:flex-row">
      <input
        name="name"
        required
        placeholder="مثلاً ارتودنسی"
        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
      />
      <button type="submit" disabled={pending} className="btn btn-secondary btn-sm">
        {pending ? "در حال افزودن..." : "افزودن تخصص"}
      </button>
      {state?.message && (
        <p className="w-full text-xs text-red-600">{state.message}</p>
      )}
    </form>
  );
}
