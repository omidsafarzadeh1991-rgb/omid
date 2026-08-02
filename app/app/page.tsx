import Link from "next/link";

function LogoMark() {
  return (
    <div
      className="animate-in flex h-14 w-14 items-center justify-center rounded-2xl"
      style={{
        background: "linear-gradient(180deg, #2dd4bf, #0d9488)",
        boxShadow: "0 3px 0 #0f766e, 0 10px 18px -6px rgba(13, 148, 136, 0.5)",
      }}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="17" rx="2.5" />
        <path d="M3 9h18" />
        <path d="M8 2v4M16 2v4" />
        <path d="M8.5 14.5l2 2 4-4" />
      </svg>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 text-center">
      <LogoMark />
      <div className="animate-in space-y-3" style={{ animationDelay: "0.05s" }}>
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
      <footer
        className="animate-in mt-4 text-xs text-slate-400"
        style={{ animationDelay: "0.25s" }}
      >
        © {new Date().getFullYear()} سامانهٔ نوبت‌دهی کلینیک
      </footer>
    </main>
  );
}
