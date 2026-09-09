const MAX_MINOR = 9223372036854775807n;
const MIN_MINOR = -9223372036854775808n;
const currencies = new Set(Intl.supportedValuesOf("currency"));

export function normalizeCurrency(value: string) {
  const currency = value.trim().toUpperCase();
  if (!currencies.has(currency))
    throw new Error("Choose a valid ISO currency.");
  return currency;
}

export function currencyExponent(currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: normalizeCurrency(currency),
  }).resolvedOptions().maximumFractionDigits!;
}

export function assertMinorRange(value: bigint) {
  if (value > MAX_MINOR || value < MIN_MINOR)
    throw new Error("Amount exceeds the supported money range.");
  return value;
}

// A decimal dot or comma is accepted; grouping separators are intentionally not
// accepted because '1,250' can mean two different amounts.
export function parseMoney(input: string, currency: string): bigint {
  const exponent = currencyExponent(currency);
  const match = /^(-?)(\d+)(?:[.,](\d+))?$/.exec(input.trim());
  if (!match || (match[3]?.length ?? 0) > exponent) {
    throw new Error(
      `Enter an amount with at most ${exponent} decimal places, without grouping separators.`,
    );
  }
  const magnitude =
    BigInt(match[2]) * 10n ** BigInt(exponent) +
    BigInt((match[3] ?? "").padEnd(exponent, "0") || "0");
  return assertMinorRange(match[1] ? -magnitude : magnitude);
}

export function moneyDecimal(amount: bigint, currency: string) {
  const exponent = currencyExponent(currency);
  const digits = (amount < 0n ? -amount : amount)
    .toString()
    .padStart(exponent + 1, "0");
  return `${amount < 0n ? "-" : ""}${exponent ? `${digits.slice(0, -exponent)}.${digits.slice(-exponent)}` : digits}`;
}

export function formatMoney(amount: bigint | string, currency: string) {
  const minor = BigInt(amount);
  const decimal = moneyDecimal(minor, currency);
  const [whole, fraction] = decimal.replace("-", "").split(".");
  const grouped = BigInt(whole).toLocaleString("en-GB");
  return `${minor < 0n ? "−" : ""}${normalizeCurrency(currency)} ${grouped}${fraction ? `.${fraction}` : ""}`;
}

export function distributeMoney(
  amount: bigint,
  weights: readonly bigint[],
): bigint[] {
  if (amount < 0n || weights.some((weight) => weight < 0n))
    throw new Error("Allocation values must be nonnegative.");
  const total = weights.reduce((sum, weight) => sum + weight, 0n);
  if (total === 0n) {
    if (amount !== 0n)
      throw new Error("At least one positive duration is required.");
    return weights.map(() => 0n);
  }
  const result = weights.map((weight) => (amount * weight) / total);
  let remainder = amount - result.reduce((sum, value) => sum + value, 0n);
  const ranked = weights
    .map((weight, index) => ({ index, remainder: (amount * weight) % total }))
    .sort((a, b) =>
      a.remainder === b.remainder
        ? a.index - b.index
        : a.remainder > b.remainder
          ? -1
          : 1,
    );
  for (const entry of ranked) {
    if (remainder-- <= 0n) break;
    result[entry.index] += 1n;
  }
  return result;
}

export const positivePart = (value: bigint) => (value > 0n ? value : 0n);
export const minMoney = (a: bigint, b: bigint) => (a < b ? a : b);

export function supportedCurrencyOptions() {
  const names = new Intl.DisplayNames(["en"], { type: "currency" });
  return [...currencies].map((code) => ({
    id: code,
    name: `${code} · ${names.of(code) ?? code}`,
  }));
}
