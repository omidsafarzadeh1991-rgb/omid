"use client";

import { useActionState } from "react";
import { createBackupAction, type CreateBackupResult } from "@/app/actions/owner";

const initialState: CreateBackupResult = undefined;

export default function BackupButton() {
  const [state, action, pending] = useActionState(createBackupAction, initialState);

  return (
    <form action={action} className="space-y-2">
      <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
        {pending ? "در حال ساخت بک‌آپ..." : "ساخت بک‌آپ دستی الان"}
      </button>
      {state?.success && (
        <p className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">{state.success}</p>
      )}
      {state?.message && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
      )}
    </form>
  );
}
