import { DateTime } from "luxon";
import { expect, it } from "vitest";
import { effectiveHourlyRate } from "./effective-rate.util";
import { getPeriod } from "@/lib/dates/utils/period.util";
const now = DateTime.fromISO("2026-03-03T00:00", { zone: "Europe/Amsterdam" });
const period = getPeriod(now, "month");
const work = {
  pauses: [],
  startedAt: new Date("2026-02-28T22:00:00Z"),
  endedAt: new Date("2026-03-01T00:00:00Z"),
  paymentAttributionCompleteAt: new Date(),
  paymentAllocations: [
    { amountMinor: 10001n, transaction: { currency: "EUR" } },
  ],
};
it("attributes late/early payment to overlapping work with rounding only at display", () => {
  const rate = effectiveHourlyRate([work], period, now);
  expect(rate).toMatchObject({
    state: "AVAILABLE",
    currency: "EUR",
    displayMinor: 5001n,
  });
  if (rate.state === "AVAILABLE")
    expect(rate.numerator * 2n).toBe(rate.denominator * 10001n);
});
it("distinguishes every unavailable state", () => {
  expect(effectiveHourlyRate([], period, now).state).toBe("NO_PAID_WORK");
  expect(
    effectiveHourlyRate(
      [{ ...work, paymentAttributionCompleteAt: null }],
      period,
      now,
    ).state,
  ).toBe("INCOMPLETE_ATTRIBUTION");
  expect(
    effectiveHourlyRate([{ ...work, paymentAllocations: [] }], period, now)
      .state,
  ).toBe("NO_LINKED_INCOME");
  expect(
    effectiveHourlyRate(
      [
        {
          ...work,
          paymentAllocations: [
            ...work.paymentAllocations,
            { amountMinor: 10n, transaction: { currency: "USD" } },
          ],
        },
      ],
      period,
      now,
    ).state,
  ).toBe("MIXED_CURRENCY");
});

it("excludes breaks from both overlapping work and the full paid-work denominator", () => {
  const pausedWork = {
    ...work,
    pauses: [
      {
        startedAt: new Date("2026-02-28T22:30:00Z"),
        endedAt: new Date("2026-02-28T23:30:00Z"),
      },
    ],
  };
  const rate = effectiveHourlyRate([pausedWork], period, now);
  expect(rate).toMatchObject({ state: "AVAILABLE", displayMinor: 10001n });
  const onlyBreak = {
    ...period,
    start: DateTime.fromISO("2026-02-28T22:45:00Z"),
    end: DateTime.fromISO("2026-02-28T23:15:00Z"),
  };
  expect(effectiveHourlyRate([pausedWork], onlyBreak, now).state).toBe(
    "NO_PAID_WORK",
  );
});
