import "server-only";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

export function verifySetupPassword(candidate: string): boolean {
  const expected = process.env.SETUP_PASSWORD;
  if (!expected) {
    throw new Error("SETUP_PASSWORD is not set");
  }

  const candidateBuf = Buffer.from(candidate);
  const expectedBuf = Buffer.from(expected);
  if (candidateBuf.length !== expectedBuf.length) {
    return false;
  }
  return timingSafeEqual(candidateBuf, expectedBuf);
}

/** Each installation is a single clinic; setup is done once a Clinic row exists. */
export async function isSetupComplete(): Promise<boolean> {
  const clinic = await prisma.clinic.findFirst({ select: { id: true } });
  return clinic !== null;
}
