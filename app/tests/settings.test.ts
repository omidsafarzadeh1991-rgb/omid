import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { getBotIntegrations, saveBotToken, setBotEnabled } from "@/lib/settings";
import { registerClinic } from "@/lib/auth";

let counter = 0;
async function createClinic() {
  counter += 1;
  const result = await registerClinic({
    clinicName: `Settings Test Clinic ${counter}`,
    adminUsername: `settings-admin-${counter}`,
    adminFirstName: "مدیر",
    adminPassword: "SuperSecret123",
  });
  if (!result.ok) throw new Error("setup failed");
  return result.clinicId;
}

describe("bot integration settings", () => {
  it("saves a token encrypted, and it round-trips back correctly", async () => {
    const clinicId = await createClinic();
    await saveBotToken(clinicId, "TELEGRAM", "123456:my-secret-telegram-token");

    const row = await prisma.botIntegration.findUniqueOrThrow({
      where: { clinicId_platform: { clinicId, platform: "TELEGRAM" } },
    });

    expect(row.encryptedToken).not.toContain("my-secret-telegram-token");
    expect(decryptSecret(row.encryptedToken)).toBe(
      "123456:my-secret-telegram-token"
    );
    expect(row.enabled).toBe(true);
  });

  it("lists integrations without ever exposing the encrypted token", async () => {
    const clinicId = await createClinic();
    await saveBotToken(clinicId, "BALE", "a-bale-token");

    const integrations = await getBotIntegrations(clinicId);
    expect(integrations).toHaveLength(1);
    expect(integrations[0]).not.toHaveProperty("encryptedToken");
    expect(integrations[0].platform).toBe("BALE");
    expect(integrations[0].enabled).toBe(true);
  });

  it("can disable and re-enable an integration without touching the token", async () => {
    const clinicId = await createClinic();
    await saveBotToken(clinicId, "TELEGRAM", "a-telegram-token");

    await setBotEnabled(clinicId, "TELEGRAM", false);
    let row = await prisma.botIntegration.findUniqueOrThrow({
      where: { clinicId_platform: { clinicId, platform: "TELEGRAM" } },
    });
    expect(row.enabled).toBe(false);
    expect(decryptSecret(row.encryptedToken)).toBe("a-telegram-token");

    await setBotEnabled(clinicId, "TELEGRAM", true);
    row = await prisma.botIntegration.findUniqueOrThrow({
      where: { clinicId_platform: { clinicId, platform: "TELEGRAM" } },
    });
    expect(row.enabled).toBe(true);
  });
});
