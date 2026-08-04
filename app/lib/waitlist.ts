import "server-only";
import { prisma } from "@/lib/prisma";

export type WaitlistEntryInput = {
  clinicId: string;
  doctorId: string;
  day: Date;
  patientName: string;
  patientPhone: string;
  serviceName?: string;
};

function normalizeDay(day: Date): Date {
  const normalized = new Date(day);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

export async function addToWaitlist(input: WaitlistEntryInput) {
  return prisma.waitlist.create({
    data: {
      clinicId: input.clinicId,
      doctorId: input.doctorId,
      day: normalizeDay(input.day),
      patientName: input.patientName,
      patientPhone: input.patientPhone,
      serviceName: input.serviceName,
    },
  });
}

export async function listWaitlist(clinicId: string) {
  const now = normalizeDay(new Date());
  return prisma.waitlist.findMany({
    where: { clinicId, day: { gte: now } },
    include: { doctor: { select: { name: true } } },
    orderBy: [{ day: "asc" }, { createdAt: "asc" }],
  });
}

export async function removeFromWaitlist(clinicId: string, waitlistId: string): Promise<void> {
  await prisma.waitlist.deleteMany({ where: { id: waitlistId, clinicId } });
}
