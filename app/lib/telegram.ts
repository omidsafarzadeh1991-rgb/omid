import "server-only";

const TELEGRAM_API_BASE = "https://api.telegram.org";

export type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number };
    from?: { first_name?: string };
    text?: string;
  };
};

/** Sends a plain-text reply to a Telegram chat using the clinic's own bot token. */
export async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string
): Promise<void> {
  const response = await fetch(
    `${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram sendMessage failed (${response.status}): ${body}`);
  }
}

export type WebhookHealth =
  | { status: "connected" }
  | { status: "error"; message: string }
  | { status: "unknown" };

/**
 * Reads Telegram's own record of the last webhook delivery attempt
 * (getWebhookInfo) for the dashboard's connection-status card. There's no
 * live socket to check - webhooks are one-off HTTP calls from Telegram to
 * us - so this is the only real signal Telegram exposes. Any failure here
 * (network, unexpected shape) falls back to "unknown" rather than a false
 * "error", since a wrong red light is worse than no light.
 */
export async function getTelegramWebhookHealth(botToken: string): Promise<WebhookHealth> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/getWebhookInfo`, {
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
