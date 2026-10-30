"use client";
import { WorkspaceDisclosure } from "@/components/ui/workspace/workspace-disclosure.component";
import Link from "next/link";
import { useId, useState } from "react";
import { FinanceForm } from "@/features/finance/components/finance-form.component";
import {
  FinanceField,
  FinanceSelect,
} from "@/features/finance/components/finance-field.component";
import { saveTransactionAction } from "@/features/finance/transactions/actions/financial-transaction.action";
import type { FinanceWorkOptions } from "@/features/finance/sessions/types/finance-session.types";
import {
  CounterpartyCombobox,
  type CounterpartyOption,
} from "@/features/finance/counterparties/components/counterparty-combobox.component";
import {
  ExpenseCategoryCombobox,
  type ExpenseCategoryOption,
} from "@/features/finance/categories/components/expense-category-combobox.component";
import { formatMoney, parseMoney } from "@/lib/money/utils/money.util";
type AccountOption = {
  id: string;
  name: string;
  currency: string;
  balanceMinor: string | null;
};
export type TransactionFormValues = {
  workSourceId?: string | null;
  incomeOpportunityId?: string | null;
  id?: string;
  type: string;
  amount: string;
  accountId: string;
  destinationAccountId?: string | null;
  currency: string;
  occurredAt: string;
  inflowKind?: string | null;
  expenseCategoryId?: string | null;
  expenseCategoryName?: string | null;
  counterpartyId?: string | null;
  counterpartyName?: string | null;
  notes?: string | null;
};
export function TransactionForm({
  businessReturnPath,
  accounts,
  categories,
  counterparties,
  initial,
  action = saveTransactionAction,
  children,
  workOptions,
  closeOnSuccess = false,
}: {
  businessReturnPath?: string;
  accounts: AccountOption[];
  categories: ExpenseCategoryOption[];
  counterparties: CounterpartyOption[];
  initial: TransactionFormValues;
  action?: typeof saveTransactionAction;
  children?: React.ReactNode;
  workOptions?: FinanceWorkOptions;
  closeOnSuccess?: boolean;
}) {
  const [type, setType] = useState(initial.type);
  const [accountId, setAccountId] = useState(
    initial.accountId || accounts[0]?.id || "",
  );
  const [amount, setAmount] = useState(initial.amount);
  const [paymentId, setPaymentId] = useState<string>();
  const balanceMessageId = useId();
  const sourceAccount = accounts.find((account) => account.id === accountId);
  const currency = sourceAccount?.currency ?? initial.currency;
  let exceedsAvailableBalance = false;
  if (
    type === "TRANSFER" &&
    sourceAccount &&
    sourceAccount.balanceMinor !== null
  ) {
    try {
      exceedsAvailableBalance =
        parseMoney(amount, currency) > BigInt(sourceAccount.balanceMinor);
    } catch {
      // The server schema provides the authoritative invalid amount message.
    }
  }
  return (
    <>
      <FinanceForm
        action={action}
        closeOnSuccess={closeOnSuccess}
        submitLabel={initial.id ? "Save correction" : "Record transaction"}
        onSaved={(result) => {
          if (type === "INCOME") setPaymentId(result.id);
        }}
      >
        {initial.id && <input type="hidden" name="id" value={initial.id} />}
        <div className="finance-form-grid">
          <FinanceSelect
            label="Transaction type"
            name="type"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
            <option value="TRANSFER">Transfer</option>
          </FinanceSelect>
          <div>
            <FinanceSelect
              label={type === "TRANSFER" ? "From account" : "Account"}
              name="accountId"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              aria-describedby={
                type === "TRANSFER" && sourceAccount
                  ? balanceMessageId
                  : undefined
              }
              required
            >
              <option value="">Choose account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} · {account.currency}
                </option>
              ))}
            </FinanceSelect>
            {type === "TRANSFER" && sourceAccount && (
              <p
                className={
                  sourceAccount.balanceMinor === null
                    ? "form-error mt-sm text-body"
                    : "text-text-secondary mt-sm text-body tabular-nums"
                }
                id={balanceMessageId}
              >
                {sourceAccount.balanceMinor === null
                  ? "Reconcile this account before transferring from it; its current recorded balance is unknown."
                  : `Available recorded balance: ${formatMoney(sourceAccount.balanceMinor, currency)}`}
              </p>
            )}
          </div>
        </div>
        <input type="hidden" name="currency" value={currency} />
        <div className="finance-form-emphasis">
          <FinanceField
            label={`Amount (${currency})`}
            name="amount"
            placeholder="0.00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-invalid={exceedsAvailableBalance || undefined}
            inputMode="decimal"
            required
          />
        </div>
        {exceedsAvailableBalance && (
          <p className="form-error" role="alert">
            This transfer cannot be recorded because the amount exceeds the
            source account&apos;s available recorded balance.
          </p>
        )}
        {type === "TRANSFER" && (
          <FinanceSelect
            label="To account"
            name="destinationAccountId"
            defaultValue={initial.destinationAccountId ?? ""}
            required
          >
            <option value="">Choose destination</option>
            {accounts
              .filter(
                (account) =>
                  account.id !== accountId && account.currency === currency,
              )
              .map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
          </FinanceSelect>
        )}
        {type === "INCOME" && (
          <FinanceSelect
            label="Inflow classification"
            name="inflowKind"
            defaultValue={initial.inflowKind ?? "OTHER"}
          >
            <option value="EARNED_WORK">Paid work</option>
            <option value="BUSINESS_REVENUE">Business revenue</option>
            <option value="STUDENT_FINANCE">Student finance</option>
            <option value="GIFT">Gift</option>
            <option value="REFUND">Refund</option>
            <option value="REIMBURSEMENT">Reimbursement</option>
            <option value="OTHER">Other income</option>
          </FinanceSelect>
        )}
        {type === "EXPENSE" && (
          <ExpenseCategoryCombobox
            categories={categories}
            initialId={initial.expenseCategoryId}
            initialName={initial.expenseCategoryName}
          />
        )}
        <FinanceField
          label="When did it happen?"
          aria-label="Occurred at (Amsterdam)"
          name="occurredAt"
          type="datetime-local"
          defaultValue={initial.occurredAt}
          required
        />
        {type === "INCOME" && workOptions && (
          <WorkspaceDisclosure
            title={<>Link work source or opportunity</>}
            className="finance-disclosure"
          >
            <div className="finance-details-body space-y-lg">
              <FinanceSelect
                label="Work source"
                name="workSourceId"
                defaultValue={initial.workSourceId ?? ""}
              >
                <option value="">Unassigned</option>
                {workOptions.workSources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </FinanceSelect>
              <FinanceSelect
                label="Opportunity"
                name="incomeOpportunityId"
                defaultValue={initial.incomeOpportunityId ?? ""}
              >
                <option value="">Unassigned</option>
                {workOptions.opportunities.map((opportunity) => (
                  <option key={opportunity.id} value={opportunity.id}>
                    {opportunity.title}
                  </option>
                ))}
              </FinanceSelect>
            </div>
          </WorkspaceDisclosure>
        )}
        {type !== "TRANSFER" && (
          <CounterpartyCombobox
            label="Counterparty"
            counterparties={counterparties}
            initialId={initial.counterpartyId}
            initialName={initial.counterpartyName}
          />
        )}
        <WorkspaceDisclosure
          title="Add a note"
          defaultOpen={Boolean(initial.notes)}
        >
          <FinanceField
            label="Notes"
            name="notes"
            placeholder="Optional context you may want later"
            defaultValue={initial.notes ?? ""}
          />
        </WorkspaceDisclosure>
        {children}
      </FinanceForm>
      {paymentId && (
        <p className="mt-lg text-primary">
          <Link href={`/finance/transactions/${paymentId}`}>
            Payment saved. Review payment details.
          </Link>
          {businessReturnPath && (
            <Link className="ml-lg" href={businessReturnPath}>
              Return to attribute receipt ↗
            </Link>
          )}
        </p>
      )}
    </>
  );
}
