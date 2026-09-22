"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { resolveMotionDurationMs } from "@/components/ui/motion/utils/motion-time.util";
import styles from "@/features/sessions/details/styles/duration-picker.component.module.css";
import { MAX_CORRECTED_SESSION_SECONDS } from "@/features/sessions/timing/constants/session-duration.constants";

const WHEEL_VALUES = [-3, -2, -1, 0, 1, 2, 3] as const;
const DRAG_CAPTURE_THRESHOLD_PX = 4;
const INERTIA_MIN_VELOCITY = 0.42;
const INERTIA_MAX_VELOCITY = 2.4;
const INERTIA_DECELERATION = 0.005;

type DurationPart = "hours" | "minutes" | "seconds";

type DurationParts = {
  hours: number;
  minutes: number;
  seconds: number;
};

type DurationPickerProps = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
};

type DurationColumnProps = {
  label: string;
  labelId: string;
  part: DurationPart;
  value: number;
  onChange: (value: number) => void;
  maximum: number;
  wrapAt?: number;
  disabled?: boolean;
};

type WheelStyle = CSSProperties & {
  "--duration-wheel-offset": string;
};

export function splitDurationSeconds(value: number): DurationParts {
  const duration = Math.min(
    MAX_CORRECTED_SESSION_SECONDS,
    Math.max(0, Math.floor(Number.isFinite(value) ? value : 0)),
  );

  return {
    hours: Math.floor(duration / 3600),
    minutes: Math.floor((duration % 3600) / 60),
    seconds: duration % 60,
  };
}

export function composeDurationSeconds(
  hours: number,
  minutes: number,
  seconds: number,
) {
  return Math.min(
    MAX_CORRECTED_SESSION_SECONDS,
    Math.max(0, Math.floor(hours)) * 3600 +
      Math.max(0, Math.floor(minutes)) * 60 +
      Math.max(0, Math.floor(seconds)),
  );
}

export function stepDurationValue(
  value: number,
  delta: number,
  wrapAt?: number,
  maximum = Number.MAX_SAFE_INTEGER,
) {
  if (wrapAt !== undefined) {
    const range = wrapAt + 1;
    return (((value + delta) % range) + range) % range;
  }

  return Math.min(maximum, Math.max(0, value + delta));
}

export function parseDurationEntry(value: string, maximum: number) {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= maximum ? parsed : null;
}

export function normalizeWheelDistance(
  deltaY: number,
  deltaMode: number,
  rowHeight: number,
) {
  const direction = Math.sign(deltaY);
  const magnitude = Math.abs(deltaY);
  let pixels = magnitude;

  if (deltaMode === 1) pixels = (magnitude * rowHeight) / 3;
  else if (deltaMode === 2) pixels = magnitude * rowHeight * 3;
  else if (magnitude >= rowHeight) pixels = Math.max(rowHeight, magnitude / 2);

  return direction * Math.min(rowHeight * 3, pixels);
}

export function resolveWheelTravel(
  value: number,
  offset: number,
  distance: number,
  stepHeight: number,
  maximum: number,
  wrapAt?: number,
) {
  let nextOffset = offset + distance;
  let steps = 0;

  while (nextOffset <= -stepHeight) {
    nextOffset += stepHeight;
    steps += 1;
  }
  while (nextOffset >= stepHeight) {
    nextOffset -= stepHeight;
    steps -= 1;
  }

  const nextValue = stepDurationValue(value, steps, wrapAt, maximum);
  const hitBoundary = wrapAt === undefined && nextValue - value !== steps;

  if (hitBoundary) {
    nextOffset = (-Math.sign(steps) * stepHeight) / 3;
  }

  return { value: nextValue, offset: nextOffset, hitBoundary };
}

export function DurationPicker({
  value,
  onChange,
  disabled = false,
}: DurationPickerProps) {
  const labelRootId = useId();
  const duration = splitDurationSeconds(value);
  const atMaximumHours = duration.hours === 24;
  const subHourMaximum = atMaximumHours ? 0 : 59;

  function updatePart(part: DurationPart, nextValue: number) {
    onChange(
      composeDurationSeconds(
        part === "hours" ? nextValue : duration.hours,
        part === "minutes" ? nextValue : duration.minutes,
        part === "seconds" ? nextValue : duration.seconds,
      ),
    );
  }

  return (
    <div
      className={styles.picker}
      data-testid="session-duration-picker"
      aria-disabled={disabled}
    >
      <div className={styles.labels}>
        {(["Hours", "Minutes", "Seconds"] as const).map((label) => (
          <span
            key={label}
            id={`${labelRootId}-${label.toLowerCase()}`}
            className="text-body-sm font-medium"
          >
            {label}
          </span>
        ))}
      </div>
      <div className={styles.wheels}>
        <DurationColumn
          label="Hours"
          labelId={`${labelRootId}-hours`}
          part="hours"
          value={duration.hours}
          maximum={24}
          onChange={(nextValue) => updatePart("hours", nextValue)}
          disabled={disabled}
        />
        <DurationColumn
          key={`minutes-${subHourMaximum}`}
          label="Minutes"
          labelId={`${labelRootId}-minutes`}
          part="minutes"
          value={duration.minutes}
          maximum={subHourMaximum}
          wrapAt={atMaximumHours ? undefined : 59}
          onChange={(nextValue) => updatePart("minutes", nextValue)}
          disabled={disabled}
        />
        <DurationColumn
          key={`seconds-${subHourMaximum}`}
          label="Seconds"
          labelId={`${labelRootId}-seconds`}
          part="seconds"
          value={duration.seconds}
          maximum={subHourMaximum}
          wrapAt={atMaximumHours ? undefined : 59}
          onChange={(nextValue) => updatePart("seconds", nextValue)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function DurationColumn({
  label,
  labelId,
  part,
  value,
  onChange,
  maximum,
  wrapAt,
  disabled = false,
}: DurationColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null);
  const entryInputRef = useRef<HTMLInputElement>(null);
  const selectedButtonRef = useRef<HTMLButtonElement>(null);
  const motionFrame = useRef<number | null>(null);
  const wheelSettleTimer = useRef<number | null>(null);
  const reducedMotion = useRef(false);
  const valueRef = useRef(value);
  const offsetRef = useRef(0);
  const pointer = useRef<{
    id: number;
    startY: number;
    lastY: number;
    lastTime: number;
    velocity: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const [wheelOffset, setWheelOffset] = useState(0);
  const [settling, setSettling] = useState(false);
  const [entry, setEntry] = useState<string | null>(null);
  const editingEntry = entry !== null;

  function cancelMotion() {
    if (motionFrame.current !== null) {
      window.cancelAnimationFrame(motionFrame.current);
      motionFrame.current = null;
    }
    if (wheelSettleTimer.current !== null) {
      window.clearTimeout(wheelSettleTimer.current);
      wheelSettleTimer.current = null;
    }
  }

  function updateOffset(nextOffset: number) {
    offsetRef.current = nextOffset;
    setWheelOffset(nextOffset);
  }

  function rowHeight() {
    return Math.max(1, (columnRef.current?.clientHeight ?? 5) / 5);
  }

  function emitValue(nextValue: number) {
    valueRef.current = nextValue;
    onChange(nextValue);
  }

  function settleWheel() {
    setSettling(!reducedMotion.current);
    updateOffset(0);
  }

  function applyTravel(distance: number) {
    const stepHeight = rowHeight();
    const travel = resolveWheelTravel(
      valueRef.current,
      offsetRef.current,
      distance,
      stepHeight,
      maximum,
      wrapAt,
    );

    if (travel.value !== valueRef.current) emitValue(travel.value);
    updateOffset(travel.offset);
    return !travel.hitBoundary;
  }

  function animateStep(delta: number) {
    if (disabled) return;
    cancelMotion();
    setEntry(null);
    const nextValue = stepDurationValue(
      valueRef.current,
      delta,
      wrapAt,
      maximum,
    );
    if (nextValue === valueRef.current) {
      settleWheel();
      return;
    }

    emitValue(nextValue);
    if (reducedMotion.current) {
      setSettling(false);
      updateOffset(0);
      return;
    }

    setSettling(false);
    updateOffset(Math.sign(delta) * rowHeight());
    motionFrame.current = window.requestAnimationFrame(() => {
      motionFrame.current = window.requestAnimationFrame(() => {
        setSettling(true);
        updateOffset(0);
        motionFrame.current = null;
      });
    });
  }

  function startInertia(initialVelocity: number) {
    cancelMotion();
    let velocity = Math.max(
      -INERTIA_MAX_VELOCITY,
      Math.min(INERTIA_MAX_VELOCITY, initialVelocity),
    );
    let previousTime: number | null = null;

    function advance(currentTime: number) {
      if (previousTime === null) {
        previousTime = currentTime;
        motionFrame.current = window.requestAnimationFrame(advance);
        return;
      }
      const elapsed = Math.min(32, currentTime - previousTime);
      previousTime = currentTime;
      const moved = applyTravel(velocity * elapsed);
      const speed = Math.max(
        0,
        Math.abs(velocity) - INERTIA_DECELERATION * elapsed,
      );
      velocity = Math.sign(velocity) * speed;

      if (!moved || speed < 0.04) {
        settleWheel();
        motionFrame.current = null;
        return;
      }
      motionFrame.current = window.requestAnimationFrame(advance);
    }

    motionFrame.current = window.requestAnimationFrame(advance);
  }

  function beginEntry() {
    if (disabled) return;
    cancelMotion();
    settleWheel();
    setEntry(String(valueRef.current));
  }

  function commitEntry(restoreFocus = false) {
    if (entry === null) return;
    const nextValue = parseDurationEntry(entry, maximum);
    cancelMotion();
    setEntry(null);
    setSettling(false);
    updateOffset(0);
    if (nextValue !== null && nextValue !== valueRef.current)
      emitValue(nextValue);
    if (restoreFocus) restoreSpinbuttonFocus();
  }

  function restoreSpinbuttonFocus() {
    window.requestAnimationFrame(() =>
      selectedButtonRef.current?.focus({ preventScroll: true }),
    );
  }

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    function syncReducedMotion() {
      reducedMotion.current = media.matches;
      if (media.matches) {
        if (motionFrame.current !== null) {
          window.cancelAnimationFrame(motionFrame.current);
          motionFrame.current = null;
        }
        if (wheelSettleTimer.current !== null) {
          window.clearTimeout(wheelSettleTimer.current);
          wheelSettleTimer.current = null;
        }
        offsetRef.current = 0;
        setWheelOffset(0);
        setSettling(false);
      }
    }
    syncReducedMotion();
    media.addEventListener("change", syncReducedMotion);
    return () => media.removeEventListener("change", syncReducedMotion);
  }, []);

  useEffect(
    () => () => {
      if (motionFrame.current !== null) {
        window.cancelAnimationFrame(motionFrame.current);
      }
      if (wheelSettleTimer.current !== null) {
        window.clearTimeout(wheelSettleTimer.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!editingEntry) return;
    entryInputRef.current?.focus({ preventScroll: true });
    entryInputRef.current?.select();
  }, [editingEntry]);

  useEffect(() => {
    const column = columnRef.current;
    if (!column) return;

    function handleWheel(event: WheelEvent) {
      if (disabled || event.deltaY === 0) return;
      event.preventDefault();
      cancelMotion();
      setEntry(null);
      setSettling(false);
      applyTravel(
        -normalizeWheelDistance(event.deltaY, event.deltaMode, rowHeight()),
      );
      wheelSettleTimer.current = window.setTimeout(() => {
        settleWheel();
        wheelSettleTimer.current = null;
      }, resolveMotionDurationMs("response"));
    }

    column.addEventListener("wheel", handleWheel, { passive: false });
    return () => column.removeEventListener("wheel", handleWheel);
  });

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    let delta: number | null = null;

    switch (event.key) {
      case "ArrowUp":
        delta = -1;
        break;
      case "ArrowDown":
        delta = 1;
        break;
      case "PageUp":
        delta = -10;
        break;
      case "PageDown":
        delta = 10;
        break;
      case "Home":
        delta = -valueRef.current;
        break;
      case "End":
        delta = maximum - valueRef.current;
        break;
      case "Enter":
      case "F2":
        event.preventDefault();
        beginEntry();
        return;
      default:
        return;
    }

    event.preventDefault();
    animateStep(delta);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (
      disabled ||
      !event.isPrimary ||
      event.target instanceof HTMLInputElement
    )
      return;
    cancelMotion();
    setSettling(false);
    updateOffset(0);
    suppressClick.current = false;
    pointer.current = {
      id: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      velocity: 0,
      moved: false,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const activePointer = pointer.current;
    if (!activePointer || activePointer.id !== event.pointerId) return;

    const elapsed = Math.max(1, event.timeStamp - activePointer.lastTime);
    const distance = event.clientY - activePointer.lastY;
    activePointer.velocity =
      activePointer.velocity * 0.6 + (distance / elapsed) * 0.4;
    activePointer.lastY = event.clientY;
    activePointer.lastTime = event.timeStamp;

    if (!activePointer.moved) {
      const totalDistance = event.clientY - activePointer.startY;
      if (Math.abs(totalDistance) < DRAG_CAPTURE_THRESHOLD_PX) return;
      activePointer.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      applyTravel(totalDistance);
      return;
    }

    applyTravel(distance);
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    const activePointer = pointer.current;
    if (!activePointer || activePointer.id !== event.pointerId) return;

    suppressClick.current = activePointer.moved;
    pointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const releaseDelay = event.timeStamp - activePointer.lastTime;
    const shouldUseInertia =
      activePointer.moved &&
      !reducedMotion.current &&
      releaseDelay < 80 &&
      Math.abs(activePointer.velocity) >= INERTIA_MIN_VELOCITY;
    if (shouldUseInertia) startInertia(activePointer.velocity);
    else settleWheel();
  }

  const trackStyle: WheelStyle = {
    "--duration-wheel-offset": `${wheelOffset}px`,
  };

  return (
    <div
      ref={columnRef}
      className={styles.columnViewport}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <div
        className={styles.track}
        data-settling={settling}
        style={trackStyle}
        onTransitionEnd={(event) => {
          if (
            event.target !== event.currentTarget ||
            event.propertyName !== "transform"
          )
            return;
          updateOffset(0);
          setSettling(false);
        }}
      >
        {WHEEL_VALUES.map((offset) => {
          const option = getVisibleOption(value, offset, wrapAt, maximum);
          const current = offset === 0;
          const distance = Math.abs(offset);

          if (option === null) {
            return (
              <span
                key={offset}
                className={styles.placeholder}
                aria-hidden="true"
              >
                {"\u00a0"}
              </span>
            );
          }

          if (current && entry !== null) {
            return (
              <input
                key={offset}
                ref={entryInputRef}
                type="text"
                inputMode="numeric"
                className={styles.entry}
                value={entry}
                maxLength={2}
                aria-label={`Enter ${label.toLowerCase()}`}
                data-testid={`session-duration-${part}-input`}
                onChange={(event) => {
                  const nextEntry = event.target.value;
                  if (
                    nextEntry === "" ||
                    (/^\d+$/.test(nextEntry) && Number(nextEntry) <= maximum)
                  ) {
                    setEntry(nextEntry);
                  }
                }}
                onBlur={() => commitEntry(false)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitEntry(true);
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    setEntry(null);
                    restoreSpinbuttonFocus();
                  }
                }}
              />
            );
          }

          return (
            <button
              key={offset}
              ref={current ? selectedButtonRef : undefined}
              type="button"
              role={current ? "spinbutton" : undefined}
              className={styles.value}
              data-distance={distance}
              data-testid={current ? `session-duration-${part}` : undefined}
              tabIndex={current ? 0 : -1}
              aria-labelledby={current ? labelId : undefined}
              aria-label={
                current ? undefined : `Set ${label.toLowerCase()} to ${option}`
              }
              aria-valuemin={current ? 0 : undefined}
              aria-valuemax={current ? maximum : undefined}
              aria-valuenow={current ? value : undefined}
              aria-valuetext={
                current ? `${value} ${label.toLowerCase()}` : undefined
              }
              disabled={disabled}
              onDoubleClick={current ? beginEntry : undefined}
              onKeyDown={current ? handleKeyDown : undefined}
              onClick={() => {
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                if (!current) animateStep(offset);
              }}
            >
              {formatWheelValue(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getVisibleOption(
  value: number,
  offset: number,
  wrapAt: number | undefined,
  maximum: number,
) {
  if (wrapAt !== undefined) {
    return stepDurationValue(value, offset, wrapAt, maximum);
  }

  const option = value + offset;
  return option < 0 || option > maximum ? null : option;
}

function formatWheelValue(value: number) {
  return String(value).padStart(2, "0");
}
