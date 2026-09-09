"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { formatDuration } from "@/lib/dates/utils/period.util";

export function TimeBarChart({
  data,
}: {
  data: Array<{ label: string; seconds: number }>;
}) {
  return (
    <div className="h-[190px] w-full" aria-label="Focused time chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 12, right: 0, bottom: 0, left: 0 }}
        >
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{
              fill: "#666A73",
              fontSize: "var(--text-body-sm)",
              lineHeight: "var(--text-body-sm--line-height)",
            }}
            dy={10}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.025)" }}
            isAnimationActive={false}
            content={({ active, payload, label }) =>
              active && payload?.[0] ? (
                <div className="chart-tooltip">
                  <p className="text-text-muted text-body-sm tracking-[0.15em] uppercase">
                    {label}
                  </p>
                  <p className="mt-xs text-body font-semibold">
                    {formatDuration(Number(payload[0].value), true)}
                  </p>
                </div>
              ) : null
            }
          />
          <Bar
            dataKey="seconds"
            fill="#E8A83E"
            radius={[4, 4, 1, 1]}
            maxBarSize={34}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
