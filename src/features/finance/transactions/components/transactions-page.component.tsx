import { getReceiptHandoff } from "@/features/finance/business-receipts/queries/receipt-handoff.query";
import { CurrencySelect } from "@/components/ui/forms/currency-select.component";
import Link from "next/link";
import { DateTime } from "luxon";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  Eye,
  Filter,
  ReceiptText,
  Settings2,
  WalletCards,
} from "lucide-react";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { formatMoney } from "@/lib/money/utils/money.util";
import { getFinanceWorkOptions } from "@/features/finance/queries/finance-options.query";
import { getFinancialLedger } from "@/features/finance/transactions/queries/financial-ledger.query";
import { TransactionForm } from "@/features/finance/transactions/components/transaction-form.component";
import {
  FinanceEmptyState,
  FinancePageHeader,
  FinanceSelect,
  FinanceSection,
} from "@/features/finance/components/finance-field.component";
import { FinanceDialog } from "@/features/finance/components/finance-dialog.component";
import { FinanceForm } from "@/features/finance/components/finance-form.component";
import { getCounterpartyOptions } from "@/features/finance/counterparties/queries/counterparty.query";
import { getFinancialTransactionAccountOptions } from "@/features/finance/transactions/queries/financial-transaction-account-options.query";
import { TransactionReviewControls } from "@/features/finance/review/components/transaction-review-controls.component";
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

type TransactionFilters = {
  engagement?: string;
  exploration?: string;
  company?: string;
  offer?: string;
  cursor?: string;
  type?: string;
  currency?: string;
  account?: string;
  day?: string;
  review?: string;
  category?: string;
  counterparty?: string;
  selected?: string;
};

const toParameters = (filters: TransactionFilters) =>
  new URLSearchParams(
    Object.entries(filters).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );

const activityDate = (activityOn: string | null, occurredAt: Date) =>
  activityOn
    ? DateTime.fromISO(activityOn, { zone: APP_TIMEZONE }).toFormat(
        "d LLL yyyy",
      )
    : DateTime.fromJSDate(occurredAt)
        .setZone(APP_TIMEZONE)
        .toFormat("d LLL yyyy, HH:mm");

export async function TransactionsPage({
  userId,
  filters,
}: {
  userId: string;
  filters: TransactionFilters;
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
  const closeParameters = toParameters(filters);
  closeParameters.delete("selected");
  const closeHref = `/finance/transactions${closeParameters.size ? `?${closeParameters}` : ""}`;
  const next = toParameters(filters);
  next.delete("selected");
  if (ledger.nextCursor) next.set("cursor", ledger.nextCursor);
  const hasFilters = Boolean(
    filters.type ||
    filters.currency ||
    filters.account ||
    filters.day ||
    filters.review ||
    filters.category ||
    filters.counterparty,
  );
  const bulkReviewDay =
    filters.day ?? (filters.review === "today" ? "today" : null);
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
      {handoff && returnPath && (
        <p className="business-hint">
          Recording a receipt for {handoff.label}. Save actual Income classified
          as Business revenue or Paid work, then{" "}
          <Link className="business-text-link" href={returnPath}>
            Return to {handoff.returnLabel} to attribute receipt ↗
          </Link>
          . Attribution requires a separate confirmation.
        </p>
      )}
      <FinancePageHeader
        eyebrow="Movement"
        title="Transactions"
        description="Review transactions, categorize spending and identify who you paid."
        actions={
          accounts.length ? (
            <FinanceDialog
              triggerLabel="Add transaction"
              title="Record money movement"
              description="Choose the kind of movement first. Become will only ask for what matters."
            >
              {transactionForm}
            </FinanceDialog>
          ) : (
            <Link
              className="finance-link-action finance-link-action--primary"
              href="/finance/accounts"
            >
              <WalletCards aria-hidden="true" />
              Add an account
            </Link>
          )
        }
      />

      <FinanceSection
        title="Review ledger"
        description={
          ledger.rows.length
            ? "Filter by day, account, category, counterparty or review state. Recognition and human review remain separate."
            : "Your recorded financial movement will live here."
        }
        action={
          <Link
            className="finance-settings-link"
            href="/settings/finance/categories"
          >
            <Settings2 aria-hidden="true" />
            Manage categories
          </Link>
        }
      >
        <form className="finance-filter-bar finance-filter-bar--review">
          {handoff?.companyId && (
            <input type="hidden" name="company" value={handoff.companyId} />
          )}
          {handoff?.offerId && (
            <input type="hidden" name="offer" value={handoff.offerId} />
          )}
          {handoff?.engagementId && (
            <input
              type="hidden"
              name="engagement"
              value={handoff.engagementId}
            />
          )}
          {handoff?.nicheId && (
            <input type="hidden" name="exploration" value={handoff.nicheId} />
          )}
          <div className="finance-filter-label">
            <Filter aria-hidden="true" />
            <span>Filter</span>
          </div>
          <label className="finance-filter-date">
            <span className="field-label">Activity day</span>
            <input
              className="text-input"
              type="date"
              name="day"
              defaultValue={filters.day ?? ""}
            />
          </label>
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
          <CurrencySelect
            name="currency"
            label="Currency"
            emptyLabel="Any currency"
            defaultValue={filters.currency ?? ""}
          />
          <button type="submit">Apply filters</button>
          {hasFilters && <Link href="/finance/transactions">Clear</Link>}
        </form>

        {bulkReviewDay && ledger.rows.some((row) => !row.reviewedAt) && (
          <div className="finance-review-bulk">
            <div>
              <strong>Ready for a quick pass?</strong>
              <p>
                This marks only recognized transactions. Unknown identities and
                uncertain relationships remain open.
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
            icon={<ReceiptText aria-hidden="true" />}
            title={
              hasFilters
                ? "Nothing matches this view"
                : "No movement recorded yet"
            }
            description={
              hasFilters
                ? "Try clearing a filter to widen the view."
                : accounts.length
                  ? "Record the first transaction when money next moves."
                  : "Add an account first, then your ledger can begin."
            }
            action={
              accounts.length ? (
                <FinanceDialog
                  triggerLabel="Record first transaction"
                  title="Record money movement"
                  description="Income, expense or transfer — keep the fact precise."
                  variant="secondary"
                >
                  {transactionForm}
                </FinanceDialog>
              ) : (
                <Link className="finance-panel-link" href="/finance/accounts">
                  Set up accounts <ArrowRight aria-hidden="true" />
                </Link>
              )
            }
          />
        ) : (
          <div
            className={`finance-ledger-workspace${selected ? "is-selected" : ""}`}
          >
            <div className="finance-ledger-list-panel">
              <div className="finance-ledger finance-ledger--review">
                {ledger.rows.map((row) => {
                  const presentation = typeCopy[row.type];
                  const Icon = presentation.icon;
                  const unknown =
                    row.dataSource !== "MANUAL" &&
                    row.type !== "TRANSFER" &&
                    !row.counterparty;
                  const identity =
                    row.counterparty?.name ||
                    row.evidenceLinks[0]?.observation.counterpartyName ||
                    row.expenseCategory?.name ||
                    (row.inflowKind ? humanize(row.inflowKind) : null) ||
                    presentation.label;
                  const selectParameters = toParameters(filters);
                  selectParameters.set("selected", row.id);
                  return (
                    <article
                      className={`finance-ledger-review-row${selected?.id === row.id ? "is-current" : ""}`}
                      key={row.id}
                    >
                      <Link
                        className="finance-ledger-row"
                        href={`/finance/transactions?${selectParameters}`}
                        scroll={false}
                      >
                        <span
                          className={`finance-ledger-icon ${presentation.className}`}
                        >
                          <Icon aria-hidden="true" />
                        </span>
                        <span className="finance-ledger-identity">
                          <strong>{identity}</strong>
                          <span>
                            <time
                              dateTime={
                                row.activityOn ?? row.occurredAt.toISOString()
                              }
                            >
                              {activityDate(row.activityOn, row.occurredAt)}
                            </time>
                            {row.type === "TRANSFER" && row.destinationAccount
                              ? ` · ${row.account.name} → ${row.destinationAccount.name}`
                              : ` · ${row.account.name}`}
                          </span>
                          <span className="finance-transaction-badges">
                            <small>{humanize(row.dataSource)}</small>
                            {unknown ? (
                              <small className="is-warning">
                                Unknown counterparty
                              </small>
                            ) : row.dataSource !== "MANUAL" ? (
                              <small>Recognized</small>
                            ) : null}
                            <small>
                              {row.reviewedAt ? "Reviewed" : "Needs review"}
                            </small>
                          </span>
                        </span>
                        <span className="finance-ledger-amount">
                          <strong
                            className={`finance-number ${presentation.className}`}
                          >
                            {row.type === "EXPENSE"
                              ? "− "
                              : row.type === "INCOME"
                                ? "+ "
                                : ""}
                            {formatMoney(row.amountMinor, row.currency)}
                          </strong>
                          <span>{presentation.label}</span>
                        </span>
                        <Eye
                          className="finance-ledger-arrow"
                          aria-hidden="true"
                        />
                      </Link>
                      <TransactionReviewControls
                        transactionId={row.id}
                        categoryId={row.expenseCategoryId}
                        categories={row.type === "EXPENSE" ? categories : []}
                        canReview={!row.reviewedAt && !unknown}
                      />
                    </article>
                  );
                })}
              </div>
              {ledger.nextCursor && (
                <Link
                  className="finance-load-more"
                  href={`/finance/transactions?${next}`}
                >
                  Older transactions <ArrowRight aria-hidden="true" />
                </Link>
              )}
            </div>

            {selected &&
              (() => {
                const presentation = typeCopy[selected.type];
                const SelectedIcon = presentation.icon;
                const unknown =
                  selected.dataSource !== "MANUAL" &&
                  selected.type !== "TRANSFER" &&
                  !selected.counterparty;
                return (
                  <aside
                    className="finance-ledger-detail-panel"
                    aria-label="Transaction details"
                  >
                    <Link
                      className="finance-detail-panel-back"
                      href={closeHref}
                      scroll={false}
                    >
                      <ArrowLeft aria-hidden="true" /> Back to transactions
                    </Link>
                    <header>
                      <span
                        className={`finance-transaction-icon ${presentation.className}`}
                      >
                        <SelectedIcon aria-hidden="true" />
                      </span>
                      <div>
                        <p className="eyebrow">{presentation.label}</p>
                        <h3>
                          {selected.counterparty?.name ||
                            selected.evidenceLinks[0]?.observation
                              .counterpartyName ||
                            selected.expenseCategory?.name ||
                            presentation.label}
                        </h3>
                        <strong className="finance-number">
                          {selected.type === "EXPENSE"
                            ? "− "
                            : selected.type === "INCOME"
                              ? "+ "
                              : ""}
                          {formatMoney(selected.amountMinor, selected.currency)}
                        </strong>
                      </div>
                    </header>

                    {unknown && (
                      <div className="finance-detail-warning">
                        <CircleAlert aria-hidden="true" />
                        <div>
                          <strong>Unknown counterparty</strong>
                          <p>
                            Confirm an identity before marking this transaction
                            reviewed.
                          </p>
                        </div>
                      </div>
                    )}

                    <FinanceForm
                      action={interpretTransactionAction}
                      submitLabel="Save interpretation"
                      submitVariant="secondary"
                      formClassName="finance-detail-interpretation"
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
                            <option
                              key={counterparty.id}
                              value={counterparty.id}
                            >
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
                      <label>
                        <span className="field-label">Tags</span>
                        <input
                          className="text-input"
                          name="tags"
                          defaultValue={selected.tags.join(", ")}
                          placeholder="Comma separated"
                        />
                      </label>
                      {selected.evidenceLinks.some(
                        (link) => link.observation.counterpartyIdentity,
                      ) && (
                        <label className="finance-checkbox-row">
                          <input type="checkbox" name="rememberIdentity" />
                          <span>
                            <strong>Remember this external identity</strong>
                            <small>
                              Apply the confirmed mapping to future matching
                              evidence.
                            </small>
                          </span>
                        </label>
                      )}
                    </FinanceForm>

                    {!selected.reviewedAt && !unknown && (
                      <FinanceForm
                        action={reviewTransactionAction}
                        submitLabel="Mark transaction reviewed"
                        submitIcon={<CheckCircle2 aria-hidden="true" />}
                        formClassName="finance-detail-review-form"
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
                              <dl>
                                <div>
                                  <dt>Source</dt>
                                  <dd>{humanize(link.observation.source)}</dd>
                                </div>
                                <div>
                                  <dt>Status</dt>
                                  <dd>
                                    {humanize(link.observation.bookingStatus)}
                                  </dd>
                                </div>
                                <div>
                                  <dt>Date precision</dt>
                                  <dd>
                                    {humanize(link.observation.datePrecision)}
                                  </dd>
                                </div>
                                <div>
                                  <dt>Reference</dt>
                                  <dd>
                                    {link.observation.externalReference ??
                                      "Unavailable"}
                                  </dd>
                                </div>
                              </dl>
                              {link.observation.description && (
                                <p>{link.observation.description}</p>
                              )}
                              <pre>
                                {JSON.stringify(link.observation.raw, null, 2)}
                              </pre>
                            </article>
                          ))}
                        </div>
                      </details>
                    )}
                    <Link
                      className="finance-panel-link"
                      href={`/finance/transactions/${selected.id}`}
                    >
                      Open full transaction <ArrowRight aria-hidden="true" />
                    </Link>
                  </aside>
                );
              })()}
          </div>
        )}
      </FinanceSection>
    </>
  );
}
