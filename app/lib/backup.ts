import "server-only";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";

function getBackupDir(): string {
  return process.env.BACKUP_DIR || path.join(process.cwd(), "backups");
}

function getDbFilePath(): string {
  const url = process.env.DATABASE_URL ?? "";
  const match = /^file:(.+)$/.exec(url);
  if (!match) {
    throw new Error("DATABASE_URL باید با file: شروع شود.");
  }
  return path.resolve(process.cwd(), match[1]);
}

export type BackupInfo = { fileName: string; sizeBytes: number; createdAt: Date };

/**
 * Uses SQLite's own VACUUM INTO to write a complete, consistent snapshot of
 * the live database - safe even while the app is actively reading/writing,
 * unlike a plain file copy which could grab a half-written file mid-write.
 */
export async function createBackup(): Promise<BackupInfo> {
  fs.mkdirSync(getBackupDir(), { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `backup-${timestamp}.db`;
  const destPath = path.join(getBackupDir(), fileName);

  await prisma.$executeRaw`VACUUM INTO ${destPath}`;

  const { size, mtime } = fs.statSync(destPath);
  return { fileName, sizeBytes: size, createdAt: mtime };
}

export function listBackups(): BackupInfo[] {
  if (!fs.existsSync(getBackupDir())) return [];
  return fs
    .readdirSync(getBackupDir())
    .filter((f) => f.endsWith(".db"))
    .map((f) => {
      const stat = fs.statSync(path.join(getBackupDir(), f));
      return { fileName: f, sizeBytes: stat.size, createdAt: stat.mtime };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** Deletes all but the most recent `keep` backups (oldest-first). */
export function pruneOldBackups(keep = 7): void {
  const backups = listBackups();
  for (const backup of backups.slice(keep)) {
    fs.unlinkSync(path.join(getBackupDir(), backup.fileName));
  }
}

export type SystemHealth = {
  dbSizeBytes: number;
  doctorCount: number;
  appointmentCount: number;
  upcomingAppointmentCount: number;
};

export async function getSystemHealth(clinicId: string): Promise<SystemHealth> {
  const dbPath = getDbFilePath();
  const dbSizeBytes = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;

  const [doctorCount, appointmentCount, upcomingAppointmentCount] = await Promise.all([
    prisma.doctor.count({ where: { clinicId } }),
    prisma.appointment.count({ where: { clinicId } }),
    prisma.appointment.count({ where: { clinicId, startTime: { gte: new Date() } } }),
  ]);

  return { dbSizeBytes, doctorCount, appointmentCount, upcomingAppointmentCount };
}
