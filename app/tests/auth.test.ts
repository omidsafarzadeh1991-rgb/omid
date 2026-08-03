import { describe, expect, it } from "vitest";
import { createStaffMember, registerClinic, verifyLogin } from "@/lib/auth";

let counter = 0;
function uniqueEmail() {
  counter += 1;
  return `admin${counter}@example.com`;
}

describe("registerClinic / verifyLogin", () => {
  it("registers a clinic with its founding account as OWNER and allows login", async () => {
    const email = uniqueEmail();
    const registered = await registerClinic({
      clinicName: "کلینیک تست",
      adminName: "مدیر تست",
      adminEmail: email,
      adminPassword: "SuperSecret123",
    });
    expect(registered.ok).toBe(true);

    const login = await verifyLogin(email, "SuperSecret123");
    expect(login.ok).toBe(true);
    if (login.ok) {
      expect(login.role).toBe("OWNER");
    }
  });

  it("rejects login with the wrong password", async () => {
    const email = uniqueEmail();
    await registerClinic({
      clinicName: "کلینیک تست ۲",
      adminName: "مدیر",
      adminEmail: email,
      adminPassword: "CorrectPassword1",
    });

    const login = await verifyLogin(email, "WrongPassword");
    expect(login.ok).toBe(false);
  });

  it("rejects registering the same admin email twice", async () => {
    const email = uniqueEmail();
    await registerClinic({
      clinicName: "کلینیک ۱",
      adminName: "مدیر ۱",
      adminEmail: email,
      adminPassword: "SuperSecret123",
    });

    const second = await registerClinic({
      clinicName: "کلینیک ۲",
      adminName: "مدیر ۲",
      adminEmail: email,
      adminPassword: "SuperSecret123",
    });

    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.reason).toBe("EMAIL_TAKEN");
    }
  });
});

describe("createStaffMember", () => {
  it("adds a receptionist to a clinic who can then log in", async () => {
    const adminEmail = uniqueEmail();
    const registered = await registerClinic({
      clinicName: "کلینیک با منشی",
      adminName: "مدیر",
      adminEmail,
      adminPassword: "SuperSecret123",
    });
    expect(registered.ok).toBe(true);
    if (!registered.ok) return;

    const receptionistEmail = uniqueEmail();
    const created = await createStaffMember({
      clinicId: registered.clinicId,
      name: "منشی تست",
      email: receptionistEmail,
      password: "ReceptionistPass1",
      role: "RECEPTIONIST",
    });
    expect(created.ok).toBe(true);

    const login = await verifyLogin(receptionistEmail, "ReceptionistPass1");
    expect(login.ok).toBe(true);
    if (login.ok) {
      expect(login.role).toBe("RECEPTIONIST");
      expect(login.clinicId).toBe(registered.clinicId);
    }
  });

  it("rejects adding a staff member with a duplicate email", async () => {
    const adminEmail = uniqueEmail();
    const registered = await registerClinic({
      clinicName: "کلینیک دیگر",
      adminName: "مدیر",
      adminEmail,
      adminPassword: "SuperSecret123",
    });
    expect(registered.ok).toBe(true);
    if (!registered.ok) return;

    const duplicate = await createStaffMember({
      clinicId: registered.clinicId,
      name: "یک نفر دیگر",
      email: adminEmail,
      password: "AnotherPass1",
      role: "RECEPTIONIST",
    });

    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) {
      expect(duplicate.reason).toBe("EMAIL_TAKEN");
    }
  });
});
