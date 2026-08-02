"use client";

import { useActionState } from "react";
import {
  createDoctorAction,
  type CreateDoctorFormState,
} from "@/app/actions/clinic";
import { WEEK_DAYS } from "@/lib/weekdays";

const initialState: CreateDoctorFormState = undefined;
const DEFAULT_WORK_DAYS = [6, 0, 1, 2, 3]; // شنبه تا چهارشنبه

export default function AddDoctorForm() {
  const [state, action, pending] = useActionState(
    createDoctorAction,
    initialState
  );

  return (
    <form
      action={action}
      dir="rtl"
      className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4"
    >
      <div className="sm:col-span-2">
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
          ساعت شروع
        </label>
        <input
          name="workStartHour"
          type="number"
          min={0}
          max={23}
          defaultValue={9}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          ساعت پایان
        </label>
        <input
          name="workEndHour"
          type="number"
          min={1}
          max={24}
          defaultValue={17}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div className="sm:col-span-4">
        <label className="mb-2 block text-xs font-medium text-slate-600">
          روزهای حضور در هفته
        </label>
        <div className="flex flex-wrap gap-3">
          {WEEK_DAYS.map((day) => (
            <label
              key={day.value}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50 has-[:checked]:text-teal-700"
            >
              <input
                type="checkbox"
                name="workDays"
                value={day.value}
                defaultChecked={(DEFAULT_WORK_DAYS as number[]).includes(day.value)}
                className="accent-teal-600"
              />
              {day.label}
            </label>
          ))}
        </div>
        {state?.errors?.workDays && (
          <p className="mt-1 text-xs text-red-600">{state.errors.workDays[0]}</p>
        )}
      </div>

      <div className="sm:col-span-4">
        <label className="mb-1 block text-xs font-medium text-slate-600">
          خدماتی که ارائه می‌دهد (اختیاری — هر خدمت را در یک خط بنویسید)
        </label>
        <textarea
          name="services"
          rows={3}
          placeholder={"ویزیت عمومی\nجرمگیری\nعصب‌کشی"}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div className="sm:col-span-4 flex items-end gap-3">
        <div className="flex-1">
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
        <button type="submit" disabled={pending} className="btn btn-dark">
          {pending ? "در حال افزودن..." : "افزودن پزشک"}
        </button>
      </div>
      {state?.message && (
        <p className="sm:col-span-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}
    </form>
  );
}
