import { describe, expect, it, vi, afterEach } from "vitest";
import { getConnectionStatuses } from "@/lib/connection-status";
import { saveBotToken } from "@/lib/settings";
import { recordMessageLog } from "@/lib/message-log";
import { createTestClinicWithDoctor } from "./helpers";

function mockWebhookInfo(body: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })));
}

describe("getConnectionStatuses", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns an empty list when no bot is configured, but still reports AI status", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    const statuses = await getConnectionStatuses(clinic.id);
    expect(statuses).toHaveLength(1);
    expect(statuses[0].key).toBe("AI");
  });

  it("marks a disabled integration as disabled without calling the messenger API", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    await saveBotToken(clinic.id, "TELEGRAM", "fake-token");
    const { setBotEnabled } = await import("@/lib/settings");
    await setBotEnabled(clinic.id, "TELEGRAM", false);

    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const statuses = await getConnectionStatuses(clinic.id);
    const telegramStatus = statuses.find((s) => s.key === "TELEGRAM");
    expect(telegramStatus).toMatchObject({ status: "disabled", label: "تلگرام" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("reports an enabled integration's live health from the messenger API", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    await saveBotToken(clinic.id, "BALE", "fake-bale-token");
    mockWebhookInfo({ ok: true, result: { url: "https://example.com" } });

    const statuses = await getConnectionStatuses(clinic.id);
    const baleStatus = statuses.find((s) => s.key === "BALE");
    expect(baleStatus).toMatchObject({ status: "connected", label: "بله" });
  });

  it("derives AI status from recent message logs", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    await recordMessageLog({ clinicId: clinic.id, platform: "TELEGRAM", resolution: "AI_ERROR", responseMs: 500 });
    await recordMessageLog({ clinicId: clinic.id, platform: "TELEGRAM", resolution: "AI_ERROR", responseMs: 500 });

    const statuses = await getConnectionStatuses(clinic.id);
    const aiStatus = statuses.find((s) => s.key === "AI");
    expect(aiStatus?.status).toBe("error");
  });
});
