"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { updateFaqAction, type FaqFormState } from "@/app/actions/knowledge";
import { CATEGORY_LABELS } from "../categories";

const initialState: FaqFormState = undefined;

type FaqFormData = {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string;
  priority: number;
};

export default function EditFaqForm({ faq }: { faq: FaqFormData }) {
  const [state, action, pending] = useActionState(updateFaqAction, initialState);
  const router = useRouter();

  return (
    <form action={action} dir="rtl" className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={faq.id} />

      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-medium text-slate-600">سوال</label>
        <input
          name="question"
          required
          defaultValue={faq.question}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-medium text-slate-600">پاسخ</label>
        <textarea
          name="answer"
          required
          rows={3}
          defaultValue={faq.answer}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">دسته</label>
        <select
          name="category"
          defaultValue={faq.category}
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
          defaultValue={faq.priority}
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
          defaultValue={faq.keywords}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
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

      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={pending} className="btn btn-dark flex-1">
          {pending ? "در حال ذخیره..." : "ذخیرهٔ تغییرات"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard/knowledge")}
          className="btn btn-secondary"
        >
          بازگشت
        </button>
      </div>
    </form>
  );
}
