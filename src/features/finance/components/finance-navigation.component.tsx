"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  Landmark,
  LayoutDashboard,
  PiggyBank,
  ReceiptText,
  Sparkles,
} from "lucide-react";

const links = [
  ["/finance", "Overview", LayoutDashboard],
  ["/finance/transactions", "Transactions", ReceiptText],
  ["/finance/accounts", "Accounts", Landmark],
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
      {links.map(([href, label, Icon]) => (
        <Link
          key={href}
          href={href}
          aria-current={isCurrent(pathname, href) ? "page" : undefined}
        >
          <Icon aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
