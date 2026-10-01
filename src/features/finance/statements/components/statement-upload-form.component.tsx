"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp } from "lucide-react";
import {
  FinanceField,
  FinanceSelect,
} from "@/features/finance/components/finance-field.component";
import { FinanceForm } from "@/features/finance/components/finance-form.component";
import { previewStatementAction } from "@/features/finance/statements/actions/statement-import.action";

type ImportAccount = {
  id: string;
  name: string;
  currency: string;
  type: string;
};

type CsvMapping = {
  date: string;
  amount: string;
  description: string;
  counterparty: string;
  reference: string;
  direction: string;
  currency: string;
  positiveDirection: "CREDIT" | "DEBIT";
};

const initialMapping: CsvMapping = {
  date: "",
  amount: "",
  description: "",
  counterparty: "",
  reference: "",
  direction: "",
  currency: "",
  positiveDirection: "CREDIT",
};

export function StatementUploadForm({
  accounts,
  defaultAccountId,
}: {
  accounts: ImportAccount[];
  defaultAccountId: string;
}) {
  const router = useRouter();
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [mapping, setMapping] = useState(initialMapping);
  const serializedMapping = useMemo(
    () =>
      JSON.stringify(
        Object.fromEntries(
          Object.entries(mapping).filter(([, value]) => value.length > 0),
        ),
      ),
    [mapping],
  );

  const setColumn = (field: keyof CsvMapping, value: string) =>
    setMapping((current) => ({ ...current, [field]: value }));

  return (
    <FinanceForm
      action={previewStatementAction}
      submitLabel="Preview statement"
      submitIcon={<FileUp aria-hidden="true" />}
      showSuccess={false}
      resetOnSuccess={false}
      closeOnSuccess
      onSaved={(state) => {
        if (state.id)
          router.push(
            `/finance/statements?account=${encodeURIComponent(accountId)}&import=${encodeURIComponent(state.id)}`,
          );
      }}
    >
      <FinanceSelect
        label="Become account"
        name="accountId"
        value={accountId}
        onChange={(event) => setAccountId(event.target.value)}
        required
      >
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name} · {account.currency}
          </option>
        ))}
      </FinanceSelect>

      <FinanceField
        label="Statement file"
        name="file"
        type="file"
        accept=".csv,.tsv,.txt,.pdf,text/csv,text/tab-separated-values,application/pdf"
        required
      />
      <p className="finance-form-note">
        Use a CSV, TSV or text-based PDF up to 2 MB. Scanned and encrypted PDFs
        are rejected without guessing amounts.
      </p>

      <details className="finance-statement-mapping">
        <summary>CSV column mapping</summary>
        <p>
          Leave these blank to recognize common headings automatically. Enter
          the exact heading from your file when its columns use different names.
        </p>
        <div className="finance-form-grid">
          <FinanceField
            label="Date column"
            value={mapping.date}
            onChange={(event) => setColumn("date", event.target.value)}
          />
          <FinanceField
            label="Amount column"
            value={mapping.amount}
            onChange={(event) => setColumn("amount", event.target.value)}
          />
          <FinanceField
            label="Description column"
            value={mapping.description}
            onChange={(event) => setColumn("description", event.target.value)}
          />
          <FinanceField
            label="Counterparty column"
            value={mapping.counterparty}
            onChange={(event) => setColumn("counterparty", event.target.value)}
          />
          <FinanceField
            label="Reference column"
            value={mapping.reference}
            onChange={(event) => setColumn("reference", event.target.value)}
          />
          <FinanceField
            label="Direction column"
            value={mapping.direction}
            onChange={(event) => setColumn("direction", event.target.value)}
          />
          <FinanceField
            label="Currency column"
            value={mapping.currency}
            onChange={(event) => setColumn("currency", event.target.value)}
          />
          <FinanceSelect
            label="Positive amounts mean"
            value={mapping.positiveDirection}
            onChange={(event) =>
              setColumn("positiveDirection", event.target.value)
            }
          >
            <option value="CREDIT">Money in</option>
            <option value="DEBIT">Money out</option>
          </FinanceSelect>
        </div>
      </details>
      <input type="hidden" name="mapping" value={serializedMapping} />
    </FinanceForm>
  );
}
