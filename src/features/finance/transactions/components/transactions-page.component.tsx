import Link from "next/link";
import { DateTime } from "luxon";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  CircleAlert,
  Filter,
  ReceiptText,
  Settings2,
  WalletCards,
} from "lucide-react";
import { CurrencySelect } from "@/components/ui/forms/currency-select.component";
import { Button } from "@/components/ui/buttons/button.component";
import { IconFrame } from "@/components/ui/icons/icon-frame.component";
import {
  WorkspaceHeader,
  WorkspaceLink,
  WorkspaceMetric,
  WorkspacePanel,
} from "@/components/ui/workspace/workspace.component";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { formatMoney } from "@/lib/money/utils/money.util";
import { getFinanceWorkOptions } from "@/features/finance/queries/finance-options.query";
import {
  getFinancialLedger,
  type ReviewLedgerFilters,
} from "@/features/finance/transactions/queries/financial-ledger.query";
import { TransactionForm } from "@/features/finance/transactions/components/transaction-form.component";
import {
  FinanceEmptyState,
  FinanceField,
  FinanceSelect,
} from "@/features/finance/components/finance-field.component";
import { FinanceDialog } from "@/features/finance/components/finance-dialog.component";
import { getCounterpartyOptions } from "@/features/finance/counterparties/queries/counterparty.query";
import { getFinancialTransactionAccountOptions } from "@/features/finance/transactions/queries/financial-transaction-account-options.query";
import { getReceiptHandoff } from "@/features/finance/business-receipts/queries/receipt-handoff.query";
import { TransactionReviewControls } from "@/features/finance/review/components/transaction-review-controls.component";
import { FinanceForm } from "@/features/finance/components/finance-form.component";
import {
  interpretTransactionAction,
  reviewRecognizedAction,
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
const humanize = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());

export async function TransactionsPage({
  userId,
  filters,
}: {
  userId: string;
  filters: ReviewLedgerFilters & {
    engagement?: string;
    exploration?: string;
    company?: string;
    offer?: string;
  };
}) {
  const [ledger, accounts, categories, counterparties, workOptions] =
    await Promise.all([
      getFinancialLedger(userId, filters),
      getFinancialTransactionAccountOptions(userId),
      prisma.expenseCategory.findMany({
        where: { userId, archivedAt: null },
        orderBy: { name: "asc" },
      }),
      getCounterpartyOptions(userId),
      getFinanceWorkOptions(userId),
    ]);
  const handoff = await getReceiptHandoff(userId, filters);
  const returnPath = handoff?.returnPath ?? null;
  const selected = ledger.rows.find((row) => row.id === filters.selected);
  const bulkReviewDay =
    filters.day ??
    filters.date ??
    (filters.review === "today" ? "today" : null);
  const next = new URLSearchParams(
    Object.entries(filters).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  next.delete("selected");
  if (ledger.nextCursor) next.set("cursor", ledger.nextCursor);
  const handoffParams = new URLSearchParams();
  if (handoff?.companyId) handoffParams.set("company", handoff.companyId);
  if (handoff?.offerId) handoffParams.set("offer", handoff.offerId);
  if (handoff?.engagementId)
    handoffParams.set("engagement", handoff.engagementId);
  if (handoff?.nicheId) handoffParams.set("exploration", handoff.nicheId);
  const clearPath = `/finance/transactions${handoffParams.size ? `?${handoffParams}` : ""}`;
  const hasFilters = Boolean(
    filters.type ||
    filters.currency ||
    filters.account ||
    filters.counterparty ||
    filters.category ||
    filters.review ||
    filters.day ||
    filters.date ||
    (filters.period && filters.period !== "ALL"),
  );
  const count = ledger.summary.reduce((sum, item) => sum + item._count._all, 0);
  const currencies = [...new Set(ledger.summary.map((item) => item.currency))];
  const moneySummary = (type: "INCOME" | "EXPENSE") =>
    currencies.length ? (
      <>
        {currencies.map((currency) => (
          <span className="finance-metric-currency" key={currency}>
            {formatMoney(
              ledger.summary.find(
                (item) => item.currency === currency && item.type === type,
              )?._sum.amountMinor ?? 0n,
              currency,
            )}
          </span>
        ))}
      </>
    ) : (
      "No movement"
    );
  const transactionForm = accounts.length ? (
    <TransactionForm
      businessReturnPath={returnPath ?? undefined}
      workOptions={workOptions}
      accounts={accounts}
      categories={categories}
      counterparties={counterparties}
      initial={{
        type: handoff ? "INCOME" : "EXPENSE",
        inflowKind: handoff ? "BUSINESS_REVENUE" : undefined,
        workSourceId: handoff?.workSourceId,
        amount: "",
        accountId: accounts[0].id,
        currency: accounts[0].currency,
        occurredAt: DateTime.now()
          .setZone(APP_TIMEZONE)
          .toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS"),
      }}
    />
  ) : null;

  return (
    <>
      <WorkspaceHeader
        eyebrow="Finance"
        title="Transactions"
        description="Track what came in, went out, or moved between accounts."
        actions={
          accounts.length ? (
            <FinanceDialog
              triggerLabel="Add transaction"
              title="What happened with your money?"
              description="Choose a movement, then record its details."
            >
              {transactionForm}
            </FinanceDialog>
          ) : (
            <WorkspaceLink variant="primary" href="/finance/accounts">
              <WalletCards /> Add an account
            </WorkspaceLink>
          )
        }
      />
      {handoff && returnPath && (
        <div className="finance-callout">
          <ReceiptText aria-hidden="true" />
          <p>
            Recording a receipt for <strong>{handoff.label}</strong>. Save the
            income, then{" "}
            <Link href={returnPath}>
              return to {handoff.returnLabel} to attribute the receipt{" "}
              <ArrowRight aria-hidden="true" />
            </Link>
            . Attribution needs your separate confirmation.
          </p>
        </div>
      )}
      <div className="finance-ledger-summary">
        <WorkspaceMetric
          label="Money in"
          value={moneySummary("INCOME")}
          icon={<ArrowDownLeft />}
          tone="positive"
          detail="All transactions matching this view"
        />
        <WorkspaceMetric
          label="Money out"
          value={moneySummary("EXPENSE")}
          icon={<ArrowUpRight />}
          tone="negative"
          detail="Transfers excluded"
        />
        <WorkspaceMetric
          label="In this view"
          value={count.toLocaleString("en-GB")}
          icon={<ReceiptText />}
          detail={`${count === 1 ? "transaction" : "transactions"} · ${hasFilters ? "filtered" : "all time"}`}
        />
      </div>
      <div className="finance-ledger-workspace">
        <WorkspacePanel
          title="Your ledger"
          description={
            ledger.rows.length
              ? `${ledger.rows.length} shown · newest first`
              : undefined
          }
          actions={
            <WorkspaceLink href="/settings/finance/categories" variant="ghost">
              <Settings2 /> Manage categories
            </WorkspaceLink>
          }
          className="finance-ledger-panel"
          spacing="dense"
        >
          {bulkReviewDay && ledger.rows.some((row) => !row.reviewedAt) && (
            <div className="finance-review-bulk">
              <div>
                <strong>Ready for a quick pass?</strong>
                <p>
                  Only recognized transactions are marked reviewed. Unknown
                  identities stay open.
                </p>
              </div>
              <FinanceForm
                action={reviewRecognizedAction}
                submitLabel="Review all recognized"
                submitVariant="secondary"
                formClassName=""
                showSuccess
              >
                <input type="hidden" name="day" value={bulkReviewDay} />
              </FinanceForm>
            </div>
          )}
          {!ledger.rows.length ? (
            <FinanceEmptyState
              title={
                hasFilters
                  ? "Nothing matches this view"
                  : "No movement recorded yet"
              }
              description={
                hasFilters
                  ? "Clear a filter to widen your view."
                  : accounts.length
                    ? "Record a transaction when money next moves."
                    : "Add an account, then record your first transaction."
              }
              action={
                hasFilters ? (
                  <WorkspaceLink href={clearPath}>Clear filters</WorkspaceLink>
                ) : accounts.length ? (
                  <FinanceDialog
                    triggerLabel="Record first transaction"
                    title="What happened with your money?"
                    variant="secondary"
                  >
                    {transactionForm}
                  </FinanceDialog>
                ) : (
                  <WorkspaceLink href="/finance/accounts">
                    Set up accounts <ArrowRight />
                  </WorkspaceLink>
                )
              }
            />
          ) : (
            <table className="finance-ledger-table">
              <caption className="sr-only">
                Recorded transactions, newest first
              </caption>
              <thead>
                <tr>
                  <th scope="col">Transaction</th>
                  <th scope="col">Account</th>
                  <th scope="col">Date & time</th>
                  <th scope="col">Category</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Review</th>
                </tr>
              </thead>
              <tbody>
                {ledger.rows.map((row) => {
                  const presentation = typeCopy[row.type];
                  const Icon = presentation.icon;
                  const identity =
                    row.counterparty?.name ||
                    row.evidenceLinks[0]?.observation.counterpartyName ||
                    row.expenseCategory?.name ||
                    (row.inflowKind ? humanize(row.inflowKind) : null) ||
                    presentation.label;
                  const unknown =
                    row.dataSource !== "MANUAL" &&
                    row.type !== "TRANSFER" &&
                    !row.counterparty;
                  const quickReviewParams = new URLSearchParams(
                    Object.entries(filters).filter(
                      (entry): entry is [string, string] =>
                        typeof entry[1] === "string",
                    ),
                  );
                  quickReviewParams.set("selected", row.id);
                  return (
                    <tr key={row.id}>
                      <th scope="row">
                        <Link
                          className="finance-ledger-table__identity"
                          href={`/finance/transactions/${row.id}`}
                        >
                          <IconFrame treatment="compact" area="finance">
                            <Icon />
                          </IconFrame>
                          <span>
                            <strong>{identity}</strong>
                            <small>{presentation.label}</small>
                          </span>
                          <ArrowRight
                            className="finance-ledger-table__arrow"
                            aria-hidden="true"
                          />
                        </Link>
                      </th>
                      <td data-label="Account">
                        {row.account.name}
                        {row.type === "TRANSFER" && row.destinationAccount ? (
                          <small> → {row.destinationAccount.name}</small>
                        ) : null}
                      </td>
                      <td data-label="Date">
                        <time dateTime={row.occurredAt.toISOString()}>
                          {DateTime.fromJSDate(row.occurredAt)
                            .setZone(APP_TIMEZONE)
                            .toFormat("d LLL yyyy")}
                          <small>
                            {DateTime.fromJSDate(row.occurredAt)
                              .setZone(APP_TIMEZONE)
                              .toFormat("HH:mm")}
                          </small>
                        </time>
                      </td>
                      <td data-label="Category">
                        {row.expenseCategory?.name ??
                          (row.inflowKind ? humanize(row.inflowKind) : "—")}
                      </td>
                      <td
                        data-label="Amount"
                        className={`finance-ledger-table__amount ${presentation.className}`}
                      >
                        {row.type === "EXPENSE"
                          ? "−"
                          : row.type === "INCOME"
                            ? "+"
                            : ""}
                        {formatMoney(row.amountMinor, row.currency)}
                      </td>
                      <td data-label="Review">
                        <span className="finance-transaction-badges">
                          {unknown ? (
                            <small className="is-warning">
                              <CircleAlert aria-hidden="true" /> Unknown
                              counterparty
                            </small>
                          ) : null}
                          <small>
                            {row.reviewedAt ? "Reviewed" : "Needs review"}
                          </small>
                        </span>
                        <TransactionReviewControls
                          transactionId={row.id}
                          categoryId={row.expenseCategoryId}
                          categories={row.type === "EXPENSE" ? categories : []}
                          canReview={!row.reviewedAt && !unknown}
                        />
                        <Link
                          href={`/finance/transactions?${quickReviewParams}`}
                          scroll={false}
                        >
                          Quick review
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {ledger.nextCursor && (
            <WorkspaceLink
              className="finance-ledger-more"
              href={`/finance/transactions?${next}`}
            >
              Older transactions <ArrowRight />
            </WorkspaceLink>
          )}
        </WorkspacePanel>
        <WorkspacePanel
          title="Filters"
          className="finance-ledger-filters"
          spacing="dense"
        >
          <form className="finance-ledger-filter-form">
            {[...handoffParams].map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <FinanceSelect
              name="period"
              label="Period"
              defaultValue={filters.period ?? "ALL"}
            >
              <option value="1D">Today</option>
              <option value="7D">Last 7 days</option>
              <option value="1M">Last month</option>
              <option value="3M">Last 3 months</option>
              <option value="1Y">Last year</option>
              <option value="ALL">All time</option>
            </FinanceSelect>
            <FinanceField
              type="date"
              name="date"
              label="Activity day"
              defaultValue={filters.date ?? filters.day ?? ""}
            />
            <p className="finance-filter-help">
              A specific day takes priority over the period.
            </p>
            <FinanceSelect
              name="review"
              label="Review"
              defaultValue={filters.review ?? ""}
            >
              <option value="">Any review state</option>
              <option value="today">Today</option>
              <option value="previous">Previous unresolved</option>
              <option value="unreviewed">Needs review</option>
              <option value="reviewed">Reviewed</option>
              <option value="unknown">Unknown counterparty</option>
            </FinanceSelect>
            <FinanceSelect
              name="account"
              label="Account"
              defaultValue={filters.account ?? ""}
            >
              <option value="">All accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </FinanceSelect>
            <FinanceSelect
              name="type"
              label="Type"
              defaultValue={filters.type ?? ""}
            >
              <option value="">All movement</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expenses</option>
              <option value="TRANSFER">Transfers</option>
            </FinanceSelect>
            <FinanceSelect
              name="category"
              label="Category"
              defaultValue={filters.category ?? ""}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </FinanceSelect>
            <FinanceSelect
              name="counterparty"
              label="Counterparty"
              defaultValue={filters.counterparty ?? ""}
            >
              <option value="">All counterparties</option>
              {counterparties.map((counterparty) => (
                <option key={counterparty.id} value={counterparty.id}>
                  {counterparty.name}
                </option>
              ))}
            </FinanceSelect>
            <CurrencySelect
              name="currency"
              label="Currency"
              emptyLabel="Any currency"
              defaultValue={filters.currency ?? ""}
            />
            <Button type="submit" variant="secondary">
              <Filter aria-hidden="true" /> Apply filters
            </Button>
            {hasFilters && (
              <WorkspaceLink href={clearPath} variant="ghost">
                Clear filters
              </WorkspaceLink>
            )}
          </form>
        </WorkspacePanel>
      </div>
      {selected && (
        <WorkspacePanel
          title="Selected transaction"
          description="Review the recorded facts and interpretation."
          spacing="dense"
        >
          <p>
            {selected.counterparty?.name ||
              selected.evidenceLinks[0]?.observation.counterpartyName ||
              "Unknown counterparty"}{" "}
            · {formatMoney(selected.amountMinor, selected.currency)}
          </p>
          {!selected.counterpartyId &&
            selected.dataSource !== "MANUAL" &&
            selected.type !== "TRANSFER" && (
              <p className="finance-detail-warning">
                <CircleAlert aria-hidden="true" /> Confirm a counterparty before
                marking this transaction reviewed.
              </p>
            )}
          <FinanceForm
            action={interpretTransactionAction}
            submitLabel="Save interpretation"
            submitVariant="secondary"
          >
            <input type="hidden" name="id" value={selected.id} />
            {selected.type !== "TRANSFER" && (
              <FinanceSelect
                name="counterpartyId"
                label="Counterparty"
                defaultValue={selected.counterpartyId ?? ""}
              >
                <option value="">Unknown</option>
                {counterparties.map((counterparty) => (
                  <option key={counterparty.id} value={counterparty.id}>
                    {counterparty.name}
                  </option>
                ))}
              </FinanceSelect>
            )}
            {selected.type === "EXPENSE" && (
              <FinanceSelect
                name="categoryId"
                label="Category"
                defaultValue={selected.expenseCategoryId ?? ""}
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
                defaultValue={selected.notes ?? ""}
              />
            </label>
            <FinanceField
              label="Tags"
              name="tags"
              defaultValue={selected.tags.join(", ")}
              placeholder="Comma separated"
            />
            {selected.evidenceLinks.some(
              (link) => link.observation.counterpartyIdentity,
            ) && (
              <label className="finance-checkbox-row">
                <input type="checkbox" name="rememberIdentity" />
                <span>
                  <strong>Remember this external identity</strong>
                  <small>
                    Apply the confirmed mapping to future matching evidence.
                  </small>
                </span>
              </label>
            )}
          </FinanceForm>
          {!selected.reviewedAt &&
            (selected.type === "TRANSFER" ||
              selected.counterpartyId ||
              selected.dataSource === "MANUAL") && (
              <FinanceForm
                action={reviewTransactionAction}
                submitLabel="Mark transaction reviewed"
                submitVariant="primary"
                showSuccess
              >
                <input type="hidden" name="id" value={selected.id} />
              </FinanceForm>
            )}
          {!!selected.evidenceLinks.length && (
            <details className="finance-raw-evidence">
              <summary>Raw bank evidence</summary>
              <div>
                {selected.evidenceLinks.map((link) => (
                  <article key={link.observationId}>
                    <p>
                      {link.observation.description ||
                        link.observation.externalReference ||
                        "Bank observation"}
                    </p>
                    <pre>{JSON.stringify(link.observation.raw, null, 2)}</pre>
                  </article>
                ))}
              </div>
            </details>
          )}
          <WorkspaceLink href={`/finance/transactions/${selected.id}`}>
            Open full transaction <ArrowRight aria-hidden="true" />
          </WorkspaceLink>
        </WorkspacePanel>
      )}
    </>
  );
}
