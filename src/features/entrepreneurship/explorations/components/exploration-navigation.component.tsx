"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ViewTransition } from "react";
import { explorationHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";
const tabs = [
  ["", "Overview"],
  ["/audience", "Audience"],
  ["/evidence", "Evidence"],
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
        const base = explorationHref(nicheId);
        const active =
          suffix === "/audience"
            ? ["/audience", "/segments", "/people", "/companies"].some(
                (section) => path.startsWith(`${base}${section}`),
              )
            : suffix === "/evidence"
              ? ["/evidence", "/interactions", "/observations"].some(
                  (section) => path.startsWith(`${base}${section}`),
                )
              : suffix
                ? path.startsWith(href)
                : path === href;
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
