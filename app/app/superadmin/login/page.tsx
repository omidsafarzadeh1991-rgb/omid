import SuperadminLoginForm from "./SuperadminLoginForm";
import LogoMark from "../../components/LogoMark";

export default function SuperadminLoginPage() {
  return (
    <main className="auth-backdrop flex flex-1 items-center justify-center px-4 py-12">
      <div className="auth-glow" />
      <div className="card animate-in relative z-10 w-full max-w-sm p-8">
        <div className="mb-5 flex justify-center">
          <LogoMark size={48} />
        </div>
        <h1 className="mb-1 text-center text-xl font-bold text-slate-900">
          ورود مدیر کل سامانه
        </h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          این بخش فقط برای صاحب سامانه است، نه کلینیک‌ها.
        </p>
        <SuperadminLoginForm />
      </div>
    </main>
  );
}
