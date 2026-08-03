import { requireOwner } from "@/lib/dal";
import { listSecurityLog } from "@/lib/security-log";
import { listBackups, getSystemHealth } from "@/lib/backup";
import BackupButton from "./BackupButton";

export const dynamic = "force-dynamic";

const EVENT_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: "ورود موفق",
  LOGIN_FAILED: "تلاش ورود ناموفق",
  BOT_TOKEN_UPDATED: "تغییر توکن بات",
  SMS_SETTINGS_UPDATED: "تغییر تنظیمات پیامک",
  BACKUP_CREATED: "ساخت بک‌آپ",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} بایت`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} کیلوبایت`;
  return `${(kb / 1024).toFixed(1)} مگابایت`;
}

export default async function OwnerPage() {
  const session = await requireOwner();

  const [logs, backups, health] = await Promise.all([
    listSecurityLog(session.clinicId, 30),
    Promise.resolve(listBackups()),
    getSystemHealth(session.clinicId),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10">
      <div>
        <h1 className="text-xl font-bold text-slate-900">امنیت و بک‌آپ</h1>
        <p className="mt-1 text-sm text-slate-500">
          این صفحه فقط برای مالک سامانه قابل‌مشاهده است.
        </p>
      </div>

      <section className="card animate-in p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">سلامت سیستم</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{formatBytes(health.dbSizeBytes)}</p>
            <p className="mt-1 text-xs text-slate-500">حجم دیتابیس</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{health.doctorCount}</p>
            <p className="mt-1 text-xs text-slate-500">پزشکان</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{health.appointmentCount}</p>
            <p className="mt-1 text-xs text-slate-500">مجموع نوبت‌ها</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{health.upcomingAppointmentCount}</p>
            <p className="mt-1 text-xs text-slate-500">نوبت‌های پیش‌رو</p>
          </div>
        </div>
      </section>

      <section className="card animate-in p-6">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">بک‌آپ دیتابیس</h2>
        <p className="mb-4 text-xs text-slate-500">
          هر بک‌آپ یک کپی کامل و سالم از کل دیتابیس در پوشهٔ <code dir="ltr">backups</code> کنار
          برنامه می‌سازد. فقط ۷ نسخهٔ آخر نگه داشته می‌شود.
        </p>
        <BackupButton />
        {backups.length > 0 && (
          <ul className="mt-4 divide-y divide-slate-100">
            {backups.map((backup) => (
              <li key={backup.fileName} className="flex items-center justify-between py-2 text-sm">
                <span dir="ltr" className="text-slate-700">
                  {backup.fileName}
                </span>
                <span className="text-xs text-slate-400">
                  {formatBytes(backup.sizeBytes)} ·{" "}
                  {new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(
                    backup.createdAt
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card animate-in p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">لاگ امنیتی</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-slate-500">هنوز رویدادی ثبت نشده است.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {logs.map((log) => (
              <li key={log.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="font-medium text-slate-800">
                    {EVENT_LABELS[log.event] ?? log.event}
                  </span>
                  {log.detail && <span className="mr-2 text-xs text-slate-500">{log.detail}</span>}
                  {log.actorStaff && (
                    <span className="mr-2 text-xs text-slate-400">— {log.actorStaff.firstName}</span>
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  {new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(
                    log.createdAt
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
