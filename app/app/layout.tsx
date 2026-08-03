import type { Metadata } from "next";
import "@fontsource-variable/vazirmatn/wght.css";
import "./globals.css";

const title = "سامانهٔ نوبت‌دهی کلینیک";
const description =
  "مدیریت نوبت‌های کلینیک شما، بدون تداخل و از هر کانالی (پنل وب، تلگرام، بله).";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    locale: "fa_IR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className="h-full">
      <body className="min-h-full flex flex-col bg-white text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
