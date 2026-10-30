"use client";

import { useState, type CSSProperties } from "react";
import { cn } from "@/lib/styles/utils/class-name.util";
import { progressIndicatorConfig } from "./progress-indicator.config";

export type ProgressVariant = "plasma-core" | "season-ticks" | "segmented-halo";

export type ProgressArea =
  | "dashboard"
  | "engineering"
  | "finance"
  | "entrepreneurship"
  | "content"
  | "direction";

type ProgressIndicatorProps = {
  value: number;
  max?: number;
  label: string;
  variant?: ProgressVariant;
  area?: ProgressArea;
  caption?: string;
  className?: string;
};

type SegmentStyle = CSSProperties & {
  "--progress-segment-index": number;
  "--progress-halo-rotation"?: string;
};

export function ProgressIndicator({
  value,
  max = 100,
  label,
  variant = "plasma-core",
  area = "dashboard",
  caption = "PROGRESS",
  className,
}: ProgressIndicatorProps) {
  const [changing, setChanging] = useState(false);
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value)
    ? Math.min(Math.max(value, 0), safeMax)
    : 0;
  const percent = (safeValue / safeMax) * 100;
  const complete = safeValue >= safeMax;

  function segmentStyle(index: number): SegmentStyle {
    return {
      "--progress-segment-index": index,
    };
  }

  return (
    <div
      className={cn("become-progress", className)}
      data-progress-variant={variant}
      data-progress-area={area}
      data-complete={complete}
      data-changing={changing}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={safeValue}
    >
      {variant === "plasma-core" && (
        <span className="become-progress__plasma-track" aria-hidden="true">
          <span
            className="become-progress__plasma-fill"
            style={{ width: `${percent}%` }}
            onTransitionStart={(event) => {
              if (event.propertyName === "width") setChanging(true);
            }}
            onTransitionEnd={(event) => {
              if (event.propertyName === "width") setChanging(false);
            }}
            onTransitionCancel={(event) => {
              if (event.propertyName === "width") setChanging(false);
            }}
          />
        </span>
      )}

      {variant === "season-ticks" && (
        <span className="become-progress__season" aria-hidden="true">
          {Array.from(
            { length: progressIndicatorConfig.seasonTickCount },
            (_, index) => {
              const unitPercent = Math.min(
                100,
                Math.max(
                  0,
                  percent * progressIndicatorConfig.seasonTickCount -
                    index * 100,
                ),
              );
              return (
                <span
                  className="become-progress__season-unit"
                  data-filled={unitPercent >= 100}
                  style={segmentStyle(index)}
                  key={index}
                >
                  <span
                    className="become-progress__season-fill"
                    style={{ width: `${unitPercent}%` }}
                  />
                </span>
              );
            },
          )}
        </span>
      )}

      {variant === "segmented-halo" && (
        <span className="become-progress__halo-layout" aria-hidden="true">
          <span className="become-progress__halo">
            {Array.from(
              { length: progressIndicatorConfig.haloTickCount },
              (_, index) => {
                const unitPercent = Math.min(
                  100,
                  Math.max(
                    0,
                    percent * progressIndicatorConfig.haloTickCount -
                      index * 100,
                  ),
                );
                return (
                  <span
                    className="become-progress__halo-tick"
                    data-filled={unitPercent > 0}
                    style={
                      {
                        ...segmentStyle(index),
                        "--progress-halo-rotation": `${(index * 360) / progressIndicatorConfig.haloTickCount}deg`,
                      } as SegmentStyle
                    }
                    key={index}
                  />
                );
              },
            )}
          </span>
          <span className="become-progress__halo-copy">
            <strong className="type-metric-md">{Math.round(percent)}%</strong>
            <span className="type-caption">{caption}</span>
          </span>
        </span>
      )}
    </div>
  );
}
