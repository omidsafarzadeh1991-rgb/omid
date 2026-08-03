import { describe, expect, it } from "vitest";
import { logSecurityEvent, listSecurityLog } from "@/lib/security-log";
import { createTestClinicWithDoctor } from "./helpers";

describe("security log", () => {
  it("records events append-only, newest first", async () => {
    const { clinic } = await createTestClinicWithDoctor();

    await logSecurityEvent(clinic.id, "LOGIN_SUCCESS", "owner@example.com");
    await logSecurityEvent(clinic.id, "BOT_TOKEN_UPDATED", "TELEGRAM: ••••1234");

    const logs = await listSecurityLog(clinic.id, 10);
    expect(logs).toHaveLength(2);
    expect(logs[0].event).toBe("BOT_TOKEN_UPDATED");
    expect(logs[1].event).toBe("LOGIN_SUCCESS");
  });

  it("scopes entries to the given clinic only", async () => {
    const { clinic: clinicA } = await createTestClinicWithDoctor();
    const { clinic: clinicB } = await createTestClinicWithDoctor();

    await logSecurityEvent(clinicA.id, "LOGIN_SUCCESS");
    await logSecurityEvent(clinicB.id, "LOGIN_FAILED");

    const logsA = await listSecurityLog(clinicA.id, 10);
    expect(logsA).toHaveLength(1);
    expect(logsA[0].event).toBe("LOGIN_SUCCESS");
  });
});
