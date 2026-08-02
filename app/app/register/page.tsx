import RegisterForm from "./RegisterForm";

export default function RegisterPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-slate-900">
          ثبت‌نام کلینیک جدید
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          یک حساب برای کلینیک خود بسازید. شما اولین مدیر این کلینیک خواهید بود.
        </p>
        <RegisterForm />
      </div>
    </main>
  );
}
