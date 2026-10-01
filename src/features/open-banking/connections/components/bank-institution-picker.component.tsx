"use client";

import { useDeferredValue, useState, useTransition } from "react";
import { ArrowRight, Building2, Search, ShieldCheck } from "lucide-react";
import { startBankConnectionAction } from "@/features/open-banking/connections/actions/bank-connection.action";
import type { BankInstitution } from "@/features/open-banking/providers/types/bank-provider.types";

export function BankInstitutionPicker({
  institutions,
}: {
  institutions: BankInstitution[];
}) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingInstitution, setPendingInstitution] = useState<string | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase());
  const visibleInstitutions = deferredQuery
    ? institutions.filter((institution) =>
        `${institution.name} ${institution.country}`
          .toLocaleLowerCase()
          .includes(deferredQuery),
      )
    : institutions;

  const connect = (institution: BankInstitution) => {
    setError(null);
    setPendingInstitution(`${institution.country}:${institution.name}`);
    startTransition(async () => {
      const result = await startBankConnectionAction({
        institutionName: institution.name,
        institutionCountry: institution.country,
      });
      if (result.error || !result.url) {
        setError(
          result.error ?? "The bank did not provide an authorization link.",
        );
        setPendingInstitution(null);
        return;
      }
      window.location.assign(result.url);
    });
  };

  return (
    <div className="open-banking-picker">
      <div className="open-banking-permission-note">
        <ShieldCheck aria-hidden="true" />
        <p>
          <strong>Read-only connection</strong>
          <span>
            Become asks the bank for balances and transactions. It cannot move
            money or change your bank account.
          </span>
        </p>
      </div>

      <label className="open-banking-search">
        <span className="field-label">Find your bank</span>
        <span>
          <Search aria-hidden="true" />
          <input
            className="text-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search institutions"
            autoComplete="off"
          />
        </span>
      </label>

      <div
        className="open-banking-institution-list"
        aria-label="Available institutions"
      >
        {visibleInstitutions.map((institution) => {
          const key = `${institution.country}:${institution.name}`;
          const isPending = pending && pendingInstitution === key;
          return (
            <button
              type="button"
              key={key}
              disabled={pending}
              aria-busy={isPending || undefined}
              onClick={() => connect(institution)}
            >
              <span className="open-banking-institution-mark">
                <Building2 aria-hidden="true" />
              </span>
              <span>
                <strong>{institution.name}</strong>
                <small>{institution.country}</small>
              </span>
              <span>
                {isPending ? "Opening bank…" : "Continue"}
                <ArrowRight aria-hidden="true" />
              </span>
            </button>
          );
        })}
        {!visibleInstitutions.length && (
          <p className="open-banking-picker-empty">
            No matching institution is available from the configured provider.
          </p>
        )}
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
