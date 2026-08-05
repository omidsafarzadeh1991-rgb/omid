"use client";

import { useActionState } from "react";
import {
  testBackupConnectionAction,
  runBackupNowAction,
  type TestConnectionFormState,
  type RunNowFormState,
} from "@/app/actions/backup-settings";

const testInitial: TestConnectionFormState = undefined;
const runInitial: RunNowFormState = undefined;

export default function OffsiteBackupActions() {
  const [testState, testAction, testPending] = useActionState(testBackupConnectionAction, testInitial);
  const [runState, runAction, runPending] = useActionState(runBackupNowAction, runInitial);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <form action={testAction}>
        <button type="submit" disabled={testPending} className="btn btn-secondary btn-sm">
          {testPending ? "در حال تست..." : "تست اتصال به مقصد"}
        </button>
        {testState?.success && <p className="mt-1 text-xs text-teal-700">{testState.success}</p>}
        {testState?.message && <p className="mt-1 text-xs text-red-600">{testState.message}</p>}
      </form>
      <form action={runAction}>
        <button type="submit" disabled={runPending} className="btn btn-primary btn-sm">
          {runPending ? "در حال ارسال بک‌آپ..." : "اجرای بک‌آپ آفسایت همین الان"}
        </button>
        {runState?.success && <p className="mt-1 text-xs text-teal-700">{runState.success}</p>}
        {runState?.message && <p className="mt-1 text-xs text-red-600">{runState.message}</p>}
      </form>
    </div>
  );
}
