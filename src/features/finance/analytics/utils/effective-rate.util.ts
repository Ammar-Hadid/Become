import {
  calculateSessionDurationWithinPeriod,
  calculateSessionMilliseconds,
} from "@/features/sessions/timing/utils/session-duration.util";
import { DateTime } from "luxon";
import { type Period } from "@/lib/dates/utils/period.util";
type PaidSession = {
  startedAt: Date;
  endedAt: Date | null;
  pauses: ReadonlyArray<{ startedAt: Date; endedAt: Date | null }>;
  paymentAttributionCompleteAt: Date | null;
  paymentAllocations: {
    amountMinor: bigint;
    transaction: { currency: string };
  }[];
};
function gcd(a: bigint, b: bigint): bigint {
  return b === 0n ? a : gcd(b, a % b);
}
export function effectiveHourlyRate(
  sessions: PaidSession[],
  period: Period,
  now: DateTime,
) {
  const overlapping = sessions
    .map((session) => ({
      session,
      seconds: calculateSessionDurationWithinPeriod(session, period, now),
    }))
    .filter((item) => item.seconds > 0);
  if (!overlapping.length) return { state: "NO_PAID_WORK" } as const;
  if (
    overlapping.some(
      ({ session }) =>
        !session.endedAt || !session.paymentAttributionCompleteAt,
    )
  )
    return { state: "INCOMPLETE_ATTRIBUTION" } as const;
  const currencies = new Set(
    overlapping.flatMap(({ session }) =>
      session.paymentAllocations.map(
        (allocation) => allocation.transaction.currency,
      ),
    ),
  );
  if (!currencies.size) return { state: "NO_LINKED_INCOME" } as const;
  if (currencies.size > 1) return { state: "MIXED_CURRENCY" } as const;
  let numerator = 0n;
  let denominator = 1n;
  let seconds = 0n;
  for (const { session, seconds: overlap } of overlapping) {
    const duration = BigInt(
      Math.floor(calculateSessionMilliseconds(session, now.toMillis()) / 1000),
    );
    const amount = session.paymentAllocations.reduce(
      (sum, allocation) => sum + allocation.amountMinor,
      0n,
    );
    numerator = numerator * duration + amount * BigInt(overlap) * denominator;
    denominator *= duration;
    const divisor = gcd(numerator, denominator);
    numerator /= divisor;
    denominator /= divisor;
    seconds += BigInt(overlap);
  }
  const rateNumerator = numerator * 3600n;
  const rateDenominator = denominator * seconds;
  return {
    state: "AVAILABLE",
    currency: [...currencies][0],
    numerator: rateNumerator,
    denominator: rateDenominator,
    displayMinor:
      (rateNumerator * 2n + rateDenominator) / (rateDenominator * 2n),
  } as const;
}
