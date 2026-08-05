import "server-only";
import { prisma } from "@/lib/prisma";
import type { BotPlatform } from "@/generated/prisma/client";

export type MessageResolution = "FAQ" | "AI" | "AI_ERROR";

export type RecordMessageLogInput = {
  clinicId: string;
  platform: BotPlatform;
  resolution: MessageResolution;
  responseMs: number;
  promptTokens?: number;
  completionTokens?: number;
};

/** Never throws into the caller - a logging failure must never break a reply. */
export async function recordMessageLog(input: RecordMessageLogInput): Promise<void> {
  await prisma.messageLog.create({ data: input }).catch((error: unknown) => {
    console.error("recordMessageLog failed:", error);
  });
}

export type AiUsageStats = {
  totalMessages: number;
  faqCount: number;
  aiCount: number;
  aiErrorCount: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  avgResponseMsFaq: number | null;
  avgResponseMsAi: number | null;
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

/** Aggregates message logs since a given point in time, for the AI-usage dashboard. */
export async function getAiUsageStats(clinicId: string, since: Date): Promise<AiUsageStats> {
  const logs = await prisma.messageLog.findMany({
    where: { clinicId, createdAt: { gte: since } },
  });

  const faqLogs = logs.filter((l) => l.resolution === "FAQ");
  const aiLogs = logs.filter((l) => l.resolution === "AI" || l.resolution === "AI_ERROR");
  const aiErrorLogs = logs.filter((l) => l.resolution === "AI_ERROR");

  return {
    totalMessages: logs.length,
    faqCount: faqLogs.length,
    aiCount: aiLogs.length,
    aiErrorCount: aiErrorLogs.length,
    totalPromptTokens: aiLogs.reduce((sum, l) => sum + (l.promptTokens ?? 0), 0),
    totalCompletionTokens: aiLogs.reduce((sum, l) => sum + (l.completionTokens ?? 0), 0),
    avgResponseMsFaq: average(faqLogs.map((l) => l.responseMs)),
    avgResponseMsAi: average(aiLogs.map((l) => l.responseMs)),
  };
}

export type AiHealthStatus = "healthy" | "degraded" | "unknown";

/**
 * Looks at the most recent AI-path attempts (successful or not) to answer
 * "is the AI provider currently working" - there's no live connection to
 * poll (each webhook call is a one-off HTTP request), so recent outcomes
 * are the only real signal. "unknown" (not "healthy") when there's simply
 * no recent AI traffic to judge from, so a quiet clinic never falsely
 * shows green.
 */
export async function getAiHealthStatus(clinicId: string, windowMinutes = 30): Promise<AiHealthStatus> {
  const since = new Date(Date.now() - windowMinutes * 60_000);
  const logs = await prisma.messageLog.findMany({
    where: { clinicId, createdAt: { gte: since }, resolution: { in: ["AI", "AI_ERROR"] } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  if (logs.length === 0) return "unknown";

  const failures = logs.filter((l) => l.resolution === "AI_ERROR").length;
  return failures > logs.length / 2 ? "degraded" : "healthy";
}
