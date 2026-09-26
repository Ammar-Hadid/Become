"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  {
    href: "/settings/personal",
    label: "Personal",
  },
  {
    href: "/settings/finance",
    label: "Finance",
  },
  {
    href: "/settings/nexo",
    label: "Nexo",
  },
] as const;

export function SettingsNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings sections" className="settings-navigation">
      <div className="settings-navigation-track">
        {sections.map((section) => {
          const active = pathname.startsWith(section.href);
          return (
            <Link
              key={section.href}
              href={section.href}
              aria-current={active ? "page" : undefined}
              className="settings-navigation-link"
            >
              {section.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
