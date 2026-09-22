"use client";

import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import styles from "@/features/sessions/details/styles/duration-picker.component.module.css";

const MAX_DURATION_SECONDS = Number.MAX_SAFE_INTEGER;
const WHEEL_VALUES = [-2, -1, 0, 1, 2] as const;
const DRAG_STEP_PX = 36;

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
  maximum?: number;
  wrapAt?: number;
  disabled?: boolean;
};

export function splitDurationSeconds(value: number): DurationParts {
  const duration = Math.min(
    MAX_DURATION_SECONDS,
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
    MAX_DURATION_SECONDS,
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

export function DurationPicker({
  value,
  onChange,
  disabled = false,
}: DurationPickerProps) {
  const labelRootId = useId();
  const duration = splitDurationSeconds(value);
  const maximumHours = Math.floor(
    (MAX_DURATION_SECONDS - duration.minutes * 60 - duration.seconds) / 3600,
  );

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
        <div className={styles.selection} aria-hidden="true" />
        <DurationColumn
          label="Hours"
          labelId={`${labelRootId}-hours`}
          part="hours"
          value={duration.hours}
          maximum={maximumHours}
          onChange={(nextValue) => updatePart("hours", nextValue)}
          disabled={disabled}
        />
        <DurationColumn
          label="Minutes"
          labelId={`${labelRootId}-minutes`}
          part="minutes"
          value={duration.minutes}
          wrapAt={59}
          onChange={(nextValue) => updatePart("minutes", nextValue)}
          disabled={disabled}
        />
        <DurationColumn
          label="Seconds"
          labelId={`${labelRootId}-seconds`}
          part="seconds"
          value={duration.seconds}
          wrapAt={59}
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
  maximum = Number.MAX_SAFE_INTEGER,
  wrapAt,
  disabled = false,
}: DurationColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<{
    id: number;
    lastY: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);

  function changeBy(delta: number) {
    if (disabled) return;
    onChange(stepDurationValue(value, delta, wrapAt, maximum));
  }

  useEffect(() => {
    const column = columnRef.current;
    if (!column) return;

    function handleWheel(event: WheelEvent) {
      if (disabled || event.deltaY === 0) return;
      event.preventDefault();
      onChange(
        stepDurationValue(value, event.deltaY > 0 ? 1 : -1, wrapAt, maximum),
      );
    }

    column.addEventListener("wheel", handleWheel, { passive: false });
    return () => column.removeEventListener("wheel", handleWheel);
  }, [disabled, maximum, onChange, value, wrapAt]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    let nextValue: number | null = null;

    switch (event.key) {
      case "ArrowUp":
        nextValue = stepDurationValue(value, -1, wrapAt, maximum);
        break;
      case "ArrowDown":
        nextValue = stepDurationValue(value, 1, wrapAt, maximum);
        break;
      case "PageUp":
        nextValue = stepDurationValue(value, -10, wrapAt, maximum);
        break;
      case "PageDown":
        nextValue = stepDurationValue(value, 10, wrapAt, maximum);
        break;
      case "Home":
        nextValue = 0;
        break;
      case "End":
        if (wrapAt !== undefined) nextValue = wrapAt;
        break;
      default:
        return;
    }

    if (nextValue === null) return;
    event.preventDefault();
    if (!disabled) onChange(nextValue);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (disabled || !event.isPrimary) return;
    pointer.current = {
      id: event.pointerId,
      lastY: event.clientY,
      moved: false,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const activePointer = pointer.current;
    if (!activePointer || activePointer.id !== event.pointerId) return;

    const travel = activePointer.lastY - event.clientY;
    const steps = Math.trunc(travel / DRAG_STEP_PX);
    if (steps === 0) return;

    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    activePointer.lastY -= steps * DRAG_STEP_PX;
    activePointer.moved = true;
    changeBy(steps);
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    const activePointer = pointer.current;
    if (!activePointer || activePointer.id !== event.pointerId) return;

    suppressClick.current = activePointer.moved;
    pointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);
  }

  return (
    <div
      ref={columnRef}
      className={styles.column}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      {WHEEL_VALUES.map((offset) => {
        const option = getVisibleOption(value, offset, wrapAt, maximum);
        const current = offset === 0;
        const distance = Math.abs(offset);

        if (option === null) {
          return <span key={offset} aria-hidden="true" />;
        }

        return (
          <button
            key={offset}
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
            aria-valuemax={current ? (wrapAt ?? maximum) : undefined}
            aria-valuenow={current ? value : undefined}
            aria-valuetext={
              current ? `${value} ${label.toLowerCase()}` : undefined
            }
            disabled={disabled}
            onKeyDown={current ? handleKeyDown : undefined}
            onClick={() => {
              if (!suppressClick.current) onChange(option);
            }}
          >
            {formatWheelValue(option)}
          </button>
        );
      })}
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
