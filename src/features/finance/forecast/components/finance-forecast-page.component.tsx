import Link from "next/link";
import { DateTime } from "luxon";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Landmark,
} from "lucide-react";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { formatMoney, moneyDecimal } from "@/lib/money/utils/money.util";
import { getFinancialPosition } from "@/features/finance/accounts/queries/financial-position.query";
import {
  FinanceEmptyState,
  FinancePageHeader,
  FinanceSection,
} from "@/features/finance/components/finance-field.component";
import { FinanceDialog } from "@/features/finance/components/finance-dialog.component";
import { FinanceForm } from "@/features/finance/components/finance-form.component";
import { archiveExpectedIncomeAction } from "@/features/finance/forecast/actions/expected-income.action";
import { ExpectedIncomeForm } from "@/features/finance/forecast/components/expected-income-form.component";
import { FinanceForecastChart } from "@/features/finance/forecast/components/finance-forecast-chart.component";
import { getFinanceForecast } from "@/features/finance/forecast/queries/finance-forecast.query";
import type { ForecastHorizon } from "@/features/finance/forecast/types/finance-forecast.types";
import { getCounterpartyOptions } from "@/features/finance/counterparties/queries/counterparty.query";

const movementPresentation = {
  RECURRING_EXPENSE: {
    label: "Confirmed commitment",
    icon: CalendarClock,
    className: "is-expense",
  },
  EXPECTED_INCOME: {
    label: "Expected income",
    icon: ArrowDownLeft,
    className: "is-income",
  },
  CARD_SETTLEMENT: {
    label: "Card settlement",
    icon: CreditCard,
    className: "is-transfer",
  },
  PENDING: {
    label: "Pending activity",
    icon: CircleDollarSign,
    className: "is-pending",
  },
} as const;

export async function FinanceForecastPage({
  userId,
  horizonDays,
}: {
  userId: string;
  horizonDays: ForecastHorizon;
}) {
  const [forecast, accounts, counterparties] = await Promise.all([
    getFinanceForecast(userId, horizonDays),
    getFinancialPosition(userId),
    getCounterpartyOptions(userId),
  ]);
  const defaultDueOn = DateTime.fromISO(forecast.asOf, {
    zone: APP_TIMEZONE,
  })
    .plus({ days: 1 })
    .toISODate()!;
  const incomeAccounts = accounts.map((account) => ({
    id: account.id,
    name: account.name,
    currency: account.currency,
    type: account.type,
  }));
  const canAddIncome = incomeAccounts.some(
    (account) =>
      account.type !== "CREDIT_CARD" && account.type !== "INVESTMENT",
  );

  return (
    <>
      <FinancePageHeader
        eyebrow="Forecast"
        title="The next move, explained."
        description="A deterministic projection from qualified balances, confirmed commitments, expected income and pending activity."
        actions={
          canAddIncome ? (
            <FinanceDialog
              triggerLabel="Add expected income"
              title="Add expected income"
              description="Include money you expect only after you have confirmed the amount and date."
            >
              <ExpectedIncomeForm
                accounts={incomeAccounts}
                counterparties={counterparties}
                defaultDueOn={defaultDueOn}
              />
            </FinanceDialog>
          ) : undefined
        }
      />

      <nav className="finance-forecast-horizons" aria-label="Forecast horizon">
        {([7, 30, 90] as const).map((days) => (
          <Link
            key={days}
            href={`/finance/forecast?horizon=${days}`}
            aria-current={forecast.horizonDays === days ? "page" : undefined}
          >
            {days} days
          </Link>
        ))}
      </nav>

      {!forecast.currencies.length ? (
        <FinanceEmptyState
          icon={<Landmark aria-hidden="true" />}
          title="No position to forecast"
          description="Add an account and establish a balance before projecting future movement."
          action={
            <Link className="finance-panel-link" href="/finance/accounts">
              Set up accounts <ArrowRight aria-hidden="true" />
            </Link>
          }
        />
      ) : (
        <div className="finance-forecast-currencies">
          {forecast.currencies.map((currencyForecast) => {
            const chartPoints = currencyForecast.points.map((point) => ({
              on: point.on,
              label: DateTime.fromISO(point.on, {
                zone: APP_TIMEZONE,
              }).toFormat(horizonDays === 90 ? "d LLL" : "ccc d"),
              balance:
                point.balanceMinor === null
                  ? null
                  : Number(
                      moneyDecimal(
                        point.balanceMinor,
                        currencyForecast.currency,
                      ),
                    ),
              balanceMinor: point.balanceMinor?.toString() ?? null,
            }));

            return (
              <section
                className="finance-forecast-currency"
                key={currencyForecast.currency}
                aria-labelledby={`forecast-${currencyForecast.currency}`}
              >
                <header>
                  <div>
                    <p className="eyebrow">{forecast.horizonDays}-day view</p>
                    <h2 id={`forecast-${currencyForecast.currency}`}>
                      {currencyForecast.currency} outlook
                    </h2>
                  </div>
                  <span
                    className={
                      "finance-status-pill " +
                      (currencyForecast.qualifications.length
                        ? "finance-status-pill--warning"
                        : "finance-status-pill--positive")
                    }
                  >
                    {currencyForecast.qualifications.length ? (
                      <AlertCircle aria-hidden="true" />
                    ) : (
                      <CheckCircle2 aria-hidden="true" />
                    )}
                    {currencyForecast.qualifications.length
                      ? "Qualified"
                      : "Evidence current"}
                  </span>
                </header>

                <dl className="finance-forecast-summary">
                  <div>
                    <dt>Net financial position</dt>
                    <dd className="finance-number">
                      {currencyForecast.netWorthMinor === null
                        ? "Unavailable"
                        : formatMoney(
                            currencyForecast.netWorthMinor,
                            currencyForecast.currency,
                          )}
                    </dd>
                    <small>Assets minus liabilities</small>
                  </div>
                  <div>
                    <dt>Projected spendable balance</dt>
                    <dd className="finance-number">
                      {currencyForecast.projectedSpendableMinor === null
                        ? "Unavailable"
                        : formatMoney(
                            currencyForecast.projectedSpendableMinor,
                            currencyForecast.currency,
                          )}
                    </dd>
                    <small>At {forecast.throughOn}</small>
                  </div>
                  <div className="is-primary">
                    <dt>Unallocated after planned payments</dt>
                    <dd className="finance-number">
                      {currencyForecast.unallocatedAfterPlannedMinor === null
                        ? "Unavailable"
                        : formatMoney(
                            currencyForecast.unallocatedAfterPlannedMinor,
                            currencyForecast.currency,
                          )}
                    </dd>
                    <small>Lowest projected capacity in this horizon</small>
                  </div>
                </dl>

                <FinanceForecastChart
                  currency={currencyForecast.currency}
                  points={chartPoints}
                />

                <div className="finance-forecast-timeline">
                  <div className="finance-panel-heading">
                    <span className="finance-panel-icon">
                      <CalendarClock aria-hidden="true" />
                    </span>
                    <div>
                      <p className="eyebrow">Projection inputs</p>
                      <h3>Upcoming movement</h3>
                    </div>
                  </div>
                  {!currencyForecast.movements.length ? (
                    <p className="finance-panel-empty">
                      No confirmed movement falls inside this horizon.
                    </p>
                  ) : (
                    <ol>
                      {currencyForecast.movements.map((movement) => {
                        const presentation =
                          movementPresentation[movement.kind];
                        const Icon = presentation.icon;
                        return (
                          <li key={movement.id}>
                            <time dateTime={movement.on}>
                              {DateTime.fromISO(movement.on, {
                                zone: APP_TIMEZONE,
                              }).toFormat("d LLL")}
                            </time>
                            <span
                              className={`finance-ledger-icon ${presentation.className}`}
                            >
                              <Icon aria-hidden="true" />
                            </span>
                            <span>
                              <strong>{movement.label}</strong>
                              <small>{presentation.label}</small>
                            </span>
                            <strong
                              className={`finance-number ${presentation.className}`}
                            >
                              {movement.amountMinor > 0n ? "+ " : "− "}
                              {formatMoney(
                                movement.amountMinor < 0n
                                  ? -movement.amountMinor
                                  : movement.amountMinor,
                                currencyForecast.currency,
                              )}
                            </strong>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>

                {currencyForecast.qualifications.length > 0 && (
                  <details className="finance-details finance-forecast-qualifications">
                    <summary>
                      How this projection is qualified (
                      {currencyForecast.qualifications.length})
                    </summary>
                    <div className="finance-details-body">
                      <ul>
                        {currencyForecast.qualifications.map(
                          (qualification) => (
                            <li key={qualification}>{qualification}</li>
                          ),
                        )}
                      </ul>
                    </div>
                  </details>
                )}
              </section>
            );
          })}
        </div>
      )}

      <FinanceSection
        title="Expected income"
        description="User-confirmed expectations used by the projection. Received money remains a separate Finance transaction."
      >
        {!forecast.expectedIncome.length ? (
          <p className="finance-quiet-copy">No expected income confirmed.</p>
        ) : (
          <div className="finance-expected-income-list">
            {forecast.expectedIncome.map((income) => (
              <article key={income.id}>
                <span className="finance-ledger-icon is-income">
                  <ArrowDownLeft aria-hidden="true" />
                </span>
                <span>
                  <strong>{income.title}</strong>
                  <small>
                    {income.dueOn}
                    {income.recurrenceFrequency
                      ? ` · ${income.recurrenceFrequency.toLocaleLowerCase()}`
                      : " · one time"}
                  </small>
                </span>
                <strong className="finance-number">
                  + {formatMoney(income.amountMinor, income.currency)}
                </strong>
                <FinanceForm
                  action={archiveExpectedIncomeAction}
                  submitLabel="Remove from forecast"
                  submitVariant="ghost"
                  showSuccess={false}
                  formClassName=""
                >
                  <input type="hidden" name="id" value={income.id} />
                </FinanceForm>
              </article>
            ))}
          </div>
        )}
      </FinanceSection>

      {forecast.suggestions.length > 0 && (
        <div className="finance-forecast-suggestions-link">
          <CalendarClock aria-hidden="true" />
          <p>
            <strong>
              {forecast.suggestions.length} recurring pattern
              {forecast.suggestions.length === 1 ? "" : "s"} suggested
            </strong>
            <span>
              Suggestions do not affect this forecast until you confirm them.
            </span>
          </p>
          <Link href="/finance/recurring">
            Review suggestions <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      )}

      <p className="finance-forecast-coverage">
        {forecast.coverage.complete ? (
          <CheckCircle2 aria-hidden="true" />
        ) : (
          <AlertCircle aria-hidden="true" />
        )}
        {forecast.coverage.detail}
      </p>
    </>
  );
}
