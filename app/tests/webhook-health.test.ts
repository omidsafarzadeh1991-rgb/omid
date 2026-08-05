import { describe, expect, it, vi, afterEach } from "vitest";
import { getTelegramWebhookHealth } from "@/lib/telegram";
import { getBaleWebhookHealth } from "@/lib/bale";

function mockFetchOnce(body: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status: ok ? 200 : 500 }))
  );
}

describe("getTelegramWebhookHealth", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reports connected when Telegram has no recent delivery error", async () => {
    mockFetchOnce({ ok: true, result: { url: "https://example.com/webhook" } });
    expect(await getTelegramWebhookHealth("fake-token")).toEqual({ status: "connected" });
  });

  it("reports the error message when Telegram recorded a delivery failure", async () => {
    mockFetchOnce({
      ok: true,
      result: { url: "https://example.com/webhook", last_error_date: 1234, last_error_message: "Connection timed out" },
    });
    expect(await getTelegramWebhookHealth("fake-token")).toEqual({
      status: "error",
      message: "Connection timed out",
    });
  });

  it("falls back to unknown on a non-OK HTTP response, not a false error", async () => {
    mockFetchOnce({}, false);
    expect(await getTelegramWebhookHealth("fake-token")).toEqual({ status: "unknown" });
  });

  it("falls back to unknown when the network call itself throws", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    expect(await getTelegramWebhookHealth("fake-token")).toEqual({ status: "unknown" });
  });
});

describe("getBaleWebhookHealth", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reports connected when there is no recorded delivery error", async () => {
    mockFetchOnce({ ok: true, result: { url: "https://example.com/webhook" } });
    expect(await getBaleWebhookHealth("fake-token")).toEqual({ status: "connected" });
  });

  it("falls back to unknown rather than a false error on an unexpected response shape", async () => {
    mockFetchOnce({ unexpected: "shape" });
    expect(await getBaleWebhookHealth("fake-token")).toEqual({ status: "unknown" });
  });
});
