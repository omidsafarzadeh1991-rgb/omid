export type SmsSendResult = { ok: true } | { ok: false; error: string };

/** Adapter interface every Iranian SMS provider implements, so swapping the
 * provider (Kavenegar, Melipayamak, Farapayamak, ...) never touches the
 * reminder-scheduling logic in lib/reminders.ts. */
export interface SmsProvider {
  send(to: string, text: string): Promise<SmsSendResult>;
}
