"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ViewTransition } from "react";

const links = [
  { href: "/direction", label: "Season", match: "/direction/seasons/" },
  { href: "/direction/goals", label: "Goals", match: "/direction/goals" },
  {
    href: "/direction/experiments",
    label: "Experiments",
    match: "/direction/experiments",
  },
  { href: "/direction/seasons", label: "Library", match: "/direction/seasons" },
] as const;

export function DirectionNavigation() {
  const pathname = usePathname();

  return (
    <nav className="direction-navigation" aria-label="Direction navigation">
      {links.map(({ href, label, match }) => {
        const active =
          href === "/direction"
            ? pathname === href ||
              (pathname.startsWith(match) && pathname !== "/direction/seasons")
            : href === "/direction/seasons"
              ? pathname === href
              : pathname === href || pathname.startsWith(`${match}/`);

        return (
          <Link
            href={href}
            key={href}
            aria-current={active ? "page" : undefined}
          >
            {label}
            {active && (
              <ViewTransition
                name="direction-navigation-indicator"
                share="motion-guide"
                default="none"
              >
                <span className="direction-navigation-indicator" aria-hidden />
              </ViewTransition>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
