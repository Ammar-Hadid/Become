import { prisma } from "@/lib/db/adapters/prisma.adapter";

export function getPersonalSettings(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
}
