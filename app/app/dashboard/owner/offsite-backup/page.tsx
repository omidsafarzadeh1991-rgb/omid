import { requireOwner } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import OffsiteBackupForm from "./OffsiteBackupForm";
import OffsiteBackupActions from "./OffsiteBackupActions";

export const dynamic = "force-dynamic";

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium text-slate-900">{value}</dd>
    </div>
  );
}

export default async function OffsiteBackupPage() {
  const session = await requireOwner();
  const destination = await prisma.backupDestination.findUnique({
    where: { clinicId: session.clinicId },
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <div>
        <h1 className="text-xl font-bold text-slate-900">بک‌آپ آفسایت (خارج از این کامپیوتر)</h1>
        <p className="mt-1 text-sm text-slate-500">
          علاوه بر بک‌آپ محلی، می‌توانید یک نسخهٔ رمزنگاری‌شده از دیتابیس را هر روز به‌صورت خودکار
          به یک مقصد بیرونی هم ارسال کنید - برای وقتی که خودِ کامپیوتر کلینیک دچار مشکل شود (خرابی،
          سرقت، آتش‌سوزی). این قابلیت کاملاً اختیاری است و تا وقتی خودتان روشنش نکنید، غیرفعال
          می‌ماند.
        </p>
      </div>

      <section className="card animate-in p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">وضعیت فعلی</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <StatusItem label="وضعیت" value={destination?.enabled ? "فعال" : "غیرفعال"} />
          <StatusItem label="مقصد" value={destination?.type ?? "تنظیم نشده"} />
          <StatusItem
            label="آخرین اجرا"
            value={
              destination?.lastRunAt
                ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(
                    destination.lastRunAt
                  )
                : "هنوز اجرا نشده"
            }
          />
          <StatusItem
            label="نتیجهٔ آخرین اجرا"
            value={
              destination?.lastRunOk === true ? "موفق" : destination?.lastRunOk === false ? "ناموفق" : "—"
            }
          />
        </dl>
        {destination?.lastRunOk === false && destination.lastRunError && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            آخرین بک‌آپ آفسایت ناموفق بود: {destination.lastRunError} نسخهٔ رمزنگاری‌شده روی همین
            کامپیوتر (پوشهٔ <code dir="ltr">backups/offsite</code>) نگه داشته شده تا وقتی مشکل مقصد
            برطرف شود.
          </p>
        )}
        {destination && (
          <div className="mt-4">
            <OffsiteBackupActions />
          </div>
        )}
      </section>

      <section className="card animate-in p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">تنظیمات مقصد</h2>
        <OffsiteBackupForm
          existing={{
            type: destination?.type ?? null,
            enabled: destination?.enabled ?? false,
            scheduleHour: destination?.scheduleHour ?? 2,
            retentionDays: destination?.retentionDays ?? 30,
            s3Endpoint: destination?.s3Endpoint ?? null,
            s3Bucket: destination?.s3Bucket ?? null,
            s3Region: destination?.s3Region ?? null,
            hasS3Credentials: !!destination?.encryptedS3AccessKey,
            sftpHost: destination?.sftpHost ?? null,
            sftpPort: destination?.sftpPort ?? null,
            sftpUsername: destination?.sftpUsername ?? null,
            sftpRemotePath: destination?.sftpRemotePath ?? null,
            hasSftpCredentials: !!destination?.encryptedSftpPassword,
          }}
        />
      </section>
    </main>
  );
}
