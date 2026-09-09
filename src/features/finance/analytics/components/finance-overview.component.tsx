import Link from "next/link";
import { DateTime } from "luxon";
import { ViewTransition } from "react";
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleGauge,
  Landmark,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import {
  formatDuration,
  getPeriod,
  getPreviousPeriod,
  isTimeframe,
} from "@/lib/dates/utils/period.util";
import { formatMoney, moneyDecimal } from "@/lib/money/utils/money.util";
import {
  getFinancialPosition,
  sumPosition,
} from "@/features/finance/accounts/queries/financial-position.query";
import { getFinanceAttention } from "@/features/finance/analytics/queries/finance-attention.query";
import { getCashFlow } from "@/features/finance/analytics/queries/cash-flow.query";
import { getFinanceWork } from "@/features/finance/analytics/queries/finance-work.query";
import {
  formatCashMovementBucketDate,
  getCashMovementBuckets,
} from "@/features/finance/analytics/utils/cash-movement-buckets.util";
import { CashMovementChart } from "@/features/finance/analytics/components/cash-movement-chart.component";
import { FinancePeriodControl } from "@/features/finance/analytics/components/finance-period-control.component";
import { getSavings } from "@/features/finance/savings/queries/savings.query";
import {
  FinanceEmptyState,
  FinancePageHeader,
  FinanceSection,
} from "@/features/finance/components/finance-field.component";
import {
  financeToday,
  recurringDueDates,
} from "@/features/finance/recurring/utils/recurring-calendar.util";

const percent = (part: bigint, whole: bigint) =>
  whole > 0n ? Math.min(100, Number((part * 1000n) / whole) / 10) : 0;

const humanize = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());

export async function FinanceOverview({
  userId,
  timeframe,
  date,
}: {
  userId: string;
  timeframe?: string;
  date?: string;
}) {
  const now = DateTime.now().setZone(APP_TIMEZONE);
  const requested = date ? DateTime.fromISO(date, { zone: APP_TIMEZONE }) : now;
  const reference = requested.isValid && requested <= now ? requested : now;
  const period = getPeriod(
    reference,
    isTimeframe(timeframe ?? null)
      ? (timeframe as "week" | "month" | "season" | "year")
      : "month",
  );
  const previous = getPreviousPeriod(period);
  const cashBuckets = getCashMovementBuckets(period);
  const [
    position,
    attention,
    savings,
    cash,
    priorCash,
    work,
    definitions,
    categories,
    startPosition,
    endPosition,
    cashTimeline,
  ] = await Promise.all([
    getFinancialPosition(userId),
    getFinanceAttention(userId),
    getSavings(userId),
    getCashFlow(userId, period),
    getCashFlow(userId, previous),
    getFinanceWork(userId, period, now),
    prisma.recurringExpense.findMany({
      where: { userId, status: "ACTIVE", archivedAt: null },
    }),
    prisma.expenseCategory.findMany({
      where: { userId },
      select: { id: true, name: true },
    }),
    getFinancialPosition(userId, period.start.toUTC().toJSDate()),
    getFinancialPosition(
      userId,
      DateTime.min(now, period.end).toUTC().toJSDate(),
    ),
    Promise.all(
      cashBuckets.map((bucket) =>
        getCashFlow(userId, {
          ...period,
          start: bucket.start,
          end: bucket.end,
        }),
      ),
    ),
  ]);

  const totals = sumPosition(position);
  const startSavings = sumPosition(
    startPosition.filter((account) => account.includeInLiquidSavings),
  );
  const endSavings = sumPosition(
    endPosition.filter((account) => account.includeInLiquidSavings),
  );
  const today = financeToday();
  const upcoming = definitions
    .flatMap((definition) =>
      recurringDueDates(
        definition,
        today.plus({ days: 1 }),
        today.plus({ days: 30 }),
      ).map((due) => ({ definition, due })),
    )
    .sort(
      (a, b) =>
        a.due.toMillis() - b.due.toMillis() ||
        a.definition.id.localeCompare(b.definition.id),
    )
    .slice(0, 5);
  const currencies = [
    ...new Set([...cash.totals.keys(), ...priorCash.totals.keys()]),
  ].sort();
  const reconciled = position.filter(
    (account) => account.balanceMinor !== null,
  ).length;
  const workSeconds = work.seconds.PAID_WORK + work.incomeDevelopment;

  return (
    <>
      <FinancePageHeader
        eyebrow="Overview"
        title="Your money, in focus."
        description="A calm view of where you stand, what is moving and what deserves your attention next."
        actions={
          <Link
            className="finance-link-action finance-link-action--primary"
            href="/finance/transactions"
          >
            <ReceiptText aria-hidden="true" />
            Record movement
          </Link>
        }
      />

      <section className="finance-cockpit" aria-label="Current position">
        <div className="finance-position-hero">
          <div className="finance-hero-label">
            <span>Current recorded position</span>
            {position.length > 0 && (
              <span
                className={
                  "finance-status-pill " +
                  (reconciled === position.length
                    ? "finance-status-pill--positive"
                    : "finance-status-pill--warning")
                }
              >
                {reconciled === position.length ? (
                  <CheckCircle2 aria-hidden="true" />
                ) : (
                  <AlertCircle aria-hidden="true" />
                )}
                {reconciled} of {position.length} current
              </span>
            )}
          </div>
          {totals.size ? (
            <div className="finance-position-values">
              {[...totals].map(([currency, amount]) => (
                <div key={currency}>
                  <span>{currency}</span>
                  <strong className="finance-number">
                    {amount === null
                      ? "Unavailable"
                      : formatMoney(amount, currency)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="finance-position-empty">
              <Landmark aria-hidden="true" />
              <div>
                <strong>No position recorded yet</strong>
                <p>
                  Add an account and tell Become what it contains to establish
                  your starting point.
                </p>
              </div>
            </div>
          )}
          <div className="finance-hero-footer">
            <p>Built from your reconciliations and recorded movement.</p>
            <Link href="/finance/accounts">
              {position.length ? "Review accounts" : "Set up accounts"}
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>

        <aside className="finance-attention" aria-labelledby="attention-title">
          <div className="finance-attention-heading">
            <span className="finance-attention-icon">
              {attention.length ? (
                <CircleGauge aria-hidden="true" />
              ) : (
                <CheckCircle2 aria-hidden="true" />
              )}
            </span>
            <div>
              <p className="eyebrow">Needs attention</p>
              <h2 id="attention-title">
                {attention.length
                  ? attention.length +
                    " " +
                    (attention.length === 1 ? "item" : "items") +
                    " to review"
                  : "Everything looks settled"}
              </h2>
            </div>
          </div>
          {attention.length ? (
            <ul>
              {attention.slice(0, 4).map((item) => (
                <li key={item.id}>
                  <Link href={item.href}>
                    <span>{item.text}</span>
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="finance-attention-clear">
              No incomplete positions, savings conflicts or commitments need a
              decision right now.
            </p>
          )}
          {attention.length > 4 && (
            <p className="finance-attention-more">
              And {attention.length - 4} more across Finance.
            </p>
          )}
        </aside>
      </section>

      <section className="finance-direction-grid">
        <article className="finance-direction-panel">
          <div className="finance-panel-heading">
            <span className="finance-panel-icon">
              <PiggyBank aria-hidden="true" />
            </span>
            <div>
              <p className="eyebrow">Savings</p>
              <h2>What your savings are holding space for</h2>
            </div>
          </div>
          {savings.pools.length ? (
            <div className="finance-savings-snapshots">
              {savings.pools.map((pool) => {
                const reserveCovered = pool.reserveCovered ?? 0n;
                const reserveCoverage =
                  pool.reserve === null
                    ? 0
                    : pool.reserve === 0n
                      ? 100
                      : percent(reserveCovered, pool.reserve);
                const hasReserveShortfall = (pool.reserveShortfall ?? 0n) > 0n;
                return (
                  <div key={pool.currency} className="finance-savings-snapshot">
                    <div>
                      <span>{pool.currency} recorded liquid savings</span>
                      <strong className="finance-number">
                        {pool.liquid === null
                          ? "Unavailable"
                          : formatMoney(pool.liquid, pool.currency)}
                      </strong>
                    </div>
                    <div className="finance-overview-reserve-visual">
                      <div
                        className="finance-overview-reserve-track"
                        role="img"
                        aria-label={
                          pool.reserve === null
                            ? "Protected reserve not configured"
                            : `${reserveCoverage}% of the ${formatMoney(pool.reserve, pool.currency)} protected reserve is covered`
                        }
                      >
                        <span style={{ width: reserveCoverage + "%" }} />
                        {pool.reserve !== null && <i aria-hidden="true" />}
                      </div>
                      <div className="finance-overview-reserve-caption">
                        <span>
                          {pool.reserve === null
                            ? "Reserve not set"
                            : `${reserveCoverage}% of reserve covered`}
                        </span>
                        {pool.reserve !== null && (
                          <span>
                            Target {formatMoney(pool.reserve, pool.currency)}
                          </span>
                        )}
                      </div>
                    </div>
                    {pool.reserve !== null && hasReserveShortfall && (
                      <p
                        className="finance-overview-reserve-warning"
                        role="status"
                      >
                        <AlertCircle aria-hidden="true" />
                        <span>
                          <strong>Reserve not yet covered</strong>
                          {" · "}
                          {formatMoney(
                            pool.reserveShortfall ?? 0n,
                            pool.currency,
                          )}{" "}
                          still needed to reach the protected reserve.
                        </span>
                      </p>
                    )}
                    <dl>
                      <div>
                        <dt>
                          <ShieldCheck aria-hidden="true" /> Protected
                        </dt>
                        <dd className="finance-number">
                          {pool.reserve === null
                            ? "Not set"
                            : formatMoney(pool.reserve, pool.currency)}
                        </dd>
                      </div>
                      <div>
                        <dt>
                          <Sparkles aria-hidden="true" /> For goals
                        </dt>
                        <dd className="finance-number">
                          {formatMoney(pool.allocated, pool.currency)}
                        </dd>
                      </div>
                      <div>
                        <dt>Free to direct</dt>
                        <dd className="finance-number">
                          {pool.unallocated === null
                            ? "Unavailable"
                            : formatMoney(pool.unallocated, pool.currency)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="finance-panel-empty">
              Your savings story starts once a savings account or goal is in
              place.
            </p>
          )}
          <Link className="finance-panel-link" href="/finance/savings">
            Shape your savings
            <ArrowRight aria-hidden="true" />
          </Link>
        </article>

        <article className="finance-direction-panel">
          <div className="finance-panel-heading">
            <span className="finance-panel-icon finance-panel-icon--blue">
              <CalendarClock aria-hidden="true" />
            </span>
            <div>
              <p className="eyebrow">Next 30 days</p>
              <h2>Commitments on the horizon</h2>
            </div>
          </div>
          {upcoming.length ? (
            <ol className="finance-upcoming-list">
              {upcoming.map(({ definition, due }) => (
                <li key={definition.id + "-" + due.toISODate()}>
                  <time dateTime={due.toISODate()!}>
                    <strong>{due.toFormat("dd")}</strong>
                    <span>{due.toFormat("LLL")}</span>
                  </time>
                  <div>
                    <strong>{definition.name}</strong>
                    <span>
                      {definition.postingBehavior === "AUTOMATIC"
                        ? "Records automatically"
                        : "You’ll confirm it"}
                    </span>
                  </div>
                  <span className="finance-number">
                    {formatMoney(definition.amountMinor, definition.currency)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="finance-panel-empty">
              Nothing waiting for the next 30 days.
            </p>
          )}
          <Link className="finance-panel-link" href="/finance/recurring">
            See all commitments
            <ArrowRight aria-hidden="true" />
          </Link>
        </article>
      </section>

      <FinanceSection
        title="Cash movement"
        description="Money entering and leaving your accounts. Transfers stay visible but never masquerade as income or spending."
        className="finance-cash-movement-section"
        action={
          <FinancePeriodControl
            key={`${period.timeframe}-${reference.toISODate()}`}
            timeframe={period.timeframe}
            date={reference.toISODate()!}
            maxDate={now.toISODate()!}
          />
        }
      >
        <ViewTransition
          key={`${period.timeframe}-${reference.toISODate()}`}
          name="finance-cash-movement"
          share="motion-data-recompose"
          default="none"
        >
          <div className="finance-cash-movement-data">
            <p className="finance-period-caption">
              {period.label} <span>compared with {previous.label}</span>
            </p>
            {!currencies.length ? (
              <FinanceEmptyState
                icon={<ReceiptText aria-hidden="true" />}
                title="No money moved in this period"
                description="When you record income, an expense or a transfer, the pattern will take shape here."
                action={
                  <Link
                    className="finance-panel-link"
                    href="/finance/transactions"
                  >
                    Open transactions <ArrowRight aria-hidden="true" />
                  </Link>
                }
              />
            ) : (
              <div className="finance-cash-list">
                {currencies.map((currency) => {
                  const current = cash.totals.get(currency) ?? {
                    income: 0n,
                    expense: 0n,
                    transfer: 0n,
                    earnedWork: 0n,
                    businessRevenue: 0n,
                  };
                  const prior = priorCash.totals.get(currency);
                  const before = startSavings.get(currency);
                  const after = endSavings.get(currency);
                  const net = current.income - current.expense;
                  const chartData = cashBuckets.map((bucket, index) => {
                    const bucketTotal =
                      cashTimeline[index].totals.get(currency);
                    const moneyInMinor = bucketTotal?.income ?? 0n;
                    const moneyOutMinor = bucketTotal?.expense ?? 0n;

                    return {
                      label: bucket.label,
                      dateLabel: formatCashMovementBucketDate(
                        bucket,
                        period.timeframe,
                      ),
                      moneyIn: Number(moneyDecimal(moneyInMinor, currency)),
                      moneyOut: -Number(moneyDecimal(moneyOutMinor, currency)),
                      moneyInMinor: moneyInMinor.toString(),
                      moneyOutMinor: moneyOutMinor.toString(),
                    };
                  });
                  return (
                    <article className="finance-cash-card" key={currency}>
                      <header>
                        <div>
                          <span>{currency}</span>
                          <p>Net external cash flow</p>
                        </div>
                        <strong
                          className={
                            "finance-number " +
                            (net >= 0n ? "is-positive" : "is-negative")
                          }
                        >
                          {net > 0n && "+"}
                          {formatMoney(net, currency)}
                        </strong>
                      </header>
                      <CashMovementChart
                        currency={currency}
                        data={chartData}
                        moneyInTotal={current.income.toString()}
                        moneyOutTotal={current.expense.toString()}
                      />
                      <div className="finance-cash-context">
                        <p>
                          Internal transfers{" "}
                          <strong className="finance-number">
                            {formatMoney(current.transfer, currency)}
                          </strong>
                        </p>
                        <p>
                          Savings changed{" "}
                          <strong className="finance-number">
                            {before === undefined ||
                            after === undefined ||
                            before === null ||
                            after === null
                              ? "Unavailable"
                              : formatMoney(after - before, currency)}
                          </strong>
                        </p>
                        <p>
                          Inflow vs prior{" "}
                          <strong className="finance-number">
                            {formatMoney(
                              current.income - (prior?.income ?? 0n),
                              currency,
                            )}
                          </strong>
                        </p>
                      </div>
                      <details className="finance-details">
                        <summary>Where it came from and went</summary>
                        <div className="finance-details-body finance-breakdown-grid">
                          <div>
                            <h3>Money in</h3>
                            {cash.groups
                              .filter(
                                (group) =>
                                  group.currency === currency &&
                                  group.type === "INCOME",
                              )
                              .map((group) => (
                                <p key={group.inflowKind}>
                                  <span>
                                    {humanize(group.inflowKind ?? "Other")}
                                  </span>
                                  <strong className="finance-number">
                                    {formatMoney(
                                      group._sum.amountMinor ?? 0n,
                                      currency,
                                    )}
                                  </strong>
                                </p>
                              ))}
                          </div>
                          <div>
                            <h3>Money out</h3>
                            {cash.groups
                              .filter(
                                (group) =>
                                  group.currency === currency &&
                                  group.type === "EXPENSE",
                              )
                              .map((group) => (
                                <p key={group.expenseCategoryId ?? "none"}>
                                  <span>
                                    {categories.find(
                                      (category) =>
                                        category.id === group.expenseCategoryId,
                                    )?.name ?? "Uncategorized"}
                                  </span>
                                  <strong className="finance-number">
                                    {formatMoney(
                                      group._sum.amountMinor ?? 0n,
                                      currency,
                                    )}
                                  </strong>
                                </p>
                              ))}
                          </div>
                        </div>
                      </details>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </ViewTransition>
      </FinanceSection>

      <FinanceSection
        title="Earning & exploration"
        description="Time spent earning now, alongside the effort invested in creating future income."
        action={
          <Link
            className="finance-link-action finance-link-action--secondary"
            href="/finance/opportunities"
          >
            Work & opportunities
            <ArrowRight aria-hidden="true" />
          </Link>
        }
      >
        <div className="finance-work-summary">
          <article>
            <span className="finance-panel-icon">
              <BriefcaseBusiness aria-hidden="true" />
            </span>
            <div>
              <span>Paid work</span>
              <strong className="finance-number">
                {formatDuration(work.seconds.PAID_WORK, true)}
              </strong>
            </div>
          </article>
          <article>
            <span className="finance-panel-icon finance-panel-icon--violet">
              <Sparkles aria-hidden="true" />
            </span>
            <div>
              <span>Income development</span>
              <strong className="finance-number">
                {formatDuration(work.incomeDevelopment, true)}
              </strong>
            </div>
          </article>
          <article>
            <span className="finance-panel-icon finance-panel-icon--blue">
              <CircleGauge aria-hidden="true" />
            </span>
            <div>
              <span>Effective linked rate</span>
              <strong className="finance-number">
                {work.rate.state === "AVAILABLE"
                  ? formatMoney(work.rate.displayMinor, work.rate.currency) +
                    " / h"
                  : {
                      NO_PAID_WORK: "No paid work yet",
                      INCOMPLETE_ATTRIBUTION: "Needs attribution",
                      NO_LINKED_INCOME: "No linked income",
                      MIXED_CURRENCY: "Multiple currencies",
                    }[work.rate.state]}
              </strong>
            </div>
          </article>
        </div>
        {workSeconds > 0 || work.cohort.discovered > 0 ? (
          <div className="finance-work-detail">
            <div>
              <h3>How the time was used</h3>
              <p>
                Search {formatDuration(work.seconds.OPPORTUNITY_SEARCH, true)} ·
                Applications {formatDuration(work.seconds.APPLICATION, true)} ·
                Assessments {formatDuration(work.seconds.ASSESSMENT, true)} ·
                Money admin {formatDuration(work.seconds.FINANCE_ADMIN, true)}
              </p>
            </div>
            <div>
              <h3>Opportunities started in {period.label}</h3>
              <p>
                {work.cohort.discovered} discovered · {work.cohort.accepted}{" "}
                accepted · {work.cohort.paid} connected to received income
              </p>
            </div>
          </div>
        ) : (
          <p className="finance-work-empty">
            No earning or opportunity-building time recorded in {period.label}.
          </p>
        )}
        <details className="finance-details finance-methodology">
          <summary>How these numbers work</summary>
          <div className="finance-details-body">
            <p className="text-text-secondary text-body">
              Work time is counted where a session overlaps {period.label}.
              Effective rate uses income explicitly attributed to paid-work
              sessions. Cash movement follows the date money was received.
            </p>
          </div>
        </details>
      </FinanceSection>
    </>
  );
}
