import Link from "next/link";
import { DateTime } from "luxon";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Landmark,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  Target,
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
import { FinanceActivity } from "@/features/finance/review/components/finance-activity.component";
import { getFinanceActivity } from "@/features/finance/review/queries/finance-activity.query";
import { FinanceEmptyState } from "@/features/finance/components/finance-field.component";
import {
  financeToday,
  recurringDueDates,
} from "@/features/finance/recurring/utils/recurring-calendar.util";
import { Card } from "@/components/ui/cards/card.component";
import { IconFrame } from "@/components/ui/icons/icon-frame.component";
import { ProgressIndicator } from "@/components/ui/progress/progress-indicator.component";
import {
  WorkspaceHeader,
  WorkspaceLink,
  WorkspaceMetric,
  WorkspacePanel,
} from "@/components/ui/workspace/workspace.component";
import { WorkspaceDisclosure } from "@/components/ui/workspace/workspace-disclosure.component";

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
    activity,
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
    recent,
  ] = await Promise.all([
    getFinancialPosition(userId),
    getFinanceActivity(userId),
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
    prisma.financialTransaction.findMany({
      where: { userId },
      include: { account: true, counterparty: true, expenseCategory: true },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: 4,
    }),
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
    .slice(0, 4);
  const currencies = [
    ...new Set([...cash.totals.keys(), ...priorCash.totals.keys()]),
  ].sort();
  const goal = savings.goals.find(
    (item) => !item.archivedAt && item.status === "ACTIVE",
  );
  const goalPercent = goal
    ? goal.funding.remaining === 0n
      ? 100
      : percent(goal.funding.funded, goal.funding.remaining)
    : 0;
  const reconciled = position.filter(
    (account) => account.balanceMinor !== null,
  ).length;
  const workSeconds = work.seconds.PAID_WORK + work.incomeDevelopment;

  return (
    <>
      <WorkspaceHeader
        eyebrow="Finance"
        title="Your money, in focus"
        description="See where you stand. Choose what needs your attention."
        actions={
          <WorkspaceLink href="/finance/transactions" variant="primary">
            <ReceiptText aria-hidden="true" /> Add a transaction
          </WorkspaceLink>
        }
      />

      <FinanceActivity activity={activity} />

      {goal ? (
        <Card material="elevated-glass" className="finance-goal-focus">
          <div className="finance-goal-focus__copy">
            <p className="workspace-eyebrow">
              <Target aria-hidden="true" /> Savings goal
            </p>
            <h2>{goal.name}</h2>
            <div className="finance-goal-focus__value">
              <strong>{goalPercent}%</strong>
              <span>
                of the remaining cost funded
                <br />
                <b>{formatMoney(goal.funding.funded, goal.currency)}</b> /{" "}
                {formatMoney(goal.funding.remaining, goal.currency)}
              </span>
            </div>
            <ProgressIndicator
              value={goalPercent}
              label={`${goal.name}: remaining cost funded`}
              area="finance"
            />
          </div>
          <div className="finance-goal-focus__aside">
            <span>
              Target {formatMoney(goal.targetAmountMinor, goal.currency)}
            </span>
            <WorkspaceLink href={`/finance/savings/${goal.id}`}>
              View goal <ArrowRight aria-hidden="true" />
            </WorkspaceLink>
          </div>
        </Card>
      ) : (
        <Card
          material="elevated-glass"
          className="finance-goal-focus finance-goal-focus--start"
        >
          <IconFrame treatment="featured" area="finance">
            <PiggyBank />
          </IconFrame>
          <div>
            <p className="workspace-eyebrow">Make room for what matters</p>
            <h2>A clear purpose for your savings.</h2>
            <p>
              Choose a goal when you are ready. Your accounts and transactions
              work independently.
            </p>
          </div>
          <WorkspaceLink href="/finance/savings">
            Explore savings <ArrowRight aria-hidden="true" />
          </WorkspaceLink>
        </Card>
      )}

      <div className="finance-overview-period">
        <span>{period.label}</span>
        <FinancePeriodControl
          key={`${period.timeframe}-${reference.toISODate()}`}
          timeframe={period.timeframe}
          date={reference.toISODate()!}
          maxDate={now.toISODate()!}
        />
      </div>
      <div className="finance-overview-layout">
        <div className="finance-overview-main">
          <div className="finance-overview-metrics">
            <WorkspaceMetric
              label="Current recorded position"
              icon={<Landmark />}
              value={
                totals.size ? (
                  <>
                    {[...totals].map(([currency, amount]) => (
                      <span className="finance-metric-currency" key={currency}>
                        {amount === null
                          ? `${currency} unavailable`
                          : formatMoney(amount, currency)}
                      </span>
                    ))}
                  </>
                ) : (
                  "Not set yet"
                )
              }
              detail={
                <Link href="/finance/accounts">
                  {position.length
                    ? `${reconciled} of ${position.length} accounts reconciled`
                    : "Add your first account"}{" "}
                  <ArrowRight aria-hidden="true" />
                </Link>
              }
            />
            <WorkspaceMetric
              label="Money in"
              tone="positive"
              icon={<ArrowDownLeft />}
              value={
                currencies.length ? (
                  <>
                    {currencies.map((currency) => (
                      <span className="finance-metric-currency" key={currency}>
                        {formatMoney(
                          cash.totals.get(currency)?.income ?? 0n,
                          currency,
                        )}
                      </span>
                    ))}
                  </>
                ) : (
                  "No movement"
                )
              }
              detail="Income recorded in this period"
            />
            <WorkspaceMetric
              label="Money out"
              tone="negative"
              icon={<ArrowUpRight />}
              value={
                currencies.length ? (
                  <>
                    {currencies.map((currency) => (
                      <span className="finance-metric-currency" key={currency}>
                        {formatMoney(
                          cash.totals.get(currency)?.expense ?? 0n,
                          currency,
                        )}
                      </span>
                    ))}
                  </>
                ) : (
                  "No movement"
                )
              }
              detail="Expenses recorded in this period"
            />
          </div>

          <div className="finance-overview-middle">
            <WorkspacePanel
              title="Cash movement"
              description={`${period.label} · transfers shown separately`}
              className="finance-overview-chart"
              spacing="dense"
            >
              <p className="finance-coverage-note">
                {cash.coverage.complete ? (
                  <CheckCircle2 aria-hidden="true" />
                ) : (
                  <AlertCircle aria-hidden="true" />
                )}
                <span>{cash.coverage.detail}</span>
              </p>
              {!currencies.length ? (
                <FinanceEmptyState
                  title="No money moved in this period"
                  description="Your income and expenses will form the picture here."
                  action={
                    <WorkspaceLink href="/finance/transactions">
                      Open transactions <ArrowRight />
                    </WorkspaceLink>
                  }
                />
              ) : (
                currencies.map((currency) => {
                  const current = cash.totals.get(currency) ?? {
                    income: 0n,
                    expense: 0n,
                    transfer: 0n,
                    earnedWork: 0n,
                    businessRevenue: 0n,
                  };
                  const before = startSavings.get(currency);
                  const after = endSavings.get(currency);
                  const chartData = cashBuckets.map((bucket, index) => {
                    const bucketTotal =
                      cashTimeline[index].totals.get(currency);
                    const moneyIn = bucketTotal?.income ?? 0n;
                    const moneyOut = bucketTotal?.expense ?? 0n;
                    return {
                      label: bucket.label,
                      dateLabel: formatCashMovementBucketDate(
                        bucket,
                        period.timeframe,
                      ),
                      moneyIn: Number(moneyDecimal(moneyIn, currency)),
                      moneyOut: -Number(moneyDecimal(moneyOut, currency)),
                      moneyInMinor: moneyIn.toString(),
                      moneyOutMinor: moneyOut.toString(),
                    };
                  });
                  return (
                    <div className="finance-overview-currency" key={currency}>
                      {currencies.length > 1 && <h3>{currency}</h3>}
                      <CashMovementChart
                        currency={currency}
                        data={chartData}
                        moneyInTotal={current.income.toString()}
                        moneyOutTotal={current.expense.toString()}
                      />
                      <div className="finance-overview-net">
                        <span>Net cash flow</span>
                        <strong
                          className={
                            current.income >= current.expense
                              ? "is-positive"
                              : "is-negative"
                          }
                        >
                          {formatMoney(
                            current.income - current.expense,
                            currency,
                          )}
                        </strong>
                      </div>
                      <WorkspaceDisclosure title="See the breakdown">
                        <dl className="finance-fact-list">
                          <div>
                            <dt>Internal transfers</dt>
                            <dd>{formatMoney(current.transfer, currency)}</dd>
                          </div>
                          <div>
                            <dt>Gross expenses</dt>
                            <dd>{formatMoney(current.expense, currency)}</dd>
                          </div>
                          <div>
                            <dt>Refunds</dt>
                            <dd>
                              {formatMoney(
                                cash.totals.get(currency)?.refunds ?? 0n,
                                currency,
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>Net spending</dt>
                            <dd>
                              {formatMoney(
                                cash.totals.get(currency)?.netSpending ?? 0n,
                                currency,
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>Savings changed</dt>
                            <dd>
                              {before === undefined ||
                              after === undefined ||
                              before === null ||
                              after === null
                                ? "Unavailable"
                                : formatMoney(after - before, currency)}
                            </dd>
                          </div>
                          <div>
                            <dt>Inflow vs {previous.label}</dt>
                            <dd>
                              {formatMoney(
                                current.income -
                                  (priorCash.totals.get(currency)?.income ??
                                    0n),
                                currency,
                              )}
                            </dd>
                          </div>
                        </dl>
                        <div className="finance-breakdown-grid">
                          {(["INCOME", "EXPENSE"] as const).map((type) => (
                            <div key={type}>
                              <h3>
                                {type === "INCOME" ? "Money in" : "Money out"}
                              </h3>
                              {cash.groups
                                .filter(
                                  (group) =>
                                    group.currency === currency &&
                                    group.type === type,
                                )
                                .map((group) => (
                                  <p
                                    key={`${group.inflowKind}-${group.expenseCategoryId}`}
                                  >
                                    <span>
                                      {type === "INCOME"
                                        ? humanize(group.inflowKind ?? "Other")
                                        : (categories.find(
                                            (category) =>
                                              category.id ===
                                              group.expenseCategoryId,
                                          )?.name ?? "Uncategorized")}
                                    </span>
                                    <strong>
                                      {formatMoney(
                                        group._sum.amountMinor ?? 0n,
                                        currency,
                                      )}
                                    </strong>
                                  </p>
                                ))}
                            </div>
                          ))}
                        </div>
                      </WorkspaceDisclosure>
                    </div>
                  );
                })
              )}
            </WorkspacePanel>
            <WorkspacePanel
              title="Recent transactions"
              actions={
                <WorkspaceLink href="/finance/transactions" variant="ghost">
                  View all <ArrowRight />
                </WorkspaceLink>
              }
              spacing="dense"
              className="finance-recent-panel"
            >
              {recent.length ? (
                <div className="finance-compact-records">
                  {recent.map((row) => (
                    <Link key={row.id} href={`/finance/transactions/${row.id}`}>
                      <IconFrame treatment="compact" area="finance">
                        {row.type === "INCOME" ? (
                          <ArrowDownLeft />
                        ) : row.type === "EXPENSE" ? (
                          <ArrowUpRight />
                        ) : (
                          <ReceiptText />
                        )}
                      </IconFrame>
                      <span>
                        <strong>
                          {row.counterparty?.name ??
                            row.expenseCategory?.name ??
                            humanize(row.type)}
                        </strong>
                        <small>
                          {row.account.name} ·{" "}
                          {DateTime.fromJSDate(row.occurredAt)
                            .setZone(APP_TIMEZONE)
                            .toFormat("d LLL")}
                        </small>
                      </span>
                      <b
                        className={
                          row.type === "INCOME"
                            ? "is-positive"
                            : row.type === "EXPENSE"
                              ? "is-negative"
                              : ""
                        }
                      >
                        {row.type === "EXPENSE"
                          ? "−"
                          : row.type === "INCOME"
                            ? "+"
                            : ""}
                        {formatMoney(row.amountMinor, row.currency)}
                      </b>
                    </Link>
                  ))}
                </div>
              ) : (
                <FinanceEmptyState
                  title="Your ledger starts here"
                  description="Record money when it arrives, leaves or moves between your accounts."
                />
              )}
              {position.length > 0 && (
                <div className="finance-account-peek">
                  <Landmark aria-hidden="true" />
                  <span>
                    {position.length}{" "}
                    {position.length === 1 ? "account" : "accounts"}
                    <small>Balances and bank sources</small>
                  </span>
                  <WorkspaceLink href="/finance/accounts" variant="ghost">
                    View <ArrowRight />
                  </WorkspaceLink>
                </div>
              )}
            </WorkspacePanel>
          </div>
        </div>
        <aside className="finance-overview-sidebar">
          <WorkspacePanel
            title="Needs attention"
            description={
              attention.length
                ? `${attention.length} ${attention.length === 1 ? "item" : "items"} to review`
                : "No actions waiting"
            }
            spacing="dense"
          >
            {attention.length ? (
              <div className="finance-attention-records">
                {attention.map((item) => (
                  <Link key={item.id} href={item.href}>
                    <AlertCircle aria-hidden="true" />
                    <span>{item.text}</span>
                    <ArrowRight aria-hidden="true" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="finance-quiet-state">
                <CheckCircle2 />
                <p>
                  Your recorded accounts and commitments have no outstanding
                  checks.
                </p>
              </div>
            )}
          </WorkspacePanel>
          <WorkspacePanel
            title="Upcoming expenses"
            description="Next 30 days"
            actions={
              <WorkspaceLink href="/finance/recurring" variant="ghost">
                View all <ArrowRight />
              </WorkspaceLink>
            }
            spacing="dense"
          >
            {upcoming.length ? (
              <div className="finance-compact-records">
                {upcoming.map(({ definition, due }) => (
                  <Link
                    key={`${definition.id}-${due.toISODate()}`}
                    href="/finance/recurring"
                  >
                    <IconFrame treatment="compact" area="finance">
                      <CalendarClock />
                    </IconFrame>
                    <span>
                      <strong>{definition.name}</strong>
                      <small>
                        {due.toFormat("d LLL")} ·{" "}
                        {definition.postingBehavior === "AUTOMATIC"
                          ? "Records automatically"
                          : "Confirm when due"}
                      </small>
                    </span>
                    <b>
                      {formatMoney(definition.amountMinor, definition.currency)}
                    </b>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="finance-quiet-state">
                <CalendarClock />
                <p>No scheduled expenses in the next 30 days.</p>
              </div>
            )}
          </WorkspacePanel>
        </aside>
      </div>

      <WorkspacePanel
        title="Savings reserve"
        description="Your safety buffer, before money is set aside for goals."
        actions={
          <WorkspaceLink href="/finance/savings" variant="ghost">
            Manage savings <ArrowRight />
          </WorkspaceLink>
        }
        spacing="dense"
      >
        {savings.pools.length ? (
          <div className="finance-reserve-grid">
            {savings.pools.map((pool) => {
              const coverage =
                pool.reserve === null || pool.liquid === null
                  ? null
                  : pool.reserve === 0n
                    ? 100
                    : percent(pool.reserveCovered ?? 0n, pool.reserve);
              return (
                <div className="finance-reserve-summary" key={pool.currency}>
                  <div className="finance-reserve-summary__heading">
                    <IconFrame treatment="bare" area="finance">
                      <ShieldCheck />
                    </IconFrame>
                    <div>
                      <span>{pool.currency} liquid savings</span>
                      <strong>
                        {pool.liquid === null
                          ? "Unavailable"
                          : formatMoney(pool.liquid, pool.currency)}
                      </strong>
                    </div>
                    <b>{coverage === null ? "—" : `${coverage}%`}</b>
                  </div>
                  {coverage !== null ? (
                    <ProgressIndicator
                      variant="season-ticks"
                      value={coverage}
                      label={`${pool.currency} protected reserve coverage`}
                      area="finance"
                    />
                  ) : (
                    <p className="finance-muted">
                      {pool.reserve === null
                        ? "Reserve not configured"
                        : "Reconcile your accounts to see reserve coverage"}
                    </p>
                  )}
                  <dl className="finance-fact-list">
                    <div>
                      <dt>Protected reserve</dt>
                      <dd>
                        {pool.reserve === null
                          ? "Not set"
                          : formatMoney(pool.reserve, pool.currency)}
                      </dd>
                    </div>
                    <div>
                      <dt>Allocated to goals</dt>
                      <dd>{formatMoney(pool.allocated, pool.currency)}</dd>
                    </div>
                    <div>
                      <dt>Free to direct</dt>
                      <dd>
                        {pool.unallocated === null
                          ? "Unavailable"
                          : formatMoney(pool.unallocated, pool.currency)}
                      </dd>
                    </div>
                  </dl>
                  {(pool.reserveShortfall ?? 0n) > 0n && (
                    <p className="finance-callout">
                      <AlertCircle />
                      <span>
                        <strong>Reserve not yet covered</strong> ·{" "}
                        {formatMoney(
                          pool.reserveShortfall ?? 0n,
                          pool.currency,
                        )}{" "}
                        still needed.
                      </span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <FinanceEmptyState
            title="No savings reserve yet"
            description="Include an account in savings, then choose the amount you want to protect."
            action={
              <WorkspaceLink href="/finance/accounts">
                View accounts <ArrowRight />
              </WorkspaceLink>
            }
          />
        )}
      </WorkspacePanel>

      <WorkspacePanel
        title="Work & opportunities"
        description={period.label}
        actions={
          <WorkspaceLink href="/finance/opportunities" variant="ghost">
            Open workspace <ArrowRight />
          </WorkspaceLink>
        }
        spacing="dense"
      >
        <div className="finance-work-metrics">
          <div>
            <BriefcaseBusiness />
            <span>
              Paid work
              <strong>{formatDuration(work.seconds.PAID_WORK, true)}</strong>
            </span>
          </div>
          <div>
            <Target />
            <span>
              Income development
              <strong>{formatDuration(work.incomeDevelopment, true)}</strong>
            </span>
          </div>
          <div>
            <Landmark />
            <span>
              Effective linked rate
              <strong>
                {work.rate.state === "AVAILABLE"
                  ? `${formatMoney(work.rate.displayMinor, work.rate.currency)} / h`
                  : {
                      NO_PAID_WORK: "No paid work yet",
                      INCOMPLETE_ATTRIBUTION: "Needs attribution",
                      NO_LINKED_INCOME: "No linked income",
                      MIXED_CURRENCY: "Multiple currencies",
                    }[work.rate.state]}
              </strong>
            </span>
          </div>
        </div>
        <WorkspaceDisclosure title="Work breakdown and measurement">
          {workSeconds > 0 || work.cohort.discovered > 0 ? (
            <div className="finance-work-detail">
              <div>
                <h3>How the time was used</h3>
                <p>
                  Search {formatDuration(work.seconds.OPPORTUNITY_SEARCH, true)}{" "}
                  · Applications{" "}
                  {formatDuration(work.seconds.APPLICATION, true)} · Assessments{" "}
                  {formatDuration(work.seconds.ASSESSMENT, true)} · Money admin{" "}
                  {formatDuration(work.seconds.FINANCE_ADMIN, true)}
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
            <p>
              No earning or opportunity-building time recorded in {period.label}
              .
            </p>
          )}
          <p className="finance-muted">
            Work time counts the part of a session inside this period. Effective
            rate uses income explicitly linked to paid work. Cash movement
            follows the date money was received.
          </p>
        </WorkspaceDisclosure>
      </WorkspacePanel>
    </>
  );
}
