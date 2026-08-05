import "server-only";
import fs from "node:fs";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * The backup FILE itself is encrypted with its own dedicated key (separate
 * from the destination credentials) - generated once per clinic, then
 * stored encrypted at rest using the same app-level master key as bot
 * tokens (lib/crypto.ts). No native OS keystore involved: see the note in
 * lib/backup-offsite.ts for why that was deliberately not used here.
 */
export async function getOrCreateBackupFileKey(clinicId: string): Promise<Buffer> {
  const existing = await prisma.backupDestination.findUnique({ where: { clinicId } });
  if (existing?.encryptedFileKey) {
    return Buffer.from(decryptSecret(existing.encryptedFileKey), "base64");
  }

  const rawKey = randomBytes(32);
  const encryptedFileKey = encryptSecret(rawKey.toString("base64"));
  await prisma.backupDestination.upsert({
    where: { clinicId },
    create: { clinicId, encryptedFileKey },
    update: { encryptedFileKey },
  });
  return rawKey;
}

/**
 * Streams srcPath through AES-256-GCM into destPath, so the ~hundreds-of-MB
 * database backup is never held fully in memory. Layout: [12-byte IV]
 * [ciphertext][16-byte auth tag] - the tag has to go last because GCM only
 * produces it after the whole stream has been consumed.
 */
export async function encryptFileStream(srcPath: string, destPath: string, key: Buffer): Promise<void> {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const output = fs.createWriteStream(destPath);

  await new Promise<void>((resolve, reject) => {
    output.on("error", reject);
    output.write(iv, (err) => {
      if (err) return reject(err);

      const source = fs.createReadStream(srcPath);
      source.on("error", reject);
      cipher.on("error", reject);
      source.pipe(cipher).pipe(output, { end: false });

      cipher.on("end", () => {
        const authTag = cipher.getAuthTag();
        output.end(authTag, () => resolve());
      });
    });
  });
}

/**
 * Reverses encryptFileStream. The auth tag sits at the end of the file, so
 * it's read directly (16 bytes, negligible cost) before streaming the body
 * through the decipher - keeps this memory-efficient too, not just encrypt.
 */
export async function decryptFileStream(srcPath: string, destPath: string, key: Buffer): Promise<void> {
  const { size } = fs.statSync(srcPath);
  const bodyLength = size - IV_LENGTH - TAG_LENGTH;

  const fd = fs.openSync(srcPath, "r");
  try {
    const iv = Buffer.alloc(IV_LENGTH);
    fs.readSync(fd, iv, 0, IV_LENGTH, 0);
    const authTag = Buffer.alloc(TAG_LENGTH);
    fs.readSync(fd, authTag, 0, TAG_LENGTH, size - TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    if (bodyLength <= 0) {
      // Empty plaintext body (never happens for a real database backup, but
      // fs.createReadStream can't express a zero-length byte range).
      fs.writeFileSync(destPath, decipher.final());
      return;
    }

    const source = fs.createReadStream(srcPath, { start: IV_LENGTH, end: IV_LENGTH + bodyLength - 1 });
    const output = fs.createWriteStream(destPath);
    await pipeline(source, decipher, output);
  } finally {
    fs.closeSync(fd);
  }
}
