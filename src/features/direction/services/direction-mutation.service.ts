import { createHash } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
export type DirectionTx = Prisma.TransactionClient;
export class DirectionError extends Error {
  constructor(
    message: string,
    public field?: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const jsonValue = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(
    JSON.stringify(value, (_key, v) =>
      typeof v === "bigint" ? v.toString() : v,
    ),
  );
export const fingerprint = (value: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(jsonValue(value)))
    .digest("hex");
export const storedDate = (day: string) => new Date(`${day}T00:00:00.000Z`);
export const dateLabel = (day: Date | null | undefined) =>
  day?.toISOString().slice(0, 10);
export async function lockDirection(
  tx: DirectionTx,
  userId: string,
  key: string,
) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`direction:${userId}:${key}`},0))::text`;
}
export function requireVersion(actual: number, expected: number | undefined) {
  if (actual !== expected)
    throw new DirectionError(
      "This record changed. Your entries are preserved; review the latest version before saving again.",
      undefined,
      409,
    );
}

/** Inspect Prisma/adapter codes for a confirmed rollback, including raw-query metadata. */
export function isDirectionWriteConflict(error: unknown): boolean {
  const pending: unknown[] = [error];
  const visited = new Set<object>();
  while (pending.length) {
    const current = pending.pop();
    if (!current || typeof current !== "object" || visited.has(current))
      continue;
    visited.add(current);
    const value = current as {
      code?: unknown;
      originalCode?: unknown;
      kind?: unknown;
      cause?: unknown;
      meta?: unknown;
      driverAdapterError?: unknown;
    };
    if (
      value.code === "P2034" ||
      ["40001", "40P01"].includes(String(value.code)) ||
      ["40001", "40P01"].includes(String(value.originalCode)) ||
      value.kind === "TransactionWriteConflict"
    )
      return true;
    pending.push(value.cause, value.meta, value.driverAdapterError);
  }
  return false;
}

/** Retry only a confirmed rollback, rebuilding the transaction and evidence snapshot. */
export async function retryDirectionTransaction<T>(
  work: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await work();
    } catch (error) {
      if (attempt >= 2 || !isDirectionWriteConflict(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 15 * (attempt + 1)));
    }
  }
}
