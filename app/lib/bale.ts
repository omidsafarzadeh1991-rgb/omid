import "server-only";

// Bale's Bot API mirrors Telegram's Bot API shape (same base-URL-per-token
// pattern, same Update/Message/sendMessage wire format) - confirmed against
// Bale's own sample bots and community SDKs, not assumed from Telegram alone.
const BALE_API_BASE = "https://tapi.bale.ai";

export type BaleUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number };
    from?: { first_name?: string };
    text?: string;
  };
};

/** Sends a plain-text reply to a Bale chat using the clinic's own bot token. */
export async function sendBaleMessage(
  botToken: string,
  chatId: number,
  text: string
): Promise<void> {
  const response = await fetch(`${BALE_API_BASE}/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Bale sendMessage failed (${response.status}): ${body}`);
  }
}

export type WebhookHealth =
  | { status: "connected" }
  | { status: "error"; message: string }
  | { status: "unknown" };

/**
 * Mirrors getTelegramWebhookHealth. Bale's support for getWebhookInfo isn't
 * independently confirmed the way sendMessage's shape is (see the note at
 * the top of this file), so any unexpected response shape or failure here
 * falls back to "unknown" rather than risking a false "error" reading.
 */
export async function getBaleWebhookHealth(botToken: string): Promise<WebhookHealth> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${BALE_API_BASE}/bot${botToken}/getWebhookInfo`, {
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) return { status: "unknown" };
    const data = await response.json();
    if (!data.ok) return { status: "unknown" };

    const info = data.result as { last_error_date?: number; last_error_message?: string };
    if (info.last_error_date) {
      return { status: "error", message: info.last_error_message ?? "خطای نامشخص" };
    }
    return { status: "connected" };
  } catch {
    return { status: "unknown" };
  }
}
