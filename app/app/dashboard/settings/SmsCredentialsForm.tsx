"use client";

import { useActionState } from "react";
import {
  saveSmsCredentialsAction,
  type SaveSmsCredentialsFormState,
} from "@/app/actions/settings";

const initialState: SaveSmsCredentialsFormState = undefined;

export default function SmsCredentialsForm({
  hasCredentials,
  defaultSenderNumber,
}: {
  hasCredentials: boolean;
  defaultSenderNumber: string;
}) {
  const [state, action, pending] = useActionState(saveSmsCredentialsAction, initialState);

  return (
    <form action={action} dir="rtl" className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">سرویس پیامک</label>
        <select
          name="provider"
          defaultValue="KAVENEGAR"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="KAVENEGAR">کاوه‌نگار</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">کلید API</label>
        <input
          name="apiKey"
          type="password"
          required
          dir="ltr"
          placeholder={hasCredentials ? "برای تغییر، کلید جدید را وارد کنید" : "کلید API را اینجا بچسبانید"}
          className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          شمارهٔ فرستنده (اختیاری)
        </label>
        <input
          name="senderNumber"
          dir="ltr"
          defaultValue={defaultSenderNumber}
          className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>
      <button type="submit" disabled={pending} className="btn btn-dark btn-sm">
        {pending ? "در حال ذخیره..." : "ذخیرهٔ اطلاعات سرویس پیامک"}
      </button>
      {state?.success && <p className="text-xs text-teal-700">{state.success}</p>}
      {state?.message && <p className="text-xs text-red-600">{state.message}</p>}
    </form>
  );
}
