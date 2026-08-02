import { describe, expect, it } from "vitest";
import { toEnglishDigits, formatToman, parseServiceLines } from "@/lib/format";

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

describe("parseServiceLines", () => {
  it("parses a name and an ASCII price separated by a dash", () => {
    expect(parseServiceLines("ویزیت عمومی - 200000")).toEqual([
      { name: "ویزیت عمومی", price: 200000 },
    ]);
  });

  it("parses a Persian-digit price", () => {
    expect(parseServiceLines("جرمگیری - ۳۵۰۰۰۰")).toEqual([
      { name: "جرمگیری", price: 350000 },
    ]);
  });

  it("treats a line with no dash as a nameless-price service", () => {
    expect(parseServiceLines("مشاوره")).toEqual([{ name: "مشاوره", price: null }]);
  });

  it("keeps the whole line as the name if the part after the dash isn't a price", () => {
    expect(parseServiceLines("ویزیت فوق‌تخصصی - کودکان")).toEqual([
      { name: "ویزیت فوق‌تخصصی - کودکان", price: null },
    ]);
  });

  it("skips blank lines and handles multiple services", () => {
    expect(parseServiceLines("ویزیت عمومی - 200000\n\nجرمگیری - 350000\n")).toEqual([
      { name: "ویزیت عمومی", price: 200000 },
      { name: "جرمگیری", price: 350000 },
    ]);
  });
});
