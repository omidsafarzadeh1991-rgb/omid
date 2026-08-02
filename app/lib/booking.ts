import "server-only";
import { Prisma, type Doctor } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type AppointmentSource =
  | "MANUAL"
  | "TELEGRAM"
  | "BALE"
  | "WHATSAPP"
  | "INSTAGRAM";

export type Slot = {
  startTime: Date;
  isFree: boolean;
};

const PRISMA_UNIQUE_CONSTRAINT_ERROR = "P2002";

/** Generates every slot for a doctor's working hours on a given calendar day. */
function generateDaySlotTimes(doctor: Doctor, day: Date): Date[] {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);

  const times: Date[] = [];
  for (
    let minutes = doctor.workStartMin;
    minutes < doctor.workEndMin;
    minutes += doctor.slotMinutes
  ) {
    times.push(new Date(dayStart.getTime() + minutes * 60_000));
  }
  return times;
}

/** Returns every slot for the day, marked free/taken against real booked appointments. */
export async function getSlotsForDay(
  clinicId: string,
  doctorId: string,
  day: Date
): Promise<Slot[]> {
  const doctor = await prisma.doctor.findFirstOrThrow({
    where: { id: doctorId, clinicId },
  });

  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60_000);

  const booked = await prisma.appointment.findMany({
    where: {
      doctorId,
      startTime: { gte: dayStart, lt: dayEnd },
    },
    select: { startTime: true },
  });
  const bookedTimes = new Set(booked.map((b) => b.startTime.getTime()));

  const now = Date.now();
  return generateDaySlotTimes(doctor, day).map((startTime) => ({
    startTime,
    isFree: !bookedTimes.has(startTime.getTime()) && startTime.getTime() > now,
  }));
}

export type BookAppointmentInput = {
  clinicId: string;
  doctorId: string;
  startTime: Date;
  patientName: string;
  patientPhone: string;
  source: AppointmentSource;
  actorStaffId?: string;
};

export type BookAppointmentResult =
  | { ok: true; appointmentId: string }
  | { ok: false; reason: "SLOT_TAKEN" | "OUTSIDE_WORKING_HOURS" | "PAST_TIME" };

/**
 * The single write path for creating an appointment, used by every channel
 * (manual panel, Telegram bot, Bale bot, ...). Relies on the DB-level unique
 * constraint on (doctorId, startTime) so two concurrent callers booking the
 * same slot race at the database, and only one insert can ever succeed.
 */
export async function bookAppointment(
  input: BookAppointmentInput
): Promise<BookAppointmentResult> {
  const doctor = await prisma.doctor.findFirstOrThrow({
    where: { id: input.doctorId, clinicId: input.clinicId },
  });

  const dayStart = new Date(input.startTime);
  dayStart.setHours(0, 0, 0, 0);
  const minutesFromMidnight = Math.round(
    (input.startTime.getTime() - dayStart.getTime()) / 60_000
  );
  const isAlignedSlot =
    minutesFromMidnight >= doctor.workStartMin &&
    minutesFromMidnight < doctor.workEndMin &&
    (minutesFromMidnight - doctor.workStartMin) % doctor.slotMinutes === 0;

  if (!isAlignedSlot) {
    return { ok: false, reason: "OUTSIDE_WORKING_HOURS" };
  }

  if (input.startTime.getTime() <= Date.now()) {
    return { ok: false, reason: "PAST_TIME" };
  }

  try {
    const appointment = await prisma.$transaction(async (tx) => {
      const created = await tx.appointment.create({
        data: {
          clinicId: input.clinicId,
          doctorId: input.doctorId,
          startTime: input.startTime,
          patientName: input.patientName,
          patientPhone: input.patientPhone,
          source: input.source,
        },
      });

      await tx.appointmentLog.create({
        data: {
          clinicId: input.clinicId,
          doctorId: input.doctorId,
          startTime: input.startTime,
          patientName: input.patientName,
          patientPhone: input.patientPhone,
          source: input.source,
          action: "BOOKED",
          actorStaffId: input.actorStaffId,
        },
      });

      return created;
    });

    return { ok: true, appointmentId: appointment.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === PRISMA_UNIQUE_CONSTRAINT_ERROR
    ) {
      return { ok: false, reason: "SLOT_TAKEN" };
    }
    throw error;
  }
}

export async function cancelAppointment(
  clinicId: string,
  appointmentId: string,
  actorStaffId?: string
): Promise<{ ok: true } | { ok: false; reason: "NOT_FOUND" }> {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, clinicId },
  });
  if (!appointment) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.appointment.delete({ where: { id: appointmentId } });
    await tx.appointmentLog.create({
      data: {
        clinicId: appointment.clinicId,
        doctorId: appointment.doctorId,
        startTime: appointment.startTime,
        patientName: appointment.patientName,
        patientPhone: appointment.patientPhone,
        source: appointment.source,
        action: "CANCELLED",
        actorStaffId,
      },
    });
  });

  return { ok: true };
}
