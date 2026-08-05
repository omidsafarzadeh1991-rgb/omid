import "server-only";
import { prisma } from "@/lib/prisma";
import { getDecryptedBotToken } from "@/lib/settings";
import { getTelegramWebhookHealth } from "@/lib/telegram";
import { getBaleWebhookHealth } from "@/lib/bale";
import { getAiHealthStatus } from "@/lib/message-log";
import type { BotPlatform } from "@/generated/prisma/client";

export type ChannelStatus = {
  key: BotPlatform | "AI";
  label: string;
  status: "connected" | "error" | "unknown" | "disabled";
  detail?: string;
};

const PLATFORM_LABELS: Record<BotPlatform, string> = { TELEGRAM: "تلگرام", BALE: "بله" };

/**
 * Bot channels have no live connection to poll (a webhook is a one-off
 * HTTP call from the messenger to us), so "connected" here means "the
 * messenger's own record of the last delivery attempt looks fine" - the
 * best real signal available. AI status comes from lib/message-log.ts's
 * recent-outcomes read, not a live ping (an extra AI call just to check
 * health would itself cost money, against the project's own cost goal).
 */
export async function getConnectionStatuses(clinicId: string): Promise<ChannelStatus[]> {
  const integrations = await prisma.botIntegration.findMany({ where: { clinicId } });
  const results: ChannelStatus[] = [];

  for (const integration of integrations) {
    const label = PLATFORM_LABELS[integration.platform];
    if (!integration.enabled) {
      results.push({ key: integration.platform, label, status: "disabled" });
      continue;
    }

    const token = await getDecryptedBotToken(clinicId, integration.platform);
    if (!token) {
      results.push({ key: integration.platform, label, status: "unknown" });
      continue;
    }

    const health =
      integration.platform === "TELEGRAM"
        ? await getTelegramWebhookHealth(token)
        : await getBaleWebhookHealth(token);

    results.push({
      key: integration.platform,
      label,
      status: health.status,
      detail: health.status === "error" ? health.message : undefined,
    });
  }

  const aiHealth = await getAiHealthStatus(clinicId);
  results.push({
    key: "AI",
    label: "هوش مصنوعی",
    status: aiHealth === "healthy" ? "connected" : aiHealth === "degraded" ? "error" : "unknown",
  });

  return results;
}
