/**
 * اسکریپت بازیابی از آخرین بک‌آپ آفسایت (خارج از این کامپیوتر).
 *
 * فقط دستی و مستقیم روی همان کامپیوتر نصب اجرا می‌شود، نه از داخل پنل -
 * چون جایگزین‌کردن فایل دیتابیس درحالی‌که برنامه (یا سرویس ویندوزی‌اش) باز
 * است و در حالت WAL به آن می‌نویسد/از آن می‌خواند امن نیست. قبل از اجرا،
 * برنامه و سرویس ویندوزی‌اش (در صورت وجود) را کاملاً متوقف کنید.
 *
 * عمداً از Prisma Client استفاده نمی‌کند (خروجی نسل جدید Prisma، فایل
 * TypeScript خام است که بدون tsx/کامپایل قابل اجرا نیست) و منطق رمزگشایی
 * lib/backup-crypto.ts و lib/backup-destinations/*.ts را دوباره اینجا با
 * require ساده می‌نویسد - همان الگوی scripts/recover-owner.js.
 *
 * اجرا: node scripts/restore-offsite-backup.js [مسیر فایل خروجی اختیاری]
 */
require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const readline = require("node:readline");
const Database = require("better-sqlite3");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const S3_PREFIX = "clinic-backups/";

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    })
  );
}

function getMasterKey() {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret) {
    console.error("TOKEN_ENCRYPTION_KEY در فایل .env تنظیم نشده است.");
    process.exit(1);
  }
  return crypto.scryptSync(secret, "clinic-bot-token", 32);
}

/** Mirrors lib/crypto.ts's decryptSecret() - same format, same key derivation. */
function decryptSecret(encoded) {
  const raw = Buffer.from(encoded, "base64");
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = raw.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, getMasterKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

/** Mirrors lib/backup-crypto.ts's decryptFileStream(). */
async function decryptFileStream(srcPath, destPath, key) {
  const { size } = fs.statSync(srcPath);
  const bodyLength = size - IV_LENGTH - TAG_LENGTH;
  const fd = fs.openSync(srcPath, "r");
  try {
    const iv = Buffer.alloc(IV_LENGTH);
    fs.readSync(fd, iv, 0, IV_LENGTH, 0);
    const authTag = Buffer.alloc(TAG_LENGTH);
    fs.readSync(fd, authTag, 0, TAG_LENGTH, size - TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    if (bodyLength <= 0) {
      fs.writeFileSync(destPath, decipher.final());
      return;
    }

    await new Promise((resolve, reject) => {
      const source = fs.createReadStream(srcPath, { start: IV_LENGTH, end: IV_LENGTH + bodyLength - 1 });
      const output = fs.createWriteStream(destPath);
      source.on("error", reject);
      decipher.on("error", reject);
      output.on("error", reject);
      output.on("finish", resolve);
      source.pipe(decipher).pipe(output);
    });
  } finally {
    fs.closeSync(fd);
  }
}

function resolveDbPath() {
  const url = process.env.DATABASE_URL || "";
  const match = /^file:(.+)$/.exec(url);
  if (!match) {
    console.error("DATABASE_URL در فایل .env تنظیم نشده یا نامعتبر است؛ این اسکریپت باید داخل پوشهٔ برنامه اجرا شود.");
    process.exit(1);
  }
  return path.resolve(process.cwd(), match[1]);
}

async function downloadLatestFromS3(destination, localPath) {
  const { S3Client, ListObjectsV2Command, GetObjectCommand } = require("@aws-sdk/client-s3");
  const client = new S3Client({
    endpoint: destination.s3Endpoint,
    region: destination.s3Region || "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: decryptSecret(destination.encryptedS3AccessKey),
      secretAccessKey: decryptSecret(destination.encryptedS3SecretKey),
    },
  });

  const listing = await client.send(
    new ListObjectsV2Command({ Bucket: destination.s3Bucket, Prefix: S3_PREFIX })
  );
  const objects = (listing.Contents || []).filter((o) => o.Key);
  if (objects.length === 0) {
    console.error("هیچ بک‌آپی در مقصد S3 پیدا نشد.");
    process.exit(1);
  }
  objects.sort((a, b) => new Date(b.LastModified).getTime() - new Date(a.LastModified).getTime());
  const latest = objects[0];
  console.log(`جدیدترین بک‌آپ پیدا شد: ${latest.Key.slice(S3_PREFIX.length)} (${latest.LastModified})`);

  const result = await client.send(
    new GetObjectCommand({ Bucket: destination.s3Bucket, Key: latest.Key })
  );
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(localPath);
    output.on("finish", resolve);
    output.on("error", reject);
    result.Body.pipe(output);
  });
}

async function downloadLatestFromSftp(destination, localPath) {
  const SftpClient = require("ssh2-sftp-client");
  const client = new SftpClient();
  await client.connect({
    host: destination.sftpHost,
    port: destination.sftpPort || 22,
    username: destination.sftpUsername,
    password: decryptSecret(destination.encryptedSftpPassword),
  });

  try {
    const entries = await client.list(destination.sftpRemotePath);
    const files = entries.filter((e) => e.type === "-");
    if (files.length === 0) {
      console.error("هیچ بک‌آپی در مسیر SFTP پیدا نشد.");
      process.exit(1);
    }
    files.sort((a, b) => b.modifyTime - a.modifyTime);
    const latest = files[0];
    console.log(`جدیدترین بک‌آپ پیدا شد: ${latest.name}`);
    const remotePath = `${destination.sftpRemotePath.replace(/\/+$/, "")}/${latest.name}`;
    await client.fastGet(remotePath, localPath);
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function main() {
  console.log("این اسکریپت آخرین بک‌آپ آفسایت را دانلود و رمزگشایی می‌کند.");
  console.log("⚠️  قبل از جایگزین‌کردن فایل دیتابیس واقعی، برنامه و سرویس ویندوزی‌اش را کاملاً متوقف کنید.");
  console.log("");

  const db = new Database(resolveDbPath(), { readonly: true });
  const destination = db.prepare("SELECT * FROM BackupDestination LIMIT 1").get();
  db.close();

  if (!destination || !destination.type) {
    console.error("هیچ تنظیمات بک‌آپ آفسایتی در پنل ذخیره نشده است.");
    process.exit(1);
  }
  if (!destination.encryptedFileKey) {
    console.error("کلید رمزگشایی فایل بک‌آپ پیدا نشد؛ رمزگشایی ممکن نیست.");
    process.exit(1);
  }

  const confirm = await ask(
    `مقصد ذخیره‌شده: ${destination.type}. برای دانلود و رمزگشایی آخرین نسخه، دقیقاً بنویسید "بله" و Enter بزنید: `
  );
  if (confirm !== "بله") {
    console.log("لغو شد؛ هیچ فایلی دانلود نشد.");
    process.exit(0);
  }

  const workDir = path.join(process.cwd(), "backups", "restore-tmp");
  fs.mkdirSync(workDir, { recursive: true });
  const encryptedPath = path.join(workDir, `downloaded-${Date.now()}.enc`);

  if (destination.type === "S3") {
    await downloadLatestFromS3(destination, encryptedPath);
  } else {
    await downloadLatestFromSftp(destination, encryptedPath);
  }

  const fileKey = Buffer.from(decryptSecret(destination.encryptedFileKey), "base64");
  const outputArg = process.argv[2];
  const outputPath = outputArg
    ? path.resolve(process.cwd(), outputArg)
    : path.join(process.cwd(), `restored-backup-${Date.now()}.db`);

  await decryptFileStream(encryptedPath, outputPath, fileKey);
  fs.unlinkSync(encryptedPath);

  console.log("");
  console.log(`بازیابی کامل شد. فایل دیتابیسِ بازیابی‌شده اینجاست: ${outputPath}`);
  console.log("برای استفاده از آن:");
  console.log("  ۱. مطمئن شوید برنامه و سرویس ویندوزی‌اش کاملاً متوقف است.");
  console.log("  ۲. فایل دیتابیس فعلی (مسیر DATABASE_URL در .env) را برای احتیاط جای دیگری منتقل کنید.");
  console.log("  ۳. فایل بازیابی‌شده را به‌جای آن کپی و هم‌نام آن کنید.");
  console.log("  ۴. برنامه/سرویس را دوباره اجرا کنید.");
}

main().catch((error) => {
  console.error("خطا:", error);
  process.exit(1);
});
