import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getAiHealthStatus, getAiUsageStats, recordMessageLog } from "@/lib/message-log";
import { createTestClinicWithDoctor } from "./helpers";

describe("message-log", () => {
  it("records a log row without throwing when given valid input", async () => {
    const { clinic } = await createTestClinicWithDoctor();

    await recordMessageLog({
      clinicId: clinic.id,
      platform: "TELEGRAM",
      resolution: "FAQ",
      responseMs: 12,
    });

    const logs = await prisma.messageLog.findMany({ where: { clinicId: clinic.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].resolution).toBe("FAQ");
  });

  it("aggregates FAQ vs AI counts and sums tokens only for AI resolutions", async () => {
    const { clinic } = await createTestClinicWithDoctor();

    await recordMessageLog({ clinicId: clinic.id, platform: "TELEGRAM", resolution: "FAQ", responseMs: 10 });
    await recordMessageLog({ clinicId: clinic.id, platform: "TELEGRAM", resolution: "FAQ", responseMs: 20 });
    await recordMessageLog({
      clinicId: clinic.id,
      platform: "TELEGRAM",
      resolution: "AI",
      responseMs: 500,
      promptTokens: 200,
      completionTokens: 40,
    });

    const stats = await getAiUsageStats(clinic.id, new Date(0));
    expect(stats.totalMessages).toBe(3);
    expect(stats.faqCount).toBe(2);
    expect(stats.aiCount).toBe(1);
    expect(stats.totalPromptTokens).toBe(200);
    expect(stats.totalCompletionTokens).toBe(40);
    expect(stats.avgResponseMsFaq).toBe(15);
    expect(stats.avgResponseMsAi).toBe(500);
  });

  it("excludes logs from before the requested window and from other clinics", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    const otherClinic = await createTestClinicWithDoctor();

    await recordMessageLog({ clinicId: otherClinic.clinic.id, platform: "TELEGRAM", resolution: "AI", responseMs: 10 });
    await prisma.messageLog.create({
      data: {
        clinicId: clinic.id,
        platform: "TELEGRAM",
        resolution: "AI",
        responseMs: 10,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60),
      },
    });
    await recordMessageLog({ clinicId: clinic.id, platform: "TELEGRAM", resolution: "FAQ", responseMs: 10 });

    const stats = await getAiUsageStats(clinic.id, new Date(Date.now() - 1000 * 60 * 60 * 24 * 30));
    expect(stats.totalMessages).toBe(1);
    expect(stats.faqCount).toBe(1);
  });

  it("returns null averages when there is no data yet", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    const stats = await getAiUsageStats(clinic.id, new Date(0));
    expect(stats.avgResponseMsFaq).toBeNull();
    expect(stats.avgResponseMsAi).toBeNull();
  });

  it("counts AI_ERROR logs toward aiCount/aiErrorCount for the usage dashboard", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    await recordMessageLog({ clinicId: clinic.id, platform: "TELEGRAM", resolution: "AI_ERROR", responseMs: 20000 });
    const stats = await getAiUsageStats(clinic.id, new Date(0));
    expect(stats.aiCount).toBe(1);
    expect(stats.aiErrorCount).toBe(1);
  });
});

describe("getAiHealthStatus", () => {
  it("returns unknown when there is no recent AI-path traffic", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    expect(await getAiHealthStatus(clinic.id)).toBe("unknown");
  });

  it("returns healthy when recent AI attempts mostly succeeded", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    await recordMessageLog({ clinicId: clinic.id, platform: "TELEGRAM", resolution: "AI", responseMs: 500 });
    await recordMessageLog({ clinicId: clinic.id, platform: "TELEGRAM", resolution: "AI", responseMs: 500 });
    await recordMessageLog({ clinicId: clinic.id, platform: "TELEGRAM", resolution: "AI_ERROR", responseMs: 500 });
    expect(await getAiHealthStatus(clinic.id)).toBe("healthy");
  });

  it("returns degraded when most recent AI attempts failed", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    await recordMessageLog({ clinicId: clinic.id, platform: "TELEGRAM", resolution: "AI_ERROR", responseMs: 500 });
    await recordMessageLog({ clinicId: clinic.id, platform: "TELEGRAM", resolution: "AI_ERROR", responseMs: 500 });
    await recordMessageLog({ clinicId: clinic.id, platform: "TELEGRAM", resolution: "AI", responseMs: 500 });
    expect(await getAiHealthStatus(clinic.id)).toBe("degraded");
  });

  it("ignores AI-path logs from outside the requested time window", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    const { prisma } = await import("@/lib/prisma");
    await prisma.messageLog.create({
      data: {
        clinicId: clinic.id,
        platform: "TELEGRAM",
        resolution: "AI_ERROR",
        responseMs: 500,
        createdAt: new Date(Date.now() - 60 * 60_000),
      },
    });
    expect(await getAiHealthStatus(clinic.id, 30)).toBe("unknown");
  });
});
