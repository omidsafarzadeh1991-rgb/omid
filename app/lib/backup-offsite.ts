import "server-only";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { logSecurityEvent } from "@/lib/security-log";
import { createBackup } from "@/lib/backup";
import { getOrCreateBackupFileKey, encryptFileStream } from "@/lib/backup-crypto";
import { resolveBackupDestination } from "@/lib/backup-destinations";
import type { BackupDestinationAdapter } from "@/lib/backup-destinations";

function getBackupDir(): string {
  return process.env.BACKUP_DIR || path.join(process.cwd(), "backups");
}

function getOffsiteDir(): string {
  const dir = path.join(getBackupDir(), "offsite");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function recordResult(clinicId: string, ok: boolean, error: string | null): Promise<void> {
  await prisma.backupDestination.update({
    where: { clinicId },
    data: { lastRunAt: new Date(), lastRunOk: ok, lastRunError: error },
  });
}

/** Deletes remote backups older than retentionDays. A failed prune never fails the backup run itself. */
async function pruneRemote(adapter: BackupDestinationAdapter, retentionDays: number): Promise<void> {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60_000;
  const remoteBackups = await adapter.list();
  for (const remote of remoteBackups) {
    if (remote.modifiedAt.getTime() < cutoff) {
      await adapter.remove(remote.remoteName).catch(() => undefined);
    }
  }
}

export type OffsiteBackupResult = { ok: true; remoteName: string } | { ok: false; error: string };

/**
 * Creates a fresh consistent snapshot (same VACUUM INTO mechanism as the
 * local daily backup), encrypts it, and uploads it to the clinic's chosen
 * destination. On any failure the encrypted file is kept on local disk
 * instead of being deleted - the "alarm" is lastRunOk=false, surfaced on the
 * OWNER's backup settings page and the dashboard connection-status area.
 */
export async function runOffsiteBackup(clinicId: string): Promise<OffsiteBackupResult> {
  const destination = await prisma.backupDestination.findUnique({ where: { clinicId } });
  if (!destination || !destination.enabled) {
    return { ok: false, error: "بک‌آپ آفسایت فعال نیست." };
  }

  const adapter = resolveBackupDestination(destination);
  if (!adapter) {
    const error = "تنظیمات مقصد بک‌آپ ناقص است.";
    await recordResult(clinicId, false, error);
    await logSecurityEvent(clinicId, "OFFSITE_BACKUP_FAILED", error);
    return { ok: false, error };
  }

  let plainPath: string | undefined;
  const encryptedPath = path.join(getOffsiteDir(), `pending-${Date.now()}.enc`);

  try {
    const backup = await createBackup();
    plainPath = path.join(getBackupDir(), backup.fileName);

    const key = await getOrCreateBackupFileKey(clinicId);
    await encryptFileStream(plainPath, encryptedPath, key);

    const remoteName = `${backup.fileName}.enc`;
    await adapter.upload(encryptedPath, remoteName);
    await pruneRemote(adapter, destination.retentionDays);

    fs.unlinkSync(encryptedPath);
    await recordResult(clinicId, true, null);
    await logSecurityEvent(clinicId, "OFFSITE_BACKUP_SUCCEEDED", remoteName);
    return { ok: true, remoteName };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordResult(clinicId, false, message);
    await logSecurityEvent(clinicId, "OFFSITE_BACKUP_FAILED", message);
    return { ok: false, error: message };
  } finally {
    if (plainPath && fs.existsSync(plainPath)) {
      fs.unlinkSync(plainPath);
    }
  }
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

type DueCheckInput = { enabled: boolean; lastRunAt: Date | null; scheduleHour: number } | null;

/** Pure decision logic, kept separate from the DB lookup so it's testable without any clinic ambiguity. */
export function isOffsiteBackupDue(destination: DueCheckInput, now: Date = new Date()): boolean {
  if (!destination || !destination.enabled) return false;
  if (destination.lastRunAt && isSameLocalDay(destination.lastRunAt, now)) return false;
  if (now.getHours() < destination.scheduleHour) return false;
  return true;
}

/**
 * Called periodically (see instrumentation.ts). Runs at most once per local
 * calendar day, no earlier than the OWNER-configured scheduleHour - checked
 * on the same hourly tick as the local backup job, so it fires within an
 * hour of the configured time rather than needing a real cron daemon.
 */
export async function runOffsiteBackupIfDue(): Promise<void> {
  const clinic = await prisma.clinic.findFirst({ select: { id: true } });
  if (!clinic) return;

  const destination = await prisma.backupDestination.findUnique({ where: { clinicId: clinic.id } });
  if (!isOffsiteBackupDue(destination)) return;

  await runOffsiteBackup(clinic.id);
}
