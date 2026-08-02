import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 text-center">
      <div className="animate-in space-y-3">
        <h1 className="text-3xl font-bold text-slate-900">
          سامانهٔ نوبت‌دهی کلینیک
        </h1>
        <p className="text-slate-600">
          مدیریت نوبت‌های کلینیک شما، بدون تداخل و از هر کانالی.
        </p>
      </div>
      <Link
        href="/login"
        className="btn btn-primary animate-in px-8 py-3.5 text-base"
        style={{ animationDelay: "0.1s" }}
      >
        ورود به پنل کلینیک
      </Link>
      <Link
        href="/superadmin/login"
        className="animate-in text-xs text-slate-400 hover:underline"
        style={{ animationDelay: "0.2s" }}
      >
        ورود مدیر کل سامانه
      </Link>
    </main>
  );
}
