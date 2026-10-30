"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import { IconFrame } from "@/components/ui/icons/icon-frame.component";
import { AiTypingText } from "@/components/ui/typing/ai-typing-text.component";
import type { DashboardLens } from "@/features/dashboard/lenses/types/dashboard-lens.types";
import { cn } from "@/lib/styles/utils/class-name.util";

export function CotsDailyMessage({
  area,
  message,
  className,
}: {
  area: DashboardLens;
  message: string;
  className?: string;
}) {
  const headingId = `dashboard-cots-${area}-title`;
  const cardRef = useRef<HTMLElement>(null);
  const [liveMessage, setLiveMessage] = useState<string | null>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const controller = new AbortController();
    let started = false;
    let retry: number | null = null;
    async function load(attempt = 0) {
      try {
        const response = await fetch("/api/cots/daily", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ area }),
          signal: controller.signal,
        });
        if (!response.ok) return;
        const result = (await response.json()) as {
          status: string;
          message?: string;
        };
        if (result.status === "READY" && result.message)
          setLiveMessage(result.message);
        else if (result.status === "PENDING" && attempt < 3)
          retry = window.setTimeout(() => void load(attempt + 1), 1500);
      } catch {
        /* Keep the clearly labelled preview when AI is unavailable. */
      }
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          started = true;
          observer.disconnect();
          void load();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(card);
    return () => {
      observer.disconnect();
      controller.abort();
      if (retry !== null) window.clearTimeout(retry);
    };
  }, [area]);

  return (
    <section
      ref={cardRef}
      className={cn(
        "dashboard-v2-card material-glass dashboard-v2-cots",
        className,
      )}
      aria-labelledby={headingId}
    >
      <div className="dashboard-v2-card-heading">
        <div className="dashboard-v2-title-group">
          <IconFrame treatment="compact" area={area}>
            <MessageSquare />
          </IconFrame>
          <h2 className="type-widget-title" id={headingId}>
            C.O.T.S Daily Message
          </h2>
        </div>
        <span className="type-caption dashboard-v2-muted">
          {liveMessage ? "Today" : "Preview"}
        </span>
      </div>
      <blockquote>
        <AiTypingText
          text={liveMessage ?? message}
          visibilityTargetRef={cardRef}
        />
      </blockquote>
      <div className="dashboard-v2-cots-signature type-system">
        <span />
        C.O.T.S
        <span />
      </div>
    </section>
  );
}
