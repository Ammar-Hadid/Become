"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, ViewTransition } from "react";
import { explorationHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";

const stages = [
  {
    slug: "snapshot",
    label: "Snapshot",
    cue: "Current understanding",
    aliases: ["snapshot"],
  },
  {
    slug: "scope",
    label: "Scope",
    cue: "Define the opportunity",
    aliases: ["scope", "audience", "segments", "people", "companies"],
  },
  {
    slug: "reach",
    label: "Reach",
    cue: "Find and engage",
    aliases: ["reach"],
  },
  {
    slug: "learn",
    label: "Learn",
    cue: "Gather evidence",
    aliases: ["learn", "evidence", "interactions", "observations"],
  },
  {
    slug: "decide",
    label: "Decide",
    cue: "Make a call",
    aliases: ["decide", "problems"],
  },
  {
    slug: "test",
    label: "Test",
    cue: "Try a solution",
    aliases: ["test", "offers"],
  },
] as const;

export function ExplorationNavigation({ nicheId }: { nicheId: string }) {
  const path = usePathname();
  const base = explorationHref(nicheId);
  const currentSection = path.slice(base.length).split("/").filter(Boolean)[0];
  const currentLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    currentLink.current?.scrollIntoView({
      behavior: "instant",
      block: "nearest",
      inline: "center",
    });
  }, [currentSection]);

  return (
    <nav className="exploration-journey" aria-label="Exploration journey">
      <ol>
        {stages.map((stage, index) => {
          const href = explorationHref(nicheId, `/${stage.slug}`);
          const active =
            (!currentSection && stage.slug === "snapshot") ||
            stage.aliases.some((alias) => alias === currentSection);
          return (
            <li key={stage.slug}>
              <Link
                ref={active ? currentLink : undefined}
                href={href}
                aria-current={active ? "page" : undefined}
              >
                <span className="exploration-journey-marker" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="exploration-journey-copy">
                  <strong>{stage.label}</strong>
                  <span className="sr-only"> — {stage.cue}</span>
                </span>
                {active && (
                  <ViewTransition
                    name="business-navigation-indicator"
                    share="motion-guide"
                    default="none"
                  >
                    <span
                      className="exploration-journey-indicator"
                      aria-hidden="true"
                    />
                  </ViewTransition>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
