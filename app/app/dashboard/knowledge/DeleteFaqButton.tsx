"use client";

import { useTransition } from "react";
import { deleteFaqAction } from "@/app/actions/knowledge";

export default function DeleteFaqButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("این سوال متداول برای همیشه پاک شود؟")) {
          startTransition(() => deleteFaqAction(id));
        }
      }}
      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
    >
      {pending ? "..." : "حذف"}
    </button>
  );
}
