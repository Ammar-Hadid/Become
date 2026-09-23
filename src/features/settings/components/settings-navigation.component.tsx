"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Landmark, Sparkles } from "lucide-react";

const sections = [
  {
    href: "/settings/finance",
    label: "Finance",
    description: "Money rules and records",
    icon: Landmark,
  },
  {
    href: "/settings/nexo",
    label: "Nexo",
    description: "AI models and limits",
    icon: Sparkles,
  },
] as const;

export function SettingsNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings sections" className="settings-navigation">
      <p>Areas</p>
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
            <span>
              <strong>{section.label}</strong>
              <small>{section.description}</small>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
