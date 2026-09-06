import Link from "next/link";
import { DateTime } from "luxon";
import { AlertCircle, CheckCircle2, Clock3, ReceiptText } from "lucide-react";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { formatMoney, moneyDecimal } from "@/lib/money/utils/money.util";
import { FinanceForm } from "@/features/finance/components/finance-form.component";
import { FinanceDialog } from "@/features/finance/components/finance-dialog.component";
import { FinanceSection } from "@/features/finance/components/finance-field.component";
import { TransactionForm } from "@/features/finance/transactions/components/transaction-form.component";
import {
  confirmOccurrenceAction,
  skipOccurrenceAction,
} from "@/features/finance/recurring/actions/recurring-expense.action";
import { getCounterpartyOptions } from "@/features/finance/counterparties/queries/counterparty.query";
import { getFinancialTransactionAccountOptions } from "@/features/finance/transactions/queries/financial-transaction-account-options.query";

export async function RecurringOccurrences({ userId }: { userId: string }) {
  const [due, recent, accounts, categories, counterparties] = await Promise.all(
    [
      prisma.recurringExpenseOccurrence.findMany({
        where: { userId, status: "AWAITING_CONFIRMATION" },
        include: { counterparty: true, expenseCategory: true },
        orderBy: [{ dueOn: "asc" }, { id: "asc" }],
        take: 30,
      }),
      prisma.recurringExpenseOccurrence.findMany({
        where: { userId, status: { not: "AWAITING_CONFIRMATION" } },
        include: { transaction: true },
        orderBy: [{ dueOn: "desc" }, { id: "desc" }],
        take: 20,
      }),
      getFinancialTransactionAccountOptions(userId),
      prisma.expenseCategory.findMany({ where: { userId, archivedAt: null } }),
      getCounterpartyOptions(userId),
    ],
  );

  return (
    <>
      {due.length ? (
        <FinanceSection
          title="Ready for your confirmation"
          description="These commitments reached their due date. Confirm what actually happened, adjust the details or skip one that did not occur."
        >
          <div className="finance-confirmation-list">
            {due.map((occurrence) => (
              <article key={occurrence.id}>
                <span className="finance-confirmation-icon">
                  <AlertCircle aria-hidden="true" />
                </span>
                <div>
                  <p className="eyebrow">
                    Due{" "}
                    {DateTime.fromJSDate(occurrence.dueOn, { zone: "utc" })
                      .setZone(APP_TIMEZONE, { keepLocalTime: true })
                      .toFormat("d LLL")}
                  </p>
                  <h3>{occurrence.nameSnapshot}</h3>
                  <p className="finance-number">
                    {formatMoney(
                      occurrence.scheduledAmountMinor,
                      occurrence.currency,
                    )}
                  </p>
                </div>
                <div className="finance-confirmation-actions">
                  <FinanceDialog
                    triggerLabel="Confirm or adjust expense"
                    title={"Confirm " + occurrence.nameSnapshot}
                    description="The scheduled terms are prefilled. Change them only to match what actually happened."
                    variant="secondary"
                    icon={false}
                  >
                    <TransactionForm
                      action={confirmOccurrenceAction}
                      closeOnSuccess
                      accounts={accounts.filter(
                        (account) => account.currency === occurrence.currency,
                      )}
                      categories={categories}
                      counterparties={counterparties}
                      initial={{
                        type: "EXPENSE",
                        amount: moneyDecimal(
                          occurrence.scheduledAmountMinor,
                          occurrence.currency,
                        ),
                        currency: occurrence.currency,
                        accountId: occurrence.accountId,
                        expenseCategoryId: occurrence.expenseCategoryId,
                        expenseCategoryName: occurrence.expenseCategory?.name,
                        occurredAt:
                          occurrence.dueOn.toISOString().slice(0, 10) +
                          "T00:00",
                        counterpartyId: occurrence.counterpartyId,
                        counterpartyName:
                          occurrence.counterparty?.name ??
                          (occurrence.counterpartyId
                            ? undefined
                            : occurrence.nameSnapshot),
                      }}
                    >
                      <input
                        type="hidden"
                        name="occurrenceId"
                        value={occurrence.id}
                      />
                    </TransactionForm>
                  </FinanceDialog>
                  <FinanceForm
                    action={skipOccurrenceAction}
                    submitLabel="Skip expense"
                    submitVariant="ghost"
                  >
                    <input
                      type="hidden"
                      name="occurrenceId"
                      value={occurrence.id}
                    />
                  </FinanceForm>
                </div>
              </article>
            ))}
          </div>
        </FinanceSection>
      ) : (
        <div className="finance-settled-banner">
          <CheckCircle2 aria-hidden="true" />
          <div>
            <strong>No confirmations waiting</strong>
            <span>
              Commitments that need your input will surface here when due.
            </span>
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <details
          className="finance-details finance-processing-history"
          open={due.length === 0}
        >
          <summary>
            <span>
              <Clock3 aria-hidden="true" />
              Recent commitment history
            </span>
          </summary>
          <div className="finance-details-body">
            {recent.map((occurrence) => (
              <div className="finance-history-row" key={occurrence.id}>
                <span className="finance-history-icon">
                  <ReceiptText aria-hidden="true" />
                </span>
                <div>
                  <strong>
                    {occurrence.nameSnapshot} ·{" "}
                    {occurrence.dueOn.toISOString().slice(0, 10)} ·{" "}
                    {occurrence.status.replaceAll("_", " ")}
                  </strong>
                  <span>
                    {occurrence.status === "SKIPPED"
                      ? "Marked as not occurred"
                      : "Recorded from its schedule"}
                  </span>
                </div>
                {occurrence.transaction && (
                  <Link
                    href={"/finance/transactions/" + occurrence.transaction.id}
                    className="finance-number"
                  >
                    Recorded{" "}
                    {formatMoney(
                      occurrence.transaction.amountMinor,
                      occurrence.currency,
                    )}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
