"use client";
import { useState } from "react";
import { FinanceForm } from "@/features/finance/components/finance-form.component";
import {
  FinanceField,
  FinanceSelect,
} from "@/features/finance/components/finance-field.component";
import { saveRecurringAction } from "@/features/finance/recurring/actions/recurring-expense.action";
import {
  ExpenseCategoryCombobox,
  type ExpenseCategoryOption,
} from "@/features/finance/categories/components/expense-category-combobox.component";
import {
  CounterpartyCombobox,
  type CounterpartyOption,
} from "@/features/finance/counterparties/components/counterparty-combobox.component";
export type RecurringFormValues = {
  id?: string;
  name: string;
  amount: string;
  currency: string;
  accountId: string;
  expenseCategoryId?: string | null;
  expenseCategoryName?: string | null;
  counterpartyId?: string | null;
  counterpartyName?: string | null;
  frequency: string;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  monthOfYear?: number | null;
  startOn: string;
  endOn: string;
  postingBehavior: string;
};
export function RecurringForm({
  initial,
  accounts,
  categories,
  counterparties,
}: {
  initial: RecurringFormValues;
  accounts: { id: string; name: string; currency: string }[];
  categories: ExpenseCategoryOption[];
  counterparties: CounterpartyOption[];
}) {
  const [frequency, setFrequency] = useState(initial.frequency);
  const [accountId, setAccountId] = useState(
    initial.accountId || accounts[0]?.id || "",
  );
  const [posting, setPosting] = useState(initial.postingBehavior);
  return (
    <FinanceForm
      action={saveRecurringAction}
      closeOnSuccess
      submitLabel={
        initial.id ? "Save recurring changes" : "Create recurring expense"
      }
    >
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <FinanceField
        label="Commitment name"
        aria-label="Expense name"
        name="name"
        placeholder="e.g. Rent, phone plan, insurance"
        defaultValue={initial.name}
        required
      />
      <CounterpartyCombobox
        label="Counterparty"
        counterparties={counterparties}
        initialId={initial.counterpartyId}
        initialName={initial.counterpartyName}
      />
      <FinanceSelect
        label="Paid from"
        aria-label="Account"
        name="accountId"
        value={accountId}
        onChange={(event) => setAccountId(event.target.value)}
        required
      >
        <option value="">Choose account</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name} · {account.currency}
          </option>
        ))}
      </FinanceSelect>
      <input
        type="hidden"
        name="currency"
        value={
          accounts.find((account) => account.id === accountId)?.currency ??
          initial.currency
        }
      />
      <FinanceField
        label="Scheduled amount"
        name="amount"
        defaultValue={initial.amount}
        inputMode="decimal"
        required
      />
      <ExpenseCategoryCombobox
        categories={categories}
        initialId={initial.expenseCategoryId}
        initialName={initial.expenseCategoryName}
      />
      <div className="finance-form-grid">
        <FinanceSelect
          label="Frequency"
          name="frequency"
          value={frequency}
          onChange={(event) => setFrequency(event.target.value)}
        >
          <option value="WEEKLY">Every week</option>
          <option value="MONTHLY">Every month</option>
          <option value="YEARLY">Every year</option>
        </FinanceSelect>
        {frequency === "WEEKLY" ? (
          <FinanceSelect
            label="Day of week"
            name="dayOfWeek"
            defaultValue={initial.dayOfWeek ?? 1}
          >
            {[
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ].map((day, index) => (
              <option key={day} value={index + 1}>
                {day}
              </option>
            ))}
          </FinanceSelect>
        ) : (
          <FinanceField
            label="Usually paid on day"
            aria-label="Day of month"
            name="dayOfMonth"
            type="number"
            min={1}
            max={31}
            defaultValue={initial.dayOfMonth ?? 1}
            required
          />
        )}
        {frequency === "YEARLY" && (
          <FinanceField
            label="Month number"
            name="monthOfYear"
            type="number"
            min={1}
            max={12}
            defaultValue={initial.monthOfYear ?? 1}
            required
          />
        )}
      </div>
      <div className="finance-form-grid">
        <FinanceField
          label="Start date"
          name="startOn"
          type="date"
          defaultValue={initial.startOn}
          required
        />
        <FinanceField
          label="End date (optional)"
          name="endOn"
          type="date"
          defaultValue={initial.endOn}
        />
      </div>
      <FinanceSelect
        label="When it becomes due"
        aria-label="Posting behavior"
        name="postingBehavior"
        value={posting}
        onChange={(event) => setPosting(event.target.value)}
      >
        <option value="ASK_TO_CONFIRM">Ask me before recording</option>
        <option value="AUTOMATIC">Record it automatically</option>
      </FinanceSelect>
      {posting === "AUTOMATIC" && (
        <p className="finance-callout">
          Become will record this expense from the schedule without checking
          your bank. Eligible past dates may be included when you save.
        </p>
      )}
      {initial.id && (
        <FinanceSelect
          label="If due today and not already processed, apply changes"
          name="todayEffect"
          defaultValue=""
        >
          <option value="">Choose when applicable</option>
          <option value="today">Starting today</option>
          <option value="next">Starting next occurrence</option>
        </FinanceSelect>
      )}
    </FinanceForm>
  );
}
