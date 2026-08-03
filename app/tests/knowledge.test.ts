import { describe, expect, it } from "vitest";
import {
  normalizeText,
  matchFaq,
  createFaqEntry,
  getClinicInfo,
  saveClinicInfo,
  formatClinicInfoForPrompt,
} from "@/lib/knowledge";
import { createTestClinicWithDoctor } from "./helpers";

describe("normalizeText", () => {
  it("unifies Arabic/Persian character variants and digits", () => {
    expect(normalizeText("پارکينگ ٣")).toBe(normalizeText("پارکینگ 3"));
  });

  it("collapses punctuation and extra whitespace", () => {
    expect(normalizeText("آدرس؟   کجاست!")).toBe("آدرس کجاست");
  });
});

describe("matchFaq", () => {
  it("returns the FAQ whose keywords match the incoming text", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    await createFaqEntry(clinic.id, {
      category: "ADDRESS",
      question: "آدرس کجاست؟",
      answer: "خیابان ولیعصر، پلاک ۱۰",
      keywords: "آدرس, نشانی, لوکیشن",
      priority: 50,
    });

    const match = await matchFaq(clinic.id, "سلام آدرس کلینیک رو میگید؟");
    expect(match?.answer).toBe("خیابان ولیعصر، پلاک ۱۰");
  });

  it("returns null when no keyword matches", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    await createFaqEntry(clinic.id, {
      category: "ADDRESS",
      question: "آدرس کجاست؟",
      answer: "خیابان ولیعصر",
      keywords: "آدرس",
      priority: 50,
    });

    const match = await matchFaq(clinic.id, "میخوام نوبت بگیرم برای فردا");
    expect(match).toBeNull();
  });

  it("ignores inactive FAQ entries", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    const faq = await createFaqEntry(clinic.id, {
      category: "ADDRESS",
      question: "آدرس کجاست؟",
      answer: "خیابان ولیعصر",
      keywords: "آدرس",
      priority: 50,
    });
    const { prisma } = await import("@/lib/prisma");
    await prisma.faqEntry.update({ where: { id: faq.id }, data: { active: false } });

    const match = await matchFaq(clinic.id, "آدرس کجاست؟");
    expect(match).toBeNull();
  });

  it("breaks ties between equal keyword-match counts by priority", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    await createFaqEntry(clinic.id, {
      category: "OTHER",
      question: "کم‌اولویت",
      answer: "پاسخ کم‌اولویت",
      keywords: "سلام",
      priority: 10,
    });
    await createFaqEntry(clinic.id, {
      category: "OTHER",
      question: "پراولویت",
      answer: "پاسخ پراولویت",
      keywords: "سلام",
      priority: 90,
    });

    const match = await matchFaq(clinic.id, "سلام");
    expect(match?.answer).toBe("پاسخ پراولویت");
  });

  it("scopes matches to the given clinic only", async () => {
    const { clinic: clinicA } = await createTestClinicWithDoctor();
    const { clinic: clinicB } = await createTestClinicWithDoctor();
    await createFaqEntry(clinicA.id, {
      category: "ADDRESS",
      question: "آدرس؟",
      answer: "آدرس کلینیک A",
      keywords: "آدرس",
      priority: 50,
    });

    const match = await matchFaq(clinicB.id, "آدرس کجاست؟");
    expect(match).toBeNull();
  });
});

describe("getClinicInfo / saveClinicInfo", () => {
  it("saves and retrieves clinic info", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    await saveClinicInfo(clinic.id, {
      address: "خیابان آزادی",
      phone: "021-1234",
      whatsapp: null,
      contactEmail: null,
      website: null,
      instagram: null,
      googleMapUrl: null,
      workingHoursNote: "هرروز ۸ تا ۲۰",
      parkingAvailable: true,
      parkingDescription: "پارکینگ اختصاصی",
      insuranceNote: null,
    });

    const info = await getClinicInfo(clinic.id);
    expect(info?.address).toBe("خیابان آزادی");
    expect(info?.parkingAvailable).toBe(true);
  });
});

describe("formatClinicInfoForPrompt", () => {
  it("returns an empty string when there is no clinic info", () => {
    expect(formatClinicInfoForPrompt(null)).toBe("");
  });

  it("includes the saved fields in the prompt block", async () => {
    const { clinic } = await createTestClinicWithDoctor();
    const info = await saveClinicInfo(clinic.id, {
      address: "خیابان آزادی",
      phone: null,
      whatsapp: null,
      contactEmail: null,
      website: null,
      instagram: null,
      googleMapUrl: null,
      workingHoursNote: null,
      parkingAvailable: false,
      parkingDescription: null,
      insuranceNote: null,
    });

    const prompt = formatClinicInfoForPrompt(info);
    expect(prompt).toContain("خیابان آزادی");
    expect(prompt).toContain("پارکینگ: ندارد");
  });
});
