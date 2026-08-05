import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { prisma } from "@/lib/prisma";
import { createTestClinicWithDoctor } from "./helpers";
import type { BackupDestinationAdapter, RemoteBackup } from "@/lib/backup-destinations/types";
import type { BackupDestinationType } from "@/generated/prisma/client";

const { mockResolve } = vi.hoisted(() => ({ mockResolve: vi.fn() }));

vi.mock("@/lib/backup-destinations", () => ({
  resolveBackupDestination: mockResolve,
}));

const { runOffsiteBackup, runOffsiteBackupIfDue, isOffsiteBackupDue } = await import("@/lib/backup-offsite");

type FakeAdapter = BackupDestinationAdapter & { remote: RemoteBackup[] };

function createFakeAdapter(initialRemote: RemoteBackup[] = []): FakeAdapter {
  const remote = [...initialRemote];
  return {
    remote,
    upload: vi.fn(async (localPath: string, remoteName: string) => {
      remote.push({ remoteName, sizeBytes: fs.statSync(localPath).size, modifiedAt: new Date() });
    }),
    list: vi.fn(async () => remote),
    remove: vi.fn(async (remoteName: string) => {
      const idx = remote.findIndex((r) => r.remoteName === remoteName);
      if (idx >= 0) remote.splice(idx, 1);
    }),
    download: vi.fn(async () => undefined),
  };
}

async function seedDestination(
  clinicId: string,
  overrides: Partial<{
    enabled: boolean;
    type: BackupDestinationType;
    scheduleHour: number;
    retentionDays: number;
    lastRunAt: Date | null;
  }> = {}
) {
  return prisma.backupDestination.create({
    data: {
      clinicId,
      enabled: true,
      type: "SFTP",
      scheduleHour: 2,
      retentionDays: 30,
      ...overrides,
    },
  });
}

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "backup-offsite-test-"));
  process.env.BACKUP_DIR = tempDir;
  mockResolve.mockReset();
});

afterEach(() => {
  delete process.env.BACKUP_DIR;
  fs.rmSync(tempDir, { recursive: true, force: true });
  vi.useRealTimers();
});

function offsiteDirFiles(): string[] {
  const offsiteDir = path.join(tempDir, "offsite");
  return fs.existsSync(offsiteDir) ? fs.readdirSync(offsiteDir) : [];
}

describe("runOffsiteBackup", () => {
  it("uploads an encrypted snapshot and records success, leaving no local leftovers", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    await seedDestination(clinic.id);
    const adapter = createFakeAdapter();
    mockResolve.mockReturnValue(adapter);

    const result = await runOffsiteBackup(clinic.id);

    expect(result.ok).toBe(true);
    expect(adapter.upload).toHaveBeenCalledTimes(1);

    const updated = await prisma.backupDestination.findUniqueOrThrow({ where: { clinicId: clinic.id } });
    expect(updated.lastRunOk).toBe(true);
    expect(updated.lastRunAt).not.toBeNull();
    expect(updated.lastRunError).toBeNull();

    const log = await prisma.securityLog.findFirst({
      where: { clinicId: clinic.id, event: "OFFSITE_BACKUP_SUCCEEDED" },
    });
    expect(log).not.toBeNull();

    expect(offsiteDirFiles()).toHaveLength(0);
    expect(fs.readdirSync(tempDir).filter((f) => f.endsWith(".db"))).toHaveLength(0);
  });

  it("prunes remote backups older than retentionDays but keeps recent ones", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    await seedDestination(clinic.id, { retentionDays: 10 });

    const old: RemoteBackup = {
      remoteName: "old.db.enc",
      sizeBytes: 10,
      modifiedAt: new Date(Date.now() - 20 * 24 * 60 * 60_000),
    };
    const recent: RemoteBackup = {
      remoteName: "recent.db.enc",
      sizeBytes: 10,
      modifiedAt: new Date(Date.now() - 2 * 24 * 60 * 60_000),
    };
    const adapter = createFakeAdapter([old, recent]);
    mockResolve.mockReturnValue(adapter);

    await runOffsiteBackup(clinic.id);

    const remainingNames = adapter.remote.map((r) => r.remoteName);
    expect(remainingNames).not.toContain("old.db.enc");
    expect(remainingNames).toContain("recent.db.enc");
  });

  it("keeps the encrypted file locally and logs failure when the upload fails", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    await seedDestination(clinic.id);
    const adapter = createFakeAdapter();
    adapter.upload = vi.fn(async () => {
      throw new Error("network unreachable");
    });
    mockResolve.mockReturnValue(adapter);

    const result = await runOffsiteBackup(clinic.id);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("network unreachable");
    }

    const updated = await prisma.backupDestination.findUniqueOrThrow({ where: { clinicId: clinic.id } });
    expect(updated.lastRunOk).toBe(false);
    expect(updated.lastRunError).toContain("network unreachable");

    const log = await prisma.securityLog.findFirst({
      where: { clinicId: clinic.id, event: "OFFSITE_BACKUP_FAILED" },
    });
    expect(log).not.toBeNull();

    expect(offsiteDirFiles().filter((f) => f.endsWith(".enc"))).toHaveLength(1);
    expect(fs.readdirSync(tempDir).filter((f) => f.endsWith(".db"))).toHaveLength(0);
  });

  it("fails without attempting anything when the destination is disabled", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    await seedDestination(clinic.id, { enabled: false });
    const adapter = createFakeAdapter();
    mockResolve.mockReturnValue(adapter);

    const result = await runOffsiteBackup(clinic.id);

    expect(result.ok).toBe(false);
    expect(adapter.upload).not.toHaveBeenCalled();
  });

  it("fails and logs when settings are incomplete (adapter can't be resolved)", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    await seedDestination(clinic.id);
    mockResolve.mockReturnValue(null);

    const result = await runOffsiteBackup(clinic.id);

    expect(result.ok).toBe(false);
    const log = await prisma.securityLog.findFirst({
      where: { clinicId: clinic.id, event: "OFFSITE_BACKUP_FAILED" },
    });
    expect(log).not.toBeNull();
  });
});

describe("isOffsiteBackupDue", () => {
  const now = new Date(2026, 0, 1, 5, 0, 0); // Jan 1, 2026, 05:00 local

  it("is false when there is no destination", () => {
    expect(isOffsiteBackupDue(null, now)).toBe(false);
  });

  it("is false when disabled", () => {
    expect(isOffsiteBackupDue({ enabled: false, lastRunAt: null, scheduleHour: 2 }, now)).toBe(false);
  });

  it("is false when it already ran earlier today", () => {
    const lastRunAt = new Date(2026, 0, 1, 2, 30, 0);
    expect(isOffsiteBackupDue({ enabled: true, lastRunAt, scheduleHour: 0 }, now)).toBe(false);
  });

  it("is true when the last run was on a previous day, even at the same clock hour", () => {
    const lastRunAt = new Date(2025, 11, 31, 5, 0, 0);
    expect(isOffsiteBackupDue({ enabled: true, lastRunAt, scheduleHour: 0 }, now)).toBe(true);
  });

  it("is false before the scheduled hour", () => {
    expect(isOffsiteBackupDue({ enabled: true, lastRunAt: null, scheduleHour: 23 }, now)).toBe(false);
  });

  it("is true once the scheduled hour has passed and no run happened today", () => {
    expect(isOffsiteBackupDue({ enabled: true, lastRunAt: null, scheduleHour: 2 }, now)).toBe(true);
  });

  it("is true exactly at the scheduled hour", () => {
    expect(isOffsiteBackupDue({ enabled: true, lastRunAt: null, scheduleHour: 5 }, now)).toBe(true);
  });
});

describe("runOffsiteBackupIfDue", () => {
  afterEach(() => {
    mockResolve.mockReset();
  });

  it("does not throw when no clinic exists yet", async () => {
    await expect(runOffsiteBackupIfDue()).resolves.toBeUndefined();
  });

  it("does not call the adapter for a clinic with no destination configured", async () => {
    await createTestClinicWithDoctor();
    const adapter = createFakeAdapter();
    mockResolve.mockReturnValue(adapter);

    // No BackupDestination row created for this clinic - whatever
    // prisma.clinic.findFirst() happens to return, it's either this clinic
    // (no destination -> skip) or some other pre-existing test clinic (which
    // this test file never gives an enabled+due destination), so the
    // adapter must never be invoked either way.
    await runOffsiteBackupIfDue();
    expect(adapter.upload).not.toHaveBeenCalled();
  });
});
