import { createHash } from "node:crypto";
import { DateTime } from "luxon";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { FinanceError } from "@/features/finance/types/finance.types";
export function evidenceHash(value: unknown): string {
  const stable = (v: unknown): unknown => {
    if (typeof v === "bigint") return v.toString();
    if (v instanceof Date) return v.toISOString();
    if (Array.isArray(v)) return v.map(stable);
    if (v && typeof v === "object")
      return Object.fromEntries(
        Object.entries(v)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, x]) => [k, stable(x)]),
      );
    return v;
  };
  return createHash("sha256")
    .update(JSON.stringify(stable(value)))
    .digest("hex");
}
export function evidenceDay(value: string): Date {
  const day = DateTime.fromISO(value, { zone: APP_TIMEZONE });
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !day.isValid ||
    day.toISODate() !== value
  )
    throw new FinanceError("A valid transaction date is required.");
  return day.startOf("day").toUTC().toJSDate();
}
export function evidenceWindow(value: string, days = 3) {
  const day = DateTime.fromISO(value, { zone: APP_TIMEZONE });
  return {
    gte: day.minus({ days }).startOf("day").toUTC().toJSDate(),
    lt: day
      .plus({ days: days + 1 })
      .startOf("day")
      .toUTC()
      .toJSDate(),
  };
}
export function activityDay(occurredAt: Date, activityOn?: string | null) {
  return (
    activityOn ??
    DateTime.fromJSDate(occurredAt).setZone(APP_TIMEZONE).toISODate()!
  );
}
export function normalizeExternalIdentity(value: string) {
  return evidenceHash(value.replace(/\s/g, "").toUpperCase());
}

export function counterpartyNameIdentity(name: string) {
  const normalized = name
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
  return normalized ? "name:" + evidenceHash(normalized) : null;
}
