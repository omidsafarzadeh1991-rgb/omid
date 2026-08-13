import "server-only";
import { prisma } from "@/lib/prisma";

export async function getAllDoctors() {
  return prisma.doctor.findMany({ orderBy: { createdAt: "asc" } });
}

export async function getFeaturedDoctors(limit = 3) {
  return prisma.doctor.findMany({
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}
