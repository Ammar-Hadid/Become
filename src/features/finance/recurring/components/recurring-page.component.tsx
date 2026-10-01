import {
  Bot,
  CalendarClock,
  CalendarDays,
  Hand,
  PauseCircle,
} from "lucide-react";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { formatMoney, moneyDecimal } from "@/lib/money/utils/money.util";
import {
  annualizedRecurringAmount,
  financeToday,
  recurringDueDates,
} from "@/features/finance/recurring/utils/recurring-calendar.util";
import { FinanceDialog } from "@/features/finance/components/finance-dialog.component";
import {
  FinanceEmptyState,
  FinancePageHeader,
  FinanceSection,
} from "@/features/finance/components/finance-field.component";
import { RecurringForm } from "@/features/finance/recurring/components/recurring-form.component";
import { RecurringOccurrences } from "@/features/finance/recurring/components/recurring-occurrences.component";
import { RecurringAnalytics } from "@/features/finance/recurring/components/recurring-analytics.component";
import { getCounterpartyOptions } from "@/features/finance/counterparties/queries/counterparty.query";
import { RecurringActionMenu } from "@/features/finance/recurring/components/recurring-action-menu.component";

const frequencyCopy = {
  WEEKLY: "Every week",
  MONTHLY: "Every month",
  YEARLY: "Every year",
} as const;

export async function RecurringPage({ userId }: { userId: string }) {
  const [definitions, accounts, categories, counterparties] = await Promise.all(
    [
      prisma.recurringExpense.findMany({
        where: { userId },
        include: { account: true, expenseCategory: true, counterparty: true },
        orderBy: [{ archivedAt: "asc" }, { status: "asc" }, { name: "asc" }],
      }),
      prisma.financialAccount.findMany({
        where: { userId, archivedAt: null },
        orderBy: { name: "asc" },
      }),
      prisma.expenseCategory.findMany({ where: { userId, archivedAt: null } }),
      getCounterpartyOptions(userId),
    ],
  );
  const today = financeToday();
  const active = definitions.filter(
    (definition) => definition.status === "ACTIVE" && !definition.archivedAt,
  );
  const upcoming = active
    .flatMap((definition) =>
      recurringDueDates(
        definition,
        today.plus({ days: 1 }),
        today.plus({ days: 30 }),
      ).map((date) => ({ definition, date })),
    )
    .sort(
      (a, b) =>
        a.date.toMillis() - b.date.toMillis() ||
        a.definition.id.localeCompare(b.definition.id),
    );
  const currencies = [
    ...new Set(active.map((definition) => definition.currency)),
  ].sort();
  const initial = {
    name: "",
    amount: "",
    currency: "EUR",
    accountId: "",
    frequency: "MONTHLY",
    startOn: today.toISODate()!,
    endOn: "",
    postingBehavior: "ASK_TO_CONFIRM",
  };
  const createForm = (
    <RecurringForm
      accounts={accounts}
      categories={categories}
      counterparties={counterparties}
      initial={initial}
    />
  );

  return (
    <>
      <FinancePageHeader
        eyebrow="Commitments"
        title="Recurring"
        description="What is coming next, what needs a confirmation and which expenses will record themselves."
        actions={
          accounts.length ? (
            <FinanceDialog
              triggerLabel="Create schedule"
              title="Schedule a commitment"
              description="Describe what you expect, when it repeats and whether Become should ask first."
            >
              {createForm}
            </FinanceDialog>
          ) : undefined
        }
      />

      <RecurringOccurrences userId={userId} />

      <FinanceSection
        title="On the horizon"
        description="The next 30 days of expected commitments. These remain expectations until an expense is recorded."
      >
        {currencies.length > 0 && (
          <div className="finance-commitment-totals">
            {currencies.map((currency) => {
              const matching = active.filter(
                (definition) => definition.currency === currency,
              );
              const total = (year: boolean) =>
                matching.reduce(
                  (sum, definition) =>
                    sum +
                    BigInt(
                      recurringDueDates(
                        definition,
                        today.plus({ days: 1 }),
                        year
                          ? today.plus({ months: 12 })
                          : today.plus({ days: 30 }),
                      ).length,
                    ) *
                      definition.amountMinor,
                  0n,
                );
              return (
                <article key={currency}>
                  <p className="eyebrow">{currency} expected</p>
                  <strong className="finance-number">
                    {formatMoney(total(false), currency)}
                  </strong>
                  <span>
                    Next 30 days · {formatMoney(total(true), currency)} over 12
                    months
                  </span>
                </article>
              );
            })}
          </div>
        )}
        {!upcoming.length ? (
          <FinanceEmptyState
            icon={<CalendarClock aria-hidden="true" />}
            title="Nothing waiting for next month"
            description={
              accounts.length
                ? "Add a known commitment and it will take its place here."
                : "Add an account first, then recurring commitments can be scheduled."
            }
            action={
              accounts.length ? (
                <FinanceDialog
                  triggerLabel="Add a commitment"
                  title="Schedule a commitment"
                  variant="secondary"
                >
                  {createForm}
                </FinanceDialog>
              ) : undefined
            }
          />
        ) : (
          <ol className="finance-commitment-timeline">
            {upcoming.slice(0, 12).map(({ definition, date }) => (
              <li key={definition.id + "-" + date.toISODate()}>
                <time dateTime={date.toISODate()!}>
                  <strong>{date.toFormat("dd")}</strong>
                  <span>{date.toFormat("LLL")}</span>
                </time>
                <span className="finance-timeline-line" aria-hidden="true" />
                <div>
                  <h3>{definition.name}</h3>
                  <p>
                    {definition.account.name} ·{" "}
                    {frequencyCopy[definition.frequency]} ·{" "}
                    {definition.postingBehavior === "AUTOMATIC"
                      ? definition.account.dataSource === "MANUAL"
                        ? "Records automatically"
                        : "Matched to imported payments"
                      : "You confirm first"}
                  </p>
                </div>
                <strong className="finance-number">
                  {formatMoney(definition.amountMinor, definition.currency)}
                </strong>
              </li>
            ))}
          </ol>
        )}
      </FinanceSection>

      <RecurringAnalytics userId={userId} />

      <FinanceSection
        title="Your commitments"
        description="Active and paused schedules. Editing a schedule never rewrites already processed occurrences."
      >
        {!definitions.length ? (
          <p className="finance-quiet-copy">
            No recurring commitments have been created yet.
          </p>
        ) : (
          <div className="finance-recurring-list">
            {definitions.map((definition) => {
              const annualized = annualizedRecurringAmount(
                definition.amountMinor,
                definition,
              );
              const editInitial = {
                ...definition,
                expenseCategoryName: definition.expenseCategory?.name,
                counterpartyName: definition.counterparty?.name,
                amount: moneyDecimal(
                  definition.amountMinor,
                  definition.currency,
                ),
                startOn: definition.startOn.toISOString().slice(0, 10),
                endOn: definition.endOn?.toISOString().slice(0, 10) ?? "",
              };

              return (
                <article
                  className={definition.archivedAt ? "is-archived" : ""}
                  key={definition.id}
                >
                  <span className="finance-recurring-icon">
                    {definition.status === "PAUSED" ? (
                      <PauseCircle aria-hidden="true" />
                    ) : definition.postingBehavior === "AUTOMATIC" ? (
                      <Bot aria-hidden="true" />
                    ) : (
                      <Hand aria-hidden="true" />
                    )}
                  </span>
                  <div className="finance-recurring-identity">
                    <div>
                      <h3>{definition.name}</h3>
                      <span
                        className={
                          "finance-status-pill " +
                          (definition.status === "ACTIVE" &&
                          !definition.archivedAt
                            ? "finance-status-pill--positive"
                            : "finance-status-pill--muted")
                        }
                      >
                        {definition.archivedAt
                          ? "Archived"
                          : definition.status.toLowerCase()}
                      </span>
                    </div>
                    <p>
                      {frequencyCopy[definition.frequency]} ·{" "}
                      {definition.account.name} ·{" "}
                      {definition.expenseCategory?.name ?? "Uncategorized"} ·{" "}
                      {definition.counterparty?.name ?? "No counterparty"}
                    </p>
                  </div>
                  <div className="finance-recurring-amount">
                    <strong className="finance-number">
                      {formatMoney(definition.amountMinor, definition.currency)}
                    </strong>
                    <span>
                      {definition.postingBehavior === "AUTOMATIC"
                        ? definition.account.dataSource === "MANUAL"
                          ? "Automatic"
                          : "Matched to imported payments"
                        : "Confirm first"}
                    </span>
                  </div>
                  <div className="finance-recurring-annualized">
                    {annualized === null ? (
                      <span>Yearly estimate unavailable</span>
                    ) : (
                      <>
                        <strong className="finance-number">
                          {formatMoney(annualized, definition.currency)}
                        </strong>
                        <span>per year</span>
                      </>
                    )}
                  </div>
                  {!definition.archivedAt && (
                    <RecurringActionMenu
                      commitmentName={definition.name}
                      id={definition.id}
                      status={definition.status}
                      initial={editInitial}
                      accounts={accounts}
                      categories={categories}
                      counterparties={counterparties}
                    />
                  )}
                </article>
              );
            })}
          </div>
        )}
      </FinanceSection>

      {!accounts.length && (
        <div className="finance-settled-banner">
          <CalendarDays aria-hidden="true" />
          <div>
            <strong>Add an account to schedule commitments</strong>
            <span>
              Each recurring expense needs a place it will be paid from.
            </span>
          </div>
        </div>
      )}
    </>
  );
}
