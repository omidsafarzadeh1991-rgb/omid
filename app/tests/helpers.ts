import { prisma } from "@/lib/prisma";

let counter = 0;

const DEFAULT_SCHEDULES = [6, 0, 1, 2, 3].map((dayOfWeek) => ({
  dayOfWeek,
  startMin: 9 * 60,
  endMin: 17 * 60,
}));

export async function createTestClinicWithDoctor(options?: {
  schedules?: { dayOfWeek: number; startMin: number; endMin: number }[];
}) {
  counter += 1;
  const clinic = await prisma.clinic.create({
    data: { name: `Test Clinic ${counter}` },
  });
  const doctor = await prisma.doctor.create({
    data: {
      clinicId: clinic.id,
      name: "Dr. Test",
      slotMinutes: 30,
      schedules: { create: options?.schedules ?? DEFAULT_SCHEDULES },
    },
  });
  return { clinic, doctor };
}
