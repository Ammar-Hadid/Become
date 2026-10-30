"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type HTMLAttributes,
} from "react";
import { cn } from "@/lib/styles/utils/class-name.util";
import "./ai-generated-text.css";

export type AiGeneratedTextProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  text: string;
  paused?: boolean;
  /** Candidate-only: stable attempt key when appending complete paragraphs.
   * Existing paragraphs must never change; a new attempt needs a new key. */
  appendKey?: string;
  /** Static reading mode, also used automatically for device reduced motion. */
  staticText?: boolean;
};

function subscribeToReducedMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function isReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Approved Living Ink: ordered paragraphs, then plain prose without animation spans. */
function InkParagraph({
  text,
  eligible,
  paused,
  staticText,
  onComplete,
}: {
  text: string;
  eligible: boolean;
  paused: boolean;
  staticText: boolean;
  onComplete: () => void;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [started, setStarted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [complete, setComplete] = useState(false);
  const words = text.match(/\S+\s*/g) ?? [];

  useEffect(() => {
    const target = ref.current;
    if (!target) return;
    let intersects = false;
    const update = () => {
      const active = intersects && document.visibilityState === "visible";
      setVisible(active);
      if (active && eligible) setStarted(true);
    };
    const observer = new IntersectionObserver(([entry]) => {
      intersects = entry.isIntersecting;
      update();
    });
    observer.observe(target);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [eligible]);

  return (
    <p
      ref={ref}
      className="living-ink-paragraph type-body-lg"
      data-reveal={started && !complete && !staticText}
      data-running={eligible && visible && !paused}
      data-pending={!started && !complete && !staticText}
      data-complete={complete || staticText}
    >
      {complete || staticText ? (
        text
      ) : (
        <>
          <span className="sr-only">{text}</span>
          <span aria-hidden="true">
            {words.map((word, wordIndex) => (
              <span
                key={wordIndex}
                className="living-ink-word"
                style={
                  {
                    "--ink-order": wordIndex,
                  } as CSSProperties
                }
                onAnimationEnd={
                  wordIndex === words.length - 1
                    ? () => {
                        setComplete(true);
                        onComplete();
                      }
                    : undefined
                }
              >
                {word}
              </span>
            ))}
          </span>
        </>
      )}
    </p>
  );
}

function subscribeToHydration() {
  return () => {};
}

function AiGeneratedTextRun({
  text,
  paused,
  staticText,
  className,
  ...props
}: AiGeneratedTextProps) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const [activeParagraph, setActiveParagraph] = useState(0);
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  return (
    <div
      {...props}
      className={cn("living-ink-copy", className)}
      data-armed={hydrated && !staticText}
      data-complete={staticText || activeParagraph >= paragraphs.length}
    >
      {paragraphs.map((text, index) => (
        <InkParagraph
          key={index}
          text={text}
          eligible={index === activeParagraph}
          paused={Boolean(paused)}
          staticText={Boolean(staticText)}
          onComplete={() =>
            setActiveParagraph((current) => Math.max(current, index + 1))
          }
        />
      ))}
    </div>
  );
}

/** Longer AI-generated prose. C.O.T.S. speech uses AiTypingText instead. */
export function AiGeneratedText({
  text,
  paused = false,
  staticText = false,
  appendKey,
  ...props
}: AiGeneratedTextProps) {
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    isReducedMotion,
    () => false,
  );
  const fullText = staticText || reducedMotion;
  return (
    <AiGeneratedTextRun
      key={`${appendKey ?? text}:${fullText}`}
      text={text}
      paused={paused}
      staticText={fullText}
      {...props}
    />
  );
}
