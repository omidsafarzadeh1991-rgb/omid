import fs from "node:fs";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import type { BackupDestinationAdapter, RemoteBackup } from "@/lib/backup-destinations/types";

export type S3Config = {
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
};

const REMOTE_PREFIX = "clinic-backups/";

/**
 * Works with any S3-compatible provider (Wasabi, Backblaze B2, self-hosted
 * MinIO), not just AWS - forcePathStyle is required for most non-AWS
 * providers since they don't support the bucket-as-subdomain addressing AWS
 * defaults to.
 */
export function createS3Destination(config: S3Config): BackupDestinationAdapter {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region || "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return {
    async upload(localPath, remoteName) {
      const body = fs.createReadStream(localPath);
      const { size } = fs.statSync(localPath);
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: REMOTE_PREFIX + remoteName,
          Body: body,
          ContentLength: size,
        }),
      );
    },

    async list(): Promise<RemoteBackup[]> {
      const result = await client.send(
        new ListObjectsV2Command({ Bucket: config.bucket, Prefix: REMOTE_PREFIX }),
      );
      return (result.Contents ?? [])
        .filter((obj) => obj.Key)
        .map((obj) => ({
          remoteName: obj.Key!.slice(REMOTE_PREFIX.length),
          sizeBytes: obj.Size ?? 0,
          modifiedAt: obj.LastModified ?? new Date(0),
        }));
    },

    async remove(remoteName) {
      await client.send(
        new DeleteObjectCommand({ Bucket: config.bucket, Key: REMOTE_PREFIX + remoteName }),
      );
    },

    async download(remoteName, localPath) {
      const result = await client.send(
        new GetObjectCommand({ Bucket: config.bucket, Key: REMOTE_PREFIX + remoteName }),
      );
      if (!result.Body) {
        throw new Error("پاسخ S3 بدون محتوا بود.");
      }
      const output = fs.createWriteStream(localPath);
      await new Promise<void>((resolve, reject) => {
        output.on("error", reject);
        output.on("finish", () => resolve());
        (result.Body as NodeJS.ReadableStream).pipe(output);
      });
    },
  };
}
