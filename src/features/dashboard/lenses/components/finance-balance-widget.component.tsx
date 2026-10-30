import Link from "next/link";
import { ArrowUpRight, Wallet } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-states/empty-state.component";
import { IconFrame } from "@/components/ui/icons/icon-frame.component";
import type { DashboardLensData } from "@/features/dashboard/lenses/types/dashboard-lens.types";

export function FinanceBalanceWidget({
  balances,
}: {
  balances: NonNullable<DashboardLensData["financeBalance"]>;
}) {
  return (
    <section className="dashboard-v2-card material-glass dashboard-lens-balance" aria-labelledby="dashboard-lens-balance-title">
      <div className="dashboard-v2-card-heading">
        <div className="dashboard-v2-title-group">
          <IconFrame area="finance" treatment="compact"><Wallet /></IconFrame>
          <h2 className="type-widget-title" id="dashboard-lens-balance-title">Total Balance</h2>
        </div>
        <Link href="/finance/accounts" className="type-caption dashboard-lens-balance-link">
          View accounts <ArrowUpRight aria-hidden="true" />
        </Link>
      </div>
      {balances.length ? (
        <>
          <div className="dashboard-lens-balance-values">
            {balances.map(({ currency, value }) => (
              <div className="dashboard-lens-balance-currency" key={currency}>
                <span className="type-label dashboard-v2-muted">{currency}</span>
                {value === null ? (
                  <span className="type-body dashboard-lens-balance-pending">Reconciliation needed</span>
                ) : (
                  <strong className="type-metric-lg dashboard-lens-balance-value">{value}</strong>
                )}
              </div>
            ))}
          </div>
          <p className="type-caption dashboard-v2-muted dashboard-lens-balance-note">
            Current account position{balances.length > 1 ? " · totals shown separately by currency" : ""}
          </p>
        </>
      ) : (
        <EmptyState
          pattern="account-gateway"
          area="finance"
          size="compact"
          title="No accounts yet"
          description="Add an account and reconcile its starting balance to see a total here."
          className="dashboard-lens-empty"
        />
      )}
    </section>
  );
}
