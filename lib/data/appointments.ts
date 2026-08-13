import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface CreateAppointmentInput {
  fullName: string;
  phone: string;
  serviceId: string;
  /** ISO `yyyy-mm-dd` date string. */
  date: string;
  time: string;
}

export class DuplicateAppointmentError extends Error {
  constructor() {
    super("این درخواست پیش‌تر ثبت شده است.");
    this.name = "DuplicateAppointmentError";
  }
}

/**
 * Creates a PENDING appointment request. Relies on the database's unique
 * constraint (phone + service + date + time) as the source of truth for
 * duplicate detection, since that's race-condition-safe unlike an
 * application-level "check then insert".
 */
export async function createAppointment(input: CreateAppointmentInput) {
  try {
    return await prisma.appointment.create({
      data: {
        fullName: input.fullName,
        phone: input.phone,
        serviceId: input.serviceId,
        date: new Date(`${input.date}T00:00:00.000Z`),
        time: input.time,
        status: "PENDING",
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new DuplicateAppointmentError();
    }
    throw error;
  }
}
