"use client";

import {
  cloneElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";
import type { IconArea } from "@/components/ui/icons/icon-frame.component";
import { parseCssTimeList } from "@/components/ui/motion/utils/motion-time.util";
import {
  positionTooltip,
  type TooltipSide,
} from "./utils/tooltip-position.util";

type Trigger = ReactElement<{ "aria-describedby"?: string }>;

type TooltipProps = {
  content: string;
  children: Trigger;
  area?: IconArea;
  side?: TooltipSide;
  className?: string;
};

/** Brief, non-interactive help for an enabled, already-accessible control. */
export function Tooltip({
  content,
  children,
  area = "dashboard",
  side = "top",
  className,
}: TooltipProps) {
  const id = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissedRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [portalHost, setPortalHost] = useState<Element | null>(null);
  const [position, setPosition] = useState<ReturnType<
    typeof positionTooltip
  > | null>(null);

  const cancelOpen = () => {
    if (openTimerRef.current !== null) clearTimeout(openTimerRef.current);
    openTimerRef.current = null;
  };
  const cancelClose = () => {
    if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  };
  const readDelay = (name: string) =>
    parseCssTimeList(
      getComputedStyle(
        anchorRef.current ?? document.documentElement,
      ).getPropertyValue(name),
    );
  const close = () => {
    cancelOpen();
    cancelClose();
    setOpen(false);
  };
  const show = () => {
    setPortalHost(anchorRef.current?.closest("dialog[open]") ?? document.body);
    setOpen(true);
  };
  const scheduleClose = () => {
    cancelOpen();
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      if (!anchorRef.current?.contains(document.activeElement)) setOpen(false);
    }, readDelay("--tooltip-close-delay"));
  };

  useEffect(
    () => () => {
      if (openTimerRef.current !== null) clearTimeout(openTimerRef.current);
      if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current);
    },
    [],
  );

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const anchor = anchorRef.current;
      const tooltip = tooltipRef.current;
      if (!anchor || !tooltip) return;
      const styles = getComputedStyle(tooltip);
      setPosition(
        positionTooltip({
          trigger: anchor.getBoundingClientRect(),
          tooltip: tooltip.getBoundingClientRect(),
          viewport: { width: window.innerWidth, height: window.innerHeight },
          preferredSide: side,
          gap:
            Number.parseFloat(styles.getPropertyValue("--tooltip-offset")) || 0,
          inset:
            Number.parseFloat(
              styles.getPropertyValue("--tooltip-viewport-inset"),
            ) || 0,
        }),
      );
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    const observer = new ResizeObserver(place);
    if (anchorRef.current) observer.observe(anchorRef.current);
    if (tooltipRef.current) observer.observe(tooltipRef.current);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      observer.disconnect();
    };
  }, [open, side, content]);

  useEffect(() => {
    if (!open) return;
    const dismissOutside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        !anchorRef.current?.contains(target) &&
        !tooltipRef.current?.contains(target)
      ) {
        if (openTimerRef.current !== null) clearTimeout(openTimerRef.current);
        if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current);
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", dismissOutside);
    return () => document.removeEventListener("pointerdown", dismissOutside);
  }, [open]);

  const describedBy = [children.props["aria-describedby"], open && id]
    .filter(Boolean)
    .join(" ");
  const trigger = cloneElement(children, {
    "aria-describedby": describedBy || undefined,
  });
  return (
    <span
      ref={anchorRef}
      className="become-tooltip-anchor"
      onPointerEnter={(event) => {
        if (event.pointerType === "touch" || dismissedRef.current) return;
        cancelClose();
        cancelOpen();
        openTimerRef.current = setTimeout(
          show,
          readDelay("--tooltip-hover-delay"),
        );
      }}
      onPointerLeave={() => {
        dismissedRef.current = false;
        scheduleClose();
      }}
      onPointerUpCapture={(event) => {
        if (event.pointerType !== "touch") return;
        dismissedRef.current = false;
        cancelOpen();
        cancelClose();
        show();
      }}
      onFocusCapture={() => {
        dismissedRef.current = false;
        cancelOpen();
        cancelClose();
        show();
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
      onKeyDownCapture={(event) => {
        if (event.key !== "Escape" || (!open && !openTimerRef.current)) return;
        dismissedRef.current = true;
        close();
        event.stopPropagation();
      }}
    >
      {trigger}
      {open && portalHost
        ? createPortal(
            <span
              ref={tooltipRef}
              id={id}
              role="tooltip"
              className={["become-tooltip type-label", className]
                .filter(Boolean)
                .join(" ")}
              data-tooltip-area={area}
              data-side={position?.side ?? side}
              style={{
                top: position?.top ?? 0,
                left: position?.left ?? 0,
                visibility: position ? "visible" : "hidden",
              }}
              onPointerEnter={cancelClose}
              onPointerLeave={scheduleClose}
            >
              {content}
            </span>,
            portalHost,
          )
        : null}
    </span>
  );
}
