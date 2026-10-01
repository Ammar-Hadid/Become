"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/money/utils/money.util";

export type ForecastChartPoint = {
  on: string;
  label: string;
  balance: number | null;
  balanceMinor: string | null;
};

const compactNumber = new Intl.NumberFormat("en-GB", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function FinanceForecastChart({
  currency,
  points,
}: {
  currency: string;
  points: ForecastChartPoint[];
}) {
  const hasProjection = points.some((point) => point.balance !== null);

  return (
    <section
      className="finance-forecast-chart"
      aria-label={`Projected spendable balance in ${currency}`}
    >
      {hasProjection ? (
        <>
          <div className="finance-forecast-chart-plot">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                accessibilityLayer
                data={points}
                title={`Projected spendable balance in ${currency}`}
                desc="A deterministic projection based on recorded balances, confirmed commitments and confirmed expected income."
                margin={{ top: 12, right: 4, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--color-border)"
                  strokeOpacity={0.55}
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "var(--color-text-muted)",
                    fontSize: "var(--text-body-sm)",
                    lineHeight: "var(--text-body-sm--line-height)",
                  }}
                  dy={9}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "var(--color-text-muted)",
                    fontSize: "var(--text-body-sm)",
                    lineHeight: "var(--text-body-sm--line-height)",
                  }}
                  tickFormatter={(value: number) => compactNumber.format(value)}
                  tickCount={5}
                  width={44}
                />
                <ReferenceLine
                  y={0}
                  stroke="var(--color-text-muted)"
                  strokeOpacity={0.7}
                />
                <Tooltip
                  isAnimationActive={false}
                  cursor={{ stroke: "var(--color-text-muted)" }}
                  content={({ active, payload }) => {
                    const point = payload?.[0]?.payload as
                      ForecastChartPoint | undefined;
                    return active && point ? (
                      <div className="finance-forecast-chart-tooltip">
                        <p>{point.on}</p>
                        <strong className="finance-number">
                          {point.balanceMinor === null
                            ? "Unavailable"
                            : formatMoney(point.balanceMinor, currency)}
                        </strong>
                      </div>
                    ) : null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  name="Projected balance"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "var(--color-primary)" }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>Projected spendable balance by date</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Balance</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.on}>
                  <th scope="row">{point.on}</th>
                  <td>
                    {point.balanceMinor === null
                      ? "Unavailable"
                      : formatMoney(point.balanceMinor, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <div className="finance-forecast-chart-empty">
          <strong>Projection unavailable</strong>
          <p>Update the qualified account balances to establish a forecast.</p>
        </div>
      )}
    </section>
  );
}
