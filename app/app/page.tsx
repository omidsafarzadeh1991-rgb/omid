import Link from "next/link";
import LogoMark from "./components/LogoMark";
import { isSetupComplete } from "@/lib/setup";

export default async function HomePage() {
  const setupDone = await isSetupComplete();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 text-center">
      <div className="animate-in">
        <LogoMark />
      </div>
      <div className="animate-in space-y-3" style={{ animationDelay: "0.05s" }}>
        <h1 className="text-3xl font-bold text-slate-900">
          سامانهٔ نوبت‌دهی کلینیک
        </h1>
        <p className="text-slate-600">
          مدیریت نوبت‌های کلینیک شما، بدون تداخل و از هر کانالی.
        </p>
      </div>
      <Link
        href={setupDone ? "/login" : "/setup"}
        className="btn btn-primary animate-in px-8 py-3.5 text-base"
        style={{ animationDelay: "0.1s" }}
      >
        {setupDone ? "ورود به پنل" : "راه‌اندازی اولیهٔ سامانه"}
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
