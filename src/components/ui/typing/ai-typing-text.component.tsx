"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import {
  parseCssTimeList,
  resolveMotionDurationMs,
} from "@/components/ui/motion/utils/motion-time.util";
import { cn } from "@/lib/styles/utils/class-name.util";
import { aiTypingConfig } from "./ai-typing-text.config";

function subscribeToReducedMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function isReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function subscribeToPageVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

function isPageVisible() {
  return document.visibilityState === "visible";
}

function visibilityThresholdFor(element: Element) {
  const bounds = element.getBoundingClientRect();
  const area = bounds.width * bounds.height;
  if (area <= 0) return aiTypingConfig.visibilityThreshold;
  // Long prose can exceed the viewport. Require a readable share of the
  // available screen, rather than an impossible share of the entire document.
  const availableArea =
    Math.min(bounds.width, window.innerWidth) *
    Math.min(bounds.height, window.innerHeight);
  return aiTypingConfig.visibilityThreshold * (availableArea / area);
}

function isActuallyVisible(element: Element) {
  if (element.closest('[inert], [aria-hidden="true"]')) return false;
  const bounds = element.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) return false;
  const visibleWidth = Math.max(
    0,
    Math.min(bounds.right, window.innerWidth) - Math.max(bounds.left, 0),
  );
  const visibleHeight = Math.max(
    0,
    Math.min(bounds.bottom, window.innerHeight) - Math.max(bounds.top, 0),
  );
  return (
    visibleWidth * visibleHeight >=
    bounds.width * bounds.height * visibilityThresholdFor(element)
  );
}

type AiTypingTextProps = {
  text: string;
  speaker?: string;
  className?: string;
  speed?: number;
  showFull?: boolean;
  visibilityTargetRef?: RefObject<Element | null>;
};

function AiTypingRun({
  text,
  speaker = "C.O.T.S",
  className,
  speed,
  showFull,
  visibilityTargetRef,
}: AiTypingTextProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const timingRef = useRef({ step: 0, punctuation: 0 });
  const characters = useMemo(() => Array.from(text), [text]);
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    isReducedMotion,
    () => false,
  );
  const pageVisible = useSyncExternalStore(
    subscribeToPageVisibility,
    isPageVisible,
    () => true,
  );
  const [inView, setInView] = useState(false);
  const [count, setCount] = useState(0);
  const complete = reducedMotion || showFull || count >= characters.length;
  const visibleCount = reducedMotion || showFull ? characters.length : count;

  useEffect(() => {
    if (!reducedMotion && !showFull) return;
    const frame = window.requestAnimationFrame(() =>
      setCount(characters.length),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [characters.length, reducedMotion, showFull]);

  useEffect(() => {
    const target = visibilityTargetRef?.current ?? rootRef.current;
    const root = rootRef.current;
    if (!target || !root) return;

    const styles = window.getComputedStyle(root);
    timingRef.current = {
      step:
        parseCssTimeList(
          styles.getPropertyValue("--ai-typing-step-duration"),
        ) ||
        resolveMotionDurationMs("content") /
          aiTypingConfig.contentDurationDivisor,
      punctuation:
        parseCssTimeList(
          styles.getPropertyValue("--ai-typing-punctuation-pause"),
        ) || resolveMotionDurationMs("content"),
    };

    const update = () => setInView(isActuallyVisible(target));
    if (typeof IntersectionObserver === "undefined") {
      update();
      window.addEventListener("scroll", update, { passive: true });
      window.addEventListener("resize", update);
      return () => {
        window.removeEventListener("scroll", update);
        window.removeEventListener("resize", update);
      };
    }

    let observer: IntersectionObserver | undefined;
    const observe = () => {
      observer?.disconnect();
      const threshold = visibilityThresholdFor(target);
      observer = new IntersectionObserver(
        ([entry]) => {
          setInView(
            Boolean(
              entry?.isIntersecting &&
              entry.intersectionRatio >= threshold &&
              !target.closest('[inert], [aria-hidden="true"]'),
            ),
          );
        },
        { threshold: [0, threshold, 1] },
      );
      observer.observe(target);
      update();
    };
    observe();
    const resizeObserver = new ResizeObserver(observe);
    resizeObserver.observe(target);
    window.addEventListener("resize", observe);
    return () => {
      observer?.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", observe);
    };
  }, [visibilityTargetRef]);

  useEffect(() => {
    if (!inView || !pageVisible || complete) return;
    const previous = characters[count - 1] ?? "";
    const pause = /[,.!?]/.test(previous) ? timingRef.current.punctuation : 0;
    const delay =
      (timingRef.current.step + pause) /
      Math.max(speed ?? 1, aiTypingConfig.minimumSpeed);
    const timer = window.setTimeout(
      () => setCount((current) => current + 1),
      delay,
    );
    return () => window.clearTimeout(timer);
  }, [characters, complete, count, inView, pageVisible, speed]);

  return (
    <div
      ref={rootRef}
      className={cn("ai-typing-text", className)}
      data-complete={complete}
    >
      <span className="ai-typing-text__prompt type-system">{speaker} &gt;</span>
      <span className="ai-typing-text__body">
        <span className="ai-typing-text__reserve type-quote" aria-hidden="true">
          {text}
        </span>
        <span className="ai-typing-text__message type-quote">
          <span className="sr-only">{text}</span>
          <span aria-hidden="true">
            {characters.slice(0, visibleCount).join("")}
            <span className="ai-typing-text__caret" />
          </span>
        </span>
      </span>
    </div>
  );
}

export function AiTypingText(props: AiTypingTextProps) {
  return (
    <AiTypingRun
      key={`${props.speaker ?? "C.O.T.S"}:${props.text}`}
      {...props}
    />
  );
}
