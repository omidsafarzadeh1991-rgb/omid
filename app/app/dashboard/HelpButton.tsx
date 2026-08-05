import Link from "next/link";

/** Fixed top-left help entry point, present on every dashboard page regardless of role. */
export default function HelpButton() {
  return (
    <Link
      href="/dashboard/help"
      aria-label="راهنما"
      title="راهنما"
      className="fixed left-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-600 shadow-lg shadow-slate-900/10 ring-1 ring-slate-200 transition-transform hover:-translate-y-0.5 hover:text-teal-700 hover:ring-teal-200"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.3 9.2a2.7 2.7 0 0 1 5.3.8c0 1.8-2.6 2-2.6 3.6" />
        <circle cx="12" cy="16.7" r="0.15" fill="currentColor" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    </Link>
  );
}
