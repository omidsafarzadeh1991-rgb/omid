const SWEEP_INTERVAL_MS = 15 * 60_000;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { sweepDueReminders } = await import("@/lib/reminders");
  setInterval(() => {
    sweepDueReminders().catch((error: unknown) => {
      console.error("sweepDueReminders failed:", error);
    });
  }, SWEEP_INTERVAL_MS);
}
