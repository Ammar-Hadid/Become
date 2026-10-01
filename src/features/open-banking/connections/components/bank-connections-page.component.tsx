import Link from "next/link";
import { DateTime } from "luxon";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  Link2,
  RefreshCw,
  ShieldAlert,
  Unplug,
} from "lucide-react";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { getFinancialPosition } from "@/features/finance/accounts/queries/financial-position.query";
import { FinanceDialog } from "@/features/finance/components/finance-dialog.component";
import {
  FinanceEmptyState,
  FinancePageHeader,
  FinanceSection,
} from "@/features/finance/components/finance-field.component";
import { BankConnectionControls } from "@/features/open-banking/connections/components/bank-connection-controls.component";
import { BankInstitutionPicker } from "@/features/open-banking/connections/components/bank-institution-picker.component";
import { ExternalAccountMapping } from "@/features/open-banking/connections/components/external-account-mapping.component";
import {
  getBankConnections,
  getBankInstitutions,
} from "@/features/open-banking/connections/queries/bank-connections.query";

const statusCopy = {
  AUTHORIZING: "Authorization in progress",
  CONNECTED: "Connected",
  REAUTH_REQUIRED: "Reconnect required",
  DISCONNECTED: "Disconnected",
  FAILED: "Connection needs attention",
} as const;

const displayDateTime = (value: Date | null) =>
  value
    ? DateTime.fromJSDate(value)
        .setZone(APP_TIMEZONE)
        .toFormat("d LLL yyyy, HH:mm")
    : "Not yet";

const externalType = (value: string | null) =>
  value
    ? value
        .toLocaleLowerCase()
        .replaceAll("_", " ")
        .replace(/^./, (character) => character.toLocaleUpperCase())
    : "Account type unavailable";

export async function BankConnectionsPage({ userId }: { userId: string }) {
  const [{ configured, connections }, institutions, accounts] =
    await Promise.all([
      getBankConnections(userId),
      getBankInstitutions(),
      getFinancialPosition(userId),
    ]);
  const accountNames = new Map(
    accounts.map((account) => [account.id, account.name]),
  );
  const mappedAccountIds = new Set(
    connections.flatMap((connection) =>
      connection.externalAccounts.flatMap((external) =>
        external.financialAccountId ? [external.financialAccountId] : [],
      ),
    ),
  );
  const availableAccounts = accounts.filter(
    (account) => !mappedAccountIds.has(account.id),
  );
  const defaultReconciledAt = DateTime.now()
    .setZone(APP_TIMEZONE)
    .toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS");

  const connectDialog = configured ? (
    <FinanceDialog
      triggerLabel="Connect bank"
      title="Connect a financial institution"
      description="Choose your bank, then authorize read-only access on the bank's own screen."
    >
      <BankInstitutionPicker institutions={institutions} />
    </FinanceDialog>
  ) : undefined;

  return (
    <>
      <FinancePageHeader
        eyebrow="Connections"
        title="Financial data sources"
        description="Bank connections and statement imports feed the same Finance ledger. Your Become account names and classifications stay in control."
        actions={connectDialog}
      />

      {!configured && (
        <div className="open-banking-setup-callout" role="status">
          <ShieldAlert aria-hidden="true" />
          <div>
            <strong>Bank connections need server setup</strong>
            <p>
              Statement imports and manual Finance continue to work. Live
              connection setup is currently unavailable.
            </p>
          </div>
        </div>
      )}

      <FinanceSection
        title="Live bank connections"
        description="Consent, connection health and synchronization are shown separately from the accounts they supply."
      >
        {!connections.length ? (
          <FinanceEmptyState
            icon={<Building2 aria-hidden="true" />}
            title="No banks connected"
            description="Connect a supported institution for read-only balance and transaction synchronization."
            action={connectDialog}
          />
        ) : (
          <div className="open-banking-connection-list">
            {connections.map((connection) => {
              const activeJob = connection.jobs[0];
              const healthy = connection.status === "CONNECTED";
              return (
                <article key={connection.id}>
                  <header>
                    <span className="open-banking-institution-mark">
                      <Building2 aria-hidden="true" />
                    </span>
                    <div>
                      <p className="eyebrow">
                        {connection.provider.replaceAll("_", " ")}
                      </p>
                      <h3>{connection.institutionName}</h3>
                      <span>{connection.institutionCountry}</span>
                    </div>
                    <span
                      className={
                        "finance-status-pill " +
                        (healthy
                          ? "finance-status-pill--positive"
                          : connection.status === "DISCONNECTED"
                            ? "finance-status-pill--muted"
                            : "finance-status-pill--warning")
                      }
                    >
                      {healthy ? (
                        <CheckCircle2 aria-hidden="true" />
                      ) : connection.status === "DISCONNECTED" ? (
                        <Unplug aria-hidden="true" />
                      ) : (
                        <ShieldAlert aria-hidden="true" />
                      )}
                      {statusCopy[connection.status]}
                    </span>
                    <BankConnectionControls connection={connection} />
                  </header>

                  <dl className="open-banking-connection-facts">
                    <div>
                      <dt>
                        <RefreshCw aria-hidden="true" /> Last synchronized
                      </dt>
                      <dd>{displayDateTime(connection.lastSuccessAt)}</dd>
                    </div>
                    <div>
                      <dt>
                        <Clock3 aria-hidden="true" /> Consent expires
                      </dt>
                      <dd>{displayDateTime(connection.consentExpiresAt)}</dd>
                    </div>
                    <div>
                      <dt>Next eligible sync</dt>
                      <dd>{displayDateTime(connection.nextEligibleAt)}</dd>
                    </div>
                  </dl>

                  {activeJob && (
                    <div
                      className={`open-banking-job is-${activeJob.status.toLocaleLowerCase()}`}
                      role="status"
                    >
                      <RefreshCw aria-hidden="true" />
                      <span>
                        <strong>
                          {activeJob.status === "RUNNING"
                            ? "Synchronization in progress"
                            : activeJob.status === "QUEUED"
                              ? "Synchronization queued"
                              : "Synchronization will retry"}
                        </strong>
                        <small>
                          {activeJob.lastError ||
                            `Next attempt ${displayDateTime(activeJob.nextAttemptAt)}`}
                        </small>
                      </span>
                    </div>
                  )}

                  <div className="open-banking-external-accounts">
                    {connection.externalAccounts.map((external) => {
                      const becomeName = external.financialAccountId
                        ? accountNames.get(external.financialAccountId)
                        : null;
                      return (
                        <div key={external.id}>
                          <span className="open-banking-account-source">
                            <Link2 aria-hidden="true" />
                          </span>
                          <span>
                            <strong>
                              {external.maskedIdentifier ||
                                `${connection.institutionName} account`}
                            </strong>
                            <small>
                              {externalType(external.externalType)} ·{" "}
                              {external.currency}
                            </small>
                          </span>
                          {external.financialAccountId && becomeName ? (
                            <Link
                              href={`/finance/accounts/${external.financialAccountId}`}
                            >
                              <span>Mapped to</span>
                              <strong>{becomeName}</strong>
                              <ArrowRight aria-hidden="true" />
                            </Link>
                          ) : (
                            <details className="open-banking-map-details">
                              <summary>Map account</summary>
                              <div>
                                <ExternalAccountMapping
                                  externalAccount={external}
                                  institutionName={connection.institutionName}
                                  accounts={availableAccounts}
                                  defaultReconciledAt={defaultReconciledAt}
                                />
                              </div>
                            </details>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </FinanceSection>

      <FinanceSection
        title="Statement imports"
        description="Accounts that begin with statement files use the same review, categorization and analytics pipeline as live data."
      >
        <div className="open-banking-statement-intro">
          <div>
            <p className="eyebrow">Statement import</p>
            <h3>Bring in a CSV or text-based PDF</h3>
            <p>
              Preview coverage and validation issues before anything joins the
              ledger. Repeated and overlapping files are checked before
              confirmation.
            </p>
          </div>
          <Link
            className="finance-link-action finance-link-action--primary"
            href="/finance/statements"
          >
            Import statement
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </FinanceSection>
    </>
  );
}
