"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/dal";
import { bookAppointment, buildMonthGrid, cancelAppointment, getSlotsForDay } from "@/lib/booking";
import { formatToman } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function parseMonthParam(value: string | undefined): Date {
  if (value) {
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, 1);
    }
  }
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
}

function toMonthParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export type QuickBookDay = {
  dateParam: string;
  inMonth: boolean;
  isWorkingDay: boolean;
  isPast: boolean;
  isToday: boolean;
  freeCount: number;
};

export type QuickBookCalendar = {
  doctorName: string;
  services: { name: string; price: string | null }[];
  monthParam: string;
  prevMonthParam: string;
  nextMonthParam: string;
  monthLabel: string;
  days: QuickBookDay[];
};

/** Data for the dashboard's quick-book modal - same month-grid logic as the full /book page. */
export async function getQuickBookCalendarAction(
  doctorId: string,
  monthParam?: string
): Promise<QuickBookCalendar | null> {
  const session = await requireSession();
  const monthDate = parseMonthParam(monthParam);

  const result = await buildMonthGrid(session.clinicId, doctorId, monthDate).catch(() => null);
  if (!result) return null;
  const { doctor, days } = result;

  return {
    doctorName: doctor.name,
    services: doctor.services.map((s) => ({
      name: s.name,
      price: s.price != null ? formatToman(s.price) : null,
    })),
    monthParam: toMonthParam(monthDate),
    prevMonthParam: toMonthParam(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1)),
    nextMonthParam: toMonthParam(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)),
    monthLabel: new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long" }).format(monthDate),
    days: days.map((day) => ({
      dateParam: day.date.toISOString().slice(0, 10),
      inMonth: day.inMonth,
      isWorkingDay: day.isWorkingDay,
      isPast: day.isPast,
      isToday: day.isToday,
      freeCount: day.freeCount,
    })),
  };
}

export type QuickBookSlot = { startTime: string; isFree: boolean };

export async function getQuickBookSlotsAction(
  doctorId: string,
  dateParam: string
): Promise<QuickBookSlot[]> {
  const session = await requireSession();
  const day = new Date(`${dateParam}T00:00:00`);
  if (Number.isNaN(day.getTime())) return [];

  const slots = await getSlotsForDay(session.clinicId, doctorId, day).catch(() => []);
  return slots.map((s) => ({ startTime: s.startTime.toISOString(), isFree: s.isFree }));
}

const CreateAppointmentSchema = z.object({
  doctorId: z.string().min(1),
  startTime: z.string().min(1, "یک ساعت خالی انتخاب کنید."),
  patientName: z.string().trim().min(2, "نام بیمار باید حداقل ۲ حرف باشد."),
  patientPhone: z
    .string()
    .trim()
    .regex(/^0\d{10}$/, "شمارهٔ تماس باید به شکل ۰۹xxxxxxxxx باشد."),
  serviceName: z.string().trim().optional(),
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
    serviceName: formData.get("serviceName") || undefined,
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
    serviceName: validated.data.serviceName || undefined,
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
