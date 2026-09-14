"use client";
import { BusinessLink as Link } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { usePathname } from "next/navigation";
import { ViewTransition } from "react";
import {
  Compass,
  Building2,
  MessagesSquare,
  ScanSearch,
  FileText,
} from "lucide-react";
const links = [
  ["/history", "Overview", Compass],
  ["/audience", "Audience", Building2],
  ["/evidence", "Evidence", MessagesSquare],
  ["/problems", "Problems", ScanSearch],
  ["/offers", "Offers", FileText],
] as const;
export function BusinessNavigation() {
  const path = usePathname();
  return (
    <nav
      className="business-navigation"
      aria-label="Entrepreneurship navigation"
    >
      {links.map(([suffix, label, Icon]) => {
        const href = `/entrepreneurship${suffix}`;
        const current =
          suffix === "/audience"
            ? ["/audience", "/people", "/segments", "/market"].some((section) =>
                path.startsWith(`/entrepreneurship${section}`),
              )
            : suffix === "/evidence"
              ? ["/evidence", "/interactions", "/observations"].some(
                  (section) => path.startsWith(`/entrepreneurship${section}`),
                )
              : path.startsWith(href);
        return (
          <Link
            href={href}
            key={href}
            aria-current={current ? "page" : undefined}
          >
            <Icon aria-hidden="true" />
            {label}
            {current && (
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
