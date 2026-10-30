"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { MoveDiagonal2 } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import { cn } from "@/lib/styles/utils/class-name.util";
import {
  PHONE_ARTWORK_VIEWPORT,
  type ViewportBounds,
  type ViewportResizeHandle,
  type ViewportSize,
} from "../config/resizable-viewport.config";
import { resizeViewport } from "../utils/resizable-viewport.util";
import "./resizable-viewport.css";

type ActiveDrag = {
  pointerId: number;
  handle: ViewportResizeHandle;
  startX: number;
  startY: number;
  size: ViewportSize;
  scale: number;
};

type LaneMetrics = {
  width: number;
  edgeClearance: number;
  handleOverhang: number;
};

type ResizableViewportProps = {
  size: ViewportSize;
  onSizeChange: (size: ViewportSize) => void;
  bounds?: ViewportBounds;
  keyboardStep?: number;
  keyboardShiftStep?: number;
  name?: string;
  className?: string;
  screenClassName?: string;
  children: ReactNode;
};

/** Approved resize mechanics and fixed review canvas for artwork viewports. */
export function ResizableViewport({
  size,
  onSizeChange,
  bounds = PHONE_ARTWORK_VIEWPORT.bounds,
  keyboardStep = PHONE_ARTWORK_VIEWPORT.keyboardStep,
  keyboardShiftStep = PHONE_ARTWORK_VIEWPORT.keyboardShiftStep,
  name = "Phone preview",
  className,
  screenClassName,
  children,
}: ResizableViewportProps) {
  const frameId = useId();
  const laneRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<ActiveDrag | null>(null);
  const [activeHandle, setActiveHandle] = useState<ViewportResizeHandle | null>(
    null,
  );
  const [lane, setLane] = useState<LaneMetrics>({
    width: 520,
    edgeClearance: 48,
    handleOverhang: 22,
  });
  const scale = Math.min(
    1,
    Math.max(0.1, (lane.width - lane.edgeClearance) / bounds.width.max),
  );

  useEffect(() => {
    const element = laneRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const styles = getComputedStyle(element);
      const token = (name: string, fallback: number) =>
        Number.parseFloat(styles.getPropertyValue(name)) || fallback;
      setLane({
        width: entry.contentRect.width,
        edgeClearance: token("--viewport-preview-edge-clearance", 48),
        handleOverhang: token("--viewport-preview-handle-overhang", 22),
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function beginDrag(
    event: PointerEvent<HTMLElement>,
    handle: ViewportResizeHandle,
  ) {
    if (
      !event.isPrimary ||
      (event.pointerType === "mouse" && event.button !== 0)
    )
      return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      handle,
      startX: event.clientX,
      startY: event.clientY,
      size,
      scale,
    };
    setActiveHandle(handle);
  }

  function moveDrag(event: PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    onSizeChange(
      resizeViewport(
        drag.size,
        drag.handle,
        event.clientX - drag.startX,
        event.clientY - drag.startY,
        drag.scale,
        bounds,
      ),
    );
  }

  function finishDrag(event: PointerEvent<HTMLElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setActiveHandle(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function onResizeKeyDown(
    event: KeyboardEvent<HTMLElement>,
    handle: ViewportResizeHandle,
  ) {
    const step = event.shiftKey ? keyboardShiftStep : keyboardStep;
    let deltaX = 0;
    let deltaY = 0;
    switch (event.key) {
      case "ArrowLeft":
        deltaX = -step;
        break;
      case "ArrowRight":
        deltaX = step;
        break;
      case "ArrowUp":
        deltaY = -step;
        break;
      case "ArrowDown":
        deltaY = step;
        break;
      case "Home":
      case "End":
        event.preventDefault();
        onSizeChange({
          width:
            handle === "height"
              ? size.width
              : bounds.width[event.key === "Home" ? "min" : "max"],
          height:
            handle === "width"
              ? size.height
              : bounds.height[event.key === "Home" ? "min" : "max"],
        });
        return;
      default:
        return;
    }
    if (handle === "width" && !deltaX) return;
    if (handle === "height" && !deltaY) return;
    event.preventDefault();
    onSizeChange(resizeViewport(size, handle, deltaX, deltaY, 1, bounds));
  }

  const pointerHandlers = {
    onPointerMove: moveDrag,
    onPointerUp: finishDrag,
    onPointerCancel: finishDrag,
    onLostPointerCapture: finishDrag,
  };

  return (
    <div className={cn("become-resizable-viewport", className)}>
      <div
        className="become-resizable-viewport-readout type-system"
        data-dragging={Boolean(activeHandle)}
        role="status"
        aria-live="off"
      >
        <span>
          {activeHandle
            ? `RESIZING ${activeHandle.toUpperCase()}`
            : "LIVE VIEWPORT"}
        </span>
        <output aria-label={`Current ${name.toLowerCase()} dimensions`}>
          {size.width} <small>×</small> {size.height} <small>PX</small>
        </output>
      </div>

      <div className="become-resizable-viewport-stage">
        <div
          className="become-resizable-viewport-lane"
          ref={laneRef}
          style={{ height: bounds.height.max * scale + lane.handleOverhang }}
        >
          <div
            className="become-resizable-viewport-shell"
            style={{ width: size.width * scale, height: size.height * scale }}
            data-dragging={Boolean(activeHandle)}
          >
            <div
              className={cn("become-resizable-viewport-frame", screenClassName)}
              id={frameId}
              style={{
                width: size.width,
                height: size.height,
                transform: `scale(${scale})`,
              }}
            >
              {children}
            </div>

            <div
              role="separator"
              tabIndex={0}
              aria-orientation="vertical"
              aria-label={`${name} width`}
              aria-controls={frameId}
              aria-valuemin={bounds.width.min}
              aria-valuemax={bounds.width.max}
              aria-valuenow={size.width}
              aria-valuetext={`${size.width} pixels wide`}
              className="become-resizable-viewport-handle become-resizable-viewport-handle-width"
              data-active={activeHandle === "width"}
              onPointerDown={(event) => beginDrag(event, "width")}
              onKeyDown={(event) => onResizeKeyDown(event, "width")}
              {...pointerHandlers}
            >
              <span
                className="become-resizable-viewport-grip"
                aria-hidden="true"
              >
                <i />
                <i />
                <i />
              </span>
            </div>
            <div
              role="separator"
              tabIndex={0}
              aria-orientation="horizontal"
              aria-label={`${name} height`}
              aria-controls={frameId}
              aria-valuemin={bounds.height.min}
              aria-valuemax={bounds.height.max}
              aria-valuenow={size.height}
              aria-valuetext={`${size.height} pixels high`}
              className="become-resizable-viewport-handle become-resizable-viewport-handle-height"
              data-active={activeHandle === "height"}
              onPointerDown={(event) => beginDrag(event, "height")}
              onKeyDown={(event) => onResizeKeyDown(event, "height")}
              {...pointerHandlers}
            >
              <span
                className="become-resizable-viewport-grip"
                aria-hidden="true"
              >
                <i />
                <i />
                <i />
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="become-resizable-viewport-corner"
              aria-label={`Resize ${name.toLowerCase()} width and height`}
              data-active={activeHandle === "corner"}
              onPointerDown={(event) => beginDrag(event, "corner")}
              onKeyDown={(event) => onResizeKeyDown(event, "corner")}
              {...pointerHandlers}
            >
              <MoveDiagonal2 aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      <div className="become-resizable-viewport-foot type-caption">
        <span>
          Right edge <strong>↔</strong> width
        </span>
        <span>
          Bottom edge <strong>↕</strong> height
        </span>
        <span>
          Corner <strong>⤡</strong> both
        </span>
        <span>Keyboard: arrows · Shift for {keyboardShiftStep} px</span>
      </div>
    </div>
  );
}
