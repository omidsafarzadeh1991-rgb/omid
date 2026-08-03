import "server-only";
import { Prisma, type DoctorSchedule } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { sendBookingConfirmation } from "@/lib/reminders";

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

function getScheduleForDay(
  doctorId: string,
  dayOfWeek: number
): Promise<DoctorSchedule | null> {
  return prisma.doctorSchedule.findUnique({
    where: { doctorId_dayOfWeek: { doctorId, dayOfWeek } },
  });
}

/** Generates every slot within a day's schedule window. */
function generateDaySlotTimes(
  schedule: Pick<DoctorSchedule, "startMin" | "endMin">,
  slotMinutes: number,
  day: Date
): Date[] {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);

  const times: Date[] = [];
  for (
    let minutes = schedule.startMin;
    minutes < schedule.endMin;
    minutes += slotMinutes
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

  const schedule = await getScheduleForDay(doctorId, day.getDay());
  if (!schedule) {
    return [];
  }

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
  return generateDaySlotTimes(schedule, doctor.slotMinutes, day).map(
    (startTime) => ({
      startTime,
      isFree: !bookedTimes.has(startTime.getTime()) && startTime.getTime() > now,
    })
  );
}

export type MonthGridDay = {
  date: Date;
  inMonth: boolean;
  isWorkingDay: boolean;
  isPast: boolean;
  isToday: boolean;
  freeCount: number;
};

/**
 * Builds the full month grid (one bulk appointment query, not N+1 per day)
 * used by both the full booking page and the dashboard's quick-book modal,
 * so the two surfaces can never drift on which days/slots count as free.
 */
export async function buildMonthGrid(
  clinicId: string,
  doctorId: string,
  monthDate: Date
): Promise<{
  doctor: Prisma.DoctorGetPayload<{ include: { services: true; specialties: true; schedules: true } }>;
  days: MonthGridDay[];
}> {
  const doctor = await prisma.doctor.findFirstOrThrow({
    where: { id: doctorId, clinicId },
    include: { services: true, specialties: true, schedules: true },
  });

  const scheduleByDay = new Map(doctor.schedules.map((s) => [s.dayOfWeek, s]));
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);

  const appointmentsInMonth = await prisma.appointment.findMany({
    where: { doctorId, startTime: { gte: monthStart, lt: monthEnd } },
    select: { startTime: true },
  });
  const bookedTimes = new Set(appointmentsInMonth.map((a) => a.startTime.getTime()));

  const now = Date.now();
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  const gridStartOffset = (monthStart.getDay() + 1) % 7; // شنبه اول ستون است
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const totalCells = Math.ceil((gridStartOffset + daysInMonth) / 7) * 7;

  const days: MonthGridDay[] = Array.from({ length: totalCells }, (_, i) => {
    const date = new Date(monthStart.getTime());
    date.setDate(date.getDate() - gridStartOffset + i);
    const inMonth = date.getMonth() === monthDate.getMonth();
    const schedule = scheduleByDay.get(date.getDay());
    const isPast = date.getTime() < todayStart;
    const isToday = date.getTime() === todayStart;

    let freeCount = 0;
    if (inMonth && schedule && !isPast) {
      freeCount = generateDaySlotTimes(schedule, doctor.slotMinutes, date).filter(
        (t) => !bookedTimes.has(t.getTime()) && t.getTime() > now
      ).length;
    }

    return { date, inMonth, isWorkingDay: !!schedule, isPast, isToday, freeCount };
  });

  return { doctor, days };
}

export type BookAppointmentInput = {
  clinicId: string;
  doctorId: string;
  startTime: Date;
  patientName: string;
  patientPhone: string;
  serviceName?: string;
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

  const schedule = await getScheduleForDay(input.doctorId, input.startTime.getDay());
  if (!schedule) {
    return { ok: false, reason: "OUTSIDE_WORKING_HOURS" };
  }

  const dayStart = new Date(input.startTime);
  dayStart.setHours(0, 0, 0, 0);
  const minutesFromMidnight = Math.round(
    (input.startTime.getTime() - dayStart.getTime()) / 60_000
  );
  const isAlignedSlot =
    minutesFromMidnight >= schedule.startMin &&
    minutesFromMidnight < schedule.endMin &&
    (minutesFromMidnight - schedule.startMin) % doctor.slotMinutes === 0;

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
          serviceName: input.serviceName,
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

    // Sending the confirmation SMS is best-effort and must never make an
    // otherwise-successful booking look like it failed.
    await sendBookingConfirmation(appointment.id).catch(() => undefined);

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
