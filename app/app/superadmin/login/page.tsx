import SuperadminLoginForm from "./SuperadminLoginForm";

export default function SuperadminLoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="card animate-in w-full max-w-sm p-8">
        <h1 className="mb-1 text-xl font-bold text-slate-900">
          ورود مدیر کل سامانه
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          این بخش فقط برای صاحب سامانه است، نه کلینیک‌ها.
        </p>
        <SuperadminLoginForm />
      </div>
    </main>
  );
}
