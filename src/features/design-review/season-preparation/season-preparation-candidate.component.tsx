"use client";
import { useEffect, useState } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import {
  Radio,
  SelectionLabel,
  Switch,
} from "@/components/ui/forms/selection.component";
import { Select } from "@/components/ui/forms/select.component";
import { Button } from "@/components/ui/buttons/button.component";
import { BrandMark } from "@/components/layout/branding/brand-mark.component";
import { SeasonRitualLayout } from "@/components/layout/season-ritual/season-ritual-layout.component";
import {
  SeasonPreparationProgress,
  PreparationDrawer,
} from "@/components/ui/season-preparation/season-preparation.component";
import type { PreparationProgress } from "@/components/ui/season-preparation/season-preparation.component";
import "./season-preparation-candidate.css";

const prose = [
  "A quiet city above the clouds. Stone terraces, worn training grounds and a horizon that opens a little further with each chapter. Levi remains the familiar presence at its centre.",
  "The voice is spare and direct. Recognition comes through a precise observation, not a speech. A setback calls for a clear next move, with space to recover and begin again.",
  "Across seven chapters, the same place changes with your pace. Paths open, the grounds become lived-in, and light reaches further into the city. The world responds to your work without promising an outcome.",
];
const stages = [
  { value: "research", label: "Research" },
  { value: "writing", label: "Arriving text" },
  { value: "checking", label: "Final checks" },
] as const;
type Stage = (typeof stages)[number]["value"];
type Connection = "normal" | "slow" | "failed";

export function SeasonPreparationCandidate() {
  const [stage, setStage] = useState<Stage>("writing");
  const [connection, setConnection] = useState<Connection>("normal");
  const [preparationPaused, setPreparationPaused] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [count, setCount] = useState(1);
  const [paused, setPaused] = useState(false);
  const [controls, setControls] = useState(false);
  const [left, setLeft] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const elapsedOffset = connection === "slow" ? 310000 : 90000;
  useEffect(() => {
    const timer = setTimeout(
      () => setStartedAt(new Date(Date.now() - elapsedOffset).toISOString()),
      0,
    );
    return () => clearTimeout(timer);
  }, [attempt, elapsedOffset]);
  useEffect(() => {
    if (stage !== "writing" || connection === "failed" || preparationPaused)
      return;
    const timer = setInterval(
      () => setCount((n) => Math.min(prose.length, n + 1)),
      8000,
    );
    return () => clearInterval(timer);
  }, [stage, connection, preparationPaused, attempt]);
  const changeStage = (value: Stage) => {
    setStage(value);
    setPreparationPaused(false);
    setAttempt((n) => n + 1);
    setCount(value === "checking" ? prose.length : 1);
  };
  const replay = () => {
    changeStage("writing");
    setConnection("normal");
    setLeft(false);
  };
  const progress: PreparationProgress | null = startedAt
    ? {
        attempt: String(attempt),
        startedAt,
        phase: stage,
        paragraphs: stage === "research" ? [] : prose.slice(0, count),
        estimate: { minMs: 130000, maxMs: 255000, samples: 6 },
      }
    : null;
  return (
    <SeasonRitualLayout
      split={false}
      paused={paused}
      contentKey="preparation-candidate"
      introduction={null}
      header={
        <div className="preparation-review-header">
          <BrandMark />
        </div>
      }
      footer={
        <div className="preparation-review-footer">
          <span className="type-caption">
            Design preview · Sample text & artwork
          </span>
          <Button variant="ghost" size="sm" onClick={() => setControls(true)}>
            <SlidersHorizontal aria-hidden="true" /> Preview controls
          </Button>
        </div>
      }
    >
      {left ? (
        <div
          className="preparation-empty"
          style={{ paddingBlock: "var(--spacing-2xl)" }}
        >
          <h1 className="type-page-title">Preview closed.</h1>
          <Button variant="secondary" onClick={() => setLeft(false)}>
            Return to preparation
          </Button>
        </div>
      ) : (
        <SeasonPreparationProgress
          name="Levi Ackerman"
          sourceWork="Attack on Titan"
          portraitHref="/design-review/character-workspace-v3/levi-avatar.webp"
          status={
            connection === "failed"
              ? "FAILED"
              : preparationPaused
                ? "PAUSED"
                : "RUNNING"
          }
          progress={progress}
          error={
            connection === "failed"
              ? "The connection ended before the complete draft arrived. Research and completed paragraphs are saved."
              : null
          }
          paused={paused}
          onPause={() => setPreparationPaused(true)}
          onResume={() => {
            setConnection("normal");
            setPreparationPaused(false);
          }}
          onLeave={() => setLeft(true)}
        />
      )}
      <PreparationDrawer
        open={controls}
        onClose={() => setControls(false)}
        title="Preview controls"
      >
        <div className="preparation-control-center">
          <p className="preparation-control-note type-caption">
            Local simulation · No API calls
          </p>
          <fieldset className="preparation-control-section">
            <legend className="type-label">Preparation stage</legend>
            <div className="preparation-control-stages">
              {stages.map(({ value, label }, index) => (
                <SelectionLabel
                  key={value}
                  className="preparation-control-stage"
                >
                  <span
                    className="preparation-control-index type-caption"
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="type-body-sm">{label}</span>
                  <Radio
                    name="preparation-stage"
                    value={value}
                    checked={stage === value}
                    onChange={() => changeStage(value)}
                  />
                </SelectionLabel>
              ))}
            </div>
          </fieldset>
          <section
            className="preparation-control-section"
            aria-labelledby="connection-heading"
          >
            <h3 id="connection-heading" className="type-label">
              Connection
            </h3>
            <div className="preparation-control-row">
              <span className="type-body-sm">Response</span>
              <Select<Connection>
                label="Connection response"
                value={connection}
                onValueChange={setConnection}
                options={[
                  { value: "normal", label: "Normal" },
                  { value: "slow", label: "Slow" },
                  { value: "failed", label: "Interrupted" },
                ]}
              />
            </div>
          </section>
          <section
            className="preparation-control-section"
            aria-labelledby="playback-heading"
          >
            <h3 id="playback-heading" className="type-label">
              Playback
            </h3>
            <SelectionLabel className="preparation-control-row">
              <span className="type-body-sm">Motion</span>
              <Switch
                checked={!paused}
                onChange={(event) => setPaused(!event.target.checked)}
              />
            </SelectionLabel>
            <Button
              variant="secondary"
              className="preparation-control-replay"
              onClick={replay}
            >
              <RotateCcw aria-hidden="true" /> Replay arrival
            </Button>
          </section>
        </div>
      </PreparationDrawer>
    </SeasonRitualLayout>
  );
}
