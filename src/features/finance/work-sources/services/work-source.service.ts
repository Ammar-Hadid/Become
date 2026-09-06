import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { workSourceSchema } from "@/features/finance/work-sources/schemas/work-source.schema";
export async function saveWorkSource(
  userId: string,
  input: unknown,
  id?: string,
) {
  const data = workSourceSchema.parse(input);
  return id
    ? prisma.workSource.update({
        where: { id, userId, archivedAt: null },
        data,
      })
    : prisma.workSource.create({ data: { ...data, userId } });
}
export async function archiveWorkSource(userId: string, id: string) {
  await prisma.workSource.update({
    where: { id, userId },
    data: { archivedAt: new Date() },
  });
}
