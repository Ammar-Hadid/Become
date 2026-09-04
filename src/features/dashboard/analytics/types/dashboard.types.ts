import type { Timeframe } from "@/lib/dates/utils/period.util";

export type DashboardData = {
  timeframe: Timeframe;
  periodLabel: string;
  totalSeconds: number;
  previousTotalSeconds: number;
  comparisonPercent: number | null;
  todaySeconds: number;
  activeDays: number;
  domains: Array<{
    id: string;
    name: string;
    slug: string;
    color: string;
    seconds: number;
    previousSeconds: number;
  }>;
  chart: Array<{ label: string; seconds: number }>;
};
