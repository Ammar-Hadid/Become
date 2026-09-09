import {
  formatMoney,
  normalizeCurrency,
  parseMoney,
} from "@/lib/money/utils/money.util";
export function quoteMoney(
  amount: string | null | undefined,
  currency: string,
) {
  if (!amount?.trim()) return { priceMinor: null, currency: null };
  const code = normalizeCurrency(currency);
  const priceMinor = parseMoney(amount, code);
  if (priceMinor < 0n) throw new Error("A quoted price cannot be negative.");
  return { priceMinor, currency: code };
}
export function quoteLabel(quote: {
  priceMinor: bigint | string | null;
  currency: string | null;
  priceBasis: string;
  unitLabel: string | null;
  intervalUnit: string | null;
  intervalCount: number | null;
}) {
  const basis =
    quote.priceBasis === "HOURLY"
      ? " / hour"
      : quote.priceBasis === "PER_UNIT"
        ? ` / ${quote.unitLabel ?? "unit"}`
        : quote.priceBasis === "RECURRING"
          ? ` every ${quote.intervalCount} ${quote.intervalUnit?.toLowerCase()}${quote.intervalCount === 1 ? "" : "s"}`
          : " fixed";
  return quote.priceMinor === null || !quote.currency
    ? `Price not specified · ${quote.priceBasis.toLowerCase().replaceAll("_", " ")}`
    : `${BigInt(quote.priceMinor) === 0n ? `Free · ${quote.currency} 0` : formatMoney(quote.priceMinor, quote.currency)}${basis}`;
}

// Events arrive in outcome chronology order. Retain accepted terms after later
// cancellation/withdrawal, while reporting that revision's actual current state.
export function offerPresentation<
  R extends { id: string; proposedAt: Date | null },
  E extends {
    offerRevisionId: string;
    kind: string;
    retractedAt?: Date | null;
  },
>(revisions: R[], events: E[]) {
  const active = events.filter((e) => !e.retractedAt);
  const acceptance = active.find((e) => e.kind === "ACCEPTED");
  const quote =
    revisions.find((r) => r.id === acceptance?.offerRevisionId) ?? revisions[0];
  const latest = active.find((e) => e.offerRevisionId === quote.id);
  return {
    quote,
    acceptance,
    latest,
    status: latest?.kind ?? (quote.proposedAt ? "RETAINED_TERMS" : "DRAFT"),
  };
}
