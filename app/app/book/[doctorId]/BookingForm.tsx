"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createManualAppointmentAction,
  type CreateAppointmentFormState,
} from "@/app/actions/booking";

const initialState: CreateAppointmentFormState = undefined;

type SlotDTO = { startTime: string; isFree: boolean };

type ServiceDTO = { name: string; price: string | null };

export default function BookingForm({
  doctorId,
  slots,
  services,
  prefillName,
  prefillPhone,
  waitlistId,
}: {
  doctorId: string;
  slots: SlotDTO[];
  services: ServiceDTO[];
  prefillName?: string;
  prefillPhone?: string;
  waitlistId?: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [repeatEnabled, setRepeatEnabled] = useState(false);
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
      setRepeatEnabled(false);
      hasSubmittedRef.current = false;
    }
  }, [pending, state]);

  return (
    <form action={action} dir="rtl" className="space-y-5">
      <input type="hidden" name="doctorId" value={doctorId} />
      <input type="hidden" name="startTime" value={selected ?? ""} />
      {waitlistId && <input type="hidden" name="waitlistId" value={waitlistId} />}

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
                      ? "scale-105 bg-[#1e3a5f] text-white shadow-[0_3px_0_#14283f]"
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
          {services.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                نوع خدمت (اختیاری)
              </label>
              <select
                name="serviceName"
                defaultValue=""
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="">— انتخاب نشود —</option>
                {services.map((service) => (
                  <option key={service.name} value={service.name}>
                    {service.name}
                    {service.price ? ` · ${service.price}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              نام بیمار
            </label>
            <input
              name="patientName"
              required
              defaultValue={prefillName}
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
              defaultValue={prefillPhone}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {state?.errors?.patientPhone && (
              <p className="mt-1 text-xs text-red-600">
                {state.errors.patientPhone[0]}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={repeatEnabled} onChange={(e) => setRepeatEnabled(e.target.checked)} />
              تکرار هفتگی
            </label>
            {repeatEnabled && (
              <select
                name="repeatWeeks"
                defaultValue="4"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {Array.from({ length: 7 }, (_, i) => i + 2).map((n) => (
                  <option key={n} value={n}>
                    {n} هفته پشت سر هم (همین ساعت، همین روز هفته)
                  </option>
                ))}
              </select>
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
