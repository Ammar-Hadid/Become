"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Check, Play, RotateCcw, Sparkles, Type } from "lucide-react";
import { BrandMark } from "@/components/layout/branding/brand-mark.component";
import { Button } from "@/components/ui/buttons/button.component";
import { Select } from "@/components/ui/forms/select.component";
import { AiTypingText } from "@/components/ui/typing/ai-typing-text.component";
import { cotsDailyPreviewMessages } from "@/features/dashboard/lenses/constants/cots-daily-preview.constants";
import type { DashboardLens } from "@/features/dashboard/lenses/types/dashboard-lens.types";
import {
  typingStudies,
  type TypingStudy,
  type TypingUnit,
} from "@/features/typing-review/constants/typing-studies.constants";
import "./typing-review.css";

const selectionKey = "become.typing-review.selection.v1";
const areas: { value: DashboardLens; label: string }[] = [
  { value: "dashboard", label: "Dashboard" },
  { value: "engineering", label: "Engineering" },
  { value: "finance", label: "Finance" },
  { value: "entrepreneurship", label: "Entrepreneurship" },
  { value: "content", label: "Content" },
];

function subscribeToReducedMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function isReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function splitMessage(text: string, unit: TypingUnit) {
  if (unit === "character") return Array.from(text);
  if (unit === "word") return text.match(/\S+\s*/g) ?? [text];
  if (unit === "phrase") return text.match(/[^,.!?]+[,.!?]?\s*/g) ?? [text];
  const words = text.match(/\S+\s*/g) ?? [text];
  const groupSize = unit === "line" ? 8 : 3;
  const groups: string[] = [];
  for (let index = 0; index < words.length; index += groupSize) {
    groups.push(words.slice(index, index + groupSize).join(""));
  }
  return groups;
}

function TypingSample({
  study,
  text,
  speed,
  reducedMotion,
  showFull,
}: {
  study: TypingStudy;
  text: string;
  speed: number;
  reducedMotion: boolean;
  showFull: boolean;
}) {
  const units = useMemo(
    () => splitMessage(text, study.unit),
    [text, study.unit],
  );
  const [index, setIndex] = useState(0);
  const complete = reducedMotion || showFull || index >= units.length;
  const visibleIndex = reducedMotion || showFull ? units.length : index;
  const before = units.slice(0, Math.max(0, visibleIndex - 1)).join("");
  const latest = units[visibleIndex - 1] ?? "";

  useEffect(() => {
    if (reducedMotion || showFull || index >= units.length) return;
    const base =
      study.unit === "character"
        ? 31
        : study.unit === "word"
          ? 138
          : study.unit === "packet"
            ? 195
            : study.unit === "line"
              ? 510
              : 400;
    const previous = units[index - 1] ?? "";
    const pause = /[,.!?]\s*$/.test(previous) ? 180 : 0;
    const timer = window.setTimeout(
      () => setIndex((current) => current + 1),
      (base * study.tempo + pause) / speed,
    );
    return () => window.clearTimeout(timer);
  }, [index, reducedMotion, showFull, speed, study.tempo, study.unit, units]);

  return (
    <div
      className="typing-sample"
      data-style={study.id}
      data-complete={complete}
      data-unit={study.unit}
    >
      <p className="typing-sample__text type-quote">
        <span className="sr-only">{text}</span>
        <span aria-hidden="true">
          {before}
          <span className="typing-sample__latest" key={visibleIndex}>
            {latest}
          </span>
          <span className="typing-sample__caret" />
        </span>
      </p>
      {study.id === "pulse-train" && !complete && (
        <span className="typing-sample__pulse" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      )}
    </div>
  );
}

function StudyCard({
  study,
  number,
  message,
  speed,
  reducedMotion,
  active,
  run,
  kept,
  finished,
  onPreview,
  onFinish,
  onKeep,
}: {
  study: TypingStudy;
  number: number;
  message: string;
  speed: number;
  reducedMotion: boolean;
  active: boolean;
  run: number;
  kept: boolean;
  finished: boolean;
  onPreview: () => void;
  onFinish: () => void;
  onKeep: () => void;
}) {
  return (
    <article
      className="typing-study material-glass"
      data-active={active}
      data-kept={kept}
    >
      <div className="typing-study__head">
        <span className="type-system typing-study__number">
          {String(number).padStart(2, "0")} / 18
        </span>
        {study.approved ? (
          <span className="type-system typing-study__recommend">APPROVED</span>
        ) : study.recommended ? (
          <span className="type-system typing-study__recommend">BEST FIT</span>
        ) : null}
      </div>
      <div className="typing-study__title">
        <h2 className="type-section-title">{study.name}</h2>
        <span className="type-system">{study.unit.toUpperCase()}</span>
      </div>
      <p className="type-body-sm typing-study__description">
        {study.description}
      </p>
      <div className="typing-study__stage" aria-label={`${study.name} preview`}>
        {active && study.id === "terminal-prompt" ? (
          <AiTypingText
            key={`${study.id}-${run}-${message}`}
            text={message}
            speed={speed}
            showFull={finished}
          />
        ) : active ? (
          <TypingSample
            key={`${study.id}-${run}-${message}`}
            study={study}
            text={message}
            speed={speed}
            reducedMotion={reducedMotion}
            showFull={finished}
          />
        ) : (
          <p className="type-quote typing-study__resting">{message}</p>
        )}
        <span className="type-system typing-study__state" role="status">
          {active
            ? reducedMotion
              ? "REDUCED MOTION / FULL TEXT"
              : finished
                ? "FULL MESSAGE"
                : "PREVIEW ACTIVE"
            : "READY TO PREVIEW"}
        </span>
      </div>
      <p className="type-caption typing-study__detail">{study.detail}</p>
      <div className="typing-study__actions">
        <Button type="button" variant="secondary" size="sm" onClick={onPreview}>
          {active ? (
            <RotateCcw aria-hidden="true" />
          ) : (
            <Play aria-hidden="true" />
          )}
          {active ? "Replay" : "Preview"}
        </Button>
        {active && !reducedMotion && !finished && (
          <Button type="button" variant="ghost" size="sm" onClick={onFinish}>
            Show all
          </Button>
        )}
        <Button
          type="button"
          variant={kept ? "primary" : "ghost"}
          size="sm"
          onClick={onKeep}
          aria-pressed={kept}
          aria-label={`${kept ? "Remove" : "Keep"} ${study.name}`}
        >
          <Check aria-hidden="true" /> {kept ? "Kept" : "Keep"}
        </Button>
      </div>
    </article>
  );
}

export function TypingReview() {
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    isReducedMotion,
    () => false,
  );
  const [area, setArea] = useState<DashboardLens>("dashboard");
  const [speed, setSpeed] = useState(1);
  const [activeId, setActiveId] = useState(typingStudies[0].id);
  const [run, setRun] = useState(0);
  const [finished, setFinished] = useState(false);
  const [kept, setKept] = useState<string[]>([]);
  const message = cotsDailyPreviewMessages[area].replace("{name}", "Ammar");

  useEffect(() => {
    let restoreTimer: ReturnType<typeof setTimeout> | null = null;
    try {
      const stored = JSON.parse(localStorage.getItem(selectionKey) ?? "[]");
      if (Array.isArray(stored)) {
        const valid = new Set(typingStudies.map((study) => study.id));
        restoreTimer = setTimeout(
          () =>
            setKept(
              stored.filter(
                (id): id is string => typeof id === "string" && valid.has(id),
              ),
            ),
          0,
        );
      }
    } catch {
      // Browser storage is optional for this comparison.
    }
    return () => {
      if (restoreTimer) clearTimeout(restoreTimer);
    };
  }, []);

  function toggleKept(id: string) {
    const next = kept.includes(id)
      ? kept.filter((item) => item !== id)
      : [...kept, id];
    setKept(next);
    try {
      localStorage.setItem(selectionKey, JSON.stringify(next));
    } catch {
      /* Preview remains usable without storage. */
    }
  }

  function preview(id: string) {
    setActiveId(id);
    setRun((current) => current + 1);
    setFinished(false);
  }

  return (
    <main className="typing-review" data-area={area}>
      <header className="typing-review__topbar">
        <BrandMark />
        <span className="type-system typing-review__topbar-label">
          C.O.T.S / TYPING STUDIES
        </span>
        <span className="type-system typing-review__topbar-count">
          {String(kept.length).padStart(2, "0")} KEPT
        </span>
      </header>

      <div className="typing-review__body">
        <section
          className="typing-review__intro"
          aria-labelledby="typing-review-title"
        >
          <div>
            <p className="type-overline typing-review__eyebrow">
              BECOME / MOTION EXPLORATION 02
            </p>
            <h1 id="typing-review-title" className="type-page-title">
              When C.O.T.S writes.
            </h1>
            <p className="type-body-lg typing-review__lede">
              Eighteen ways a message could arrive. One category only: the
              visible act of typing. Content generation and waiting states come
              later.
            </p>
          </div>
          <div className="typing-review__intro-mark" aria-hidden="true">
            <Type />
            <span className="type-system">18</span>
            <i />
          </div>
        </section>

        <section
          className="typing-review__notes material-glass"
          aria-label="Design basis"
        >
          <div>
            <Sparkles aria-hidden="true" />
            <span className="type-label">Research basis</span>
          </div>
          <p className="type-body-sm">
            Streaming text should make progress visible and feel immediate. The
            motion stays at the writing point, ends when the message ends, and
            shows full text under reduced motion. Preview is simulated with
            existing copy; it does not represent a live AI response.
          </p>
          <div className="typing-review__source-links type-caption">
            <a
              href="https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/ux-custom-engine-agent#streaming-responses"
              target="_blank"
              rel="noreferrer"
            >
              Microsoft / streaming responses ↗
            </a>
            <a
              href="https://design.google/library/gemini-ai-visual-design"
              target="_blank"
              rel="noreferrer"
            >
              Google / intentional AI motion ↗
            </a>
            <a
              href="https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide"
              target="_blank"
              rel="noreferrer"
            >
              W3C / motion control ↗
            </a>
          </div>
        </section>

        <section
          className="typing-review__toolbar material-elevated-glass"
          aria-label="Comparison controls"
        >
          <div className="typing-review__toolbar-copy">
            <span className="type-label">Compare on the same message</span>
            <p className="type-caption">
              One preview plays at a time. Select a lens to see its accent and
              copy.
            </p>
          </div>
          <Select
            label="C.O.T.S message lens"
            value={area}
            options={areas}
            onValueChange={(value) => {
              setArea(value);
              setRun((current) => current + 1);
              setFinished(false);
            }}
          />
          <div
            className="typing-review__speed"
            role="group"
            aria-label="Preview speed"
          >
            {[0.75, 1, 1.5].map((value) => (
              <Button
                type="button"
                key={value}
                variant={speed === value ? "primary" : "ghost"}
                size="sm"
                aria-pressed={speed === value}
                onClick={() => setSpeed(value)}
              >
                {value}×
              </Button>
            ))}
          </div>
        </section>

        <div className="typing-review__section-head">
          <div>
            <span className="type-system">ONE CATEGORY / 18 DIRECTIONS</span>
            <h2 className="type-section-title">AI is typing</h2>
          </div>
          <p className="type-caption">
            Press Preview to see a full reveal. Keep saves a browser-local
            shortlist; tell me which names you approve.
          </p>
        </div>

        <div className="typing-review__grid">
          {typingStudies.map((study, index) => (
            <StudyCard
              key={study.id}
              study={study}
              number={index + 1}
              message={message}
              speed={speed}
              reducedMotion={reducedMotion}
              active={activeId === study.id}
              run={run}
              kept={kept.includes(study.id)}
              finished={finished}
              onPreview={() => preview(study.id)}
              onFinish={() => setFinished(true)}
              onKeep={() => toggleKept(study.id)}
            />
          ))}
        </div>

        <footer className="typing-review__footer type-caption">
          <span>COMPARISON ONLY / DASHBOARD UNCHANGED</span>
          <span>Reduced-motion preference is respected automatically.</span>
        </footer>
      </div>
    </main>
  );
}
