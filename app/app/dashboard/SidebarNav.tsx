"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function DashboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" />
    </svg>
  );
}

function DoctorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function StaffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="8.5" cy="8" r="3" />
      <circle cx="16" cy="9" r="2.4" />
      <path d="M3 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M14 15.2c2.4.2 4 2 4 4.8" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a1.7 1.7 0 000-3l1-1.7-1.7-1.7-1.7 1a1.7 1.7 0 00-3-1.2l-.2-2h-2.4l-.2 2a1.7 1.7 0 00-3 1.2l-1.7-1L5 8.8l1 1.7a1.7 1.7 0 000 3l-1 1.7 1.7 1.7 1.7-1a1.7 1.7 0 003 1.2l.2 2h2.4l.2-2a1.7 1.7 0 003-1.2l1.7 1 1.7-1.7-1-1.7z" />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "داشبورد", Icon: DashboardIcon, adminOnly: false },
  { href: "/dashboard/doctors", label: "پزشکان", Icon: DoctorIcon, adminOnly: true },
  { href: "/dashboard/staff", label: "کارمندان", Icon: StaffIcon, adminOnly: true },
  { href: "/dashboard/settings", label: "تنظیمات بات‌ها", Icon: SettingsIcon, adminOnly: true },
];

export default function SidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-teal-500/15 text-teal-300"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            <item.Icon />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
