import "server-only";
import { decryptSecret } from "@/lib/crypto";
import { createS3Destination } from "@/lib/backup-destinations/s3";
import { createSftpDestination } from "@/lib/backup-destinations/sftp";
import type { BackupDestinationAdapter } from "@/lib/backup-destinations/types";
import type { BackupDestination } from "@/generated/prisma/client";

export type { BackupDestinationAdapter, RemoteBackup } from "@/lib/backup-destinations/types";

/** Builds the right adapter from a saved BackupDestination row, decrypting its credentials. */
export function resolveBackupDestination(row: BackupDestination): BackupDestinationAdapter | null {
  if (row.type === "S3") {
    if (!row.s3Endpoint || !row.s3Bucket || !row.encryptedS3AccessKey || !row.encryptedS3SecretKey) {
      return null;
    }
    return createS3Destination({
      endpoint: row.s3Endpoint,
      bucket: row.s3Bucket,
      region: row.s3Region ?? "us-east-1",
      accessKeyId: decryptSecret(row.encryptedS3AccessKey),
      secretAccessKey: decryptSecret(row.encryptedS3SecretKey),
    });
  }

  if (row.type === "SFTP") {
    if (!row.sftpHost || !row.sftpUsername || !row.encryptedSftpPassword || !row.sftpRemotePath) {
      return null;
    }
    return createSftpDestination({
      host: row.sftpHost,
      port: row.sftpPort ?? 22,
      username: row.sftpUsername,
      password: decryptSecret(row.encryptedSftpPassword),
      remotePath: row.sftpRemotePath,
    });
  }

  return null;
}
