import LoginForm from "./LoginForm";
import LogoMark from "../components/LogoMark";

export default function LoginPage() {
  return (
    <main className="auth-backdrop flex flex-1 items-center justify-center px-4 py-12">
      <div className="auth-glow" />
      <div className="card animate-in relative z-10 w-full max-w-sm p-8">
        <div className="mb-5 flex justify-center">
          <LogoMark size={48} />
        </div>
        <h1 className="mb-6 text-center text-xl font-bold text-slate-900">
          ورود به پنل
        </h1>
        <LoginForm />
      </div>
    </main>
  );
}
