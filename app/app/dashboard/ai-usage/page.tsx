import { redirect } from "next/navigation";
import { requireSession } from "@/lib/dal";
import { canManageClinic } from "@/lib/roles";
import { getAiUsageStats } from "@/lib/message-log";
import { formatToman } from "@/lib/format";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60_000);
}

function percent(part: number, total: number): string {
  if (total === 0) return "—";
  return `${Math.round((part / total) * 100)}٪`;
}

export default async function AiUsagePage() {
  const session = await requireSession();
  if (!canManageClinic(session.role)) {
    redirect("/dashboard");
  }

  const [today, last30Days] = await Promise.all([
    getAiUsageStats(session.clinicId, startOfToday()),
    getAiUsageStats(session.clinicId, daysAgo(30)),
  ]);

  const costPer1kTokensToman = Number(process.env.AI_COST_PER_1K_TOKENS_TOMAN);
  const hasCostRate = Number.isFinite(costPer1kTokensToman) && costPer1kTokensToman > 0;
  const totalTokens30d = last30Days.totalPromptTokens + last30Days.totalCompletionTokens;
  const estimatedCost30d = hasCostRate ? Math.round((totalTokens30d / 1000) * costPer1kTokensToman) : null;

  const todayStats = [
    { label: "پیام‌های امروز", value: today.totalMessages },
    { label: "پاسخ رایگان (بدون AI)", value: today.faqCount },
    { label: "پاسخ با هوش مصنوعی", value: today.aiCount },
    { label: "سهم پاسخ رایگان", value: percent(today.faqCount, today.totalMessages) },
  ];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10">
      <div>
        <p className="eyebrow mb-1">هزینهٔ هوش مصنوعی</p>
        <h1 className="text-xl font-bold text-slate-900">آمار مصرف بات هوشمند</h1>
        <p className="mt-1 text-sm text-slate-500">
          هر پیام یا از «مرکز دانش» (رایگان، بدون هوش مصنوعی) جواب می‌گیرد یا از هوش مصنوعی
          (هزینه‌بر). این صفحه نشان می‌دهد چه سهمی رایگان جواب داده می‌شود؛ هرچه این سهم
          بیشتر باشد، هزینهٔ ماهانه‌تان کمتر است.
        </p>
      </div>

      <section className="surface animate-in p-7">
        <h2 className="mb-5 text-lg font-bold text-slate-900">امروز</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {todayStats.map((stat, i) => (
            <div key={stat.label} className="surface surface-hover p-5" style={{ animationDelay: `${0.05 * i}s` }}>
              <p className="stat-value stat-compact">{stat.value}</p>
              <p className="eyebrow mt-2">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="surface animate-in p-7">
        <h2 className="mb-5 text-lg font-bold text-slate-900">۳۰ روز اخیر</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="surface surface-hover p-5">
            <p className="stat-value stat-compact">{last30Days.totalMessages}</p>
            <p className="eyebrow mt-2">کل پیام‌ها</p>
          </div>
          <div className="surface surface-hover p-5">
            <p className="stat-value stat-compact">{percent(last30Days.faqCount, last30Days.totalMessages)}</p>
            <p className="eyebrow mt-2">سهم پاسخ رایگان</p>
          </div>
          <div className="surface surface-hover p-5">
            <p className="stat-value stat-compact">{totalTokens30d.toLocaleString("fa-IR")}</p>
            <p className="eyebrow mt-2">مجموع توکن مصرفی AI</p>
          </div>
        </div>
        {hasCostRate ? (
          <p className="mt-4 text-sm text-slate-500">
            تخمین هزینهٔ ۳۰ روز اخیر بر اساس نرخی که در تنظیمات وارد کرده‌اید:{" "}
            <strong className="text-slate-700">{formatToman(estimatedCost30d!)}</strong>
          </p>
        ) : (
          <p className="mt-4 text-xs text-slate-400">
            برای دیدن تخمین هزینه به تومان، مقدار <code dir="ltr">AI_COST_PER_1K_TOKENS_TOMAN</code> را
            در فایل <code dir="ltr">.env</code> بر اساس نرخ هر ۱۰۰۰ توکنِ مدلی که استفاده می‌کنید وارد کنید.
          </p>
        )}
      </section>

      <section className="surface animate-in p-7 text-sm text-slate-500">
        برای کاهش هزینه: به «مرکز دانش» بروید و سوالاتی که زیاد به هوش مصنوعی می‌رسند را به‌عنوان
        FAQ ثابت اضافه کنید — از آن به بعد همان سوال رایگان و فوری جواب داده می‌شود.
      </section>
    </main>
  );
}
