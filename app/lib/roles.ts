import type { StaffRole } from "@/generated/prisma/client";

/** OWNER has every ADMIN capability plus secrets/security/backup access. */
export function canManageClinic(role: StaffRole): boolean {
  return role === "ADMIN" || role === "OWNER";
}
