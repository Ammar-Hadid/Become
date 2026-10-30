"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useInterfaceSound } from "@/components/ui/sound/hooks/use-interface-sound.hook";
import "./character-step-rail.css";

export type CharacterStepRailItem<Id extends string> = {
  id: Id;
  label: string;
  detail: string;
};

function railStride(rail: HTMLElement) {
  const first = rail.querySelector<HTMLElement>("[data-rail-step]");
  const second = first?.nextElementSibling as HTMLElement | null;
  // offsetLeft rounds each position independently; fractional card widths can
  // then push the selected card's border outside the scroll viewport.
  return first && second
    ? second.getBoundingClientRect().left - first.getBoundingClientRect().left
    : 0;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function CharacterStepRail<Id extends string>({
  steps,
  selectedId,
  onSelect,
  ariaLabel = "Character profile sections",
}: {
  steps: readonly CharacterStepRailItem<Id>[];
  selectedId: Id;
  onSelect: (id: Id) => void;
  ariaLabel?: string;
}) {
  const { play } = useInterfaceSound();
  const reducedMotion = useReducedMotion();
  const [startIndex, setStartIndex] = useState(() =>
    Math.max(
      0,
      steps.findIndex((step) => step.id === selectedId),
    ),
  );
  const railRef = useRef<HTMLElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressScroll = useRef(false);
  const wheelLocked = useRef(false);
  const wheelRelease = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStart = useRef<{
    x: number;
    y: number;
    left: number;
    axis: "horizontal" | "vertical" | null;
    blocked: boolean;
  } | null>(null);
  const touchDragging = useRef(false);
  const transitioning = useRef(false);
  const pendingDirection = useRef<1 | -1 | null>(null);
  const suppressClickUntil = useRef(0);
  const navigateRef = useRef<(direction: 1 | -1) => void>(() => {});
  const selectedRef = useRef(selectedId);
  const startRef = useRef(startIndex);
  const ordered = steps.map(
    (_, offset) => steps[(startIndex + offset) % steps.length],
  );
  const display = [
    ordered[steps.length - 1],
    ...ordered,
    ...ordered.slice(0, 3),
  ];

  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);
  useEffect(() => {
    startRef.current = startIndex;
  }, [startIndex]);

  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const stride = railStride(rail);
    if (stride <= 0) return;
    suppressScroll.current = true;
    rail.scrollLeft = stride;
    const frame = requestAnimationFrame(() => {
      suppressScroll.current = false;
      transitioning.current = false;
      const pending = pendingDirection.current;
      pendingDirection.current = null;
      if (pending) navigateRef.current(pending);
    });
    return () => cancelAnimationFrame(frame);
  }, [startIndex]);

  useEffect(() => {
    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
      if (wheelRelease.current) clearTimeout(wheelRelease.current);
    };
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    let width = rail.clientWidth;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      if (rail.clientWidth === width) return;
      width = rail.clientWidth;
      if (settleTimer.current) clearTimeout(settleTimer.current);
      transitioning.current = false;
      pendingDirection.current = null;
      suppressScroll.current = true;
      const index = Math.max(
        0,
        steps.findIndex((step) => step.id === selectedRef.current),
      );
      if (index !== startRef.current) {
        startRef.current = index;
        setStartIndex(index);
      } else {
        rail.scrollLeft = railStride(rail);
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          suppressScroll.current = false;
        });
      }
    });
    observer.observe(rail);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [steps]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const handleWheel = (event: WheelEvent) => {
      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;
      if (Math.abs(delta) < 1) return;
      event.preventDefault();
      if (!wheelLocked.current) {
        wheelLocked.current = true;
        navigateRef.current(delta > 0 ? 1 : -1);
      }
      if (wheelRelease.current) clearTimeout(wheelRelease.current);
      wheelRelease.current = setTimeout(() => {
        wheelLocked.current = false;
      }, 280);
    };
    rail.addEventListener("wheel", handleWheel, { passive: false });
    return () => rail.removeEventListener("wheel", handleWheel);
  }, []);

  function settleRail() {
    const rail = railRef.current;
    if (!rail || suppressScroll.current || touchDragging.current) return;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = null;
    const stride = railStride(rail);
    if (stride <= 0) return;
    const offset = Math.max(
      -1,
      Math.min(steps.length - 1, Math.round(rail.scrollLeft / stride) - 1),
    );
    if (offset === 0) {
      transitioning.current = false;
      return;
    }
    const nextIndex = (startRef.current + offset + steps.length) % steps.length;
    const next = steps[nextIndex].id;
    suppressScroll.current = true;
    startRef.current = nextIndex;
    const changed = next !== selectedRef.current;
    selectedRef.current = next;
    if (changed) onSelect(next);
    setStartIndex(nextIndex);
  }

  function onScroll() {
    if (suppressScroll.current || touchDragging.current) return;
    if (railRef.current && "onscrollend" in railRef.current) return;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(settleRail, 110);
  }

  function chooseStep(id: Id, audible = true) {
    const rail = railRef.current;
    if (!rail) return;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    if (audible && id !== selectedRef.current) play("controlConfirmed");
    selectedRef.current = id;
    onSelect(id);
    const offset = steps.findIndex((step) => step.id === id);
    if (offset < 0) return;
    transitioning.current = offset !== startRef.current;
    if (reducedMotion) {
      if (offset === startRef.current) {
        rail.scrollLeft = railStride(rail);
        return;
      }
      suppressScroll.current = true;
      startRef.current = offset;
      setStartIndex(offset);
      return;
    }
    const relative = (offset - startRef.current + steps.length) % steps.length;
    const stride = railStride(rail);
    if (stride <= 0) return;
    const target = (relative === steps.length - 1 ? 0 : relative + 1) * stride;
    if (Math.abs(rail.scrollLeft - target) < 1) {
      settleRail();
      return;
    }
    rail.scrollTo({ left: target, behavior: "smooth" });
  }

  useEffect(() => {
    navigateRef.current = (direction) => {
      if (transitioning.current) {
        pendingDirection.current = direction;
        return;
      }
      const current = steps.findIndex(
        (step) => step.id === selectedRef.current,
      );
      chooseStep(
        steps[(current + direction + steps.length) % steps.length].id,
        false,
      );
    };
  });

  function onTouchStart(event: React.TouchEvent<HTMLElement>) {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      left: railRef.current?.scrollLeft ?? 0,
      axis: null,
      blocked: transitioning.current,
    };
  }

  function onTouchMove(event: React.TouchEvent<HTMLElement>) {
    const start = touchStart.current;
    const rail = railRef.current;
    if (!start || !rail || start.blocked || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (!start.axis) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
      start.axis = Math.abs(dx) >= Math.abs(dy) ? "horizontal" : "vertical";
      touchDragging.current = true;
    }
    const stride = railStride(rail);
    const progress = start.axis === "horizontal" ? -dx : dy;
    rail.scrollLeft = Math.max(
      start.left - stride,
      Math.min(start.left + stride, start.left + progress),
    );
  }

  function onTouchEnd(event: React.TouchEvent<HTMLElement>) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    touchDragging.current = false;
    const axis =
      start.axis ?? (Math.abs(dx) >= Math.abs(dy) ? "horizontal" : "vertical");
    const progress = axis === "horizontal" ? -dx : dy;
    if (start.blocked) {
      if (Math.abs(progress) >= 24) {
        suppressClickUntil.current = Date.now() + 450;
        pendingDirection.current = progress > 0 ? 1 : -1;
      }
      return;
    }
    if (!start.axis) return;
    suppressClickUntil.current = Date.now() + 450;
    if (Math.abs(progress) < 24) {
      railRef.current?.scrollTo({
        left: start.left,
        behavior: reducedMotion ? "auto" : "smooth",
      });
      return;
    }
    navigateRef.current(progress > 0 ? 1 : -1);
  }

  function onTouchCancel() {
    const start = touchStart.current;
    touchStart.current = null;
    touchDragging.current = false;
    if (start?.axis)
      railRef.current?.scrollTo({ left: start.left, behavior: "auto" });
  }

  function onRailKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    const focused = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "[data-rail-step]",
    );
    if (!focused) return;
    event.preventDefault();
    const current = steps.findIndex(
      (step) => step.id === focused.dataset.railStep,
    );
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? steps.length - 1
          : (current + (event.key === "ArrowRight" ? 1 : -1) + steps.length) %
            steps.length;
    const nextId = steps[nextIndex].id;
    chooseStep(nextId);
    requestAnimationFrame(() => {
      railRef.current
        ?.querySelector<HTMLButtonElement>(`[data-rail-step="${nextId}"]`)
        ?.focus({ preventScroll: true });
    });
  }

  return (
    <nav
      ref={railRef}
      className="character-step-rail"
      aria-label={ariaLabel}
      onScroll={onScroll}
      onScrollEnd={settleRail}
      onKeyDown={onRailKeyDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
    >
      {display.map((step, index) => {
        const duplicate = index === 0 || index > steps.length;
        const content = (
          <>
            <span className="character-step-rail__number type-metric-md">
              {steps.findIndex((item) => item.id === step.id) + 1}.
            </span>
            <span>
              <span className="type-caption">{step.detail}</span>
              <strong className="type-widget-title">{step.label}</strong>
            </span>
            <ChevronRight aria-hidden="true" />
          </>
        );
        if (duplicate)
          return (
            <div
              key={`${step.id}-copy-${index}`}
              className="character-step-rail__step"
              aria-hidden="true"
            >
              {content}
            </div>
          );
        return (
          <button
            type="button"
            key={step.id}
            className="character-step-rail__step"
            data-rail-step={step.id}
            data-selected={selectedId === step.id}
            aria-pressed={selectedId === step.id}
            onClick={(event) => {
              if (Date.now() < suppressClickUntil.current) {
                event.preventDefault();
                return;
              }
              chooseStep(step.id);
            }}
          >
            {content}
          </button>
        );
      })}
    </nav>
  );
}
