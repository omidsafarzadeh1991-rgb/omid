import { prisma } from "@/lib/prisma";

let counter = 0;

export async function createTestClinicWithDoctor(options?: { workDays?: string }) {
  counter += 1;
  const clinic = await prisma.clinic.create({
    data: { name: `Test Clinic ${counter}` },
  });
  const doctor = await prisma.doctor.create({
    data: {
      clinicId: clinic.id,
      name: "Dr. Test",
      workStartMin: 9 * 60,
      workEndMin: 17 * 60,
      slotMinutes: 30,
      ...(options?.workDays ? { workDays: options.workDays } : {}),
    },
  });
  return { clinic, doctor };
}
