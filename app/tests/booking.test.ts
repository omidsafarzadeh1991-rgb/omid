import { describe, expect, it } from "vitest";
import { bookAppointment, cancelAppointment, getSlotsForDay } from "@/lib/booking";
import { prisma } from "@/lib/prisma";
import { createTestClinicWithDoctor } from "./helpers";

function nextMonday9am() {
  const d = new Date();
  d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
  d.setHours(9, 0, 0, 0);
  return d;
}

describe("bookAppointment", () => {
  it("books a free slot", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    const startTime = nextMonday9am();

    const result = await bookAppointment({
      clinicId: clinic.id,
      doctorId: doctor.id,
      startTime,
      patientName: "علی رضایی",
      patientPhone: "09120000001",
      source: "MANUAL",
    });

    expect(result.ok).toBe(true);

    const slots = await getSlotsForDay(clinic.id, doctor.id, startTime);
    const bookedSlot = slots.find(
      (s) => s.startTime.getTime() === startTime.getTime()
    );
    expect(bookedSlot?.isFree).toBe(false);
  });

  it("rejects a second booking on an already-taken slot", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    const startTime = nextMonday9am();

    const first = await bookAppointment({
      clinicId: clinic.id,
      doctorId: doctor.id,
      startTime,
      patientName: "بیمار اول",
      patientPhone: "09120000002",
      source: "MANUAL",
    });
    expect(first.ok).toBe(true);

    const second = await bookAppointment({
      clinicId: clinic.id,
      doctorId: doctor.id,
      startTime,
      patientName: "بیمار دوم",
      patientPhone: "09120000003",
      source: "TELEGRAM",
    });

    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.reason).toBe("SLOT_TAKEN");
    }
  });

  it("rejects a booking that doesn't line up with the doctor's slot grid", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    const startTime = nextMonday9am();
    startTime.setMinutes(startTime.getMinutes() + 5);

    const result = await bookAppointment({
      clinicId: clinic.id,
      doctorId: doctor.id,
      startTime,
      patientName: "تست",
      patientPhone: "09120000004",
      source: "MANUAL",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("OUTSIDE_WORKING_HOURS");
    }
  });

  it("rejects a booking for a time slot that has already passed", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    const startTime = new Date();
    startTime.setDate(startTime.getDate() - 1);
    startTime.setHours(9, 0, 0, 0);

    const result = await bookAppointment({
      clinicId: clinic.id,
      doctorId: doctor.id,
      startTime,
      patientName: "تست",
      patientPhone: "09120000008",
      source: "MANUAL",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("PAST_TIME");
    }
  });

  it("does not offer already-passed slots as free when listing a day", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    const today = new Date();

    const slots = await getSlotsForDay(clinic.id, doctor.id, today);
    const pastSlots = slots.filter((s) => s.startTime.getTime() <= Date.now());

    expect(pastSlots.every((s) => s.isFree === false)).toBe(true);
  });

  it(
    "only lets one of two simultaneous bookings for the same slot succeed",
    async () => {
      const { clinic, doctor } = await createTestClinicWithDoctor();
      const startTime = nextMonday9am();

      const bookingInput = (patientName: string, source: "TELEGRAM" | "BALE") => ({
        clinicId: clinic.id,
        doctorId: doctor.id,
        startTime,
        patientName,
        patientPhone: "09120000005",
        source,
      });

      const [telegramResult, baleResult] = await Promise.all([
        bookAppointment(bookingInput("از تلگرام", "TELEGRAM")),
        bookAppointment(bookingInput("از بله", "BALE")),
      ]);

      const results = [telegramResult, baleResult];
      const succeeded = results.filter((r) => r.ok);
      const failed = results.filter((r) => !r.ok);

      expect(succeeded).toHaveLength(1);
      expect(failed).toHaveLength(1);
      expect(failed[0]).toMatchObject({ ok: false, reason: "SLOT_TAKEN" });

      const appointmentsInDb = await prisma.appointment.count({
        where: { doctorId: doctor.id, startTime },
      });
      expect(appointmentsInDb).toBe(1);
    }
  );

  it("frees the slot again after cancelling, and logs both actions", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    const startTime = nextMonday9am();

    const booked = await bookAppointment({
      clinicId: clinic.id,
      doctorId: doctor.id,
      startTime,
      patientName: "بیمار",
      patientPhone: "09120000006",
      source: "MANUAL",
    });
    expect(booked.ok).toBe(true);
    if (!booked.ok) return;

    const cancelled = await cancelAppointment(clinic.id, booked.appointmentId);
    expect(cancelled.ok).toBe(true);

    const slots = await getSlotsForDay(clinic.id, doctor.id, startTime);
    const slot = slots.find((s) => s.startTime.getTime() === startTime.getTime());
    expect(slot?.isFree).toBe(true);

    const rebooked = await bookAppointment({
      clinicId: clinic.id,
      doctorId: doctor.id,
      startTime,
      patientName: "بیمار دوم",
      patientPhone: "09120000007",
      source: "TELEGRAM",
    });
    expect(rebooked.ok).toBe(true);

    const logs = await prisma.appointmentLog.findMany({
      where: { clinicId: clinic.id, doctorId: doctor.id, startTime },
      orderBy: { createdAt: "asc" },
    });
    expect(logs.map((l) => l.action)).toEqual(["BOOKED", "CANCELLED", "BOOKED"]);
  });
});
