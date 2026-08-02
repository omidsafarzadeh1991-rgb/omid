import "server-only";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
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
  await prisma.botIntegration.upsert({
    where: { clinicId_platform: { clinicId, platform } },
    create: { clinicId, platform, encryptedToken, enabled: true },
    update: { encryptedToken, enabled: true },
  });
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
