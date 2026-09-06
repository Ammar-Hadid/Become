import { Bot, CalendarDays, PauseCircle } from "lucide-react";
import { getRecurringAnalytics } from "@/features/finance/recurring/queries/recurring-analytics.query";
import { formatMoney } from "@/lib/money/utils/money.util";
import { FinanceSection } from "@/features/finance/components/finance-field.component";

export async function RecurringAnalytics({ userId }: { userId: string }) {
  const analytics = await getRecurringAnalytics(userId);
  return (
    <FinanceSection
      title="Commitment rhythm"
      description="A light summary of the schedules shaping your regular outflow."
    >
      <div className="finance-recurring-signals">
        <article>
          <CalendarDays aria-hidden="true" />
          <div>
            <strong>{analytics.active}</strong>
            <span>active commitments</span>
          </div>
        </article>
        <article>
          <Bot aria-hidden="true" />
          <div>
            <strong>{analytics.automatic}</strong>
            <span>record automatically</span>
          </div>
        </article>
        <article>
          <PauseCircle aria-hidden="true" />
          <div>
            <strong>{analytics.paused}</strong>
            <span>currently paused</span>
          </div>
        </article>
      </div>
      {(analytics.actualByCurrency.size > 0 ||
        analytics.categoryAnnualized.length > 0 ||
        analytics.largest.length > 0) && (
        <details className="finance-details finance-methodology">
          <summary>Commitment insights</summary>
          <div className="finance-details-body finance-insight-grid">
            {analytics.actualByCurrency.size > 0 && (
              <div>
                <h3>Actual spending · {analytics.monthLabel}</h3>
                {[...analytics.actualByCurrency].map(([currency, totals]) => {
                  const total = totals.recurring + totals.ordinary;
                  const permille = total
                    ? (totals.recurring * 1000n + total / 2n) / total
                    : null;
                  return (
                    <p key={currency}>
                      <span>{currency} recurring share</span>
                      <strong>
                        {permille === null
                          ? "Unavailable"
                          : String(permille / 10n) +
                            "." +
                            String(permille % 10n) +
                            "%"}
                      </strong>
                    </p>
                  );
                })}
              </div>
            )}
            {analytics.categoryAnnualized.length > 0 && (
              <div>
                <h3>Ongoing by category</h3>
                {analytics.categoryAnnualized.map((row) => (
                  <p key={row.currency + ":" + row.category}>
                    <span>{row.category}</span>
                    <strong className="finance-number">
                      ≈ {formatMoney((row.amount + 6n) / 12n, row.currency)} /
                      month
                    </strong>
                  </p>
                ))}
              </div>
            )}
          </div>
        </details>
      )}
    </FinanceSection>
  );
}
