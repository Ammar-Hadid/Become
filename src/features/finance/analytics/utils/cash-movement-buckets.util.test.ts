import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import {
  formatCashMovementBucketDate,
  getCashMovementBuckets,
} from "@/features/finance/analytics/utils/cash-movement-buckets.util";
import { getPeriod } from "@/lib/dates/utils/period.util";

const zone = "Europe/Amsterdam";

describe("cash movement buckets", () => {
  it("uses daily buckets for a week", () => {
    const period = getPeriod(DateTime.fromISO("2026-09-02", { zone }), "week");
    const buckets = getCashMovementBuckets(period);

    expect(buckets).toHaveLength(7);
    expect(buckets[0].start.toISODate()).toBe(period.start.toISODate());
    expect(buckets.at(-1)?.end.toISODate()).toBe(period.end.toISODate());
  });

  it("uses compact weekly buckets for a month", () => {
    const period = getPeriod(DateTime.fromISO("2026-09-02", { zone }), "month");
    const buckets = getCashMovementBuckets(period);

    expect(buckets).toHaveLength(5);
    expect(buckets.map((bucket) => bucket.label)).toEqual([
      "W1",
      "W2",
      "W3",
      "W4",
      "W5",
    ]);
    expect(buckets[0].start.toISODate()).toBe(period.start.toISODate());
    expect(buckets.at(-1)?.end.toISODate()).toBe(period.end.toISODate());
  });

  it("uses continuous weekly buckets across a season", () => {
    const period = getPeriod(
      DateTime.fromISO("2026-08-14", { zone }),
      "season",
    );
    const buckets = getCashMovementBuckets(period);

    expect(buckets.length).toBeGreaterThanOrEqual(13);
    expect(buckets[0]).toMatchObject({ label: "W1" });
    expect(buckets[0].start.toISODate()).toBe(period.start.toISODate());
    expect(buckets.at(-1)?.end.toISODate()).toBe(period.end.toISODate());
    expect(formatCashMovementBucketDate(buckets[0], "season")).toBe(
      "1–7 Jul 2026",
    );
    expect(
      buckets.every(
        (bucket, index) =>
          index === 0 ||
          bucket.start.toMillis() === buckets[index - 1].end.toMillis(),
      ),
    ).toBe(true);
  });

  it("keeps monthly buckets for a year", () => {
    const period = getPeriod(DateTime.fromISO("2026-09-02", { zone }), "year");
    const buckets = getCashMovementBuckets(period);

    expect(buckets).toHaveLength(12);
    expect(buckets.map((bucket) => bucket.label)).toEqual([
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ]);
  });
});
