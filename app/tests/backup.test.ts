import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createBackup, listBackups, pruneOldBackups, runDailyBackupIfDue } from "@/lib/backup";
import { prisma } from "@/lib/prisma";
import { createTestClinicWithDoctor } from "./helpers";

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "backup-test-"));
  process.env.BACKUP_DIR = tempDir;
});

afterEach(() => {
  delete process.env.BACKUP_DIR;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("createBackup / listBackups / pruneOldBackups", () => {
  it("creates a valid, non-empty snapshot file", async () => {
    const backup = await createBackup();
    expect(backup.sizeBytes).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(tempDir, backup.fileName))).toBe(true);
  });

  it("lists backups newest first", async () => {
    const first = await createBackup();
    await new Promise((resolve) => setTimeout(resolve, 10));
    const second = await createBackup();

    const backups = listBackups();
    expect(backups.map((b) => b.fileName)).toEqual([second.fileName, first.fileName]);
  });

  it("keeps only the newest N backups after pruning", async () => {
    for (let i = 0; i < 5; i++) {
      await createBackup();
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    pruneOldBackups(2);

    expect(listBackups()).toHaveLength(2);
  });
});

describe("runDailyBackupIfDue", () => {
  it("creates a backup when none exist yet", async () => {
    await runDailyBackupIfDue();
    expect(listBackups()).toHaveLength(1);
  });

  it("does not create a new backup when the most recent one is under 24h old", async () => {
    await createBackup();
    await runDailyBackupIfDue();
    expect(listBackups()).toHaveLength(1);
  });

  it("creates a new backup, prunes, and logs a security event when the most recent backup is over 24h old", async () => {
    await createTestClinicWithDoctor();

    const stale = await createBackup();
    const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const stalePath = path.join(tempDir, stale.fileName);
    fs.utimesSync(stalePath, staleDate, staleDate);

    const logCountBefore = await prisma.securityLog.count({ where: { event: "BACKUP_CREATED" } });

    await runDailyBackupIfDue();

    const backups = listBackups();
    expect(backups).toHaveLength(2);

    const logCountAfter = await prisma.securityLog.count({ where: { event: "BACKUP_CREATED" } });
    expect(logCountAfter).toBe(logCountBefore + 1);

    const log = await prisma.securityLog.findFirst({
      where: { event: "BACKUP_CREATED" },
      orderBy: { createdAt: "desc" },
    });
    expect(log?.detail).toContain("خودکار روزانه");
  });
});
