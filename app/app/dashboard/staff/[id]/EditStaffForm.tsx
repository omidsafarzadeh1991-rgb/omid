"use client";

import { useActionState } from "react";
import {
  updateStaffAction,
  type UpdateStaffFormState,
} from "@/app/actions/clinic";

const initialState: UpdateStaffFormState = undefined;

type StaffFormData = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  birthDate: string;
  personnelCode: string;
  hireDate: string;
  notes: string;
  role: "ADMIN" | "RECEPTIONIST";
  profilePictureUrl: string | null;
};

export default function EditStaffForm({ staff }: { staff: StaffFormData }) {
  const [state, action, pending] = useActionState(updateStaffAction, initialState);

  return (
    <form action={action} dir="rtl" className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="staffId" value={staff.id} />

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">نام</label>
        <input
          name="firstName"
          required
          defaultValue={staff.firstName}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          نام خانوادگی (اختیاری)
        </label>
        <input
          name="lastName"
          defaultValue={staff.lastName}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">نقش</label>
        <select
          name="role"
          defaultValue={staff.role}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="RECEPTIONIST">منشی (فقط ثبت و دیدن نوبت‌ها)</option>
          <option value="ADMIN">مدیر کلینیک (دسترسی کامل)</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          ایمیل (اختیاری)
        </label>
        <input
          name="email"
          type="email"
          dir="ltr"
          defaultValue={staff.email}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          شماره موبایل (اختیاری)
        </label>
        <input
          name="mobile"
          dir="ltr"
          defaultValue={staff.mobile}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          تاریخ تولد (اختیاری)
        </label>
        <input
          name="birthDate"
          type="date"
          dir="ltr"
          defaultValue={staff.birthDate}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          کد پرسنلی (اختیاری)
        </label>
        <input
          name="personnelCode"
          dir="ltr"
          defaultValue={staff.personnelCode}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          تاریخ استخدام (اختیاری)
        </label>
        <input
          name="hireDate"
          type="date"
          dir="ltr"
          defaultValue={staff.hireDate}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-medium text-slate-600">
          عکس پروفایل (اختیاری - برای تغییر، فایل جدید انتخاب کنید)
        </label>
        {staff.profilePictureUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={staff.profilePictureUrl}
            alt=""
            className="mb-2 h-12 w-12 rounded-full object-cover"
          />
        )}
        <input
          name="profilePicture"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-medium text-slate-600">
          توضیحات / یادداشت (اختیاری)
        </label>
        <textarea
          name="notes"
          rows={2}
          defaultValue={staff.notes}
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

      <button type="submit" disabled={pending} className="btn btn-dark sm:col-span-2">
        {pending ? "در حال ذخیره..." : "ذخیرهٔ تغییرات"}
      </button>
    </form>
  );
}
