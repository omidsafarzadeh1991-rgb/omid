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

/** Parses one "نام خدمت - قیمت" per line; the price part is optional. */
export function parseServiceLines(raw: string): { name: string; price: number | null }[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const separatorIndex = line.lastIndexOf("-");
      if (separatorIndex === -1) {
        return { name: line, price: null };
      }
      const name = line.slice(0, separatorIndex).trim();
      const priceDigits = toEnglishDigits(line.slice(separatorIndex + 1)).replace(/[^\d]/g, "");
      if (!name || !priceDigits) {
        return { name: line, price: null };
      }
      return { name, price: Number(priceDigits) };
    });
}
