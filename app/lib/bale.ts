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
