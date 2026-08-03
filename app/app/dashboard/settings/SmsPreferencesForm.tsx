"use client";

import { useActionState } from "react";
import {
  saveSmsPreferencesAction,
  type SaveSmsPreferencesFormState,
} from "@/app/actions/settings";

const initialState: SaveSmsPreferencesFormState = undefined;

type Defaults = {
  confirmationEnabled: boolean;
  reminder24hEnabled: boolean;
  reminder2to4hEnabled: boolean;
  confirmationTemplate: string;
  reminder24hTemplate: string;
  reminder2to4hTemplate: string;
};

export default function SmsPreferencesForm({ defaults }: { defaults: Defaults }) {
  const [state, action, pending] = useActionState(saveSmsPreferencesAction, initialState);

  return (
    <form action={action} dir="rtl" className="space-y-4">
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="confirmationEnabled"
            defaultChecked={defaults.confirmationEnabled}
            className="accent-teal-600"
          />
          تایید فوری بعد از ثبت نوبت
        </label>
        <textarea
          name="confirmationTemplate"
          rows={2}
          defaultValue={defaults.confirmationTemplate}
          placeholder="{clinic}: نوبت شما نزد {doctor} برای {date} ساعت {time} ثبت شد."
          dir="rtl"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div className="space-y-3 border-t border-slate-100 pt-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="reminder24hEnabled"
            defaultChecked={defaults.reminder24hEnabled}
            className="accent-teal-600"
          />
          یادآوری ۲۴ ساعت قبل
        </label>
        <textarea
          name="reminder24hTemplate"
          rows={2}
          defaultValue={defaults.reminder24hTemplate}
          placeholder="{clinic}: یادآوری - فردا {date} ساعت {time} نزد {doctor} نوبت دارید."
          dir="rtl"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div className="space-y-3 border-t border-slate-100 pt-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="reminder2to4hEnabled"
            defaultChecked={defaults.reminder2to4hEnabled}
            className="accent-teal-600"
          />
          یادآوری ۲ تا ۴ ساعت قبل
        </label>
        <textarea
          name="reminder2to4hTemplate"
          rows={2}
          defaultValue={defaults.reminder2to4hTemplate}
          placeholder="{clinic}: یادآوری - امروز ساعت {time} نزد {doctor} نوبت دارید."
          dir="rtl"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-dark btn-sm">
          {pending ? "در حال ذخیره..." : "ذخیرهٔ تنظیمات پیامک"}
        </button>
        {state?.success && <p className="text-xs text-teal-700">{state.success}</p>}
      </div>
    </form>
  );
}
