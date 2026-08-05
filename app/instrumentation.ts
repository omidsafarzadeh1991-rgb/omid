const REMINDER_SWEEP_INTERVAL_MS = 15 * 60_000;
const BACKUP_CHECK_INTERVAL_MS = 60 * 60_000;
const RATE_LIMIT_PRUNE_INTERVAL_MS = 30 * 60_000;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { sweepDueReminders } = await import("@/lib/reminders");
  const { runDailyBackupIfDue } = await import("@/lib/backup");
  const { runOffsiteBackupIfDue } = await import("@/lib/backup-offsite");
  const { pruneExpiredRateLimitBuckets } = await import("@/lib/rate-limit");

  setInterval(() => {
    sweepDueReminders().catch((error: unknown) => {
      console.error("sweepDueReminders failed:", error);
    });
  }, REMINDER_SWEEP_INTERVAL_MS);

  setInterval(() => {
    runDailyBackupIfDue().catch((error: unknown) => {
      console.error("runDailyBackupIfDue failed:", error);
    });
  }, BACKUP_CHECK_INTERVAL_MS);

  setInterval(() => {
    runOffsiteBackupIfDue().catch((error: unknown) => {
      console.error("runOffsiteBackupIfDue failed:", error);
    });
  }, BACKUP_CHECK_INTERVAL_MS);

  setInterval(pruneExpiredRateLimitBuckets, RATE_LIMIT_PRUNE_INTERVAL_MS);

  // Also run once shortly after the server starts, so a fresh install (or a
  // computer that was off for a while) gets its first backup right away
  // instead of waiting up to an hour for the first interval tick.
  runDailyBackupIfDue().catch((error: unknown) => {
    console.error("runDailyBackupIfDue failed:", error);
  });
  runOffsiteBackupIfDue().catch((error: unknown) => {
    console.error("runOffsiteBackupIfDue failed:", error);
  });
}
