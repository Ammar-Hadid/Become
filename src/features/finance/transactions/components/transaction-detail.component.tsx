import { notFound } from "next/navigation";
import { BusinessReceipts } from "@/features/finance/business-receipts/components/business-receipts.component";
import { isBusinessReceipt } from "@/features/finance/business-receipts/services/business-receipt.service";
import Link from "next/link";
import { DateTime } from "luxon";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  PiggyBank,
  ReceiptText,
  Search,
  ShieldCheck,
} from "lucide-react";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { formatMoney, moneyDecimal } from "@/lib/money/utils/money.util";
import { getFinanceWorkOptions } from "@/features/finance/queries/finance-options.query";
import { TransactionForm } from "@/features/finance/transactions/components/transaction-form.component";
import {
  FinanceEmptyState,
  FinanceField,
  FinancePageHeader,
  FinanceSection,
  FinanceSelect,
} from "@/features/finance/components/finance-field.component";
import { FinanceForm } from "@/features/finance/components/finance-form.component";
import { deleteTransactionAction } from "@/features/finance/transactions/actions/financial-transaction.action";
import { PaymentAllocation } from "@/features/finance/payments/components/payment-allocation.component";
import { getPaymentCandidates } from "@/features/finance/payments/queries/payment-candidates.query";
import { linkGoalExpenseAction } from "@/features/finance/savings/actions/savings-goal.action";
import { getCounterpartyOptions } from "@/features/finance/counterparties/queries/counterparty.query";
import { getFinancialTransactionAccountOptions } from "@/features/finance/transactions/queries/financial-transaction-account-options.query";
import {
  interpretTransactionAction,
  reviewTransactionAction,
} from "@/features/finance/review/actions/financial-review.action";

const typeCopy = {
  INCOME: { label: "Income", className: "is-income", icon: ArrowDownLeft },
  EXPENSE: { label: "Expense", className: "is-expense", icon: ArrowUpRight },
  TRANSFER: {
    label: "Transfer",
    className: "is-transfer",
    icon: ArrowRightLeft,
  },
} as const;

export async function TransactionDetail({
  userId,
  id,
  workSearch,
}: {
  userId: string;
  id: string;
  workSearch?: string;
}) {
  const record = await prisma.financialTransaction.findFirst({
    where: { userId, id },
    include: {
      account: true,
      destinationAccount: true,
      expenseCategory: true,
      counterparty: true,
      workSource: true,
      incomeOpportunity: true,
      recurringExpenseOccurrence: true,
      evidenceLinks: {
        where: { status: "PROJECTED" },
        include: { observation: true },
      },
    },
  });
  if (!record) notFound();
  const [accounts, categories, counterparties, workOptions] = await Promise.all(
    [
      getFinancialTransactionAccountOptions(userId),
      prisma.expenseCategory.findMany({
        where: { userId, archivedAt: null },
        orderBy: { name: "asc" },
      }),
      getCounterpartyOptions(userId),
      getFinanceWorkOptions(userId),
    ],
  );
  const candidates =
    record.type === "INCOME" && record.inflowKind === "EARNED_WORK"
      ? await getPaymentCandidates(userId, id, workSearch)
      : null;
  const goals =
    record.type === "EXPENSE"
      ? await prisma.savingsGoal.findMany({
          where: {
            userId,
            currency: record.currency,
            OR: [
              { archivedAt: null },
              { expenses: { some: { transactionId: id } } },
            ],
          },
        })
      : [];
  const goalAllocations = await prisma.savingsGoalExpenseAllocation.findMany({
    where: { userId, transactionId: id },
    include: { goal: true },
  });
  const presentation = typeCopy[record.type];
  const Icon = presentation.icon;
  const identity =
    record.counterparty?.name ||
    record.expenseCategory?.name ||
    (record.type === "TRANSFER"
      ? record.account.name + " to " + record.destinationAccount?.name
      : presentation.label);
  const occurred = DateTime.fromJSDate(record.occurredAt)
    .setZone(APP_TIMEZONE)
    .toFormat("d LLL yyyy, HH:mm");

  return (
    <>
      <Link className="finance-back-link" href="/finance/transactions">
        <ArrowLeft aria-hidden="true" />
        Transactions
      </Link>
      <FinancePageHeader
        eyebrow={presentation.label}
        title={identity}
        description={occurred + " · " + record.account.name}
      />

      <section className={"finance-transaction-hero " + presentation.className}>
        <span className="finance-transaction-icon">
          <Icon aria-hidden="true" />
        </span>
        <div>
          <p className="eyebrow">{presentation.label}</p>
          <strong className="finance-number">
            {record.type === "EXPENSE"
              ? "− "
              : record.type === "INCOME"
                ? "+ "
                : ""}
            {formatMoney(record.amountMinor, record.currency)}
          </strong>
        </div>
        <dl>
          <div>
            <dt>{record.type === "TRANSFER" ? "From" : "Account"}</dt>
            <dd>{record.account.name}</dd>
          </div>
          {record.destinationAccount && (
            <div>
              <dt>To</dt>
              <dd>{record.destinationAccount.name}</dd>
            </div>
          )}
          {record.expenseCategory && (
            <div>
              <dt>Category</dt>
              <dd>{record.expenseCategory.name}</dd>
            </div>
          )}
          {record.counterparty && (
            <div>
              <dt>Counterparty</dt>
              <dd>{record.counterparty.name}</dd>
            </div>
          )}
          {record.workSource && (
            <div>
              <dt>Work source</dt>
              <dd>{record.workSource.name}</dd>
            </div>
          )}
          {record.recurringExpenseOccurrence && (
            <div>
              <dt>Origin</dt>
              <dd>Recurring commitment</dd>
            </div>
          )}
          <div>
            <dt>Source</dt>
            <dd>{record.dataSource.toLowerCase().replaceAll("_", " ")}</dd>
          </div>
          <div>
            <dt>Review</dt>
            <dd>{record.reviewedAt ? "Reviewed" : "Needs review"}</dd>
          </div>
        </dl>
        {record.notes && (
          <p className="finance-transaction-note">{record.notes}</p>
        )}
      </section>

      {candidates && (
        <FinanceSection
          title="Link this payment to work"
          description="Connect received income to the sessions it paid for. One payment can cover several sessions, and one session can be paid in parts."
          action={<BriefcaseBusiness className="finance-heading-icon" />}
        >
          <form className="finance-work-search">
            <Search aria-hidden="true" />
            <FinanceField
              label="Find completed work"
              name="workSearch"
              placeholder="Search by focus, source or opportunity"
              defaultValue={workSearch ?? ""}
            />
            <button type="submit">Find work</button>
          </form>
          <PaymentAllocation
            key={workSearch ?? "all"}
            transactionId={id}
            currency={record.currency}
            amountMinor={record.amountMinor.toString()}
            candidates={candidates}
          />
        </FinanceSection>
      )}

      {isBusinessReceipt(record) && (
        <BusinessReceipts
          userId={userId}
          transactionId={id}
          amountMinor={record.amountMinor}
          currency={record.currency}
        />
      )}

      {record.type === "EXPENSE" && (
        <FinanceSection
          title="Savings goal impact"
          description="Confirm when part of this real expense fulfilled a savings goal. Goal allocation stays unchanged until you release it explicitly."
          action={<PiggyBank className="finance-heading-icon" />}
        >
          {goalAllocations.length ? (
            <div className="finance-goal-links">
              {goalAllocations.map((allocation) => (
                <Link
                  href={"/finance/savings/" + allocation.savingsGoalId}
                  key={allocation.savingsGoalId}
                >
                  <span>{allocation.goal.name}</span>
                  <strong className="finance-number">
                    {formatMoney(allocation.amountMinor, record.currency)}
                  </strong>
                  <ArrowRight aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : (
            <FinanceEmptyState
              icon={<PiggyBank aria-hidden="true" />}
              title="Not connected to a goal"
              description="Most expenses are not. Add a connection only when this purchase genuinely fulfilled part of a savings goal."
            />
          )}
          {goals.length > 0 && (
            <details className="finance-details">
              <summary>Add or correct goal spending</summary>
              <div className="finance-details-body finance-settings-panel">
                <FinanceForm
                  action={linkGoalExpenseAction}
                  submitLabel="Confirm goal spending"
                  submitVariant="secondary"
                >
                  <input type="hidden" name="transactionId" value={id} />
                  <FinanceSelect label="Savings goal" name="goalId" required>
                    <option value="">Choose goal</option>
                    {goals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.name}
                      </option>
                    ))}
                  </FinanceSelect>
                  <FinanceField
                    label="Expense amount that counts (zero removes the link)"
                    name="spending"
                    inputMode="decimal"
                    required
                  />
                </FinanceForm>
              </div>
            </details>
          )}
        </FinanceSection>
      )}

      {record.dataSource !== "MANUAL" && (
        <FinanceSection
          title="Interpretation and review"
          description="The imported amount, direction and source dates stay immutable. Your counterparty, category, notes, tags and review decision remain editable."
          action={<ShieldCheck className="finance-heading-icon" />}
        >
          {!record.counterpartyId && record.type !== "TRANSFER" && (
            <div className="finance-callout">
              <AlertTriangle aria-hidden="true" />
              Confirm a counterparty before marking this imported transaction
              reviewed.
            </div>
          )}
          <div className="finance-imported-interpretation finance-surface">
            <FinanceForm
              action={interpretTransactionAction}
              submitLabel="Save interpretation"
              submitVariant="secondary"
            >
              <input type="hidden" name="id" value={record.id} />
              {record.type !== "TRANSFER" && (
                <FinanceSelect
                  label="Counterparty"
                  name="counterpartyId"
                  defaultValue={record.counterpartyId ?? ""}
                >
                  <option value="">Unknown</option>
                  {counterparties.map((counterparty) => (
                    <option key={counterparty.id} value={counterparty.id}>
                      {counterparty.name}
                    </option>
                  ))}
                </FinanceSelect>
              )}
              {record.type === "EXPENSE" && (
                <FinanceSelect
                  label="Category"
                  name="categoryId"
                  defaultValue={record.expenseCategoryId ?? ""}
                >
                  <option value="">Uncategorized</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </FinanceSelect>
              )}
              <label>
                <span className="field-label">Notes</span>
                <textarea
                  className="text-input finance-textarea"
                  name="notes"
                  defaultValue={record.notes ?? ""}
                />
              </label>
              <FinanceField
                label="Tags"
                name="tags"
                defaultValue={record.tags.join(", ")}
                placeholder="Comma separated"
              />
              {record.evidenceLinks.some(
                (link) => link.observation.counterpartyIdentity,
              ) && (
                <label className="finance-checkbox-row">
                  <input type="checkbox" name="rememberIdentity" />
                  <span>
                    <strong>Remember this external identity</strong>
                    <small>
                      Apply this confirmed mapping to future evidence. Existing
                      transactions remain unchanged.
                    </small>
                  </span>
                </label>
              )}
            </FinanceForm>
            {!record.reviewedAt &&
              (record.type === "TRANSFER" || record.counterpartyId) && (
                <FinanceForm
                  action={reviewTransactionAction}
                  submitLabel="Mark transaction reviewed"
                  submitVariant="primary"
                >
                  <input type="hidden" name="id" value={record.id} />
                </FinanceForm>
              )}
          </div>

          <details className="finance-raw-evidence finance-surface">
            <summary>Raw bank evidence</summary>
            <div>
              {record.evidenceLinks.map((link) => (
                <article key={link.observationId}>
                  <dl>
                    <div>
                      <dt>Source</dt>
                      <dd>
                        {link.observation.source
                          .toLowerCase()
                          .replaceAll("_", " ")}
                      </dd>
                    </div>
                    <div>
                      <dt>Activity date</dt>
                      <dd>{link.observation.activityOn}</dd>
                    </div>
                    <div>
                      <dt>Booking status</dt>
                      <dd>{link.observation.bookingStatus.toLowerCase()}</dd>
                    </div>
                    <div>
                      <dt>Reference</dt>
                      <dd>
                        {link.observation.externalReference ?? "Unavailable"}
                      </dd>
                    </div>
                  </dl>
                  {link.observation.description && (
                    <p>{link.observation.description}</p>
                  )}
                  <pre>{JSON.stringify(link.observation.raw, null, 2)}</pre>
                </article>
              ))}
            </div>
          </details>
        </FinanceSection>
      )}

      {record.dataSource === "MANUAL" && (
        <FinanceSection
          title="Corrections"
          description="Financial history should reflect what actually happened. Use these controls only to correct the recorded fact."
          action={<ReceiptText className="finance-heading-icon" />}
        >
          <details className="finance-details">
            <summary>Edit recorded fact</summary>
            <div className="finance-details-body finance-settings-panel">
              <TransactionForm
                workOptions={workOptions}
                accounts={accounts}
                categories={categories}
                counterparties={counterparties}
                initial={{
                  ...record,
                  expenseCategoryName: record.expenseCategory?.name,
                  counterpartyName: record.counterparty?.name,
                  amount: moneyDecimal(record.amountMinor, record.currency),
                  occurredAt: DateTime.fromJSDate(record.occurredAt)
                    .setZone(APP_TIMEZONE)
                    .toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS"),
                }}
              />
            </div>
          </details>
          <details className="finance-details finance-danger-details">
            <summary>Delete as a correction</summary>
            <div className="finance-details-body">
              <p className="finance-quiet-copy">
                Deleting changes recorded balances and removes linked financial
                evidence. This cannot be undone here.
              </p>
              <FinanceForm
                action={deleteTransactionAction}
                submitLabel="Confirm transaction deletion"
                submitVariant="danger"
              >
                <input type="hidden" name="id" value={id} />
              </FinanceForm>
            </div>
          </details>
        </FinanceSection>
      )}
    </>
  );
}
