import { getReceiptHandoff } from "@/features/finance/business-receipts/queries/receipt-handoff.query";
import { CurrencySelect } from "@/components/ui/forms/currency-select.component";
import Link from "next/link";
import { DateTime } from "luxon";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
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
import { getCounterpartyOptions } from "@/features/finance/counterparties/queries/counterparty.query";
import { getFinancialTransactionAccountOptions } from "@/features/finance/transactions/queries/financial-transaction-account-options.query";

const typeCopy = {
  INCOME: {
    label: "Income",
    className: "is-income",
    icon: ArrowDownLeft,
  },
  EXPENSE: {
    label: "Expense",
    className: "is-expense",
    icon: ArrowUpRight,
  },
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
  filters: {
    engagement?: string;
    exploration?: string;
    company?: string;
    offer?: string;
    cursor?: string;
    type?: string;
    currency?: string;
    account?: string;
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
  const next = new URLSearchParams(
    Object.entries(filters).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  if (ledger.nextCursor) next.set("cursor", ledger.nextCursor);
  const hasFilters = Boolean(
    filters.type || filters.currency || filters.account,
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
        description="A human ledger of what arrived, what left and what moved between your accounts."
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
        title="Your ledger"
        description={
          ledger.rows.length
            ? "Newest movement first. Select any entry to inspect its context or make a correction."
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
        <form className="finance-filter-bar">
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
          <CurrencySelect
            name="currency"
            label="Currency"
            emptyLabel="Any currency"
            defaultValue={filters.currency ?? ""}
          />
          <button type="submit">Apply filters</button>
          {hasFilters && <Link href="/finance/transactions">Clear</Link>}
        </form>

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
          <div className="finance-ledger">
            {ledger.rows.map((row) => {
              const presentation = typeCopy[row.type];
              const Icon = presentation.icon;
              const identity =
                row.counterparty?.name ||
                row.expenseCategory?.name ||
                (row.inflowKind ? humanize(row.inflowKind) : null) ||
                presentation.label;
              return (
                <Link
                  className="finance-ledger-row"
                  key={row.id}
                  href={"/finance/transactions/" + row.id}
                >
                  <span
                    className={"finance-ledger-icon " + presentation.className}
                  >
                    <Icon aria-hidden="true" />
                  </span>
                  <span className="finance-ledger-identity">
                    <strong>{identity}</strong>
                    <span>
                      <time dateTime={row.occurredAt.toISOString()}>
                        {DateTime.fromJSDate(row.occurredAt)
                          .setZone(APP_TIMEZONE)
                          .toFormat("d LLL yyyy, HH:mm")}
                      </time>
                      {row.type === "TRANSFER" && row.destinationAccount
                        ? " · " +
                          row.account.name +
                          " → " +
                          row.destinationAccount.name
                        : " · " + row.account.name}
                    </span>
                  </span>
                  <span className="finance-ledger-amount">
                    <strong
                      className={"finance-number " + presentation.className}
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
                  <ArrowRight
                    className="finance-ledger-arrow"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>
        )}
        {ledger.nextCursor && (
          <Link
            className="finance-load-more"
            href={"/finance/transactions?" + next}
          >
            Older transactions
            <ArrowRight aria-hidden="true" />
          </Link>
        )}
      </FinanceSection>
    </>
  );
}
