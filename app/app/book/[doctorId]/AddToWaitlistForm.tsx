"use client";

import { useActionState } from "react";
import { addToWaitlistAction, type AddWaitlistFormState } from "@/app/actions/waitlist";

const initialState: AddWaitlistFormState = undefined;

export default function AddToWaitlistForm({
  doctorId,
  day,
}: {
  doctorId: string;
  day: string;
}) {
  const [state, action, pending] = useActionState(addToWaitlistAction, initialState);

  return (
    <details className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium text-slate-600">
        وقت خالی برای این روز نبود؟ بیمار را به لیست انتظار اضافه کنید
      </summary>
      <form action={action} dir="rtl" className="mt-3 space-y-3">
        <input type="hidden" name="doctorId" value={doctorId} />
        <input type="hidden" name="day" value={day} />
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">نام بیمار</label>
          <input
            name="patientName"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">شمارهٔ تماس</label>
          <input
            name="patientPhone"
            required
            dir="ltr"
            placeholder="09xxxxxxxxx"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <button type="submit" disabled={pending} className="btn btn-secondary btn-sm">
          {pending ? "در حال ثبت..." : "افزودن به لیست انتظار"}
        </button>
        {state?.message && <p className="text-xs text-slate-500">{state.message}</p>}
      </form>
    </details>
  );
}
