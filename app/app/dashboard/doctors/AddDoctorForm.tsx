"use client";

import { useActionState, useState } from "react";
import {
  createDoctorAction,
  type CreateDoctorFormState,
} from "@/app/actions/clinic";
import { WEEK_DAYS } from "@/lib/weekdays";
import CatalogCheckboxGroup from "./CatalogCheckboxGroup";

const initialState: CreateDoctorFormState = undefined;
const DEFAULT_ENABLED_DAYS = [6, 0, 1, 2, 3]; // شنبه تا چهارشنبه

export default function AddDoctorForm({
  specialties,
  services,
}: {
  specialties: { id: string; name: string }[];
  services: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(
    createDoctorAction,
    initialState
  );
  const [enabledDays, setEnabledDays] = useState<Set<number>>(
    new Set(DEFAULT_ENABLED_DAYS)
  );

  function toggleDay(value: number) {
    setEnabledDays((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  return (
    <form
      action={action}
      dir="rtl"
      className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4"
    >
      <div className="sm:col-span-3">
        <label className="mb-1 block text-xs font-medium text-slate-600">
          نام پزشک
        </label>
        <input
          name="name"
          required
          placeholder="دکتر رضایی"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        {state?.errors?.name && (
          <p className="mt-1 text-xs text-red-600">{state.errors.name[0]}</p>
        )}
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          طول هر نوبت (دقیقه)
        </label>
        <input
          name="slotMinutes"
          type="number"
          min={5}
          max={240}
          defaultValue={30}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div className="sm:col-span-4">
        <label className="mb-2 block text-xs font-medium text-slate-600">
          روزها و ساعت کاری (ساعت هر روز می‌تواند فرق کند)
        </label>
        <div className="space-y-2">
          {WEEK_DAYS.map((day) => {
            const enabled = enabledDays.has(day.value);
            return (
              <div
                key={day.value}
                className={`flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
                  enabled
                    ? "border-teal-200 bg-teal-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <label className="flex w-24 items-center gap-1.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name={`day_${day.value}_enabled`}
                    checked={enabled}
                    onChange={() => toggleDay(day.value)}
                    className="accent-teal-600"
                  />
                  {day.label}
                </label>
                {enabled && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span>از</span>
                    <input
                      name={`day_${day.value}_start`}
                      type="number"
                      min={0}
                      max={23}
                      defaultValue={9}
                      className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                    <span>تا</span>
                    <input
                      name={`day_${day.value}_end`}
                      type="number"
                      min={1}
                      max={24}
                      defaultValue={17}
                      className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="sm:col-span-4">
        <label className="mb-2 block text-xs font-medium text-slate-600">
          تخصص‌ها
        </label>
        <CatalogCheckboxGroup
          name="specialtyIds"
          items={specialties.map((s) => ({ id: s.id, label: s.name }))}
          emptyMessage="هنوز تخصصی تعریف نشده — اول از بخش «فهرست تخصص‌ها» بالای همین صفحه اضافه کنید."
        />
      </div>

      <div className="sm:col-span-4">
        <label className="mb-2 block text-xs font-medium text-slate-600">
          خدمات
        </label>
        <CatalogCheckboxGroup
          name="serviceIds"
          items={services.map((s) => ({ id: s.id, label: s.name }))}
          emptyMessage="هنوز خدمتی تعریف نشده — اول از بخش «فهرست خدمات» بالای همین صفحه اضافه کنید."
        />
      </div>

      <button type="submit" disabled={pending} className="btn btn-dark sm:col-span-4">
        {pending ? "در حال افزودن..." : "افزودن پزشک"}
      </button>

      {state?.message && (
        <p className="sm:col-span-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}
    </form>
  );
}
