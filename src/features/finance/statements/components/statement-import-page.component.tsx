import Link from "next/link";
import { DateTime } from "luxon";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  FileClock,
  FileWarning,
  Landmark,
} from "lucide-react";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { formatMoney } from "@/lib/money/utils/money.util";
import { getFinancialPosition } from "@/features/finance/accounts/queries/financial-position.query";
import {
  FinanceEmptyState,
  FinancePageHeader,
  FinanceSection,
} from "@/features/finance/components/finance-field.component";
import { FinanceDialog } from "@/features/finance/components/finance-dialog.component";
import { StatementConfirmForm } from "@/features/finance/statements/components/statement-confirm-form.component";
import { StatementUploadForm } from "@/features/finance/statements/components/statement-upload-form.component";
import { StatementOverlapResolution } from "@/features/finance/statements/components/statement-overlap-resolution.component";
import {
  getStatementImports,
  getStatementPreview,
} from "@/features/finance/statements/queries/statement-import.query";

const dateOnly = (value: Date | string | null) =>
  value
    ? typeof value === "string"
      ? value.slice(0, 10)
      : value.toISOString().slice(0, 10)
    : null;

const presentDate = (value: Date | string | null) => {
  const iso = dateOnly(value);
  return iso
    ? DateTime.fromISO(iso, { zone: APP_TIMEZONE }).toFormat("d LLL yyyy")
    : "Unavailable";
};

export async function StatementImportPage({
  userId,
  accountId,
  importId,
}: {
  userId: string;
  accountId?: string;
  importId?: string;
}) {
  const [accounts, requestedPreview] = await Promise.all([
    getFinancialPosition(userId),
    importId ? getStatementPreview(userId, importId) : null,
  ]);
  const eligibleAccounts = accounts.filter((account) => !account.archivedAt);
  const selectedAccountId =
    requestedPreview?.accountId ??
    eligibleAccounts.find((account) => account.id === accountId)?.id ??
    eligibleAccounts[0]?.id;
  const [preview, imports] = await Promise.all([
    requestedPreview,
    selectedAccountId
      ? getStatementImports(userId, selectedAccountId)
      : Promise.resolve([]),
  ]);
  const previewErrors = preview?.errors.flatMap((error, index) => {
    if (typeof error === "string")
      return [{ line: null, message: error, key: `${index}-${error}` }];
    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
    )
      return [
        {
          line:
            "line" in error && typeof error.line === "number"
              ? error.line
              : null,
          message: error.message,
          key: `${index}-${error.message}`,
        },
      ];
    return [];
  });
  const activeRows =
    preview?.rows.filter((row) => row.link?.status === "STAGED") ?? [];
  const unresolvedRows =
    preview?.rows.filter((row) => row.link?.status === "DUPLICATE_REVIEW") ??
    [];

  return (
    <>
      <FinancePageHeader
        eyebrow="Statement import"
        title="Bring evidence into Finance."
        description="Preview every row before it joins the same Finance pipeline used by live sync and manual activity."
        actions={
          eligibleAccounts.length ? (
            <FinanceDialog
              triggerLabel="Upload statement"
              title="Upload a statement"
              description="Choose the Become account this evidence belongs to. Its nickname, classification and existing interpretation stay in place."
            >
              <StatementUploadForm
                accounts={eligibleAccounts.map((account) => ({
                  id: account.id,
                  name: account.name,
                  currency: account.currency,
                  type: account.type,
                }))}
                defaultAccountId={selectedAccountId ?? eligibleAccounts[0].id}
              />
            </FinanceDialog>
          ) : undefined
        }
      />

      {!eligibleAccounts.length ? (
        <FinanceEmptyState
          icon={<Landmark aria-hidden="true" />}
          title="Add an account first"
          description="A statement needs an owned Become account before its evidence can be reviewed."
          action={
            <Link className="finance-panel-link" href="/finance/accounts">
              Set up accounts <ArrowRight aria-hidden="true" />
            </Link>
          }
        />
      ) : (
        <>
          {preview && (
            <FinanceSection
              title={
                preview.status === "CONFIRMED"
                  ? "Import complete"
                  : "Statement preview"
              }
              description={`${preview.fileName} · ${preview.account.name}`}
            >
              <div className="finance-statement-preview finance-surface">
                <header>
                  <div>
                    <p className="eyebrow">
                      {preview.format.replace("_", " ")}
                    </p>
                    <h3>
                      {preview.status === "CONFIRMED"
                        ? `${preview.rows.length} rows imported`
                        : `${activeRows.length} rows ready to import`}
                    </h3>
                    <p>
                      Coverage {presentDate(preview.coverageFromOn)} –{" "}
                      {presentDate(preview.coverageThroughOn)}
                    </p>
                  </div>
                  <span
                    className={
                      "finance-status-pill " +
                      (preview.status === "CONFIRMED"
                        ? "finance-status-pill--positive"
                        : previewErrors?.length
                          ? "finance-status-pill--warning"
                          : "")
                    }
                  >
                    {preview.status === "CONFIRMED" ? (
                      <CheckCircle2 aria-hidden="true" />
                    ) : previewErrors?.length ? (
                      <AlertCircle aria-hidden="true" />
                    ) : (
                      <FileClock aria-hidden="true" />
                    )}
                    {preview.status === "CONFIRMED"
                      ? "Confirmed"
                      : previewErrors?.length
                        ? "Needs correction"
                        : "Preview only"}
                  </span>
                </header>

                {!!previewErrors?.length && (
                  <div className="finance-statement-errors" role="alert">
                    <FileWarning aria-hidden="true" />
                    <div>
                      <strong>Fix the source or column mapping</strong>
                      <p>
                        No rows will be imported while the statement contains
                        parsing errors.
                      </p>
                      <ul>
                        {previewErrors.slice(0, 12).map((error) => (
                          <li key={error.key}>
                            {error.line ? `Line ${error.line}: ` : ""}
                            {error.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="finance-statement-table-wrap">
                  <table className="finance-statement-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Counterparty or description</th>
                        <th>Evidence status</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.slice(0, 100).map((row) => {
                        const signedAmount =
                          row.direction === "DEBIT"
                            ? -row.amountMinor
                            : row.amountMinor;
                        return (
                          <tr key={row.id}>
                            <td>{presentDate(row.activityOn)}</td>
                            <td>
                              <strong>
                                {row.counterpartyName ??
                                  row.description ??
                                  "Unknown counterparty"}
                              </strong>
                              {row.counterpartyName && row.description && (
                                <small>{row.description}</small>
                              )}
                            </td>
                            <td>
                              {row.link?.status === "DUPLICATE_REVIEW" ? (
                                <StatementOverlapResolution
                                  observationId={row.id}
                                  candidates={preview.candidates
                                    .filter((candidate) =>
                                      Array.isArray(
                                        row.link?.duplicateCandidates,
                                      )
                                        ? row.link.duplicateCandidates.includes(
                                            candidate.id,
                                          )
                                        : false,
                                    )
                                    .map((candidate) => ({
                                      id: candidate.id,
                                      label: `${candidate.account.name} · ${candidate.type.toLowerCase()} · ${DateTime.fromJSDate(
                                        candidate.occurredAt,
                                      )
                                        .setZone(APP_TIMEZONE)
                                        .toFormat(
                                          "d LLL yyyy",
                                        )} · ${formatMoney(candidate.amountMinor, candidate.currency)}`,
                                    }))}
                                />
                              ) : row.link?.needsAttention ? (
                                "Needs review"
                              ) : (
                                "New evidence"
                              )}
                            </td>
                            <td className="finance-number">
                              {formatMoney(signedAmount, row.currency)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {preview.rows.length > 100 && (
                  <p className="finance-statement-row-limit">
                    Showing the first 100 of {preview.rows.length} rows. Every
                    valid row will be included when you confirm.
                  </p>
                )}

                <footer>
                  <p>
                    Evidence stays immutable. Counterparty, category, notes,
                    tags and review decisions remain editable after import.
                  </p>
                  {preview.status === "CONFIRMED" ? (
                    <Link
                      className="finance-link-action finance-link-action--primary"
                      href={`/finance/transactions?account=${preview.accountId}`}
                    >
                      Review imported activity <ArrowRight aria-hidden="true" />
                    </Link>
                  ) : !previewErrors?.length &&
                    !unresolvedRows.length &&
                    activeRows.length ? (
                    <StatementConfirmForm importId={preview.id} />
                  ) : unresolvedRows.length ? (
                    <p>
                      Resolve {unresolvedRows.length} possible overlap
                      {unresolvedRows.length === 1 ? "" : "s"} before
                      confirming.
                    </p>
                  ) : null}
                </footer>
              </div>
            </FinanceSection>
          )}

          <FinanceSection
            title="Statement history"
            description="Coverage and freshness remain attached to the same Become account if its source later changes to live sync."
          >
            <div className="finance-statement-account-filter">
              {eligibleAccounts.map((account) => (
                <Link
                  key={account.id}
                  href={`/finance/statements?account=${account.id}`}
                  aria-current={
                    account.id === selectedAccountId ? "page" : undefined
                  }
                >
                  {account.name}
                </Link>
              ))}
            </div>
            {!imports.length ? (
              <FinanceEmptyState
                icon={<FileCheck2 aria-hidden="true" />}
                title="No statements imported"
                description="Upload a file to inspect its coverage and rows before confirming anything."
              />
            ) : (
              <div className="finance-statement-history">
                {imports.map((statement) => (
                  <Link
                    key={statement.id}
                    href={`/finance/statements?account=${statement.accountId}&import=${statement.id}`}
                  >
                    <span className="finance-panel-icon">
                      {statement.status === "CONFIRMED" ? (
                        <FileCheck2 aria-hidden="true" />
                      ) : (
                        <FileClock aria-hidden="true" />
                      )}
                    </span>
                    <span>
                      <strong>{statement.fileName}</strong>
                      <small>
                        {presentDate(statement.coverageFromOn)} –{" "}
                        {presentDate(statement.coverageThroughOn)}
                      </small>
                    </span>
                    <span>{statement.status.toLowerCase()}</span>
                    <ArrowRight aria-hidden="true" />
                  </Link>
                ))}
              </div>
            )}
          </FinanceSection>
        </>
      )}
    </>
  );
}
