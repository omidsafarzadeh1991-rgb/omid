import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names, resolving conflicting utility classes. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format an integer Toman price with Persian digits, or a fallback label when absent. */
export function formatPrice(price: number | null): string {
  if (price === null) return "تماس بگیرید";
  return `${price.toLocaleString("fa-IR")} تومان`;
}

/** Format a Date as a Persian (Jalali) long date, e.g. "۱۴ مرداد ۱۴۰۴". */
export function formatPersianDate(date: Date): string {
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/** Convert Persian/Arabic-Indic digits in a string to plain ASCII digits. */
export function toEnglishDigits(value: string): string {
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  return value.replace(/[۰-۹٠-٩]/g, (ch) => {
    const persianIndex = persian.indexOf(ch);
    if (persianIndex !== -1) return String(persianIndex);
    const arabicIndex = arabic.indexOf(ch);
    if (arabicIndex !== -1) return String(arabicIndex);
    return ch;
  });
}
