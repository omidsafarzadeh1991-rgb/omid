import { describe, expect, it } from "vitest";
import { bookAppointment, buildMonthGrid, cancelAppointment, getSlotsForDay } from "@/lib/booking";
import { prisma } from "@/lib/prisma";
import { createTestClinicWithDoctor } from "./helpers";

function nextMonday9am() {
  const d = new Date();
  d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
  d.setHours(9, 0, 0, 0);
  return d;
}

// Friday (day 5) is not in the default work-days set ("6,0,1,2,3" = Sat-Wed).
function nextFriday9am() {
  const d = new Date();
  d.setDate(d.getDate() + ((5 + 7 - d.getDay()) % 7 || 7));
  d.setHours(9, 0, 0, 0);
  return d;
}

function nextDayOfWeek(dayOfWeek: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + ((dayOfWeek + 7 - d.getDay()) % 7 || 7));
  d.setHours(0, 0, 0, 0);
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

  it("rejects a booking on a day the doctor doesn't work", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    const startTime = nextFriday9am();

    const result = await bookAppointment({
      clinicId: clinic.id,
      doctorId: doctor.id,
      startTime,
      patientName: "تست",
      patientPhone: "09120000009",
      source: "MANUAL",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("OUTSIDE_WORKING_HOURS");
    }
  });

  it("offers no slots at all for a day the doctor doesn't work", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    const friday = nextFriday9am();

    const slots = await getSlotsForDay(clinic.id, doctor.id, friday);
    expect(slots).toHaveLength(0);
  });

  it("allows booking on a day included in a custom work-days schedule", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor({
      schedules: [{ dayOfWeek: 5, startMin: 9 * 60, endMin: 17 * 60 }], // Friday only
    });
    const startTime = nextFriday9am();

    const result = await bookAppointment({
      clinicId: clinic.id,
      doctorId: doctor.id,
      startTime,
      patientName: "تست",
      patientPhone: "09120000010",
      source: "MANUAL",
    });

    expect(result.ok).toBe(true);
  });

  it("respects different working hours on different days for the same doctor", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor({
      schedules: [
        { dayOfWeek: 6, startMin: 10 * 60, endMin: 18 * 60 }, // Saturday 10-18
        { dayOfWeek: 3, startMin: 12 * 60, endMin: 15 * 60 }, // Wednesday 12-15
      ],
    });

    const saturday = nextDayOfWeek(6);
    const saturdaySlots = await getSlotsForDay(clinic.id, doctor.id, saturday);
    expect(saturdaySlots[0]?.startTime.getHours()).toBe(10);
    expect(saturdaySlots.at(-1)?.startTime.getHours()).toBe(17);
    expect(saturdaySlots.some((s) => s.startTime.getHours() === 12)).toBe(true);

    const wednesday = nextDayOfWeek(3);
    const wednesdaySlots = await getSlotsForDay(clinic.id, doctor.id, wednesday);
    expect(wednesdaySlots[0]?.startTime.getHours()).toBe(12);
    expect(wednesdaySlots.at(-1)?.startTime.getHours()).toBe(14);
    expect(wednesdaySlots.some((s) => s.startTime.getHours() === 10)).toBe(false);

    // Booking at 13:00 on Wednesday must succeed...
    const wednesday13 = new Date(wednesday);
    wednesday13.setHours(13, 0, 0, 0);
    const bookedOnWednesday = await bookAppointment({
      clinicId: clinic.id,
      doctorId: doctor.id,
      startTime: wednesday13,
      patientName: "تست",
      patientPhone: "09120000012",
      source: "MANUAL",
    });
    expect(bookedOnWednesday.ok).toBe(true);

    // ...but 13:00 falls outside Saturday's 10-18 grid alignment is fine,
    // while an hour outside Wednesday's 12-15 window must be rejected.
    const wednesday16 = new Date(wednesday);
    wednesday16.setHours(16, 0, 0, 0);
    const rejectedOnWednesday = await bookAppointment({
      clinicId: clinic.id,
      doctorId: doctor.id,
      startTime: wednesday16,
      patientName: "تست",
      patientPhone: "09120000013",
      source: "MANUAL",
    });
    expect(rejectedOnWednesday.ok).toBe(false);
  });

  it("stores the selected service on the appointment", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    const startTime = nextMonday9am();

    const result = await bookAppointment({
      clinicId: clinic.id,
      doctorId: doctor.id,
      startTime,
      patientName: "تست",
      patientPhone: "09120000011",
      serviceName: "جرمگیری",
      source: "MANUAL",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const appointment = await prisma.appointment.findUniqueOrThrow({
      where: { id: result.appointmentId },
    });
    expect(appointment.serviceName).toBe("جرمگیری");
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

describe("buildMonthGrid", () => {
  it("marks a booked day's free count one lower than an identical unbooked day", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    const startTime = nextMonday9am();
    const dayStart = new Date(startTime);
    dayStart.setHours(0, 0, 0, 0);
    const monthDate = new Date(startTime.getFullYear(), startTime.getMonth(), 1);

    const before = await buildMonthGrid(clinic.id, doctor.id, monthDate);
    const freeCountBefore =
      before.days.find((d) => d.date.getTime() === dayStart.getTime())?.freeCount ?? 0;

    await bookAppointment({
      clinicId: clinic.id,
      doctorId: doctor.id,
      startTime,
      patientName: "تست",
      patientPhone: "09120000020",
      source: "MANUAL",
    });

    const after = await buildMonthGrid(clinic.id, doctor.id, monthDate);
    const freeCountAfter =
      after.days.find((d) => d.date.getTime() === dayStart.getTime())?.freeCount ?? 0;

    expect(freeCountAfter).toBe(freeCountBefore - 1);
  });

  it("marks non-working days as not bookable with zero free slots", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    const friday = nextFriday9am();
    const monthDate = new Date(friday.getFullYear(), friday.getMonth(), 1);

    const { days } = await buildMonthGrid(clinic.id, doctor.id, monthDate);
    const fridayCell = days.find(
      (d) => d.inMonth && d.date.getDay() === 5 && d.date.getTime() === new Date(friday).setHours(0, 0, 0, 0)
    );

    expect(fridayCell?.isWorkingDay).toBe(false);
    expect(fridayCell?.freeCount).toBe(0);
  });

  it("marks today as isToday and past days as isPast, both excluded from bookable free counts", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    const today = new Date();
    const monthDate = new Date(today.getFullYear(), today.getMonth(), 1);

    const { days } = await buildMonthGrid(clinic.id, doctor.id, monthDate);
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayCell = days.find((d) => d.date.getTime() === todayStart.getTime());

    expect(todayCell?.isToday).toBe(true);
    expect(todayCell?.isPast).toBe(false);

    const pastCells = days.filter((d) => d.date.getTime() < todayStart.getTime());
    expect(pastCells.every((d) => d.isPast)).toBe(true);
    expect(pastCells.every((d) => d.freeCount === 0)).toBe(true);
  });
});
