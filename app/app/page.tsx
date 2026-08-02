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
      <div className="flex gap-4">
        <Link
          href="/register"
          className="rounded-lg bg-teal-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-teal-700"
        >
          ثبت‌نام کلینیک جدید
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
        >
          ورود
        </Link>
      </div>
    </main>
  );
}
