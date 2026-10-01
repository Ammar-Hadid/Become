"use client";

import { useId, useState } from "react";
import { CurrencySelect } from "@/components/ui/forms/currency-select.component";
import type { RecordFormState } from "@/components/ui/forms/record-form.types";
import { createAccountAction } from "@/features/finance/accounts/actions/financial-account.action";
import {
  eligibleSettlementAccounts,
  requiresSettlementAccount,
} from "@/features/finance/accounts/utils/credit-card-account.util";
import {
  FinanceField,
  FinanceSelect,
} from "@/features/finance/components/finance-field.component";
import { FinanceForm } from "@/features/finance/components/finance-form.component";
import { FINANCIAL_ACCOUNT_TYPES } from "@/features/finance/accounts/constants/financial-account.constants";

type SettlementAccountOption = {
  id: string;
  name: string;
  currency: string;
  type: string;
  archivedAt: Date | null;
};

export function FinancialAccountForm({
  defaultReconciledAt,
  settlementAccounts,
  defaultCurrency = "EUR",
  defaultBankName = "",
  dataSource,
  submitLabel = "Create account & reconcile",
  closeOnSuccess = true,
  resetOnSuccess = true,
  showSuccess = true,
  onSaved,
}: {
  defaultReconciledAt: string;
  settlementAccounts: SettlementAccountOption[];
  defaultCurrency?: string;
  defaultBankName?: string;
  dataSource?: "LIVE_SYNC" | "STATEMENT_IMPORT" | "MANUAL";
  submitLabel?: string;
  closeOnSuccess?: boolean;
  resetOnSuccess?: boolean;
  showSuccess?: boolean;
  onSaved?: (state: RecordFormState) => void;
}) {
  const [accountType, setAccountType] = useState("CHECKING");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [repaymentMethod, setRepaymentMethod] = useState("MANUAL");
  const [creditCardSource, setCreditCardSource] = useState("STATEMENT_IMPORT");
  const [settlementDay, setSettlementDay] = useState("");
  const settlementHelpId = useId();
  const isCreditCard = accountType === "CREDIT_CARD";
  const isInvestment = accountType === "INVESTMENT";
  const needsSettlementAccount = requiresSettlementAccount(
    accountType,
    repaymentMethod,
  );
  const eligibleAccounts = eligibleSettlementAccounts(
    settlementAccounts,
    currency,
  );
  const effectiveDataSource =
    dataSource ?? (isCreditCard ? creditCardSource : "MANUAL");
  const requiresStartingBalance = effectiveDataSource === "MANUAL";

  return (
    <FinanceForm
      action={createAccountAction}
      submitLabel={submitLabel}
      resetOnSuccess={resetOnSuccess}
      closeOnSuccess={closeOnSuccess}
      showSuccess={showSuccess}
      onSaved={onSaved}
    >
      <input type="hidden" name="dataSource" value={effectiveDataSource} />
      <FinanceField
        name="name"
        label="Account name"
        placeholder="The name you use in Become"
        required
        maxLength={120}
      />
      <p className="finance-form-note">
        This nickname remains the account&apos;s primary identity, even when it
        is linked to a bank account later.
      </p>
      <FinanceField
        name="bankName"
        label={isCreditCard ? "Bank / card issuer" : "Bank / institution"}
        defaultValue={defaultBankName}
        placeholder={isCreditCard ? "Required for card accounts" : "Optional"}
        required={isCreditCard}
        maxLength={120}
      />
      <div className="finance-form-grid">
        <FinanceSelect
          name="type"
          label="Account type"
          value={accountType}
          onChange={(event) => setAccountType(event.target.value)}
        >
          {FINANCIAL_ACCOUNT_TYPES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </FinanceSelect>
        <CurrencySelect
          name="currency"
          label="Currency"
          value={currency}
          onValueChange={setCurrency}
          required
        />
      </div>

      {isCreditCard && !dataSource && (
        <div>
          <FinanceSelect
            name="creditCardSource"
            label="Initial transaction source"
            value={creditCardSource}
            onChange={(event) => setCreditCardSource(event.target.value)}
          >
            <option value="STATEMENT_IMPORT">Statement import</option>
            <option value="MANUAL">Manual</option>
          </FinanceSelect>
          <p className="finance-form-note">
            Statement import is recommended for cards without a live bank
            connection. You can switch to live sync later without recreating the
            account or losing its history.
          </p>
        </div>
      )}

      {isCreditCard && (
        <fieldset className="finance-choice-group">
          <legend>Repayment method</legend>
          <label className="finance-choice-row">
            <input
              type="radio"
              name="repaymentMethod"
              value="LINKED_ACCOUNT"
              checked={repaymentMethod === "LINKED_ACCOUNT"}
              onChange={(event) => setRepaymentMethod(event.target.value)}
            />
            <span>
              <strong>Automatically from one of my accounts</strong>
              <small>
                Records which Become account settles this card. It does not
                change bank autopay settings.
              </small>
            </span>
          </label>
          <label className="finance-choice-row">
            <input
              type="radio"
              name="repaymentMethod"
              value="MANUAL"
              checked={repaymentMethod === "MANUAL"}
              onChange={(event) => setRepaymentMethod(event.target.value)}
            />
            <span>
              <strong>Manual / another method</strong>
              <small>No settlement account is required.</small>
            </span>
          </label>
        </fieldset>
      )}

      {needsSettlementAccount && (
        <div>
          <FinanceSelect
            name="settlementAccountId"
            label="Settlement account"
            defaultValue=""
            aria-describedby={settlementHelpId}
            required
          >
            <option value="">Choose account</option>
            {eligibleAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} · {account.currency}
              </option>
            ))}
          </FinanceSelect>
          <p className="finance-form-note" id={settlementHelpId}>
            {eligibleAccounts.length
              ? "Only active accounts in the card currency can settle it."
              : `Add an active ${currency} current or savings account before using automatic repayment.`}
          </p>
        </div>
      )}

      {isCreditCard && (
        <details className="finance-details">
          <summary>Optional card and statement details</summary>
          <div className="finance-details-body space-y-lg">
            <div className="finance-form-grid">
              <FinanceField
                name="creditLimit"
                label={`Credit limit (${currency})`}
                inputMode="decimal"
                placeholder="Unavailable"
              />
              <FinanceField
                name="statementDue"
                label={`Amount due (${currency})`}
                inputMode="decimal"
                placeholder="Unavailable"
              />
            </div>
            <div className="finance-form-grid">
              <FinanceField
                name="statementDueOn"
                label="Statement due date"
                type="date"
              />
              <FinanceField
                name={settlementDay ? "settlementDay" : undefined}
                label="Usual settlement day"
                type="number"
                min={1}
                max={31}
                placeholder="Unavailable"
                value={settlementDay}
                onChange={(event) => setSettlementDay(event.target.value)}
              />
            </div>
            <p className="finance-form-note">
              Leave values empty when the bank or statement has not supplied
              them. Become does not infer repayment amounts or dates.
            </p>
          </div>
        </details>
      )}

      {!isCreditCard && !isInvestment && (
        <label className="finance-checkbox-row">
          <input
            type="checkbox"
            name="includeInLiquidSavings"
            aria-label="Include in liquid savings"
          />
          <span>
            <strong>Count this as liquid savings</strong>
            <small>
              Use this balance when calculating reserve and goal capacity.
            </small>
          </span>
        </label>
      )}

      {effectiveDataSource === "LIVE_SYNC" ? (
        <p className="finance-form-note">
          Balance comes from your bank when available. Become will not create a
          manual starting balance for this account.
        </p>
      ) : (
        <>
          <div className="finance-form-grid">
            <FinanceField
              name="balance"
              label={
                isCreditCard
                  ? requiresStartingBalance
                    ? "Current outstanding balance"
                    : "Current outstanding balance (optional)"
                  : requiresStartingBalance
                    ? "What does it contain now?"
                    : "Opening balance (optional)"
              }
              aria-label={
                isCreditCard ? "Current card balance" : "Current balance"
              }
              inputMode="decimal"
              required={requiresStartingBalance}
            />
            <FinanceField
              name="reconciledAt"
              label="Observed at (Amsterdam)"
              type="datetime-local"
              required={requiresStartingBalance}
              defaultValue={defaultReconciledAt}
            />
          </div>
          <p className="finance-form-note">
            {!requiresStartingBalance
              ? "Leave the balance blank when the statement does not provide a reliable opening position. Imported activity can establish evidence without one."
              : isCreditCard
                ? "Record the amount currently owed. Card purchases remain expenses; repayments are transfers."
                : isInvestment
                  ? "Become tracks the evidenced account balance. Holdings and market performance are outside this view."
                  : "This observed balance becomes the trusted starting point. Future transactions move the recorded position from there."}
          </p>
        </>
      )}
    </FinanceForm>
  );
}
