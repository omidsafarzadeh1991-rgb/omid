import "server-only";
import { prisma } from "@/lib/prisma";
import { sendClinicSms } from "@/lib/sms";
import type { SmsReminderType } from "@/generated/prisma/client";

const DEFAULT_TEMPLATES: Record<SmsReminderType, string> = {
  CONFIRMATION: "{clinic}: نوبت شما نزد {doctor} برای {date} ساعت {time} ثبت شد.",
  REMINDER_24H: "{clinic}: یادآوری - فردا {date} ساعت {time} نزد {doctor} نوبت دارید.",
  REMINDER_2_4H: "{clinic}: یادآوری - امروز ساعت {time} نزد {doctor} نوبت دارید.",
};

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

function buildVars(clinicName: string, doctorName: string, startTime: Date): Record<string, string> {
  return {
    clinic: clinicName,
    doctor: doctorName,
    date: new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(startTime),
    time: new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(startTime),
  };
}

/**
 * Records the send attempt before returning, so a reminder is never sent
 * twice - even if the periodic sweep overlaps itself or the app restarts
 * mid-window. Never throws: a failed/unconfigured SMS provider must not
 * break the booking flow that calls this.
 */
async function recordAndSend(
  clinicId: string,
  appointmentId: string,
  type: SmsReminderType,
  phone: string,
  text: string
): Promise<void> {
  const existing = await prisma.appointmentReminder.findUnique({
    where: { appointmentId_type: { appointmentId, type } },
  });
  if (existing) return;

  const result = await sendClinicSms(clinicId, phone, text).catch((error: unknown) => ({
    ok: false as const,
    error: error instanceof Error ? error.message : "خطای ناشناخته در ارسال پیامک.",
  }));

  await prisma.appointmentReminder.create({
    data: {
      appointmentId,
      type,
      success: result.ok,
      errorMessage: result.ok ? null : result.error,
    },
  });
}

/** Called right after a booking succeeds, from any channel. */
export async function sendBookingConfirmation(appointmentId: string): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { doctor: true, clinic: { include: { smsSettings: true } } },
  });
  if (!appointment) return;

  const settings = appointment.clinic.smsSettings;
  if (!settings?.confirmationEnabled) return;

  const text = fillTemplate(
    settings.confirmationTemplate || DEFAULT_TEMPLATES.CONFIRMATION,
    buildVars(appointment.clinic.name, appointment.doctor.name, appointment.startTime)
  );

  await recordAndSend(appointment.clinicId, appointment.id, "CONFIRMATION", appointment.patientPhone, text);
}

async function sendDueRemindersOfType(
  type: "REMINDER_24H" | "REMINDER_2_4H",
  windowStart: Date,
  windowEnd: Date
): Promise<void> {
  const appointments = await prisma.appointment.findMany({
    where: {
      startTime: { gte: windowStart, lt: windowEnd },
      reminders: { none: { type } },
    },
    include: { doctor: true, clinic: { include: { smsSettings: true } } },
  });

  for (const appointment of appointments) {
    const settings = appointment.clinic.smsSettings;
    if (!settings?.encryptedApiKey) continue;
    if (type === "REMINDER_24H" && !settings.reminder24hEnabled) continue;
    if (type === "REMINDER_2_4H" && !settings.reminder2to4hEnabled) continue;

    const template =
      (type === "REMINDER_24H" ? settings.reminder24hTemplate : settings.reminder2to4hTemplate) ||
      DEFAULT_TEMPLATES[type];
    const text = fillTemplate(
      template,
      buildVars(appointment.clinic.name, appointment.doctor.name, appointment.startTime)
    );

    await recordAndSend(appointment.clinicId, appointment.id, type, appointment.patientPhone, text);
  }
}

/**
 * Run periodically (see instrumentation.ts) to send the two time-relative
 * reminders. Windows are wide enough (1 hour) to tolerate the sweep
 * interval without missing an appointment, while the per-(appointment,type)
 * unique constraint on AppointmentReminder guarantees no duplicate sends
 * even if an appointment matches the same window on consecutive sweeps.
 */
export async function sweepDueReminders(): Promise<void> {
  const now = Date.now();
  await sendDueRemindersOfType(
    "REMINDER_24H",
    new Date(now + 23.5 * 60 * 60_000),
    new Date(now + 24.5 * 60 * 60_000)
  );
  await sendDueRemindersOfType(
    "REMINDER_2_4H",
    new Date(now + 1.5 * 60 * 60_000),
    new Date(now + 4 * 60 * 60_000)
  );
}
