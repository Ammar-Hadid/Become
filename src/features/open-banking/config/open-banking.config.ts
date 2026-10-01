import { z } from "zod";

const cadenceSchema = z.record(
  z.string(),
  z
    .number()
    .int()
    .min(60)
    .max(30 * 86400),
);

export function getOpenBankingConfig(source: NodeJS.ProcessEnv = process.env) {
  const monthlyCost = Number(source.OPEN_BANKING_MONTHLY_COST_EUR ?? "0");
  if (!Number.isFinite(monthlyCost) || monthlyCost < 0 || monthlyCost > 10)
    throw new Error(
      "Open Banking monthly provider cost must be between EUR 0 and EUR 10.",
    );
  const appId = source.ENABLE_BANKING_APP_ID?.trim() ?? "";
  const privateKeyPath = source.ENABLE_BANKING_PRIVATE_KEY_PATH?.trim() ?? "";
  const intervalSeconds = z.coerce
    .number()
    .int()
    .min(60)
    .max(30 * 86400)
    .parse(source.OPEN_BANKING_SYNC_INTERVAL_SECONDS ?? "21600");
  const overrides = cadenceSchema.parse(
    JSON.parse(source.OPEN_BANKING_INSTITUTION_CADENCE_JSON ?? "{}"),
  );
  const origin = new URL(source.BETTER_AUTH_URL ?? "http://localhost:3010");
  return {
    configured: Boolean(appId && privateKeyPath),
    appId,
    privateKeyPath,
    callbackUrl: new URL("/api/open-banking/callback", origin).href,
    intervalSeconds,
    institutionCadence: overrides,
    monthlyCost,
  };
}

export function bankSyncCadenceSeconds(
  provider: string,
  country: string,
  institution: string,
) {
  const config = getOpenBankingConfig();
  return (
    config.institutionCadence[`${provider}:${country}:${institution}`] ??
    config.intervalSeconds
  );
}
