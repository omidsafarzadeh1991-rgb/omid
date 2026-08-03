import "server-only";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "staff");
const MAX_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export type AvatarUploadResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

/** Saves an uploaded profile picture to disk and returns its public URL. */
export async function saveStaffAvatar(file: File): Promise<AvatarUploadResult> {
  if (file.size > MAX_SIZE_BYTES) {
    return { ok: false, message: "حجم عکس نباید بیشتر از ۲ مگابایت باشد." };
  }

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return { ok: false, message: "فرمت عکس باید PNG، JPG یا WEBP باشد." };
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const fileName = `${randomBytes(16).toString("hex")}.${extension}`;
  const destPath = path.join(UPLOAD_DIR, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(destPath, buffer);

  return { ok: true, url: `/uploads/staff/${fileName}` };
}
