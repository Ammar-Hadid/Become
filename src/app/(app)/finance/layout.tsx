import { FinanceNavigation } from "@/features/finance/components/finance-navigation.component";
import { RecurringCheck } from "@/features/finance/recurring/components/recurring-check.component";
export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="page-shell finance-shell">
      <header className="finance-masthead">
        <div>
          <p className="eyebrow">Your financial life</p>
          <h1>Finance</h1>
        </div>
        <p className="finance-masthead-copy">
          Position, movement, commitments and earning — held in one clear
          picture.
        </p>
      </header>
      <FinanceNavigation />
      <RecurringCheck />
      {children}
    </div>
  );
}
