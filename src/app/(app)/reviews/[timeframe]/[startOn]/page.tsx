import { DirectionError } from "@/features/direction/services/direction-mutation.service";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { reviewIdentitySchema } from "@/features/reviews/contracts/schemas/review.schema";
import { reviewPeriod } from "@/features/reviews/periods/utils/review-period.util";
import { getReviewView } from "@/features/reviews/persistence/queries/review.query";
import { ReviewReading } from "@/features/reviews/reading/components/review-reading.component";
import { DateTime } from "luxon";
import { getPeriod, getPreviousPeriod } from "@/lib/dates/utils/period.util";
import { reviewHref } from "@/features/reviews/periods/utils/review-period.util";

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ timeframe: string; startOn: string }>;
  searchParams: Promise<{ editionId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const identity = reviewIdentitySchema.safeParse(await params);
  if (!identity.success) notFound();
  try {
    reviewPeriod(identity.data.timeframe, identity.data.startOn);
  } catch {
    notFound();
  }
  const editionId = (await searchParams).editionId;
  if (editionId && (typeof editionId !== "string" || editionId.length > 200))
    notFound();
  const view = await getReviewView(user.id, identity.data, editionId).catch(
    (error: unknown) => {
      if (error instanceof DirectionError && error.status === 404) notFound();
      throw error;
    },
  );
  const period = getPeriod(
    DateTime.fromISO(identity.data.startOn, { zone: "Europe/Amsterdam" }),
    identity.data.timeframe,
  );
  const current = getPeriod(
    DateTime.now().setZone("Europe/Amsterdam"),
    identity.data.timeframe,
  );
  const href = (date: DateTime) =>
    reviewHref(identity.data.timeframe, date.toISODate()!);
  return (
    <ReviewReading
      view={view}
      navigation={{
        previousHref: href(getPreviousPeriod(period).start),
        nextHref: period.end <= current.start ? href(period.end) : null,
        currentHref: href(current.start),
        label: `${identity.data.timeframe} review periods`,
      }}
    />
  );
}
