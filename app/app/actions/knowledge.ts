"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/dal";
import { canManageClinic } from "@/lib/roles";
import {
  createFaqEntry,
  deleteFaqEntry,
  saveClinicInfo,
  setFaqActive,
  updateFaqEntry,
} from "@/lib/knowledge";

const FAQ_CATEGORIES = [
  "ADDRESS",
  "WORKING_HOURS",
  "INSURANCE",
  "PAYMENT",
  "BOOKING",
  "DOCTORS",
  "SERVICES",
  "CLINIC_RULES",
  "OTHER",
] as const;

const FaqSchema = z.object({
  category: z.enum(FAQ_CATEGORIES),
  question: z.string().trim().min(3, "سوال باید حداقل ۳ حرف باشد."),
  answer: z.string().trim().min(1, "متن پاسخ را وارد کنید."),
  keywords: z.string().trim().min(1, "حداقل یک کلیدواژه وارد کنید."),
  priority: z.coerce.number().int().min(1).max(100),
});

export type FaqFormState = { message?: string; success?: string } | undefined;

export async function createFaqAction(
  _prevState: FaqFormState,
  formData: FormData
): Promise<FaqFormState> {
  const session = await requireSession();
  if (!canManageClinic(session.role)) {
    return { message: "فقط مدیر کلینیک می‌تواند سوال متداول اضافه کند." };
  }

  const validated = FaqSchema.safeParse({
    category: formData.get("category"),
    question: formData.get("question"),
    answer: formData.get("answer"),
    keywords: formData.get("keywords"),
    priority: formData.get("priority") || 50,
  });
  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "اطلاعات نامعتبر است." };
  }

  await createFaqEntry(session.clinicId, validated.data);
  revalidatePath("/dashboard/knowledge");
  return { success: "سوال متداول اضافه شد." };
}

export async function updateFaqAction(
  _prevState: FaqFormState,
  formData: FormData
): Promise<FaqFormState> {
  const session = await requireSession();
  if (!canManageClinic(session.role)) {
    return { message: "فقط مدیر کلینیک می‌تواند سوال متداول را ویرایش کند." };
  }

  const id = String(formData.get("id") ?? "");
  const validated = FaqSchema.safeParse({
    category: formData.get("category"),
    question: formData.get("question"),
    answer: formData.get("answer"),
    keywords: formData.get("keywords"),
    priority: formData.get("priority") || 50,
  });
  if (!id || !validated.success) {
    return { message: validated.success ? "سوال پیدا نشد." : validated.error.issues[0]?.message };
  }

  await updateFaqEntry(session.clinicId, id, validated.data);
  revalidatePath("/dashboard/knowledge");
  return { success: "سوال متداول به‌روزرسانی شد." };
}

export async function deleteFaqAction(id: string) {
  const session = await requireSession();
  if (!canManageClinic(session.role)) return;

  await deleteFaqEntry(session.clinicId, id);
  revalidatePath("/dashboard/knowledge");
}

export async function toggleFaqActiveAction(id: string, active: boolean) {
  const session = await requireSession();
  if (!canManageClinic(session.role)) return;

  await setFaqActive(session.clinicId, id, active);
  revalidatePath("/dashboard/knowledge");
}

const ClinicInfoSchema = z.object({
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  contactEmail: z.union([z.email(), z.literal("")]).optional(),
  website: z.string().trim().optional(),
  instagram: z.string().trim().optional(),
  googleMapUrl: z.string().trim().optional(),
  workingHoursNote: z.string().trim().optional(),
  parkingDescription: z.string().trim().optional(),
  insuranceNote: z.string().trim().optional(),
});

export type ClinicInfoFormState = { message?: string; success?: string } | undefined;

export async function saveClinicInfoAction(
  _prevState: ClinicInfoFormState,
  formData: FormData
): Promise<ClinicInfoFormState> {
  const session = await requireSession();
  if (!canManageClinic(session.role)) {
    return { message: "فقط مدیر کلینیک می‌تواند اطلاعات کلینیک را ویرایش کند." };
  }

  const validated = ClinicInfoSchema.safeParse({
    address: formData.get("address") || undefined,
    phone: formData.get("phone") || undefined,
    whatsapp: formData.get("whatsapp") || undefined,
    contactEmail: formData.get("contactEmail") || "",
    website: formData.get("website") || undefined,
    instagram: formData.get("instagram") || undefined,
    googleMapUrl: formData.get("googleMapUrl") || undefined,
    workingHoursNote: formData.get("workingHoursNote") || undefined,
    parkingDescription: formData.get("parkingDescription") || undefined,
    insuranceNote: formData.get("insuranceNote") || undefined,
  });
  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "اطلاعات نامعتبر است." };
  }

  await saveClinicInfo(session.clinicId, {
    address: validated.data.address || null,
    phone: validated.data.phone || null,
    whatsapp: validated.data.whatsapp || null,
    contactEmail: validated.data.contactEmail || null,
    website: validated.data.website || null,
    instagram: validated.data.instagram || null,
    googleMapUrl: validated.data.googleMapUrl || null,
    workingHoursNote: validated.data.workingHoursNote || null,
    parkingAvailable: formData.get("parkingAvailable") === "on",
    parkingDescription: validated.data.parkingDescription || null,
    insuranceNote: validated.data.insuranceNote || null,
  });

  revalidatePath("/dashboard/knowledge");
  return { success: "اطلاعات کلینیک ذخیره شد." };
}
