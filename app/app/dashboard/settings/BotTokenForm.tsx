"use client";

import { useActionState } from "react";
import {
  saveBotTokenAction,
  type SaveTokenFormState,
} from "@/app/actions/settings";

const initialState: SaveTokenFormState = undefined;

export default function BotTokenForm({
  platform,
  hasToken,
}: {
  platform: "TELEGRAM" | "BALE";
  hasToken: boolean;
}) {
  const [state, action, pending] = useActionState(
    saveBotTokenAction,
    initialState
  );

  return (
    <form action={action} dir="rtl" className="flex flex-col gap-2 sm:flex-row">
      <input type="hidden" name="platform" value={platform} />
      <input
        name="token"
        type="password"
        required
        dir="ltr"
        placeholder={hasToken ? "برای تغییر، توکن جدید را وارد کنید" : "توکن ربات را اینجا بچسبانید"}
        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm ltr:text-left focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
      />
      <button type="submit" disabled={pending} className="btn btn-dark btn-sm">
        {pending ? "در حال ذخیره..." : hasToken ? "به‌روزرسانی توکن" : "ذخیرهٔ توکن"}
      </button>
      {state?.message && (
        <p className="w-full text-xs text-red-600">{state.message}</p>
      )}
      {state?.success && (
        <p className="w-full text-xs text-teal-700">{state.success}</p>
      )}
    </form>
  );
}
