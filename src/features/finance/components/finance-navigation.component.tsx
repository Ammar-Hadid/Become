"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ViewTransition } from "react";
import {
  CalendarClock,
  Landmark,
  LayoutDashboard,
  PiggyBank,
  ReceiptText,
  Sparkles,
  TrendingUp,
} from "lucide-react";

const links = [
  ["/finance", "Overview", LayoutDashboard],
  ["/finance/transactions", "Transactions", ReceiptText],
  ["/finance/accounts", "Accounts", Landmark],
  ["/finance/forecast", "Forecast", TrendingUp],
  ["/finance/savings", "Savings", PiggyBank],
  ["/finance/recurring", "Recurring", CalendarClock],
  ["/finance/opportunities", "Work & Opportunities", Sparkles],
] as const;

const isCurrent = (pathname: string, href: string) =>
  href === "/finance"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

export function FinanceNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Finance navigation" className="finance-navigation">
      {links.map(([href, label, Icon]) => {
        const current = isCurrent(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
          >
            <Icon aria-hidden="true" />
            {label}
            {current && (
              <ViewTransition
                name="finance-navigation-indicator"
                share="motion-guide"
                default="none"
              >
                <span
                  className="finance-navigation-indicator"
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
