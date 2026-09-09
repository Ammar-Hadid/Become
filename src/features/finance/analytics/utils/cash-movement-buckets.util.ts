import { DateTime } from "luxon";
import {
  getPeriodBuckets,
  type Period,
  type PeriodBucket,
  type Timeframe,
} from "@/lib/dates/utils/period.util";

export function getCashMovementBuckets(period: Period): PeriodBucket[] {
  if (period.timeframe !== "season") return getPeriodBuckets(period);

  const buckets: PeriodBucket[] = [];
  let start = period.start;
  let index = 1;

  while (start < period.end) {
    const end = DateTime.min(start.plus({ weeks: 1 }), period.end);
    buckets.push({ start, end, label: `W${index++}` });
    start = end;
  }

  return buckets;
}

export function formatCashMovementBucketDate(
  bucket: PeriodBucket,
  timeframe: Timeframe,
) {
  if (timeframe === "year") return bucket.start.toFormat("LLLL yyyy");

  const finalDay = bucket.end.minus({ days: 1 });
  if (bucket.start.hasSame(finalDay, "day")) {
    return bucket.start.toFormat("ccc, d LLL yyyy");
  }
  if (bucket.start.hasSame(finalDay, "month")) {
    return `${bucket.start.toFormat("d")}–${finalDay.toFormat("d LLL yyyy")}`;
  }
  return `${bucket.start.toFormat("d LLL")}–${finalDay.toFormat("d LLL yyyy")}`;
}
