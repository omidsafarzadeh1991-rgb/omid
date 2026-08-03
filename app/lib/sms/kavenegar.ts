import "server-only";
import type { SmsProvider, SmsSendResult } from "./types";

const BASE_URL = "https://api.kavenegar.com";

type KavenegarResponse = {
  return?: { status?: number; message?: string };
};

/** https://kavenegar.com/rest.html - api key is part of the URL path, not a header. */
export function createKavenegarProvider(apiKey: string, senderNumber?: string): SmsProvider {
  return {
    async send(to: string, text: string): Promise<SmsSendResult> {
      const params = new URLSearchParams({ receptor: to, message: text });
      if (senderNumber) params.set("sender", senderNumber);

      const url = `${BASE_URL}/v1/${encodeURIComponent(apiKey)}/sms/send.json?${params.toString()}`;

      let body: KavenegarResponse | null = null;
      let response: Response;
      try {
        response = await fetch(url);
        body = (await response.json().catch(() => null)) as KavenegarResponse | null;
      } catch {
        return { ok: false, error: "ارتباط با سرویس پیامک کاوه‌نگار برقرار نشد." };
      }

      const status = body?.return?.status;
      if (!response.ok || status !== 200) {
        return {
          ok: false,
          error: body?.return?.message ?? `خطای سرویس پیامک (HTTP ${response.status})`,
        };
      }
      return { ok: true };
    },
  };
}
