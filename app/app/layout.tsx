import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "نوبت‌دهی کلینیک",
  description: "سامانه نوبت‌دهی کلینیک",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
