"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createManualAppointmentAction,
  getQuickBookCalendarAction,
  getQuickBookSlotsAction,
  type QuickBookCalendar,
  type QuickBookSlot,
} from "@/app/actions/booking";
import { WEEK_DAYS } from "@/lib/weekdays";

const initialFormState = undefined;

function formatDayLabel(dateParam: string): string {
  return new Intl.DateTimeFormat("fa-IR", { day: "numeric" }).format(new Date(`${dateParam}T00:00:00`));
}

function formatSlotLabel(iso: string): string {
  return new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export default function QuickBookModal({
  doctorId,
  onClose,
}: {
  doctorId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [monthParam, setMonthParam] = useState<string | undefined>(undefined);
  const [calendar, setCalendar] = useState<QuickBookCalendar | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<QuickBookSlot[] | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [formState, formAction, formPending] = useActionState(
    createManualAppointmentAction,
    initialFormState
  );
  const hasSubmittedRef = useRef(false);

  useEffect(() => {
    startTransition(async () => {
      const data = await getQuickBookCalendarAction(doctorId, monthParam);
      setCalendar(data);
    });
  }, [doctorId, monthParam]);

  useEffect(() => {
    if (!selectedDate) return;
    startTransition(async () => {
      const data = await getQuickBookSlotsAction(doctorId, selectedDate);
      setSlots(data);
    });
  }, [doctorId, selectedDate]);

  useEffect(() => {
    if (formPending) {
      hasSubmittedRef.current = true;
      return;
    }
    if (hasSubmittedRef.current && !formState) {
      hasSubmittedRef.current = false;
      router.refresh();
      onClose();
    }
  }, [formPending, formState, onClose, router]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            ثبت نوبت{calendar ? ` برای ${calendar.doctorName}` : ""}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="بستن"
          >
            ✕
          </button>
        </div>

        {!calendar ? (
          <p className="py-8 text-center text-sm text-slate-400">در حال بارگذاری...</p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={isPending}
                onClick={() => {
                  setMonthParam(calendar.prevMonthParam);
                  setSelectedDate(null);
                  setSelectedSlot(null);
                  setSlots(null);
                }}
              >
                ماه قبل ←
              </button>
              <p className="text-sm font-semibold text-slate-800">{calendar.monthLabel}</p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={isPending}
                onClick={() => {
                  setMonthParam(calendar.nextMonthParam);
                  setSelectedDate(null);
                  setSelectedSlot(null);
                  setSlots(null);
                }}
              >
                → ماه بعد
              </button>
            </div>

            <div className="mb-4 grid grid-cols-7 gap-1">
              {WEEK_DAYS.map((d) => (
                <div key={d.value} className="pb-1 text-center text-[11px] font-medium text-slate-400">
                  {d.label.slice(0, 1)}
                </div>
              ))}
              {calendar.days.map((day, i) => {
                const isBookable = day.inMonth && day.isWorkingDay && !day.isPast && day.freeCount > 0;
                const isSelected = day.dateParam === selectedDate;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!isBookable}
                    onClick={() => {
                      setSelectedDate(day.dateParam);
                      setSelectedSlot(null);
                      setSlots(null);
                    }}
                    className={`aspect-square rounded-lg text-xs transition-all duration-150 ${
                      !day.inMonth
                        ? "text-slate-200"
                        : isSelected
                          ? "scale-105 bg-[#1e3a5f] font-semibold text-white shadow-[0_2px_0_#14283f]"
                          : isBookable
                            ? "border border-teal-200 bg-teal-50 text-teal-800 hover:-translate-y-0.5"
                            : "text-slate-300 line-through"
                    }`}
                  >
                    {formatDayLabel(day.dateParam)}
                  </button>
                );
              })}
            </div>

            {selectedDate && slots && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-slate-600">یک ساعت خالی انتخاب کنید</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {slots.map((slot) => {
                    const isSelected = slot.startTime === selectedSlot;
                    return (
                      <button
                        key={slot.startTime}
                        type="button"
                        disabled={!slot.isFree}
                        onClick={() => setSelectedSlot(slot.startTime)}
                        className={`rounded-lg px-1.5 py-1.5 text-xs transition-all duration-150 ${
                          !slot.isFree
                            ? "cursor-not-allowed bg-slate-50 text-slate-300 line-through"
                            : isSelected
                              ? "scale-105 bg-[#1e3a5f] text-white shadow-[0_2px_0_#14283f]"
                              : "border border-slate-300 text-slate-700 hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50"
                        }`}
                      >
                        {formatSlotLabel(slot.startTime)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedSlot && (
              <form action={formAction} className="space-y-3 border-t border-slate-100 pt-4">
                <input type="hidden" name="doctorId" value={doctorId} />
                <input type="hidden" name="startTime" value={selectedSlot} />

                {calendar.services.length > 0 && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      نوع خدمت (اختیاری)
                    </label>
                    <select
                      name="serviceName"
                      defaultValue=""
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="">— انتخاب نشود —</option>
                      {calendar.services.map((service) => (
                        <option key={service.name} value={service.name}>
                          {service.name}
                          {service.price ? ` · ${service.price}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">نام بیمار</label>
                  <input
                    name="patientName"
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  {formState?.errors?.patientName && (
                    <p className="mt-1 text-xs text-red-600">{formState.errors.patientName[0]}</p>
                  )}
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
                  {formState?.errors?.patientPhone && (
                    <p className="mt-1 text-xs text-red-600">{formState.errors.patientPhone[0]}</p>
                  )}
                </div>
                <button type="submit" disabled={formPending} className="btn btn-primary w-full">
                  {formPending ? "در حال ثبت..." : "ثبت نوبت"}
                </button>
                {formState?.message && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {formState.message}
                  </p>
                )}
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
