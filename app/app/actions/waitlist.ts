"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { addToWaitlist, removeFromWaitlist } from "@/lib/waitlist";

const AddWaitlistSchema = z.object({
  doctorId: z.string().min(1),
  day: z.string().min(1),
  patientName: z.string().trim().min(2, "نام بیمار باید حداقل ۲ حرف باشد."),
  patientPhone: z
    .string()
    .trim()
    .regex(/^0\d{10}$/, "شمارهٔ تماس باید به شکل ۰۹xxxxxxxxx باشد."),
  serviceName: z.string().trim().optional(),
});

export type AddWaitlistFormState = { message?: string } | undefined;

export async function addToWaitlistAction(
  _prevState: AddWaitlistFormState,
  formData: FormData
): Promise<AddWaitlistFormState> {
  const session = await requireSession();

  const validated = AddWaitlistSchema.safeParse({
    doctorId: formData.get("doctorId"),
    day: formData.get("day"),
    patientName: formData.get("patientName"),
    patientPhone: formData.get("patientPhone"),
    serviceName: formData.get("serviceName") || undefined,
  });
  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "اطلاعات نامعتبر است." };
  }

  const day = new Date(`${validated.data.day}T00:00:00`);
  if (Number.isNaN(day.getTime())) {
    return { message: "تاریخ نامعتبر است." };
  }

  const doctor = await prisma.doctor.findFirst({
    where: { id: validated.data.doctorId, clinicId: session.clinicId },
  });
  if (!doctor) {
    return { message: "پزشک پیدا نشد." };
  }

  await addToWaitlist({
    clinicId: session.clinicId,
    doctorId: doctor.id,
    day,
    patientName: validated.data.patientName,
    patientPhone: validated.data.patientPhone,
    serviceName: validated.data.serviceName || undefined,
  });

  revalidatePath(`/book/${doctor.id}`);
  revalidatePath("/dashboard/waitlist");
  return { message: "به لیست انتظار اضافه شد." };
}

export async function removeFromWaitlistAction(waitlistId: string) {
  const session = await requireSession();
  await removeFromWaitlist(session.clinicId, waitlistId);
  revalidatePath("/dashboard/waitlist");
}
