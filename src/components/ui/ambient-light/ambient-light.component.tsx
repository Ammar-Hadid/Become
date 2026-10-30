"use client";

import { useEffect, useRef, useState, type HTMLAttributes } from "react";
import { cn } from "@/lib/styles/utils/class-name.util";
import "./ambient-light.css";

export type AmbientLightProps = HTMLAttributes<HTMLDivElement> & {
  /** Supply a shared pause/resume control beside the surface. */
  paused?: boolean;
};

/** Approved Gold Drift backdrop; decorative motion never represents progress. */
export function AmbientLight({
  paused = false,
  children,
  className,
  ...props
}: AmbientLightProps) {
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let intersects = false;
    const update = () =>
      setVisible(intersects && document.visibilityState === "visible");
    const observer = new IntersectionObserver(([entry]) => {
      intersects = entry.isIntersecting;
      update();
    });
    observer.observe(element);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return (
    <div
      {...props}
      ref={root}
      className={cn("become-ambient-light", className)}
      data-motion={visible && !paused ? "running" : "paused"}
    >
      <div className="become-ambient-light__field" aria-hidden="true" />
      {children}
    </div>
  );
}
