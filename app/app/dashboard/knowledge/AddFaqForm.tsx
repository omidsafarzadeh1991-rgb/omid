"use client";

import { useActionState } from "react";
import { createFaqAction, type FaqFormState } from "@/app/actions/knowledge";
import { CATEGORY_LABELS } from "./categories";

const initialState: FaqFormState = undefined;

export default function AddFaqForm() {
  const [state, action, pending] = useActionState(createFaqAction, initialState);

  return (
    <form
      action={action}
      dir="rtl"
      className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-medium text-slate-600">سوال</label>
        <input
          name="question"
          required
          placeholder="مثلاً: آدرس کلینیک کجاست؟"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-medium text-slate-600">پاسخ</label>
        <textarea
          name="answer"
          required
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">دسته</label>
        <select
          name="category"
          defaultValue="OTHER"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          اولویت (۱ تا ۱۰۰)
        </label>
        <input
          name="priority"
          type="number"
          min={1}
          max={100}
          defaultValue={50}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-medium text-slate-600">
          کلیدواژه‌ها (با کاما جدا کنید)
        </label>
        <input
          name="keywords"
          required
          placeholder="آدرس, لوکیشن, کجا هستید, نشانی"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        <p className="mt-1 text-xs text-slate-400">
          اگر پیام بیمار شامل هرکدام از این کلمات باشد، همین جواب داده می‌شود.
        </p>
      </div>

      {state?.message && (
        <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}
      {state?.success && (
        <p className="sm:col-span-2 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">
          {state.success}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-dark sm:col-span-2">
        {pending ? "در حال افزودن..." : "افزودن سوال متداول"}
      </button>
    </form>
  );
}
