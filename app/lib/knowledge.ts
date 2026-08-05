import "server-only";
import { prisma } from "@/lib/prisma";
import { toEnglishDigits } from "@/lib/format";
import type { ClinicInfo, FaqCategory } from "@/generated/prisma/client";

/**
 * Unifies the different ways the same Persian word can be typed (ي/ی,
 * ك/ک, mixed digits, extra punctuation/whitespace) so keyword matching
 * doesn't miss an FAQ just because of character variants.
 */
export function normalizeText(text: string): string {
  return toEnglishDigits(text)
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ً-ٰٟ]/g, "") // Arabic diacritics
    .replace(/[؟?!.,،؛;:()«»"']/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function splitKeywords(keywords: string): string[] {
  return keywords
    .split(",")
    .map((keyword) => normalizeText(keyword))
    .filter(Boolean);
}

// Shared, clinic-independent synonym groups so an admin who only types
// "قیمت" as a keyword also catches "هزینه"/"تعرفه" without listing every
// variant by hand. Deliberately a small static list, not a synonym-manager
// UI or embeddings - if it ever stops being enough, that's the signal to
// build one.
const SYNONYM_GROUPS: readonly string[][] = [
  ["قیمت", "هزینه", "تعرفه", "مبلغ", "نرخ"],
  ["آدرس", "نشانی", "لوکیشن", "موقعیت"],
  ["ساعت کاری", "ساعات کاری", "زمان کاری"],
  ["پارکینگ", "جای پارک", "پارک ماشین"],
  ["بیمه", "بیمه تکمیلی", "طرف قرارداد"],
];

const synonymsByTerm = new Map<string, string[]>();
for (const group of SYNONYM_GROUPS) {
  const normalizedGroup = group.map(normalizeText);
  for (const term of normalizedGroup) {
    synonymsByTerm.set(term, normalizedGroup);
  }
}

/** Every spelling that should count as the same keyword, including itself. */
function keywordVariants(normalizedKeyword: string): string[] {
  return synonymsByTerm.get(normalizedKeyword) ?? [normalizedKeyword];
}

/**
 * Finds the best-matching active FAQ for an incoming message, purely by
 * keyword overlap (expanded through the synonym groups above) - no AI call
 * involved. The entry with the most matched keywords wins; ties break by
 * the admin-set priority (higher first), then by creation order for
 * stability.
 */
export async function matchFaq(clinicId: string, userText: string) {
  const entries = await prisma.faqEntry.findMany({
    where: { clinicId, active: true },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  const normalizedText = normalizeText(userText);
  if (!normalizedText) return null;

  let best: { entry: (typeof entries)[number]; matchCount: number } | null = null;

  for (const entry of entries) {
    const keywords = splitKeywords(entry.keywords);
    const matchCount = keywords.filter((keyword) =>
      keywordVariants(keyword).some((variant) => normalizedText.includes(variant))
    ).length;
    if (matchCount === 0) continue;
    if (!best || matchCount > best.matchCount) {
      best = { entry, matchCount };
    }
  }

  return best?.entry ?? null;
}

export async function listFaqEntries(clinicId: string) {
  return prisma.faqEntry.findMany({
    where: { clinicId },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
}

export type SaveFaqInput = {
  category: FaqCategory;
  question: string;
  answer: string;
  keywords: string;
  priority: number;
};

export async function createFaqEntry(clinicId: string, input: SaveFaqInput) {
  return prisma.faqEntry.create({ data: { clinicId, ...input } });
}

export async function updateFaqEntry(clinicId: string, id: string, input: SaveFaqInput) {
  return prisma.faqEntry.updateMany({ where: { id, clinicId }, data: input });
}

export async function deleteFaqEntry(clinicId: string, id: string) {
  return prisma.faqEntry.deleteMany({ where: { id, clinicId } });
}

export async function setFaqActive(clinicId: string, id: string, active: boolean) {
  return prisma.faqEntry.updateMany({ where: { id, clinicId }, data: { active } });
}

export async function getClinicInfo(clinicId: string) {
  return prisma.clinicInfo.findUnique({ where: { clinicId } });
}

export type SaveClinicInfoInput = Omit<
  ClinicInfo,
  "id" | "clinicId" | "createdAt" | "updatedAt"
>;

export async function saveClinicInfo(clinicId: string, input: SaveClinicInfoInput) {
  return prisma.clinicInfo.upsert({
    where: { clinicId },
    create: { clinicId, ...input },
    update: input,
  });
}

/** Renders the clinic's fixed facts as a short block for the AI's system prompt. */
export function formatClinicInfoForPrompt(info: ClinicInfo | null): string {
  if (!info) return "";

  const lines: string[] = [];
  if (info.address) lines.push(`آدرس: ${info.address}`);
  if (info.phone) lines.push(`تلفن: ${info.phone}`);
  if (info.whatsapp) lines.push(`واتس‌اپ: ${info.whatsapp}`);
  if (info.website) lines.push(`وب‌سایت: ${info.website}`);
  if (info.instagram) lines.push(`اینستاگرام: ${info.instagram}`);
  if (info.googleMapUrl) lines.push(`لوکیشن گوگل مپ: ${info.googleMapUrl}`);
  if (info.workingHoursNote) lines.push(`ساعات کاری کلینیک: ${info.workingHoursNote}`);
  lines.push(
    `پارکینگ: ${info.parkingAvailable ? "دارد" : "ندارد"}${
      info.parkingDescription ? ` (${info.parkingDescription})` : ""
    }`
  );
  if (info.insuranceNote) lines.push(`بیمه‌های طرف قرارداد: ${info.insuranceNote}`);

  if (lines.length === 0) return "";
  return lines.join("\n");
}
