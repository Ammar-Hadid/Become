"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import { AreaIcon } from "@/components/ui/icons/area-icon.component";
import { IconFrame } from "@/components/ui/icons/icon-frame.component";
import { useInterfaceSound } from "@/components/ui/sound/hooks/use-interface-sound.hook";
import {
  AREA_NAVIGATION,
  DESKTOP_NAVIGATION_CONFIG,
} from "./constants/area-navigation.config";

const areaCount = AREA_NAVIGATION.length;
const visibleCount = Math.max(
  1,
  Math.min(DESKTOP_NAVIGATION_CONFIG.visibleItems, areaCount),
);

function areaIndexForPath(pathname: string): number | null {
  const index = AREA_NAVIGATION.findIndex(
    ({ href }) =>
      pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)),
  );
  return index < 0 ? null : index;
}

export function normalizeWheelDistance(
  deltaY: number,
  deltaMode: number,
  stepHeight: number,
) {
  const magnitude = Math.abs(deltaY);
  let pixels = magnitude;
  if (deltaMode === 1) pixels = (magnitude * stepHeight) / 3;
  else if (deltaMode === 2) pixels = magnitude * stepHeight;
  else if (magnitude >= 80) pixels = stepHeight;
  return Math.sign(deltaY) * Math.min(stepHeight, pixels);
}

export function resolveWheelTravel(
  offset: number,
  distance: number,
  stepHeight: number,
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
  return { steps, offset: nextOffset };
}

export function DesktopAreaNavigation({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate: (href: string) => void;
}) {
  const { play } = useInterfaceSound();
  const initialIndex = areaIndexForPath(pathname) ?? 0;
  const [firstIndex, setFirstIndex] = useState(initialIndex);
  const [trackIndex, setTrackIndex] = useState(areaCount * 2 + initialIndex);
  const [wheelOffset, setWheelOffset] = useState(0);
  const [settling, setSettling] = useState(false);
  const [travelSize, setTravelSize] = useState<"short" | "medium" | "long">(
    "short",
  );
  const [expanded, setExpanded] = useState(false);
  const firstRef = useRef(initialIndex);
  const trackRef = useRef(areaCount * 2 + initialIndex);
  const onNavigateRef = useRef(onNavigate);
  const dockRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const wheelSettleTimer = useRef<number | null>(null);
  const motionFrame = useRef<number | null>(null);
  const wheelBurst = useRef({
    lastTime: -Infinity,
    direction: 0,
    moved: false,
  });

  useEffect(() => {
    onNavigateRef.current = onNavigate;
  }, [onNavigate]);

  useEffect(() => {
    if (!expanded) return;
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !dockRef.current?.contains(event.target)) {
        setExpanded(false);
      }
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setExpanded(false);
      play("returned");
      launcherRef.current?.focus({ preventScroll: true });
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [expanded, play]);

  // An external route change (for example, the mobile menu or a link inside a
  // domain) updates the rail without replaying a wheel transition.
  useEffect(() => {
    const routeIndex = areaIndexForPath(pathname);
    if (routeIndex === null || routeIndex === firstRef.current) return;
    if (wheelSettleTimer.current !== null)
      window.clearTimeout(wheelSettleTimer.current);
    if (motionFrame.current !== null)
      window.cancelAnimationFrame(motionFrame.current);
    wheelSettleTimer.current = null;
    motionFrame.current = null;
    offsetRef.current = 0;
    firstRef.current = routeIndex;
    setFirstIndex(routeIndex);
    trackRef.current = areaCount * 2 + routeIndex;
    setTrackIndex(trackRef.current);
    setWheelOffset(0);
    setSettling(false);
  }, [pathname]);

  useEffect(() => {
    const rail = navRef.current;
    const railWindow = windowRef.current;
    if (!rail || !railWindow) return;
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    function cancelMotion() {
      if (wheelSettleTimer.current !== null) {
        window.clearTimeout(wheelSettleTimer.current);
        wheelSettleTimer.current = null;
      }
      if (motionFrame.current !== null) {
        window.cancelAnimationFrame(motionFrame.current);
        motionFrame.current = null;
      }
    }

    function rowHeight() {
      const entries = railWindow!.querySelectorAll<HTMLElement>(
        ".desktop-rail-entry",
      );
      return entries.length > 1
        ? entries[1].offsetTop - entries[0].offsetTop
        : railWindow!.clientHeight / visibleCount;
    }

    function moveSelection(steps: number) {
      if (steps === 0) return;
      const next =
        (((firstRef.current + steps) % areaCount) + areaCount) % areaCount;
      firstRef.current = next;
      setFirstIndex(next);
      let nextTrack = trackRef.current + steps;
      if (nextTrack < areaCount || nextTrack >= areaCount * 3) {
        // Equivalent copies let the loop rebase without reversing the visual
        // travel when moving between Direction and Dashboard.
        nextTrack = areaCount * 2 + next;
      }
      trackRef.current = nextTrack;
      setTrackIndex(nextTrack);
    }

    function navigateToSelection() {
      onNavigateRef.current(AREA_NAVIGATION[firstRef.current].href);
    }

    function settleWheel() {
      setSettling(!motionPreference.matches);
      offsetRef.current = 0;
      setWheelOffset(0);
      navigateToSelection();
    }

    function animateStep(steps: number) {
      if (steps === 0) return;
      cancelMotion();
      const carriedOffset =
        (offsetRef.current /
          Math.max(1, rowHeight() * DESKTOP_NAVIGATION_CONFIG.wheelStepRows)) *
        rowHeight();
      offsetRef.current = 0;
      moveSelection(steps);
      navigateToSelection();
      setTravelSize(
        Math.abs(steps) >= 3
          ? "long"
          : Math.abs(steps) === 2
            ? "medium"
            : "short",
      );
      if (motionPreference.matches) {
        setSettling(false);
        setWheelOffset(0);
        return;
      }
      setSettling(false);
      setWheelOffset(steps * rowHeight() + carriedOffset);
      motionFrame.current = window.requestAnimationFrame(() => {
        motionFrame.current = window.requestAnimationFrame(() => {
          setSettling(true);
          setWheelOffset(0);
          motionFrame.current = null;
        });
      });
    }

    function onWheel(event: WheelEvent) {
      if (event.deltaY === 0) return;
      event.preventDefault();
      const direction = Math.sign(event.deltaY);
      const burst = wheelBurst.current;
      const newBurst =
        direction !== burst.direction ||
        event.timeStamp - burst.lastTime >
          DESKTOP_NAVIGATION_CONFIG.wheelBurstIdleMs;
      if (newBurst) burst.moved = false;
      burst.lastTime = event.timeStamp;
      burst.direction = direction;

      const stepDistance = Math.max(
        1,
        rowHeight() * DESKTOP_NAVIGATION_CONFIG.wheelStepRows,
      );
      cancelMotion();
      setSettling(false);
      setTravelSize("short");
      const normalized = normalizeWheelDistance(
        event.deltaY,
        event.deltaMode,
        stepDistance,
      );
      const travel = resolveWheelTravel(
        offsetRef.current,
        -normalized,
        stepDistance,
      );
      offsetRef.current = travel.offset;
      moveSelection(travel.steps);
      if (travel.steps !== 0) burst.moved = true;
      setWheelOffset(
        motionPreference.matches
          ? 0
          : (travel.offset / stepDistance) * rowHeight(),
      );
      wheelSettleTimer.current = window.setTimeout(() => {
        wheelSettleTimer.current = null;
        if (burst.moved) settleWheel();
        else animateStep(direction);
      }, DESKTOP_NAVIGATION_CONFIG.wheelBurstIdleMs);
    }

    function onKeyDown(event: KeyboardEvent) {
      const direction =
        event.key === "PageDown" || event.key === "ArrowDown"
          ? 1
          : event.key === "PageUp" || event.key === "ArrowUp"
            ? -1
            : null;
      if (direction === null) return;
      event.preventDefault();
      animateStep(direction);
    }

    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest<HTMLButtonElement>(
        ".desktop-rail-item[data-visible='true']",
      );
      if (!button || !railWindow!.contains(button)) return;
      const targetIndex = Number(button.dataset.areaIndex);
      if (!Number.isInteger(targetIndex)) return;
      const steps = (targetIndex - firstRef.current + areaCount) % areaCount;
      animateStep(steps);
    }

    function onMotionPreferenceChange(event: MediaQueryListEvent) {
      if (!event.matches) return;
      cancelMotion();
      offsetRef.current = 0;
      setSettling(false);
      setWheelOffset(0);
    }

    rail.addEventListener("wheel", onWheel, { passive: false });
    railWindow.addEventListener("keydown", onKeyDown);
    railWindow.addEventListener("click", onClick);
    motionPreference.addEventListener("change", onMotionPreferenceChange);
    return () => {
      rail.removeEventListener("wheel", onWheel);
      railWindow.removeEventListener("keydown", onKeyDown);
      railWindow.removeEventListener("click", onClick);
      motionPreference.removeEventListener("change", onMotionPreferenceChange);
      cancelMotion();
    };
  }, []);

  useEffect(() => {
    const rail = navRef.current;
    const focused = document.activeElement;
    if (!(focused instanceof HTMLButtonElement) || !rail?.contains(focused))
      return;
    if (focused.dataset.visible === "true") return;
    rail
      .querySelector<HTMLButtonElement>(
        ".desktop-rail-item[data-active='true'][data-visible='true']",
      )
      ?.focus({ preventScroll: true });
  }, [firstIndex]);

  return (
    <div
      className="desktop-nav-dock"
      ref={dockRef}
      data-expanded={expanded}
      data-active-area={AREA_NAVIGATION[firstIndex].area}
      style={{ "--nav-rail-visible-count": visibleCount } as CSSProperties}
    >
      <Button
        ref={launcherRef}
        className="desktop-nav-launcher"
        variant="ghost"
        size="icon"
        type="button"
        aria-label={expanded ? "Close area navigation" : "Open area navigation"}
        aria-controls="desktop-area-navigation-rail"
        aria-expanded={expanded}
        onClick={() => {
          const next = !expanded;
          setExpanded(next);
          play(next ? "layerOpened" : "returned");
        }}
      >
        <IconFrame treatment="compact" area={AREA_NAVIGATION[firstIndex].area}>
          {expanded ? <PanelLeftClose /> : <PanelLeftOpen />}
        </IconFrame>
      </Button>
      <nav
        id="desktop-area-navigation-rail"
        className="desktop-rail"
        ref={navRef}
        aria-label="Desktop area navigation"
        aria-hidden={!expanded}
        inert={!expanded}
      >
        <span className="desktop-rail-active-indicator" aria-hidden="true" />
        <div
          className="desktop-rail-window"
          ref={windowRef}
          tabIndex={expanded ? 0 : -1}
          aria-label={`Area navigation, position ${firstIndex + 1} of ${areaCount}. Scroll, select an icon, or use arrow keys. Navigation loops continuously.`}
        >
          <div
            className="desktop-rail-track"
            role="list"
            aria-label="Product areas"
            data-settling={settling}
            data-travel-size={travelSize}
            style={
              {
                "--nav-rail-track-index": trackIndex,
                "--nav-rail-wheel-offset": `${wheelOffset}px`,
              } as CSSProperties
            }
          >
            {Array.from({ length: 4 }, (_, copy) =>
              AREA_NAVIGATION.map(({ area, label }, index) => {
                const physicalIndex = copy * areaCount + index;
                const visible =
                  physicalIndex >= trackIndex &&
                  physicalIndex < trackIndex + visibleCount;
                return (
                  <div
                    className="desktop-rail-entry"
                    key={`${copy}-${area}`}
                    role="listitem"
                    aria-hidden={!visible}
                  >
                    <button
                      className="desktop-rail-item"
                      type="button"
                      data-area={area}
                      data-area-index={index}
                      data-visible={visible}
                      data-active={index === firstIndex}
                      tabIndex={visible ? 0 : -1}
                      aria-current={
                        index === firstIndex && visible ? "page" : undefined
                      }
                      aria-label={label}
                    >
                      <AreaIcon area={area} treatment="compact" />
                      <span
                        className="type-label desktop-rail-label"
                        aria-hidden="true"
                      >
                        {label}
                      </span>
                    </button>
                  </div>
                );
              }),
            )}
          </div>
        </div>
        <div className="desktop-rail-pagination type-system" aria-live="polite">
          <span>
            {String(firstIndex + 1).padStart(2, "0")} /{" "}
            {String(areaCount).padStart(2, "0")}
          </span>
          <span>SCROLL / CLICK</span>
        </div>
      </nav>
    </div>
  );
}
