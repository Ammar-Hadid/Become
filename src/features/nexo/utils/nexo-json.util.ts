import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";

export function nexoJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value, (_key, item) =>
      typeof item === "bigint" ? item.toString() : item,
    ),
  ) as Prisma.InputJsonValue;
}
export function nexoFingerprint(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(nexoJson(value)))
    .digest("hex");
}
