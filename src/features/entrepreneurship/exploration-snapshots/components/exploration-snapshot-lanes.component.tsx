"use client";

import { useInterfaceSound } from "@/components/ui/sound/hooks/use-interface-sound.hook";
import { useState } from "react";

const lanes = [
  ["B2C", "Consumers"],
  ["B2B", "Businesses"],
  ["CROSS_MARKET", "Cross-market"],
] as const;

export function ExplorationSnapshotLanes({
  children,
}: {
  children: React.ReactNode[];
}) {
  const sound = useInterfaceSound();
  const [active, setActive] = useState(0);
  return (
    <div className="exploration-snapshot-lanes" data-active-lane={active}>
      <div
        className="exploration-snapshot-lane-tabs"
        role="tablist"
        aria-label="Snapshot market"
      >
        {lanes.map(([key, label], index) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`snapshot-lane-${key}`}
            aria-selected={active === index}
            aria-controls={`snapshot-lane-panel-${key}`}
            tabIndex={active === index ? 0 : -1}
            onClick={() => {
              if (active !== index) sound.play("controlConfirmed");
              setActive(index);
            }}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
                return;
              event.preventDefault();
              const next =
                event.key === "ArrowRight"
                  ? (active + 1) % lanes.length
                  : (active - 1 + lanes.length) % lanes.length;
              sound.play("controlConfirmed");
              setActive(next);
              requestAnimationFrame(() =>
                document
                  .getElementById(`snapshot-lane-${lanes[next][0]}`)
                  ?.focus(),
              );
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="exploration-snapshot-lane-grid">
        {children.map((child, index) => (
          <div
            key={lanes[index][0]}
            id={`snapshot-lane-panel-${lanes[index][0]}`}
            className="exploration-snapshot-lane-panel"
            role="tabpanel"
            aria-labelledby={`snapshot-lane-${lanes[index][0]}`}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
