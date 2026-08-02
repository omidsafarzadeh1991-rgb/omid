import { redirect } from "next/navigation";
import { isSetupComplete } from "@/lib/setup";
import LogoMark from "../components/LogoMark";
import SetupForm from "./SetupForm";

export default async function SetupPage() {
  if (await isSetupComplete()) {
    redirect("/login");
  }

  return (
    <main className="auth-backdrop flex flex-1 items-center justify-center px-4 py-12">
      <div className="auth-glow" />
      <div className="card animate-in relative z-10 w-full max-w-lg p-8">
        <div className="mb-5 flex justify-center">
          <LogoMark size={48} />
        </div>
        <h1 className="mb-1 text-center text-xl font-bold text-slate-900">
          راه‌اندازی اولیهٔ سامانه
        </h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          این صفحه فقط یک‌بار، برای اولین راه‌اندازی روی این کامپیوتر نمایش داده
          می‌شود. اطلاعات کلینیک خودتان را وارد کنید تا حساب مدیر ساخته شود.
        </p>
        <SetupForm />
      </div>
    </main>
  );
}
