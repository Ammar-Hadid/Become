import { FinanceNavigation } from "@/features/finance/components/finance-navigation.component";
import { RecurringCheck } from "@/features/finance/recurring/components/recurring-check.component";
import { Workspace } from "@/components/ui/workspace/workspace.component";
import "@/features/finance/styles/finance-workspace.css";

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Workspace area="finance" className="page-shell finance-shell">
      <FinanceNavigation />
      {children}
      <RecurringCheck />
    </Workspace>
  );
}
