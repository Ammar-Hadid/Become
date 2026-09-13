import { DateTime } from "luxon";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import {
  getPeriod,
  getPreviousPeriod,
  TIMEFRAMES,
} from "@/lib/dates/utils/period.util";
import { reviewHref } from "@/features/reviews/periods/utils/review-period.util";
import { getReviewHistory } from "@/features/reviews/persistence/queries/review.query";
import { ReviewHistoryReading } from "@/features/reviews/history/components/review-history-reading.component";

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const now = DateTime.now().setZone("Europe/Amsterdam");
  const entries = TIMEFRAMES.flatMap((timeframe) => {
    const current = getPeriod(now, timeframe),
      previous = getPreviousPeriod(current);
    return [current, previous].map((period, index) => ({
      timeframe,
      label: `${index === 0 ? "Current" : "Previous"} · ${period.label}`,
      href: reviewHref(timeframe, period.start.toISODate()!),
    }));
  });
  const cursor = (await searchParams).cursor;
  return (
    <ReviewHistoryReading
      history={await getReviewHistory(
        user.id,
        typeof cursor === "string" && cursor.length < 200 ? cursor : undefined,
      )}
      entries={entries}
    />
  );
}
