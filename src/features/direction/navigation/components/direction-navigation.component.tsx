"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { ViewTransition } from "react";
import { MenuItem } from "@/components/ui/menus/menu-item.component";
import { SubMenu } from "@/components/ui/menus/submenu.component";

const groups = [
  {
    label: "Chapter",
    links: [
      { href: "/direction", label: "Season" },
      { href: "/direction/goals", label: "Goals" },
      { href: "/direction/experiments", label: "Experiments" },
    ],
  },
  {
    label: "Thinking",
    links: [
      { href: "/direction/ideas", label: "Ideas" },
      { href: "/direction/decisions", label: "Decisions" },
    ],
  },
  {
    label: "Archive",
    links: [{ href: "/direction/seasons", label: "Library" }],
  },
] as const;

type DirectionLink = { href: string; label: string };
const links: DirectionLink[] = groups.flatMap((group) => [...group.links]);

function isCurrent(pathname: string, href: string) {
  if (href === "/direction") {
    return (
      pathname === href ||
      (pathname.startsWith("/direction/seasons/") &&
        pathname !== "/direction/seasons")
    );
  }
  if (href === "/direction/seasons") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DirectionNavigation() {
  const pathname = usePathname();
  const current =
    links.find(({ href }) => isCurrent(pathname, href)) ?? links[0];

  return (
    <>
      <nav
        className="direction-navigation direction-navigation--desktop"
        aria-label="Direction navigation"
      >
        {groups.map((group) => (
          <div
            className="direction-navigation-group"
            role="group"
            aria-label={group.label}
            key={group.label}
          >
            <span className="direction-navigation-group-label" aria-hidden>
              {group.label}
            </span>
            <div className="direction-navigation-links">
              {group.links.map(({ href, label }) => {
                const active = isCurrent(pathname, href);
                return (
                  <Link
                    href={href}
                    key={href}
                    aria-current={active ? "page" : undefined}
                  >
                    {label}
                    {active && (
                      <ViewTransition
                        name="direction-navigation-indicator-desktop"
                        share="motion-guide"
                        default="none"
                      >
                        <span
                          className="direction-navigation-indicator"
                          aria-hidden
                        />
                      </ViewTransition>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <SubMenu
        label="Choose a Direction view"
        placement="bottom-end"
        className="direction-navigation-mobile"
        menuClassName="direction-navigation-menu"
        trigger={(triggerProps) => (
          <button {...triggerProps} className="direction-navigation-trigger">
            <span>
              <small>Direction</small>
              <strong>{current.label}</strong>
            </span>
            <ChevronDown aria-hidden />
          </button>
        )}
      >
        {groups.map((group) => (
          <div className="direction-navigation-menu-group" key={group.label}>
            <p>{group.label}</p>
            {group.links.map(({ href, label }) => {
              const active = isCurrent(pathname, href);
              return (
                <MenuItem
                  href={href}
                  key={href}
                  className={
                    active ? "direction-navigation-menu-current" : undefined
                  }
                  label={`${label}${active ? ", current page" : ""}`}
                >
                  <span>{label}</span>
                  {active && <Check aria-hidden />}
                </MenuItem>
              );
            })}
          </div>
        ))}
      </SubMenu>
    </>
  );
}
