/**
 * اسکریپت بازیابی اضطراری رمز عبور «مالک سامانه» (OWNER).
 *
 * فقط برای زمانی که مالک سامانه رمزش را فراموش کرده و هیچ نقش بالاتری برای
 * ریست‌کردنش وجود ندارد (OWNER بالاترین نقش است). این اسکریپت باید مستقیم
 * روی همان کامپیوتری که نرم‌افزار رویش نصب است اجرا شود - یعنی هرکسی که
 * این را اجرا می‌کند، از قبل به فایل‌های همان کامپیوتر دسترسی دارد (همان
 * سطح دسترسی که برای دستکاری مستقیم فایل دیتابیس هم لازم بود)، پس این
 * اسکریپت راه دسترسی جدیدی باز نمی‌کند - فقط همان کار را ایمن و درست انجام
 * می‌دهد.
 *
 * عمداً از Prisma Client استفاده نمی‌کند (خروجی نسل جدید Prisma، فایل
 * TypeScript خام است که بدون tsx/کامپایل قابل اجرا نیست - نامناسب برای یک
 * ابزار اضطراری). به‌جایش مستقیم و فقط با better-sqlite3 (که از قبل نصب
 * است) به فایل دیتابیس وصل می‌شود - بدون نیاز به هیچ ابزار اضافه.
 *
 * اجرا: node scripts/recover-owner.js  (یا دوبار کلیک روی
 * بازیابی-اضطراری-مالک.bat در همین پوشه)
 */
require("dotenv").config();
const readline = require("node:readline");
const crypto = require("node:crypto");
const path = require("node:path");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => {
    rl.close();
    resolve(answer.trim());
  }));
}

function randomTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(crypto.randomFillSync(new Uint8Array(10)))
    .map((b) => chars[b % chars.length])
    .join("");
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

async function main() {
  const db = new Database(resolveDbPath());

  const owner = db.prepare("SELECT * FROM StaffUser WHERE role = 'OWNER' LIMIT 1").get();
  if (!owner) {
    console.error("هیچ کاربر با نقش «مالک سامانه» پیدا نشد.");
    process.exit(1);
  }

  console.log(`مالک سامانه پیدا شد: ${owner.firstName} (نام‌کاربری: ${owner.username})`);
  const confirm = await ask('این عملیات رمز عبور مالک سامانه را ریست می‌کند. برای ادامه دقیقاً بنویسید "بله" و Enter بزنید: ');
  if (confirm !== "بله") {
    console.log("لغو شد؛ هیچ تغییری اعمال نشد.");
    process.exit(0);
  }

  const tempPassword = randomTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  db.prepare(
    "UPDATE StaffUser SET passwordHash = ?, mustChangePassword = 1, failedLoginCount = 0, active = 1 WHERE id = ?"
  ).run(passwordHash, owner.id);

  db.prepare(
    "INSERT INTO SecurityLog (id, clinicId, event, detail, createdAt) VALUES (?, ?, 'OWNER_PASSWORD_RECOVERED', ?, ?)"
  ).run(
    crypto.randomUUID(),
    owner.clinicId,
    "بازیابی اضطراری از طریق scripts/recover-owner.js (اجرا مستقیم روی کامپیوتر نصب)",
    new Date().toISOString()
  );

  console.log("");
  console.log("رمز عبور موقت جدید ساخته شد. همین الان با این اطلاعات وارد شوید:");
  console.log(`  نام‌کاربری: ${owner.username}`);
  console.log(`  رمز موقت: ${tempPassword}`);
  console.log("بعد از ورود، بلافاصله از شما خواسته می‌شود رمز را خودتان عوض کنید.");

  db.close();
}

main().catch((error) => {
  console.error("خطا:", error);
  process.exit(1);
});
