"use client";

import { useContext, useLayoutEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { InterfaceSoundContext } from "@/components/ui/sound/components/interface-sound-provider.component";
import { cn } from "@/lib/styles/utils/class-name.util";
import "./workspace.css";

export type WorkspaceNavigationItem = {
  href: string;
  label: string;
  icon?: ReactNode;
  active?: boolean;
  exact?: boolean;
};

export function WorkspaceNavigation({
  label,
  items,
  className,
}: {
  label: string;
  items: readonly WorkspaceNavigationItem[];
  className?: string;
}) {
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);
  const sound = useContext(InterfaceSoundContext);
  const matching = items.filter(
    (item) =>
      item.active ??
      (pathname === item.href ||
        (!item.exact && pathname.startsWith(`${item.href}/`))),
  );
  const activeHref = matching.sort((a, b) => b.href.length - a.href.length)[0]
    ?.href;
  useLayoutEffect(() => {
    const nav = ref.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) return;
    const bounds = nav.getBoundingClientRect();
    const item = active.getBoundingClientRect();
    if (item.left < bounds.left || item.right > bounds.right)
      nav.scrollLeft +=
        item.left - bounds.left - (bounds.width - item.width) / 2;
  }, [activeHref]);
  return (
    <nav
      ref={ref}
      className={cn("workspace-navigation", className)}
      aria-label={label}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={activeHref === item.href ? "page" : undefined}
          onClick={(event) => {
            if (
              !event.metaKey &&
              !event.ctrlKey &&
              !event.shiftKey &&
              activeHref !== item.href
            )
              sound?.play("controlConfirmed");
          }}
        >
          {item.icon && <span aria-hidden="true">{item.icon}</span>}
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
