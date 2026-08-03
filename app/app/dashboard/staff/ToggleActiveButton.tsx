"use client";

import { useTransition } from "react";
import { toggleStaffActiveAction } from "@/app/actions/clinic";

export default function ToggleActiveButton({
  staffId,
  active,
}: {
  staffId: string;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => toggleStaffActiveAction(staffId))}
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
