import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
import { FinanceForecastPage } from "@/features/finance/forecast/components/finance-forecast-page.component";
import type { ForecastHorizon } from "@/features/finance/forecast/types/finance-forecast.types";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ horizon?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const requested = Number((await searchParams).horizon);
  const horizonDays: ForecastHorizon = [7, 30, 90].includes(requested)
    ? (requested as ForecastHorizon)
    : 30;
  return <FinanceForecastPage userId={user.id} horizonDays={horizonDays} />;
}
