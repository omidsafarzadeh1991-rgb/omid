import { describe, expect, it } from "vitest";
import { canManageClinic } from "@/lib/roles";

describe("canManageClinic", () => {
  it("allows OWNER and ADMIN", () => {
    expect(canManageClinic("OWNER")).toBe(true);
    expect(canManageClinic("ADMIN")).toBe(true);
  });

  it("rejects RECEPTIONIST", () => {
    expect(canManageClinic("RECEPTIONIST")).toBe(false);
  });
});
