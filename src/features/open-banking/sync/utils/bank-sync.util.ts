import { z } from "zod";
import { DateTime } from "luxon";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { BankProviderError } from "../../providers/types/bank-provider.types";

export const bankSyncCursorSchema = z.object({
  accountIds: z.array(z.string()),
  accountIndex: z.number().int().nonnegative(),
  phase: z.enum(["BALANCES", "TRANSACTIONS"]),
  page: z.number().int().nonnegative(),
  continuationKey: z.string().optional(),
  dateFrom: z.iso.date().optional(),
  dateTo: z.iso.date(),
  longestHistory: z.boolean(),
});
export type BankSyncCursor = z.infer<typeof bankSyncCursorSchema>;
export function bankSyncDateBounds(
  longestHistory: boolean,
  lastSuccessAt: Date | null,
  now = new Date(),
  zone = APP_TIMEZONE,
) {
  const dateTo = DateTime.fromJSDate(now).setZone(zone).toISODate()!;
  if (longestHistory) return { dateTo };
  // Ninety days cover corrections; an older successful sync extends downtime catch-up.
  const overlap = now.getTime() - 90 * 86400_000;
  const catchup = lastSuccessAt
    ? lastSuccessAt.getTime() - 7 * 86400_000
    : overlap;
  return {
    dateTo,
    dateFrom: DateTime.fromMillis(Math.min(overlap, catchup))
      .setZone(zone)
      .toISODate()!,
  };
}
export function bankRetryDate(
  error: unknown,
  attempts: number,
  cadenceSeconds: number,
  now = new Date(),
) {
  if (
    error instanceof BankProviderError &&
    error.retryAt &&
    error.retryAt > now
  )
    return error.retryAt;
  const seconds =
    error instanceof BankProviderError &&
    (error.status === 429 || error.code === "ASPSP_RATE_LIMIT_EXCEEDED")
      ? cadenceSeconds
      : Math.min(
          86400,
          [60, 3600, 7200, 14400][Math.min(attempts - 1, 3)] *
            2 ** Math.max(0, attempts - 4),
        );
  return new Date(now.getTime() + seconds * 1000);
}
export function bankFailureCode(error: unknown) {
  return error instanceof BankProviderError
    ? error.code
    : error instanceof z.ZodError
      ? "INVALID_PROVIDER_DATA"
      : "SYNC_FAILED";
}
export function bankRequiresReauthorization(error: unknown) {
  return (
    error instanceof BankProviderError &&
    [
      "SESSION_EXPIRED",
      "SESSION_NOT_FOUND",
      "SESSION_CLOSED",
      "INVALID_SESSION",
    ].includes(error.code)
  );
}
