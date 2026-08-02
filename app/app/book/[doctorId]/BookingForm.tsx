"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createManualAppointmentAction,
  type CreateAppointmentFormState,
} from "@/app/actions/booking";

const initialState: CreateAppointmentFormState = undefined;

type SlotDTO = { startTime: string; isFree: boolean };

export default function BookingForm({
  doctorId,
  slots,
}: {
  doctorId: string;
  slots: SlotDTO[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [state, action, pending] = useActionState(
    createManualAppointmentAction,
    initialState
  );
  const hasSubmittedRef = useRef(false);

  useEffect(() => {
    if (pending) {
      hasSubmittedRef.current = true;
      return;
    }
    if (hasSubmittedRef.current && !state) {
      setSelected(null);
      hasSubmittedRef.current = false;
    }
  }, [pending, state]);

  return (
    <form action={action} dir="rtl" className="space-y-5">
      <input type="hidden" name="doctorId" value={doctorId} />
      <input type="hidden" name="startTime" value={selected ?? ""} />

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">
          یک ساعت خالی انتخاب کنید
        </p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {slots.map((slot) => {
            const isSelected = selected === slot.startTime;
            return (
              <button
                key={slot.startTime}
                type="button"
                disabled={!slot.isFree}
                onClick={() => setSelected(slot.startTime)}
                className={`rounded-lg px-2 py-2 text-sm transition-all duration-150 ${
                  !slot.isFree
                    ? "cursor-not-allowed bg-slate-50 text-slate-300 line-through"
                    : isSelected
                      ? "scale-105 bg-teal-600 text-white shadow-[0_3px_0_#0f766e]"
                      : "border border-slate-300 text-slate-700 hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50"
                }`}
              >
                {new Intl.DateTimeFormat("fa-IR", {
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(slot.startTime))}
              </button>
            );
          })}
        </div>
        {slots.length === 0 && (
          <p className="text-sm text-slate-500">
            برای این روز ساعت کاری تعریف نشده است.
          </p>
        )}
      </div>

      {selected && (
        <div className="card animate-in space-y-4 p-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              نام بیمار
            </label>
            <input
              name="patientName"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {state?.errors?.patientName && (
              <p className="mt-1 text-xs text-red-600">
                {state.errors.patientName[0]}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              شمارهٔ تماس
            </label>
            <input
              name="patientPhone"
              required
              dir="ltr"
              placeholder="09xxxxxxxxx"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {state?.errors?.patientPhone && (
              <p className="mt-1 text-xs text-red-600">
                {state.errors.patientPhone[0]}
              </p>
            )}
          </div>
          <button type="submit" disabled={pending} className="btn btn-primary w-full">
            {pending ? "در حال ثبت..." : "ثبت نوبت"}
          </button>
        </div>
      )}

      {state?.message && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}
    </form>
  );
}
