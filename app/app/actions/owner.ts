"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/dal";
import { createBackup, pruneOldBackups } from "@/lib/backup";
import { logSecurityEvent } from "@/lib/security-log";

export type CreateBackupResult = { message?: string; success?: string } | undefined;

export async function createBackupAction(
  _prevState: CreateBackupResult,
  _formData: FormData
): Promise<CreateBackupResult> {
  const session = await requireOwner();

  try {
    const backup = await createBackup();
    pruneOldBackups(7);
    await logSecurityEvent(session.clinicId, "BACKUP_CREATED", backup.fileName, session.staffId);
    revalidatePath("/dashboard/owner");
    return { success: `بک‌آپ «${backup.fileName}» با موفقیت ساخته شد.` };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "ساخت بک‌آپ ناموفق بود." };
  }
}
