"use client";

import { useActionState } from "react";
import {
  saveClinicInfoAction,
  type ClinicInfoFormState,
} from "@/app/actions/knowledge";
import type { ClinicInfo } from "@/generated/prisma/client";

const initialState: ClinicInfoFormState = undefined;

export default function ClinicInfoForm({ info }: { info: ClinicInfo | null }) {
  const [state, action, pending] = useActionState(saveClinicInfoAction, initialState);

  return (
    <form action={action} dir="rtl" className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">آدرس</label>
        <input
          name="address"
          defaultValue={info?.address ?? ""}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">تلفن</label>
        <input
          name="phone"
          dir="ltr"
          defaultValue={info?.phone ?? ""}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">واتس‌اپ</label>
        <input
          name="whatsapp"
          dir="ltr"
          defaultValue={info?.whatsapp ?? ""}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">ایمیل</label>
        <input
          name="contactEmail"
          type="email"
          dir="ltr"
          defaultValue={info?.contactEmail ?? ""}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">وب‌سایت</label>
        <input
          name="website"
          dir="ltr"
          defaultValue={info?.website ?? ""}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">اینستاگرام</label>
        <input
          name="instagram"
          dir="ltr"
          defaultValue={info?.instagram ?? ""}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-medium text-slate-600">
          لینک لوکیشن گوگل مپ
        </label>
        <input
          name="googleMapUrl"
          dir="ltr"
          defaultValue={info?.googleMapUrl ?? ""}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-medium text-slate-600">
          یادداشت ساعات کاری (متن آزاد)
        </label>
        <input
          name="workingHoursNote"
          placeholder="مثلاً: شنبه تا چهارشنبه ۸ تا ۲۰، پنجشنبه ۸ تا ۱۴"
          defaultValue={info?.workingHoursNote ?? ""}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div className="flex items-end gap-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <input
            type="checkbox"
            name="parkingAvailable"
            defaultChecked={info?.parkingAvailable ?? false}
          />
          پارکینگ دارد
        </label>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          توضیح پارکینگ (اختیاری)
        </label>
        <input
          name="parkingDescription"
          defaultValue={info?.parkingDescription ?? ""}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-medium text-slate-600">
          بیمه‌های طرف قرارداد (متن آزاد)
        </label>
        <textarea
          name="insuranceNote"
          rows={2}
          defaultValue={info?.insuranceNote ?? ""}
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
        {pending ? "در حال ذخیره..." : "ذخیرهٔ اطلاعات کلینیک"}
      </button>
    </form>
  );
}
