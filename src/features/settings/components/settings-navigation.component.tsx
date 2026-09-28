"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Landmark, Sparkles, UserRound } from "lucide-react";

const sections = [
  {
    href: "/settings/personal",
    label: "Personal",
    icon: UserRound,
  },
  {
    href: "/settings/finance",
    label: "Finance",
    icon: Landmark,
  },
  {
    href: "/settings/nexo",
    label: "Nexo",
    icon: Sparkles,
  },
] as const;

export function SettingsNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings sections" className="settings-navigation">
      <div className="settings-navigation-track">
        {sections.map((section) => {
          const Icon = section.icon;
          const active = pathname.startsWith(section.href);
          return (
            <Link
              key={section.href}
              href={section.href}
              aria-current={active ? "page" : undefined}
              className="settings-navigation-link"
            >
              <Icon aria-hidden="true" />
              {section.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
