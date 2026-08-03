"use client";

import { useTransition } from "react";
import { toggleFaqActiveAction } from "@/app/actions/knowledge";

export default function FaqToggleButton({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => toggleFaqActiveAction(id, !active))}
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        active
          ? "bg-red-50 text-red-700 hover:bg-red-100"
          : "bg-teal-50 text-teal-700 hover:bg-teal-100"
      }`}
    >
      {pending ? "..." : active ? "غیرفعال کردن" : "فعال کردن"}
    </button>
  );
}
