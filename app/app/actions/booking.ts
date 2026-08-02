"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/dal";
import { bookAppointment, cancelAppointment } from "@/lib/booking";
import { prisma } from "@/lib/prisma";

const CreateAppointmentSchema = z.object({
  doctorId: z.string().min(1),
  startTime: z.string().min(1, "یک ساعت خالی انتخاب کنید."),
  patientName: z.string().trim().min(2, "نام بیمار باید حداقل ۲ حرف باشد."),
  patientPhone: z
    .string()
    .trim()
    .regex(/^0\d{10}$/, "شمارهٔ تماس باید به شکل ۰۹xxxxxxxxx باشد."),
});

export type CreateAppointmentFormState =
  | {
      errors?: Partial<
        Record<keyof z.infer<typeof CreateAppointmentSchema>, string[]>
      >;
      message?: string;
    }
  | undefined;

export async function createManualAppointmentAction(
  _prevState: CreateAppointmentFormState,
  formData: FormData
): Promise<CreateAppointmentFormState> {
  const session = await requireSession();

  const validated = CreateAppointmentSchema.safeParse({
    doctorId: formData.get("doctorId"),
    startTime: formData.get("startTime"),
    patientName: formData.get("patientName"),
    patientPhone: formData.get("patientPhone"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const doctor = await prisma.doctor.findFirst({
    where: { id: validated.data.doctorId, clinicId: session.clinicId },
  });
  if (!doctor) {
    return { message: "پزشک پیدا نشد." };
  }

  const result = await bookAppointment({
    clinicId: session.clinicId,
    doctorId: doctor.id,
    startTime: new Date(validated.data.startTime),
    patientName: validated.data.patientName,
    patientPhone: validated.data.patientPhone,
    source: "MANUAL",
    actorStaffId: session.staffId,
  });

  if (!result.ok) {
    const messages: Record<typeof result.reason, string> = {
      SLOT_TAKEN:
        "این ساعت همین الان توسط یک نفر دیگر رزرو شد. لطفاً ساعت دیگری را انتخاب کنید.",
      OUTSIDE_WORKING_HOURS: "این ساعت خارج از برنامهٔ کاری پزشک است.",
      PAST_TIME: "امکان ثبت نوبت برای زمان گذشته وجود ندارد.",
    };
    return { message: messages[result.reason] };
  }

  revalidatePath(`/book/${doctor.id}`);
  revalidatePath("/dashboard");
}

export async function cancelManualAppointmentAction(appointmentId: string) {
  const session = await requireSession();
  await cancelAppointment(session.clinicId, appointmentId, session.staffId);
  revalidatePath("/dashboard");
}
