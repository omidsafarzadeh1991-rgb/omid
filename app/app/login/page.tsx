import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="card animate-in w-full max-w-sm p-8">
        <h1 className="mb-6 text-xl font-bold text-slate-900">ورود به پنل</h1>
        <LoginForm />
      </div>
    </main>
  );
}
