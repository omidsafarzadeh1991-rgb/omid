import { describe, expect, it } from "vitest";
import { verifySetupPassword, isSetupComplete } from "@/lib/setup";
import { registerClinic } from "@/lib/auth";

describe("verifySetupPassword", () => {
  it("accepts the correct password", () => {
    expect(verifySetupPassword("test-setup-password")).toBe(true);
  });

  it("rejects a wrong password", () => {
    expect(verifySetupPassword("wrong-password")).toBe(false);
  });

  it("rejects an empty password", () => {
    expect(verifySetupPassword("")).toBe(false);
  });
});

describe("isSetupComplete", () => {
  it("is true once at least one clinic exists", async () => {
    const result = await registerClinic({
      clinicName: "Setup Test Clinic",
      adminUsername: `setup-test-${Date.now()}`,
      adminFirstName: "مدیر",
      adminPassword: "SuperSecret123",
    });
    if (!result.ok) throw new Error("setup failed");

    expect(await isSetupComplete()).toBe(true);
  });
});
