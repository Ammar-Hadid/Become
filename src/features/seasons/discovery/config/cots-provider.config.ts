export function cotsLimits() {
  const bounded = (name: string, fallback: number, maximum: number) => {
    const value = Number(process.env[name]);
    return Number.isInteger(value) && value > 0
      ? Math.min(value, maximum)
      : fallback;
  };
  return {
    images: bounded("COTS_MAX_IMAGES", 24, 100),
    quotes: bounded("COTS_MAX_QUOTES", 48, 200),
  };
}
export function cotsProviderEnabled(provider: string) {
  const enabled = process.env.COTS_ENABLED_PROVIDERS;
  return (
    !enabled ||
    enabled
      .split(",")
      .map((v) => v.trim())
      .includes(provider)
  );
}
export const cotsSpendLimit = () =>
  Math.max(0, Number(process.env.COTS_MONTHLY_SPEND_LIMIT_USD) || 0);
export function cotsPaidCommitments() {
  const serpapi = process.env.COTS_SERPAPI_PLAN === "starter" ? 25 : 0;
  const clipcafe =
    process.env.COTS_CLIPCAFE_RETENTION_ALLOWED === "true" &&
    process.env.COTS_CLIPCAFE_API_KEY
      ? Math.max(0, Number(process.env.COTS_CLIPCAFE_MONTHLY_COST_USD) || 0)
      : 0;
  return { serpapi, clipcafe, total: serpapi + clipcafe };
}
