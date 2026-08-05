import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getAiUsageStats, recordMessageLog } from "@/lib/message-log";
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
});
