import { describe, expect, it } from "vitest";
import { addToWaitlist, listWaitlist, removeFromWaitlist } from "@/lib/waitlist";
import { createTestClinicWithDoctor } from "./helpers";

function nextMonday() {
  const d = new Date();
  d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

describe("waitlist", () => {
  it("adds an entry and lists it back with the doctor name attached", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    const day = nextMonday();

    await addToWaitlist({
      clinicId: clinic.id,
      doctorId: doctor.id,
      day,
      patientName: "بیمار منتظر",
      patientPhone: "09120000040",
    });

    const entries = await listWaitlist(clinic.id);
    expect(entries).toHaveLength(1);
    expect(entries[0].patientName).toBe("بیمار منتظر");
    expect(entries[0].doctor.name).toBe(doctor.name);
    expect(entries[0].day.getTime()).toBe(day.getTime());
  });

  it("normalizes the day to midnight regardless of the time passed in", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    const day = nextMonday();
    const withTime = new Date(day);
    withTime.setHours(14, 30);

    await addToWaitlist({
      clinicId: clinic.id,
      doctorId: doctor.id,
      day: withTime,
      patientName: "بیمار",
      patientPhone: "09120000041",
    });

    const entries = await listWaitlist(clinic.id);
    expect(entries[0].day.getTime()).toBe(day.getTime());
  });

  it("excludes waitlist days that are already in the past", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await addToWaitlist({
      clinicId: clinic.id,
      doctorId: doctor.id,
      day: yesterday,
      patientName: "بیمار دیروز",
      patientPhone: "09120000042",
    });

    const entries = await listWaitlist(clinic.id);
    expect(entries).toHaveLength(0);
  });

  it("never leaks one clinic's waitlist into another clinic's list", async () => {
    const clinicA = await createTestClinicWithDoctor();
    const clinicB = await createTestClinicWithDoctor();
    const day = nextMonday();

    await addToWaitlist({
      clinicId: clinicA.clinic.id,
      doctorId: clinicA.doctor.id,
      day,
      patientName: "بیمار الف",
      patientPhone: "09120000043",
    });

    const entriesForB = await listWaitlist(clinicB.clinic.id);
    expect(entriesForB).toHaveLength(0);
  });

  it("removes an entry, and only within its own clinic", async () => {
    const { clinic, doctor } = await createTestClinicWithDoctor();
    const otherClinic = await createTestClinicWithDoctor();
    const day = nextMonday();

    const entry = await addToWaitlist({
      clinicId: clinic.id,
      doctorId: doctor.id,
      day,
      patientName: "بیمار",
      patientPhone: "09120000044",
    });

    await removeFromWaitlist(otherClinic.clinic.id, entry.id);
    expect(await listWaitlist(clinic.id)).toHaveLength(1);

    await removeFromWaitlist(clinic.id, entry.id);
    expect(await listWaitlist(clinic.id)).toHaveLength(0);
  });
});
