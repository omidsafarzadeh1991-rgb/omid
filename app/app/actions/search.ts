"use server";

import { requireSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { canManageClinic } from "@/lib/roles";
import { normalizeText } from "@/lib/knowledge";

export type SearchResultItem = { id: string; title: string; subtitle?: string; href: string };
export type SearchResultGroup = { label: string; items: SearchResultItem[] };

const STATIC_PAGES: { label: string; href: string; adminOnly: boolean; ownerOnly?: boolean }[] = [
  { label: "داشبورد", href: "/dashboard", adminOnly: false },
  { label: "مکالمات", href: "/dashboard/conversations", adminOnly: false },
  { label: "پزشکان", href: "/dashboard/doctors", adminOnly: true },
  { label: "مرکز دانش", href: "/dashboard/knowledge", adminOnly: true },
  { label: "کارمندان", href: "/dashboard/staff", adminOnly: true },
  { label: "تنظیمات بات‌ها و پیامک", href: "/dashboard/settings", adminOnly: true },
  { label: "امنیت و بک‌آپ", href: "/dashboard/owner", adminOnly: true, ownerOnly: true },
  { label: "تغییر رمز عبور", href: "/dashboard/change-password", adminOnly: false },
];

const MAX_ITEMS_PER_GROUP = 5;

export async function searchAction(rawQuery: string): Promise<SearchResultGroup[]> {
  const session = await requireSession();
  const query = normalizeText(rawQuery);
  if (!query) return [];

  const isAdmin = canManageClinic(session.role);

  const pageMatches = STATIC_PAGES.filter(
    (page) =>
      (!page.adminOnly || isAdmin) &&
      (!page.ownerOnly || session.role === "OWNER") &&
      normalizeText(page.label).includes(query)
  ).slice(0, MAX_ITEMS_PER_GROUP);

  const [doctors, appointments] = await Promise.all([
    prisma.doctor.findMany({
      where: { clinicId: session.clinicId },
      take: 50,
    }),
    prisma.appointment.findMany({
      where: { clinicId: session.clinicId, startTime: { gte: new Date() } },
      orderBy: { startTime: "asc" },
      take: 100,
      include: { doctor: true },
    }),
  ]);

  const doctorMatches = doctors
    .filter((doctor) => normalizeText(doctor.name).includes(query))
    .slice(0, MAX_ITEMS_PER_GROUP)
    .map((doctor) => ({
      id: doctor.id,
      title: doctor.name,
      subtitle: "مشاهدهٔ تقویم نوبت‌دهی",
      href: `/book/${doctor.id}`,
    }));

  const appointmentMatches = appointments
    .filter(
      (appt) =>
        normalizeText(appt.patientName).includes(query) ||
        normalizeText(appt.patientPhone).includes(query)
    )
    .slice(0, MAX_ITEMS_PER_GROUP)
    .map((appt) => ({
      id: appt.id,
      title: `${appt.patientName} (${appt.patientPhone})`,
      subtitle: `${appt.doctor.name} — ${new Intl.DateTimeFormat("fa-IR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(appt.startTime)}`,
      href: "/dashboard",
    }));

  const groups: SearchResultGroup[] = [];
  if (pageMatches.length > 0) {
    groups.push({
      label: "صفحات",
      items: pageMatches.map((p) => ({ id: p.href, title: p.label, href: p.href })),
    });
  }
  if (doctorMatches.length > 0) groups.push({ label: "پزشکان", items: doctorMatches });
  if (appointmentMatches.length > 0) {
    groups.push({ label: "نوبت‌های پیش رو", items: appointmentMatches });
  }

  return groups;
}
