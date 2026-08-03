const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Converts Persian/Arabic digits typed by users into plain ASCII digits. */
export function toEnglishDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persianIndex = PERSIAN_DIGITS.indexOf(digit);
    if (persianIndex !== -1) return String(persianIndex);
    return String(ARABIC_DIGITS.indexOf(digit));
  });
}

/** Formats a Toman amount for display, e.g. 250000 -> "۲۵۰,۰۰۰ تومان". */
export function formatToman(amount: number): string {
  return `${amount.toLocaleString("fa-IR")} تومان`;
}
