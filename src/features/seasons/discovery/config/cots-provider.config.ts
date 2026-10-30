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
