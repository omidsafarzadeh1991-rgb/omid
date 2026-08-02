import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import type { BotPlatform } from "@/generated/prisma/client";

export async function getBotIntegrations(clinicId: string) {
  return prisma.botIntegration.findMany({
    where: { clinicId },
    select: { platform: true, enabled: true, updatedAt: true },
  });
}

export async function saveBotToken(
  clinicId: string,
  platform: BotPlatform,
  token: string
) {
  const encryptedToken = encryptSecret(token);
  const encryptedWebhookSecret = encryptSecret(randomBytes(24).toString("hex"));
  await prisma.botIntegration.upsert({
    where: { clinicId_platform: { clinicId, platform } },
    create: { clinicId, platform, encryptedToken, encryptedWebhookSecret, enabled: true },
    update: { encryptedToken, enabled: true },
  });
}

/**
 * Returns the plaintext webhook secret for a clinic's integration, so the
 * settings page can show it in the setWebhook curl command. Generates and
 * persists one if this row predates the webhook-secret column.
 */
export async function getWebhookSecret(
  clinicId: string,
  platform: BotPlatform
): Promise<string | null> {
  const row = await prisma.botIntegration.findUnique({
    where: { clinicId_platform: { clinicId, platform } },
  });
  if (!row) return null;

  if (row.encryptedWebhookSecret) {
    return decryptSecret(row.encryptedWebhookSecret);
  }

  const secret = randomBytes(24).toString("hex");
  await prisma.botIntegration.update({
    where: { clinicId_platform: { clinicId, platform } },
    data: { encryptedWebhookSecret: encryptSecret(secret) },
  });
  return secret;
}

/**
 * Looks up which clinic a Telegram webhook call belongs to and verifies the
 * secret-token header Telegram echoes back, so forged requests are rejected.
 * Returns the decrypted bot token to reply with, or null if verification fails.
 */
export async function verifyTelegramWebhook(
  clinicId: string,
  secretHeader: string | null
): Promise<{ botToken: string } | null> {
  if (!secretHeader) return null;

  const row = await prisma.botIntegration.findUnique({
    where: { clinicId_platform: { clinicId, platform: "TELEGRAM" } },
  });
  if (!row || !row.enabled || !row.encryptedWebhookSecret) return null;

  const expected = Buffer.from(decryptSecret(row.encryptedWebhookSecret), "utf8");
  const actual = Buffer.from(secretHeader, "utf8");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }

  return { botToken: decryptSecret(row.encryptedToken) };
}

export async function setBotEnabled(
  clinicId: string,
  platform: BotPlatform,
  enabled: boolean
) {
  await prisma.botIntegration.updateMany({
    where: { clinicId, platform },
    data: { enabled },
  });
}
