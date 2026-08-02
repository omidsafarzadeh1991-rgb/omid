import "server-only";
import { timingSafeEqual } from "node:crypto";

export function verifySuperadminPassword(candidate: string): boolean {
  const expected = process.env.SUPERADMIN_PASSWORD;
  if (!expected) {
    throw new Error("SUPERADMIN_PASSWORD is not set");
  }

  const candidateBuf = Buffer.from(candidate);
  const expectedBuf = Buffer.from(expected);
  if (candidateBuf.length !== expectedBuf.length) {
    return false;
  }
  return timingSafeEqual(candidateBuf, expectedBuf);
}
