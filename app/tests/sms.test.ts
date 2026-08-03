import { describe, expect, it, vi, beforeEach } from "vitest";
import { createKavenegarProvider } from "@/lib/sms/kavenegar";
import { sendClinicSms, saveSmsCredentials } from "@/lib/sms";
import { createTestClinicWithDoctor } from "./helpers";

describe("createKavenegarProvider", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports success when Kavenegar returns status 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(url).toContain("/v1/my-api-key/sms/send.json");
        expect(url).toContain("receptor=09121234567");
        return new Response(
          JSON.stringify({ return: { status: 200, message: "تایید شد" }, entries: [] }),
          { status: 200 }
        );
      })
    );

    const provider = createKavenegarProvider("my-api-key");
    const result = await provider.send("09121234567", "سلام");

    expect(result.ok).toBe(true);
  });

  it("reports failure with the provider's own error message on a non-200 status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ return: { status: 411, message: "شماره گیرنده نامعتبر است" } }),
          { status: 200 }
        )
      )
    );

    const provider = createKavenegarProvider("my-api-key");
    const result = await provider.send("bad-number", "سلام");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("شماره گیرنده نامعتبر است");
    }
  });

  it("reports failure when the network request itself throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    const provider = createKavenegarProvider("my-api-key");
    const result = await provider.send("09121234567", "سلام");

    expect(result.ok).toBe(false);
  });
});

describe("sendClinicSms", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a clear error when no SMS provider is configured yet", async () => {
    const { clinic } = await createTestClinicWithDoctor();

    const result = await sendClinicSms(clinic.id, "09121234567", "سلام");

    expect(result.ok).toBe(false);
  });

  it("routes to the configured provider once credentials are saved", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    await saveSmsCredentials(clinic.id, "KAVENEGAR", "real-key", "10001234");

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(url).toContain("/v1/real-key/sms/send.json");
        expect(url).toContain("sender=10001234");
        return new Response(JSON.stringify({ return: { status: 200 } }), { status: 200 });
      })
    );

    const result = await sendClinicSms(clinic.id, "09121234567", "سلام");
    expect(result.ok).toBe(true);
  });
});
