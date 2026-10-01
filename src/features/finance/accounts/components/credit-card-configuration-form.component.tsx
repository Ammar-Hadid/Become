"use client";

import { useId, useState } from "react";
import { updateCreditCardConfigurationAction } from "@/features/finance/accounts/actions/credit-card-configuration.action";
import {
  eligibleSettlementAccounts,
  requiresSettlementAccount,
} from "@/features/finance/accounts/utils/credit-card-account.util";
import {
  FinanceField,
  FinanceSelect,
} from "@/features/finance/components/finance-field.component";
import { FinanceForm } from "@/features/finance/components/finance-form.component";

type SettlementAccountOption = {
  id: string;
  name: string;
  currency: string;
  type: string;
  archivedAt: Date | null;
};

export function CreditCardConfigurationForm({
  account,
  settlementAccounts,
}: {
  account: {
    id: string;
    bankName: string;
    currency: string;
    repaymentMethod: "LINKED_ACCOUNT" | "MANUAL" | null;
    settlementAccountId: string | null;
    creditLimit: string;
    statementBalance: string;
    statementDue: string;
    statementDueOn: string;
    settlementDay: number | null;
  };
  settlementAccounts: SettlementAccountOption[];
}) {
  const [repaymentMethod, setRepaymentMethod] = useState(
    account.repaymentMethod ?? "MANUAL",
  );
  const helpId = useId();
  const needsSettlement = requiresSettlementAccount(
    "CREDIT_CARD",
    repaymentMethod,
  );
  const eligibleAccounts = eligibleSettlementAccounts(
    settlementAccounts,
    account.currency,
  );

  return (
    <FinanceForm
      action={updateCreditCardConfigurationAction}
      submitLabel="Save card settings"
      closeOnSuccess
    >
      <input type="hidden" name="id" value={account.id} />
      <FinanceField
        name="bankName"
        label="Bank / card issuer"
        defaultValue={account.bankName}
        placeholder="Add the bank shown on this card"
        required
        maxLength={120}
      />
      <fieldset className="finance-choice-group">
        <legend>Repayment method</legend>
        <label className="finance-choice-row">
          <input
            type="radio"
            name="repaymentMethod"
            value="LINKED_ACCOUNT"
            checked={repaymentMethod === "LINKED_ACCOUNT"}
            onChange={(event) =>
              setRepaymentMethod(
                event.target.value as "LINKED_ACCOUNT" | "MANUAL",
              )
            }
          />
          <span>
            <strong>Automatically from one of my accounts</strong>
            <small>
              Records the Become account used for settlement. It does not
              configure bank autopay.
            </small>
          </span>
        </label>
        <label className="finance-choice-row">
          <input
            type="radio"
            name="repaymentMethod"
            value="MANUAL"
            checked={repaymentMethod === "MANUAL"}
            onChange={(event) =>
              setRepaymentMethod(
                event.target.value as "LINKED_ACCOUNT" | "MANUAL",
              )
            }
          />
          <span>
            <strong>Manual / another method</strong>
            <small>No settlement account is required.</small>
          </span>
        </label>
      </fieldset>

      {needsSettlement && (
        <div>
          <FinanceSelect
            name="settlementAccountId"
            label="Settlement account"
            defaultValue={account.settlementAccountId ?? ""}
            aria-describedby={helpId}
            required
          >
            <option value="">Choose account</option>
            {eligibleAccounts.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name} · {candidate.currency}
              </option>
            ))}
          </FinanceSelect>
          <p className="finance-form-note" id={helpId}>
            {eligibleAccounts.length
              ? "Only active owned accounts in the card currency can settle it."
              : `Add an active ${account.currency} current or savings account before using automatic repayment.`}
          </p>
        </div>
      )}

      <div className="finance-form-grid">
        <FinanceField
          name="creditLimit"
          label={`Credit limit (${account.currency})`}
          inputMode="decimal"
          defaultValue={account.creditLimit}
          placeholder="Unavailable"
        />
        <FinanceField
          name="statementBalance"
          label={`Latest statement balance (${account.currency})`}
          inputMode="decimal"
          defaultValue={account.statementBalance}
          placeholder="Unavailable"
        />
      </div>
      <div className="finance-form-grid">
        <FinanceField
          name="statementDue"
          label={`Amount due (${account.currency})`}
          inputMode="decimal"
          defaultValue={account.statementDue}
          placeholder="Unavailable"
        />
        <FinanceField
          name="statementDueOn"
          label="Statement due date"
          type="date"
          defaultValue={account.statementDueOn}
        />
      </div>
      <FinanceField
        name="settlementDay"
        label="Usual settlement day"
        type="number"
        min={1}
        max={31}
        defaultValue={account.settlementDay ?? ""}
        placeholder="Unavailable"
      />
      <p className="finance-form-note">
        Leave values empty when a statement or the provider has not supplied
        them. Become does not infer repayment amounts or dates.
      </p>
    </FinanceForm>
  );
}
