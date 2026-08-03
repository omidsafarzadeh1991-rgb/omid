import { describe, expect, it } from "vitest";
import { toEnglishDigits, formatToman } from "@/lib/format";

describe("toEnglishDigits", () => {
  it("converts Persian and Arabic digits to ASCII", () => {
    expect(toEnglishDigits("۲۵۰۰۰۰")).toBe("250000");
    expect(toEnglishDigits("٢٥٠٠٠٠")).toBe("250000");
    expect(toEnglishDigits("abc123")).toBe("abc123");
  });
});

describe("formatToman", () => {
  it("formats an amount with thousands separators and the currency label", () => {
    expect(formatToman(250000)).toBe("۲۵۰٬۰۰۰ تومان");
  });
});
