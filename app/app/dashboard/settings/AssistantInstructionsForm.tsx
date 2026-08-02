"use client";

import { useActionState } from "react";
import {
  saveAssistantInstructionsAction,
  type SaveInstructionsFormState,
} from "@/app/actions/settings";

const initialState: SaveInstructionsFormState = undefined;

export default function AssistantInstructionsForm({
  defaultValue,
}: {
  defaultValue: string;
}) {
  const [state, action, pending] = useActionState(
    saveAssistantInstructionsAction,
    initialState
  );

  return (
    <form action={action} dir="rtl" className="flex flex-col gap-2">
      <textarea
        name="instructions"
        rows={6}
        defaultValue={defaultValue}
        placeholder={
          "مثلاً:\nهمیشه بیمار را با احترام و اسم کوچک صدا نکن.\nآدرس مطب: خیابان ولیعصر، پلاک ۱۲.\nروزهای تعطیل رسمی نوبت‌دهی نکن.\nاگر بیمار زیر ۱۸ سال بود، بگو حتماً همراه بزرگ‌تر بیاید."
        }
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
      />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-dark btn-sm w-fit">
          {pending ? "در حال ذخیره..." : "ذخیرهٔ دستورالعمل"}
        </button>
        {state?.success && (
          <p className="text-xs text-teal-700">{state.success}</p>
        )}
      </div>
    </form>
  );
}
