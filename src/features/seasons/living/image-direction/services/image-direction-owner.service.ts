import "server-only";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { DirectionError } from "@/features/direction/services/direction-mutation.service";

const demoOwnerEmail = "demotest@gmail.com";

/** Owner access is explicit; database creation order must not grant privileges. */
export async function isImageDirectionOwner(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) return false;

  // The disposable demo account can exercise the owner-only studio locally.
  if (process.env.NODE_ENV === "development" && user.email.toLowerCase() === demoOwnerEmail) return true;

  const configured = process.env.BECOME_OWNER_EMAIL?.trim().toLowerCase();
  return Boolean(configured && user.email.toLowerCase() === configured);
}

export async function requireImageDirectionOwner(userId: string) {
  if (!await isImageDirectionOwner(userId))
    throw new DirectionError("Image Direction is available only to the owner.", undefined, 403);
}
