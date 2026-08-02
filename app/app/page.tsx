import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 text-center">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-slate-900">
          سامانهٔ نوبت‌دهی کلینیک
        </h1>
        <p className="text-slate-600">
          مدیریت نوبت‌های کلینیک شما، بدون تداخل و از هر کانالی.
        </p>
      </div>
      <Link
        href="/login"
        className="rounded-lg bg-teal-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-teal-700"
      >
        ورود به پنل کلینیک
      </Link>
      <Link href="/superadmin/login" className="text-xs text-slate-400 hover:underline">
        ورود مدیر کل سامانه
      </Link>
    </main>
  );
}
