"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, Plus } from "lucide-react";
import { mapExternalAccountAction } from "@/features/finance/accounts/actions/bank-account-mapping.action";
import { FinancialAccountForm } from "@/features/finance/accounts/components/financial-account-form.component";
import { FinanceSelect } from "@/features/finance/components/finance-field.component";
import { FinanceForm } from "@/features/finance/components/finance-form.component";

type BecomeAccountOption = {
  id: string;
  name: string;
  type: string;
  currency: string;
};

const humanize = (value: string | null) =>
  value
    ? value
        .toLocaleLowerCase()
        .replaceAll("_", " ")
        .replace(/^./, (character) => character.toLocaleUpperCase())
    : "Unknown type";

export function ExternalAccountMapping({
  externalAccount,
  institutionName,
  accounts,
  defaultReconciledAt,
}: {
  externalAccount: {
    id: string;
    externalType: string | null;
    currency: string;
    maskedIdentifier: string | null;
  };
  institutionName: string;
  accounts: BecomeAccountOption[];
  defaultReconciledAt: string;
}) {
  const router = useRouter();
  const eligibleAccounts = accounts.filter(
    (account) => account.currency === externalAccount.currency,
  );
  const [mode, setMode] = useState<"EXISTING" | "CREATE">(
    eligibleAccounts.length ? "EXISTING" : "CREATE",
  );
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [mapping, startMapping] = useTransition();

  const mapCreatedAccount = (accountId: string) => {
    setMappingError(null);
    startMapping(async () => {
      const data = new FormData();
      data.set("externalId", externalAccount.id);
      data.set("accountId", accountId);
      const result = await mapExternalAccountAction(data);
      if (result.error) setMappingError(result.error);
      else router.refresh();
    });
  };

  return (
    <div className="open-banking-mapping">
      <div className="open-banking-mapping-source">
        <span>
          <Link2 aria-hidden="true" />
        </span>
        <div>
          <p className="eyebrow">External account</p>
          <strong>
            {externalAccount.maskedIdentifier || "Identifier unavailable"}
          </strong>
          <small>
            {humanize(externalAccount.externalType)} ·{" "}
            {externalAccount.currency}
          </small>
        </div>
      </div>

      <fieldset className="finance-choice-group">
        <legend>Map this external account</legend>
        <label className="finance-choice-row">
          <input
            type="radio"
            name={`mapping-${externalAccount.id}`}
            checked={mode === "EXISTING"}
            disabled={!eligibleAccounts.length}
            onChange={() => setMode("EXISTING")}
          />
          <span>
            <strong>Use one of my Become accounts</strong>
            <small>
              Keeps its nickname, classification, Savings behavior and history.
            </small>
          </span>
        </label>
        <label className="finance-choice-row">
          <input
            type="radio"
            name={`mapping-${externalAccount.id}`}
            checked={mode === "CREATE"}
            onChange={() => setMode("CREATE")}
          />
          <span>
            <strong>Create a new Become account</strong>
            <small>Choose how Finance should classify the account.</small>
          </span>
        </label>
      </fieldset>

      {mode === "EXISTING" ? (
        <FinanceForm
          action={mapExternalAccountAction}
          submitLabel="Confirm mapping"
          submitIcon={<Link2 aria-hidden="true" />}
        >
          <input type="hidden" name="externalId" value={externalAccount.id} />
          <FinanceSelect
            name="accountId"
            label="Become account"
            defaultValue=""
            required
          >
            <option value="">Choose account</option>
            {eligibleAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} · {humanize(account.type)}
              </option>
            ))}
          </FinanceSelect>
          <p className="finance-form-note">
            The bank&apos;s {humanize(externalAccount.externalType)} label
            remains external evidence. It will not replace Become&apos;s account
            type.
          </p>
        </FinanceForm>
      ) : (
        <FinancialAccountForm
          defaultReconciledAt={defaultReconciledAt}
          defaultCurrency={externalAccount.currency}
          defaultBankName={institutionName}
          dataSource="LIVE_SYNC"
          settlementAccounts={accounts.map((account) => ({
            ...account,
            archivedAt: null,
          }))}
          submitLabel="Create and map account"
          closeOnSuccess={false}
          resetOnSuccess={false}
          showSuccess={false}
          onSaved={(result) => {
            if (result.id) mapCreatedAccount(result.id);
            else setMappingError("The new account could not be mapped.");
          }}
        />
      )}

      {mapping && (
        <p className="open-banking-mapping-status" role="status">
          Mapping the new account…
        </p>
      )}
      {mappingError && (
        <p className="form-error" role="alert">
          {mappingError}
        </p>
      )}
      {mode === "CREATE" && (
        <p className="open-banking-mapping-footnote">
          <Plus aria-hidden="true" /> If mapping is interrupted after creation,
          the account remains available and can be mapped here again.
        </p>
      )}
    </div>
  );
}
