import { describe, expect, it } from "vitest";
import { registerClinic, verifyLogin } from "@/lib/auth";

let counter = 0;
function uniqueEmail() {
  counter += 1;
  return `admin${counter}@example.com`;
}

describe("registerClinic / verifyLogin", () => {
  it("registers a clinic with its first admin and allows login", async () => {
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
      expect(login.role).toBe("ADMIN");
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
