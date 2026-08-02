import { describe, expect, it } from "vitest";
import { verifySuperadminPassword } from "@/lib/superadmin";

describe("verifySuperadminPassword", () => {
  it("accepts the correct password", () => {
    expect(verifySuperadminPassword("test-superadmin-password")).toBe(true);
  });

  it("rejects a wrong password", () => {
    expect(verifySuperadminPassword("wrong-password")).toBe(false);
  });

  it("rejects an empty password", () => {
    expect(verifySuperadminPassword("")).toBe(false);
  });
});
