"use server";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
export async function getBusinessSessionOptionsAction() {
  const user = await getCurrentUser();
  if (!user) return { companies: [], niches: [] };
  const [companies, niches] = await Promise.all([
    prisma.company.findMany({
      where: { userId: user.id, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.niche.findMany({
      where: { userId: user.id, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return { companies, niches };
}
