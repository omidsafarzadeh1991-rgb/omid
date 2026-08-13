import "server-only";
import { prisma } from "@/lib/prisma";

/** All services, newest first — used by the full /services listing. */
export async function getAllServices() {
  return prisma.service.findMany({ orderBy: { createdAt: "asc" } });
}

/** A small subset for the homepage preview section. */
export async function getFeaturedServices(limit = 6) {
  return prisma.service.findMany({
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

/** Distinct category labels, used to build the services page filter. */
export async function getServiceCategories() {
  const rows = await prisma.service.findMany({
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });
  return rows.map((row) => row.category);
}

/** Minimal projection for the appointment form's service <select>. */
export async function getServiceOptions() {
  return prisma.service.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
}

export async function getServiceById(id: string) {
  return prisma.service.findUnique({ where: { id } });
}

interface ServiceSearchParams {
  q?: string;
  category?: string;
}

/**
 * Server-side filtering for the /services listing. Kept as a single
 * Prisma query (rather than filtering in memory) so this stays correct as
 * the catalog grows beyond a handful of rows.
 */
export async function searchServices({ q, category }: ServiceSearchParams) {
  return prisma.service.findMany({
    where: {
      AND: [
        category ? { category } : {},
        q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    orderBy: { createdAt: "asc" },
  });
}
