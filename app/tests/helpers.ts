import { prisma } from "@/lib/prisma";

let counter = 0;

export async function createTestClinicWithDoctor() {
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
    },
  });
  return { clinic, doctor };
}
