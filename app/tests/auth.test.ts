import { describe, expect, it } from "vitest";
import { createStaffMember, registerClinic, verifyLogin } from "@/lib/auth";

let counter = 0;
function uniqueUsername() {
  counter += 1;
  return `admin${counter}`;
}

describe("registerClinic / verifyLogin", () => {
  it("registers a clinic with its founding account as OWNER and allows login", async () => {
    const username = uniqueUsername();
    const registered = await registerClinic({
      clinicName: "کلینیک تست",
      adminUsername: username,
      adminFirstName: "مدیر تست",
      adminPassword: "SuperSecret123",
    });
    expect(registered.ok).toBe(true);

    const login = await verifyLogin(username, "SuperSecret123");
    expect(login.ok).toBe(true);
    if (login.ok) {
      expect(login.role).toBe("OWNER");
    }
  });

  it("rejects login with the wrong password", async () => {
    const username = uniqueUsername();
    await registerClinic({
      clinicName: "کلینیک تست ۲",
      adminUsername: username,
      adminFirstName: "مدیر",
      adminPassword: "CorrectPassword1",
    });

    const login = await verifyLogin(username, "WrongPassword");
    expect(login.ok).toBe(false);
  });

  it("rejects registering the same admin username twice", async () => {
    const username = uniqueUsername();
    await registerClinic({
      clinicName: "کلینیک ۱",
      adminUsername: username,
      adminFirstName: "مدیر ۱",
      adminPassword: "SuperSecret123",
    });

    const second = await registerClinic({
      clinicName: "کلینیک ۲",
      adminUsername: username,
      adminFirstName: "مدیر ۲",
      adminPassword: "SuperSecret123",
    });

    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.reason).toBe("USERNAME_TAKEN");
    }
  });
});

describe("createStaffMember", () => {
  it("adds a receptionist to a clinic who can then log in", async () => {
    const registered = await registerClinic({
      clinicName: "کلینیک با منشی",
      adminUsername: uniqueUsername(),
      adminFirstName: "مدیر",
      adminPassword: "SuperSecret123",
    });
    expect(registered.ok).toBe(true);
    if (!registered.ok) return;

    const receptionistUsername = uniqueUsername();
    const created = await createStaffMember({
      clinicId: registered.clinicId,
      username: receptionistUsername,
      firstName: "منشی تست",
      password: "ReceptionistPass1",
      role: "RECEPTIONIST",
      mustChangePassword: false,
    });
    expect(created.ok).toBe(true);

    const login = await verifyLogin(receptionistUsername, "ReceptionistPass1");
    expect(login.ok).toBe(true);
    if (login.ok) {
      expect(login.role).toBe("RECEPTIONIST");
      expect(login.clinicId).toBe(registered.clinicId);
    }
  });

  it("rejects adding a staff member with a duplicate username", async () => {
    const adminUsername = uniqueUsername();
    const registered = await registerClinic({
      clinicName: "کلینیک دیگر",
      adminUsername,
      adminFirstName: "مدیر",
      adminPassword: "SuperSecret123",
    });
    expect(registered.ok).toBe(true);
    if (!registered.ok) return;

    const duplicate = await createStaffMember({
      clinicId: registered.clinicId,
      username: adminUsername,
      firstName: "یک نفر دیگر",
      password: "AnotherPass1",
      role: "RECEPTIONIST",
    });

    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) {
      expect(duplicate.reason).toBe("USERNAME_TAKEN");
    }
  });

  it("defaults to requiring a password change on first login", async () => {
    const registered = await registerClinic({
      clinicName: "کلینیک با اجبار تغییر رمز",
      adminUsername: uniqueUsername(),
      adminFirstName: "مدیر",
      adminPassword: "SuperSecret123",
    });
    expect(registered.ok).toBe(true);
    if (!registered.ok) return;

    const username = uniqueUsername();
    await createStaffMember({
      clinicId: registered.clinicId,
      username,
      firstName: "منشی جدید",
      password: "TempPass123",
      role: "RECEPTIONIST",
    });

    const login = await verifyLogin(username, "TempPass123");
    expect(login.ok).toBe(true);
    if (login.ok) {
      expect(login.mustChangePassword).toBe(true);
    }
  });

  it("rejects login for a deactivated account", async () => {
    const registered = await registerClinic({
      clinicName: "کلینیک با حساب غیرفعال",
      adminUsername: uniqueUsername(),
      adminFirstName: "مدیر",
      adminPassword: "SuperSecret123",
    });
    expect(registered.ok).toBe(true);
    if (!registered.ok) return;

    const username = uniqueUsername();
    const created = await createStaffMember({
      clinicId: registered.clinicId,
      username,
      firstName: "منشی غیرفعال",
      password: "SomePass123",
      role: "RECEPTIONIST",
      mustChangePassword: false,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const { prisma } = await import("@/lib/prisma");
    await prisma.staffUser.update({
      where: { id: created.staffId },
      data: { active: false },
    });

    const login = await verifyLogin(username, "SomePass123");
    expect(login.ok).toBe(false);
    if (!login.ok) {
      expect(login.reason).toBe("INACTIVE");
    }
  });
});
