import { describe, expect, it, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { bookAppointment } from "@/lib/booking";
import { saveSmsCredentials } from "@/lib/sms";
import { sendBookingConfirmation, sweepDueReminders } from "@/lib/reminders";
import { createTestClinicWithDoctor } from "./helpers";

function nextMonday9am() {
  const d = new Date();
  d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
  d.setHours(9, 0, 0, 0);
  return d;
}

describe("sendBookingConfirmation", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("does nothing when the clinic has never touched SMS settings", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    const startTime = nextMonday9am();

    const result = await bookAppointment({
      clinicId: clinic.id,
      doctorId: doctor.id,
      startTime,
      patientName: "بیمار",
      patientPhone: "09120000030",
      source: "MANUAL",
    });
    expect(result.ok).toBe(true);

    const reminders = await prisma.appointmentReminder.findMany({
      where: { appointmentId: result.ok ? result.appointmentId : "" },
    });
    expect(reminders).toHaveLength(0);
  });

  it("logs a failed attempt when reminders are enabled but no API key is set yet", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    await prisma.smsSettings.create({
      data: { clinicId: clinic.id, confirmationEnabled: true },
    });
    const startTime = nextMonday9am();

    const result = await bookAppointment({
      clinicId: clinic.id,
      doctorId: doctor.id,
      startTime,
      patientName: "بیمار",
      patientPhone: "09120000031",
      source: "MANUAL",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const reminders = await prisma.appointmentReminder.findMany({
      where: { appointmentId: result.appointmentId },
    });
    expect(reminders).toHaveLength(1);
    expect(reminders[0].type).toBe("CONFIRMATION");
    expect(reminders[0].success).toBe(false);
  });

  it("sends once via the configured provider and never sends a duplicate confirmation", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    await saveSmsCredentials(clinic.id, "KAVENEGAR", "real-key", "");
    const startTime = nextMonday9am();

    const sendSpy = vi.fn(async () =>
      new Response(JSON.stringify({ return: { status: 200 } }), { status: 200 })
    );
    vi.stubGlobal("fetch", sendSpy);

    const result = await bookAppointment({
      clinicId: clinic.id,
      doctorId: doctor.id,
      startTime,
      patientName: "بیمار",
      patientPhone: "09120000032",
      source: "MANUAL",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(sendSpy).toHaveBeenCalledTimes(1);

    // Calling it again directly must not send a second SMS.
    await sendBookingConfirmation(result.appointmentId);
    expect(sendSpy).toHaveBeenCalledTimes(1);

    const reminders = await prisma.appointmentReminder.findMany({
      where: { appointmentId: result.appointmentId },
    });
    expect(reminders).toHaveLength(1);
    expect(reminders[0].success).toBe(true);
  });

  it("does not send a confirmation SMS when the clinic has disabled it", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    await saveSmsCredentials(clinic.id, "KAVENEGAR", "real-key", "");
    await prisma.smsSettings.update({
      where: { clinicId: clinic.id },
      data: { confirmationEnabled: false },
    });
    const startTime = nextMonday9am();

    const sendSpy = vi.fn(async () =>
      new Response(JSON.stringify({ return: { status: 200 } }), { status: 200 })
    );
    vi.stubGlobal("fetch", sendSpy);

    await bookAppointment({
      clinicId: clinic.id,
      doctorId: doctor.id,
      startTime,
      patientName: "بیمار",
      patientPhone: "09120000033",
      source: "MANUAL",
    });

    expect(sendSpy).not.toHaveBeenCalled();
  });
});

describe("sweepDueReminders", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a 24h reminder for an appointment inside the window, and skips one far outside it", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    await saveSmsCredentials(clinic.id, "KAVENEGAR", "real-key", "");

    const dueSoon = await prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        doctorId: doctor.id,
        startTime: new Date(Date.now() + 24 * 60 * 60_000),
        patientName: "بیمار نزدیک",
        patientPhone: "09120000040",
        source: "MANUAL",
      },
    });
    const farAway = await prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        doctorId: doctor.id,
        startTime: new Date(Date.now() + 3 * 24 * 60 * 60_000),
        patientName: "بیمار دور",
        patientPhone: "09120000041",
        source: "MANUAL",
      },
    });

    const sendSpy = vi.fn(async () =>
      new Response(JSON.stringify({ return: { status: 200 } }), { status: 200 })
    );
    vi.stubGlobal("fetch", sendSpy);

    await sweepDueReminders();

    const dueSoonReminders = await prisma.appointmentReminder.findMany({
      where: { appointmentId: dueSoon.id },
    });
    expect(dueSoonReminders).toHaveLength(1);
    expect(dueSoonReminders[0].type).toBe("REMINDER_24H");

    const farAwayReminders = await prisma.appointmentReminder.findMany({
      where: { appointmentId: farAway.id },
    });
    expect(farAwayReminders).toHaveLength(0);
  });

  it("never sends the same reminder twice across repeated sweeps", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    await saveSmsCredentials(clinic.id, "KAVENEGAR", "real-key", "");

    const appointment = await prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        doctorId: doctor.id,
        startTime: new Date(Date.now() + 3 * 60 * 60_000),
        patientName: "بیمار",
        patientPhone: "09120000042",
        source: "MANUAL",
      },
    });

    const sendSpy = vi.fn(async () =>
      new Response(JSON.stringify({ return: { status: 200 } }), { status: 200 })
    );
    vi.stubGlobal("fetch", sendSpy);

    await sweepDueReminders();
    await sweepDueReminders();

    expect(sendSpy).toHaveBeenCalledTimes(1);
    const reminders = await prisma.appointmentReminder.findMany({
      where: { appointmentId: appointment.id },
    });
    expect(reminders).toHaveLength(1);
  });
});
