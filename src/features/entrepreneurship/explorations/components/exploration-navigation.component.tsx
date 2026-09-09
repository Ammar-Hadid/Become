"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ViewTransition } from "react";
import { explorationHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";
const tabs = [
  ["", "Overview"],
  ["/companies", "Companies"],
  ["/interactions", "Interactions"],
  ["/problems", "Problems"],
  ["/offers", "Offers"],
] as const;
export function ExplorationNavigation({ nicheId }: { nicheId: string }) {
  const path = usePathname();
  return (
    <nav
      className="business-navigation exploration-navigation"
      aria-label="Exploration navigation"
    >
      {tabs.map(([suffix, label]) => {
        const href = explorationHref(nicheId, suffix);
        const active = suffix ? path.startsWith(href) : path === href;
        return (
          <Link
            href={href}
            key={href}
            aria-current={active ? "page" : undefined}
          >
            {label}
            {active && (
              <ViewTransition
                name="business-navigation-indicator"
                share="motion-guide"
                default="none"
              >
                <span
                  className="business-navigation-indicator"
                  aria-hidden="true"
                />
              </ViewTransition>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
