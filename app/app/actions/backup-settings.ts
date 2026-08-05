"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
import { logSecurityEvent } from "@/lib/security-log";
import { isRateLimited } from "@/lib/rate-limit";
import { resolveBackupDestination } from "@/lib/backup-destinations";
import { runOffsiteBackup } from "@/lib/backup-offsite";

const SECRET_SAVE_LIMIT = 10;
const SECRET_SAVE_WINDOW_MS = 10 * 60_000;

const SaveDestinationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("S3"),
    enabled: z.boolean(),
    scheduleHour: z.coerce.number().int().min(0).max(23),
    retentionDays: z.coerce.number().int().min(1).max(365),
    s3Endpoint: z.string().trim().min(1, "آدرس Endpoint را وارد کنید."),
    s3Bucket: z.string().trim().min(1, "نام Bucket را وارد کنید."),
    s3Region: z.string().trim().optional(),
    s3AccessKey: z.string().trim().min(1, "Access Key را وارد کنید."),
    s3SecretKey: z.string().trim().min(1, "Secret Key را وارد کنید."),
  }),
  z.object({
    type: z.literal("SFTP"),
    enabled: z.boolean(),
    scheduleHour: z.coerce.number().int().min(0).max(23),
    retentionDays: z.coerce.number().int().min(1).max(365),
    sftpHost: z.string().trim().min(1, "آدرس سرور را وارد کنید."),
    sftpPort: z.coerce.number().int().min(1).max(65535),
    sftpUsername: z.string().trim().min(1, "نام‌کاربری را وارد کنید."),
    sftpPassword: z.string().trim().min(1, "رمز عبور را وارد کنید."),
    sftpRemotePath: z.string().trim().min(1, "مسیر مقصد را وارد کنید."),
  }),
]);

export type BackupSettingsFormState = { message?: string; success?: string } | undefined;

/** OWNER-only: chooses and saves the offsite backup destination. Off by default. */
export async function saveBackupDestinationAction(
  _prevState: BackupSettingsFormState,
  formData: FormData
): Promise<BackupSettingsFormState> {
  const session = await requireOwner();
  if (isRateLimited(`save-secret:${session.staffId}`, SECRET_SAVE_LIMIT, SECRET_SAVE_WINDOW_MS)) {
    return { message: "تعداد درخواست‌ها بیش از حد مجاز است؛ چند دقیقه دیگر دوباره امتحان کنید." };
  }

  const validated = SaveDestinationSchema.safeParse({
    type: formData.get("type"),
    enabled: formData.get("enabled") === "on",
    scheduleHour: formData.get("scheduleHour"),
    retentionDays: formData.get("retentionDays"),
    s3Endpoint: formData.get("s3Endpoint") || undefined,
    s3Bucket: formData.get("s3Bucket") || undefined,
    s3Region: formData.get("s3Region") || undefined,
    s3AccessKey: formData.get("s3AccessKey") || undefined,
    s3SecretKey: formData.get("s3SecretKey") || undefined,
    sftpHost: formData.get("sftpHost") || undefined,
    sftpPort: formData.get("sftpPort") || undefined,
    sftpUsername: formData.get("sftpUsername") || undefined,
    sftpPassword: formData.get("sftpPassword") || undefined,
    sftpRemotePath: formData.get("sftpRemotePath") || undefined,
  });
  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "اطلاعات نامعتبر است." };
  }
  const data = validated.data;

  const commonData = {
    enabled: data.enabled,
    type: data.type,
    scheduleHour: data.scheduleHour,
    retentionDays: data.retentionDays,
  };

  const typeData =
    data.type === "S3"
      ? {
          s3Endpoint: data.s3Endpoint,
          s3Bucket: data.s3Bucket,
          s3Region: data.s3Region || null,
          encryptedS3AccessKey: encryptSecret(data.s3AccessKey),
          encryptedS3SecretKey: encryptSecret(data.s3SecretKey),
          sftpHost: null,
          sftpPort: null,
          sftpUsername: null,
          encryptedSftpPassword: null,
          sftpRemotePath: null,
        }
      : {
          sftpHost: data.sftpHost,
          sftpPort: data.sftpPort,
          sftpUsername: data.sftpUsername,
          encryptedSftpPassword: encryptSecret(data.sftpPassword),
          sftpRemotePath: data.sftpRemotePath,
          s3Endpoint: null,
          s3Bucket: null,
          s3Region: null,
          encryptedS3AccessKey: null,
          encryptedS3SecretKey: null,
        };

  await prisma.backupDestination.upsert({
    where: { clinicId: session.clinicId },
    create: { clinicId: session.clinicId, ...commonData, ...typeData },
    update: { ...commonData, ...typeData },
  });

  await logSecurityEvent(
    session.clinicId,
    "OFFSITE_BACKUP_SETTINGS_UPDATED",
    `مقصد: ${data.type} (${data.enabled ? "فعال" : "غیرفعال"})`,
    session.staffId
  );

  revalidatePath("/dashboard/owner/offsite-backup");
  return { success: "تنظیمات بک‌آپ آفسایت ذخیره شد." };
}

export type TestConnectionFormState = { message?: string; success?: string } | undefined;

/** Just lists the destination's existing files - a cheap way to confirm credentials/endpoint are correct without waiting for a full backup. */
export async function testBackupConnectionAction(
  _prevState: TestConnectionFormState,
  _formData: FormData
): Promise<TestConnectionFormState> {
  const session = await requireOwner();

  const destination = await prisma.backupDestination.findUnique({
    where: { clinicId: session.clinicId },
  });
  if (!destination) {
    return { message: "ابتدا تنظیمات مقصد را ذخیره کنید." };
  }
  const adapter = resolveBackupDestination(destination);
  if (!adapter) {
    return { message: "تنظیمات مقصد ناقص است." };
  }

  try {
    await adapter.list();
    return { success: "اتصال به مقصد بک‌آپ با موفقیت برقرار شد." };
  } catch (error) {
    return {
      message: `اتصال ناموفق بود: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export type RunNowFormState = { message?: string; success?: string } | undefined;

/** Manually triggers a full offsite backup run right now, instead of waiting for the scheduled hour. */
export async function runBackupNowAction(
  _prevState: RunNowFormState,
  _formData: FormData
): Promise<RunNowFormState> {
  const session = await requireOwner();
  const result = await runOffsiteBackup(session.clinicId);
  revalidatePath("/dashboard/owner/offsite-backup");

  if (result.ok) {
    return { success: `بک‌آپ آفسایت با موفقیت ارسال شد (${result.remoteName}).` };
  }
  return { message: result.error };
}
