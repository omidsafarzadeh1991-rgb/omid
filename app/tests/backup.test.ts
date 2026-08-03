import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createBackup, listBackups, pruneOldBackups } from "@/lib/backup";

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
