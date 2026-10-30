import {
  CalendarClock,
  Landmark,
  LayoutDashboard,
  PiggyBank,
  ReceiptText,
  TrendingUp,
  BriefcaseBusiness,
} from "lucide-react";
import { WorkspaceNavigation } from "@/components/ui/workspace/workspace-navigation.component";

const links = [
  ["/finance", "Overview", LayoutDashboard],
  ["/finance/transactions", "Transactions", ReceiptText],
  ["/finance/accounts", "Accounts", Landmark],
  ["/finance/forecast", "Forecast", TrendingUp],
  ["/finance/savings", "Savings", PiggyBank],
  ["/finance/recurring", "Recurring", CalendarClock],
  ["/finance/opportunities", "Work & opportunities", BriefcaseBusiness],
] as const;

export function FinanceNavigation() {
  return (
    <WorkspaceNavigation
      label="Finance navigation"
      items={links.map(([href, label, Icon]) => ({
        href,
        label,
        icon: <Icon aria-hidden="true" />,
        exact: href === "/finance",
      }))}
    />
  );
}
