import "server-only";
import { prisma } from "@/lib/prisma";
import type { SecurityEventType } from "@/generated/prisma/client";

export async function logSecurityEvent(
  clinicId: string,
  event: SecurityEventType,
  detail?: string,
  actorStaffId?: string
): Promise<void> {
  await prisma.securityLog.create({
    data: { clinicId, event, detail, actorStaffId },
  });
}

export async function listSecurityLog(clinicId: string, limit = 30) {
  return prisma.securityLog.findMany({
    where: { clinicId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { actorStaff: { select: { firstName: true } } },
  });
}
