"use client";

import { useEffect, useId, useRef, useState, type HTMLAttributes } from "react";
import { Sparkles } from "lucide-react";
import { Card } from "../cards/card.component";
import { cn } from "@/lib/styles/utils/class-name.util";
import "./ai-text-frame.css";

export type AiTextFrameProps = HTMLAttributes<HTMLElement> & {
  /** Supply an adjacent pause control when using the animated treatment. */
  paused?: boolean;
  heading?: string;
  description?: string;
  headingLevel?: 2 | 3;
};

/** Approved reading surface for AI-prepared text; never a generation indicator. */
export function AiTextFrame({
  paused = false,
  heading,
  description,
  headingLevel = 2,
  children,
  className,
  ...props
}: AiTextFrameProps) {
  const frame = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const Heading = headingLevel === 3 ? "h3" : "h2";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = frame.current;
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
      ref={frame}
      className="become-ai-text-frame"
      data-animated={visible && !paused}
    >
      <Card
        as="article"
        material="solid"
        spacing="action"
        className={cn("become-ai-text-frame__box", className)}
        aria-labelledby={heading ? headingId : undefined}
        {...props}
      >
        <div className="become-ai-text-frame__content">
          {heading && (
            <header className="become-ai-text-frame__heading">
              <Heading id={headingId} className="type-section-title">
                <Sparkles aria-hidden="true" /> {heading}
              </Heading>
              {description && <p className="type-body-sm">{description}</p>}
            </header>
          )}
          {children}
        </div>
      </Card>
    </div>
  );
}
