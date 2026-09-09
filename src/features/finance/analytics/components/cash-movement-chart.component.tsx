"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/money/utils/money.util";

export type CashMovementChartPoint = {
  label: string;
  dateLabel: string;
  moneyIn: number;
  moneyOut: number;
  moneyInMinor: string;
  moneyOutMinor: string;
};

const compactNumber = new Intl.NumberFormat("en-GB", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function CashMovementChart({
  currency,
  data,
  moneyInTotal,
  moneyOutTotal,
}: {
  currency: string;
  data: CashMovementChartPoint[];
  moneyInTotal: string;
  moneyOutTotal: string;
}) {
  const hasExternalMovement = data.some(
    (point) => point.moneyIn !== 0 || point.moneyOut !== 0,
  );

  return (
    <section
      className="finance-cash-chart"
      aria-label={`External cash movement in ${currency}`}
    >
      <dl className="finance-cash-chart__summary" aria-label="Chart legend">
        <div>
          <dt>
            <i className="is-money-in" aria-hidden="true" /> Money in
          </dt>
          <dd className="finance-number">
            {formatMoney(moneyInTotal, currency)}
          </dd>
        </div>
        <div>
          <dt>
            <i className="is-money-out" aria-hidden="true" /> Money out
          </dt>
          <dd className="finance-number">
            {formatMoney(moneyOutTotal, currency)}
          </dd>
        </div>
      </dl>

      {hasExternalMovement ? (
        <>
          <div className="finance-cash-chart__plot">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                accessibilityLayer
                data={data}
                title={`External cash movement in ${currency}`}
                desc="Money in is plotted above zero and money out below zero. Use the arrow keys to inspect each time bucket."
                margin={{ top: 14, right: 2, bottom: 0, left: 0 }}
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
                  tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                  dy={9}
                  interval="preserveStartEnd"
                  minTickGap={12}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--color-text-muted)", fontSize: 10 }}
                  tickFormatter={(value: number) => compactNumber.format(value)}
                  tickCount={5}
                  width={42}
                />
                <ReferenceLine
                  y={0}
                  stroke="var(--color-text-muted)"
                  strokeOpacity={0.7}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255, 255, 255, 0.025)" }}
                  isAnimationActive={false}
                  content={({ active, payload }) => {
                    const point = payload?.[0]?.payload as
                      CashMovementChartPoint | undefined;

                    return active && point ? (
                      <div className="finance-cash-chart__tooltip">
                        <p>{point.dateLabel}</p>
                        <dl>
                          <div>
                            <dt>
                              <i className="is-money-in" aria-hidden="true" />
                              Money in
                            </dt>
                            <dd className="finance-number">
                              {formatMoney(point.moneyInMinor, currency)}
                            </dd>
                          </div>
                          <div>
                            <dt>
                              <i className="is-money-out" aria-hidden="true" />
                              Money out
                            </dt>
                            <dd className="finance-number">
                              {formatMoney(point.moneyOutMinor, currency)}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    ) : null;
                  }}
                />
                <Bar
                  dataKey="moneyIn"
                  name="Money in"
                  fill="var(--finance-positive)"
                  radius={[4, 4, 1, 1]}
                  maxBarSize={28}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="moneyOut"
                  name="Money out"
                  fill="var(--finance-negative)"
                  radius={[1, 1, 4, 4]}
                  maxBarSize={28}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="sr-only">
            Focus the chart and use the arrow keys to inspect each time bucket.
          </p>
          <table className="sr-only">
            <caption>External cash movement by time bucket</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Money in</th>
                <th scope="col">Money out</th>
              </tr>
            </thead>
            <tbody>
              {data.map((point) => (
                <tr key={point.dateLabel}>
                  <th scope="row">{point.dateLabel}</th>
                  <td>{formatMoney(point.moneyInMinor, currency)}</td>
                  <td>{formatMoney(point.moneyOutMinor, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <div className="finance-cash-chart__empty">
          <div>
            <strong>No external movement to plot</strong>
            <p>The timeline will take shape when money comes in or goes out.</p>
          </div>
        </div>
      )}
    </section>
  );
}
