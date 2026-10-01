"use client";

import { useState } from "react";
import { saveExpectedIncomeAction } from "@/features/finance/forecast/actions/expected-income.action";
import {
  FinanceField,
  FinanceSelect,
} from "@/features/finance/components/finance-field.component";
import { FinanceForm } from "@/features/finance/components/finance-form.component";

type IncomeAccount = {
  id: string;
  name: string;
  currency: string;
  type: string;
};

export function ExpectedIncomeForm({
  accounts,
  counterparties,
  defaultDueOn,
}: {
  accounts: IncomeAccount[];
  counterparties: { id: string; name: string }[];
  defaultDueOn: string;
}) {
  const eligibleAccounts = accounts.filter(
    (candidate) =>
      candidate.type !== "CREDIT_CARD" && candidate.type !== "INVESTMENT",
  );
  const [accountId, setAccountId] = useState(eligibleAccounts[0]?.id ?? "");
  const account = accounts.find((candidate) => candidate.id === accountId);
  const currency = account?.currency ?? "EUR";

  return (
    <FinanceForm
      action={saveExpectedIncomeAction}
      submitLabel="Add expected income"
      resetOnSuccess
      closeOnSuccess
    >
      <FinanceField
        name="title"
        label="Expected income"
        placeholder="e.g. October salary"
        required
      />
      <div className="finance-form-grid">
        <FinanceSelect
          name="accountId"
          label="Receiving account"
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          required
        >
          <option value="">Choose account</option>
          {eligibleAccounts.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name} · {candidate.currency}
            </option>
          ))}
        </FinanceSelect>
        <FinanceField
          name="amount"
          label={`Amount (${currency})`}
          inputMode="decimal"
          placeholder="0.00"
          required
        />
      </div>
      <FinanceSelect
        name="counterpartyId"
        label="Confirmed counterparty (optional)"
        defaultValue=""
      >
        <option value="">No counterparty selected</option>
        {counterparties.map((counterparty) => (
          <option key={counterparty.id} value={counterparty.id}>
            {counterparty.name}
          </option>
        ))}
      </FinanceSelect>
      <p className="finance-form-note">
        A confirmed counterparty helps imported receipts match this expectation
        without relying on the title.
      </p>
      <input type="hidden" name="currency" value={currency} />
      <div className="finance-form-grid">
        <FinanceField
          name="dueOn"
          label="Expected on"
          type="date"
          defaultValue={defaultDueOn}
          required
        />
        <FinanceSelect
          name="recurrenceFrequency"
          label="Repeats"
          defaultValue=""
        >
          <option value="">One time</option>
          <option value="WEEKLY">Weekly</option>
          <option value="MONTHLY">Monthly</option>
          <option value="YEARLY">Yearly</option>
        </FinanceSelect>
      </div>
      <p className="finance-form-note">
        Forecasting uses only income you confirm here. Recording an expectation
        does not create a received transaction.
      </p>
    </FinanceForm>
  );
}
