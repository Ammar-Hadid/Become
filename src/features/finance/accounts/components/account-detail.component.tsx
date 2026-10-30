import { WorkspaceDisclosure } from "@/components/ui/workspace/workspace-disclosure.component";
import { Card } from "@/components/ui/cards/card.component";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DateTime } from "luxon";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowRightLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  History,
  Settings2,
  FileUp,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { formatMoney, moneyDecimal } from "@/lib/money/utils/money.util";
import { FinanceForm } from "@/features/finance/components/finance-form.component";
import { FinanceDialog } from "@/features/finance/components/finance-dialog.component";
import {
  FinanceEmptyState,
  FinanceField,
  FinancePageHeader,
  FinanceSelect,
  FinanceSection,
} from "@/features/finance/components/finance-field.component";
import {
  archiveAccountAction,
  deleteSnapshotAction,
  reconcileAccountAction,
  updateAccountAction,
} from "@/features/finance/accounts/actions/financial-account.action";
import { getFinancialPosition } from "@/features/finance/accounts/queries/financial-position.query";
import { getFinancialAccountBanking } from "@/features/finance/accounts/queries/account-banking.query";
import { AccountArtwork } from "@/features/finance/accounts/components/account-artwork.component";
import { CreditCardConfigurationForm } from "@/features/finance/accounts/components/credit-card-configuration-form.component";
import { getFinancialLedger } from "@/features/finance/transactions/queries/financial-ledger.query";
import { BankConnectionControls } from "@/features/open-banking/connections/components/bank-connection-controls.component";
import {
  classifyIncomingEvidenceAction,
  confirmEvidenceTransferAction,
  resolveEvidenceAction,
} from "@/features/finance/review/actions/financial-review.action";

export async function AccountDetail({
  userId,
  id,
  cursor,
}: {
  userId: string;
  id: string;
  cursor?: string;
}) {
  const account = await prisma.financialAccount.findFirst({
    where: { id, userId },
  });
  if (!account) notFound();
  const at = account.archivedAt
    ? new Date(account.archivedAt.getTime() - 1)
    : new Date();
  const [position, ledger, banking] = await Promise.all([
    getFinancialPosition(userId, at),
    getFinancialLedger(userId, { account: id }),
    getFinancialAccountBanking(userId, id),
  ]);
  const current = position.find((item) => item.id === id);
  const settlementAccounts = position.filter(
    (item) =>
      item.id !== id &&
      item.currency === account.currency &&
      item.type !== "CREDIT_CARD" &&
      !item.archivedAt,
  );
  const debtMinor =
    account.type === "CREDIT_CARD" &&
    current?.balanceMinor !== null &&
    current?.balanceMinor !== undefined
      ? current.balanceMinor < 0n
        ? -current.balanceMinor
        : current.balanceMinor
      : null;
  const anchor = cursor
    ? await prisma.financialAccountBalanceSnapshot.findFirst({
        where: { id: cursor, userId, accountId: id },
      })
    : null;
  const snapshots = await prisma.financialAccountBalanceSnapshot.findMany({
    where: {
      userId,
      accountId: id,
      ...(anchor ? { reconciledAt: { lt: anchor.reconciledAt } } : {}),
    },
    orderBy: { reconciledAt: "desc" },
    take: 21,
  });
  const localInput = (date: Date) =>
    DateTime.fromJSDate(date)
      .setZone(APP_TIMEZONE)
      .toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS");
  const localDisplay = (date: Date) =>
    DateTime.fromJSDate(date)
      .setZone(APP_TIMEZONE)
      .toFormat("d LLL yyyy, HH:mm");
  const reconciliationAge = current?.reconciledAt
    ? Math.floor(
        (DateTime.now().toMillis() - current.reconciledAt.getTime()) /
          (24 * 60 * 60 * 1000),
      )
    : null;
  const liveBalance = current?.balanceSource === "LIVE_SYNC";
  const availableBalance =
    liveBalance &&
    account.type !== "CREDIT_CARD" &&
    (current.balanceType === "ITAV" || current.balanceType === "CLAV");
  const balanceTitle =
    account.type === "CREDIT_CARD"
      ? "Current debt"
      : availableBalance
        ? "Available bank balance"
        : liveBalance
          ? "Synced bank balance"
          : "Current recorded position";
  const balanceDescription = account.archivedAt
    ? "Position when this account was archived."
    : availableBalance
      ? `Based on the latest available balance from your bank and movement recorded after it.${current.balanceIncludesPending ? " The bank balance includes pending movements." : ""}`
      : liveBalance
        ? `Based on the latest synced bank balance and movement recorded after it.${current.balanceIncludesPending ? " The bank balance includes pending movements." : ""}`
        : "Latest trusted balance plus all movement recorded after it.";
  const freshnessDescription = liveBalance
    ? reconciliationAge === null
      ? "Waiting for a bank balance"
      : reconciliationAge > 30
        ? "Bank update is over 30 days old"
        : reconciliationAge === 0
          ? "Synced today"
          : "Synced " + reconciliationAge + " days ago"
    : reconciliationAge === null
      ? "Needs a first balance check"
      : reconciliationAge > 30
        ? "Ready for an update"
        : reconciliationAge === 0
          ? "Checked today"
          : "Checked " + reconciliationAge + " days ago";

  const reconciliationForm = (
    <FinanceForm
      action={reconcileAccountAction}
      submitLabel="Record observed balance"
      resetOnSuccess
      closeOnSuccess
    >
      <input type="hidden" name="accountId" value={id} />
      <FinanceField
        label={
          account.type === "CREDIT_CARD"
            ? `Current outstanding balance (${account.currency})`
            : `What does this account contain? (${account.currency})`
        }
        aria-label={"Reconciled balance (" + account.currency + ")"}
        name="balance"
        inputMode="decimal"
        required
      />
      <FinanceField
        label="Observed at (Amsterdam)"
        name="reconciledAt"
        type="datetime-local"
        defaultValue={localInput(new Date())}
        required
      />
      <FinanceField
        label="Note (optional)"
        name="notes"
        placeholder="Anything useful about this check"
      />
      <p className="finance-form-note">
        {account.type === "CREDIT_CARD"
          ? "Enter the positive amount currently owed. Become records it as a liability."
          : "This tells Become what the account actually contained at this moment. Transactions after it determine the recorded position above."}
      </p>
    </FinanceForm>
  );

  return (
    <>
      <Link className="finance-back-link" href="/finance/accounts">
        <ArrowLeft aria-hidden="true" />
        All accounts
      </Link>
      <FinancePageHeader
        eyebrow={account.archivedAt ? "Archived account" : "Account"}
        title={account.name}
        description={
          account.currency +
          " · " +
          account.type.toLowerCase().replaceAll("_", " ")
        }
        actions={
          !account.archivedAt ? (
            <FinanceDialog
              triggerLabel="Update actual balance"
              title={"Update " + account.name}
              description="Tell Become what this account actually contains now."
            >
              {reconciliationForm}
            </FinanceDialog>
          ) : undefined
        }
      />

      <Card
        material="elevated-glass"
        className="finance-detail-focus finance-detail-focus--account"
      >
        <div>
          <AccountArtwork
            name={account.name}
            type={account.type}
            institutionName={
              banking?.externalAccounts[0]?.connection.institutionName ??
              account.bankName
            }
            maskedIdentifier={
              banking?.externalAccounts[0]?.maskedIdentifier ?? null
            }
          />
          <p className="eyebrow">{balanceTitle}</p>
          <strong className="finance-number">
            {current?.balanceMinor === null ||
            current?.balanceMinor === undefined
              ? "Unavailable"
              : formatMoney(
                  account.type === "CREDIT_CARD" && current.balanceMinor < 0n
                    ? -current.balanceMinor
                    : current.balanceMinor,
                  account.currency,
                )}
          </strong>
          <p>{balanceDescription}</p>
        </div>
        <dl>
          <div>
            <dt>
              <Clock3 aria-hidden="true" />
              {liveBalance ? "Bank updated" : "Last checked"}
            </dt>
            <dd>
              {current?.reconciledAt
                ? localDisplay(current.reconciledAt)
                : "Never"}
            </dd>
          </div>
          <div>
            <dt>
              {reconciliationAge !== null && reconciliationAge > 30 ? (
                <AlertTriangle aria-hidden="true" />
              ) : (
                <CheckCircle2 aria-hidden="true" />
              )}
              {liveBalance ? "Sync freshness" : "Confidence"}
            </dt>
            <dd>{freshnessDescription}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>
              {account.includeInLiquidSavings
                ? "Contributes to liquid savings"
                : "Everyday financial position"}
            </dd>
          </div>
          <div>
            <dt>Ingestion source</dt>
            <dd>{account.dataSource.replaceAll("_", " ").toLowerCase()}</dd>
          </div>
        </dl>
      </Card>

      {account.type === "CREDIT_CARD" && (
        <FinanceSection
          title="Card position"
          description="Debt, available credit, pending activity and statement obligations are kept separate. A credit limit is never counted as an asset."
          action={
            !account.archivedAt ? (
              <FinanceDialog
                triggerLabel="Card settings"
                title="Repayment and statement settings"
                description="Update how this card is settled and record only values supplied by a statement, provider or you."
                variant="secondary"
              >
                <CreditCardConfigurationForm
                  account={{
                    id: account.id,
                    bankName:
                      banking?.externalAccounts[0]?.connection
                        .institutionName ??
                      account.bankName ??
                      "",
                    currency: account.currency,
                    repaymentMethod: account.repaymentMethod,
                    settlementAccountId: account.settlementAccountId,
                    creditLimit:
                      account.creditLimitMinor === null
                        ? ""
                        : moneyDecimal(
                            account.creditLimitMinor,
                            account.currency,
                          ),
                    statementBalance:
                      account.statementBalanceMinor === null
                        ? ""
                        : moneyDecimal(
                            account.statementBalanceMinor,
                            account.currency,
                          ),
                    statementDue:
                      account.statementDueMinor === null
                        ? ""
                        : moneyDecimal(
                            account.statementDueMinor,
                            account.currency,
                          ),
                    statementDueOn: account.statementDueOn ?? "",
                    settlementDay: account.settlementDay,
                  }}
                  settlementAccounts={settlementAccounts}
                />
              </FinanceDialog>
            ) : undefined
          }
        >
          <dl className="finance-card-position">
            <div>
              <dt>Current debt</dt>
              <dd className="finance-number">
                {debtMinor === null
                  ? "Unavailable"
                  : formatMoney(debtMinor, account.currency)}
              </dd>
              <small>
                {current?.balanceIncludesPending
                  ? "Observed balance includes pending movements"
                  : "Booked position"}
              </small>
            </div>
            <div>
              <dt>Available credit</dt>
              <dd className="finance-number">
                {account.creditLimitMinor === null || debtMinor === null
                  ? "Unavailable"
                  : formatMoney(
                      account.creditLimitMinor > debtMinor
                        ? account.creditLimitMinor - debtMinor
                        : 0n,
                      account.currency,
                    )}
              </dd>
              <small>
                {account.creditLimitMinor === null
                  ? "No credit limit supplied"
                  : `Limit ${formatMoney(account.creditLimitMinor, account.currency)}`}
              </small>
            </div>
            <div>
              <dt>Pending card activity</dt>
              <dd>{banking?.pending.length ?? 0}</dd>
              <small>Shown separately from booked spending</small>
            </div>
            <div>
              <dt>Statement due</dt>
              <dd className="finance-number">
                {account.statementDueMinor === null
                  ? "Unavailable"
                  : formatMoney(account.statementDueMinor, account.currency)}
              </dd>
              <small>
                {account.statementDueOn
                  ? `Due ${DateTime.fromISO(account.statementDueOn, { zone: APP_TIMEZONE }).toFormat("d LLL yyyy")}`
                  : "No due date supplied"}
              </small>
            </div>
          </dl>
        </FinanceSection>
      )}

      <FinanceSection
        title="Banking evidence"
        description="Source health, coverage and pending observations qualify this account without changing its Become name or classification."
        action={
          <ShieldCheck aria-hidden="true" className="finance-heading-icon" />
        }
      >
        <div className="finance-account-banking-grid">
          <article className="finance-surface">
            <p className="eyebrow">Active source</p>
            <h3>{account.dataSource.replaceAll("_", " ").toLowerCase()}</h3>
            <p>
              {account.dataSource === "MANUAL"
                ? "Balances and transactions come from your own entries."
                : account.dataSource === "STATEMENT_IMPORT"
                  ? "Confirmed statement evidence feeds this account."
                  : "A consent-based connection supplies evidence through the background scheduler."}
            </p>
            <dl>
              <div>
                <dt>Coverage through</dt>
                <dd>
                  {banking?.coverage
                    ? DateTime.fromISO(banking.coverage, {
                        zone: APP_TIMEZONE,
                      }).toFormat("d LLL yyyy")
                    : "Unavailable"}
                </dd>
              </div>
              <div>
                <dt>Pending activity</dt>
                <dd>{banking?.pending.length ?? 0}</dd>
              </div>
              <div>
                <dt>Needs evidence review</dt>
                <dd>{banking?.unresolved.length ?? 0}</dd>
              </div>
            </dl>
            <Link
              className="finance-panel-link"
              href={`/finance/statements?account=${account.id}`}
            >
              <FileUp aria-hidden="true" /> Import a statement
            </Link>
          </article>

          {banking?.externalAccounts.map((external) => (
            <article className="finance-surface" key={external.id}>
              <header>
                <div>
                  <p className="eyebrow">Live connection</p>
                  <h3>{external.connection.institutionName}</h3>
                </div>
                <span
                  className={
                    "finance-status-pill " +
                    (external.connection.status === "CONNECTED"
                      ? "finance-status-pill--positive"
                      : "finance-status-pill--warning")
                  }
                >
                  <RefreshCw aria-hidden="true" />
                  {external.connection.status.replaceAll("_", " ")}
                </span>
              </header>
              <p>
                {external.maskedIdentifier || "Masked identifier unavailable"}
                {external.externalType
                  ? ` · ${external.externalType.replaceAll("_", " ").toLowerCase()}`
                  : ""}
              </p>
              <dl>
                <div>
                  <dt>Last synchronized</dt>
                  <dd>
                    {external.connection.lastSuccessAt
                      ? localDisplay(external.connection.lastSuccessAt)
                      : "Not yet"}
                  </dd>
                </div>
                <div>
                  <dt>Consent expires</dt>
                  <dd>
                    {external.connection.consentExpiresAt
                      ? localDisplay(external.connection.consentExpiresAt)
                      : "Unavailable"}
                  </dd>
                </div>
              </dl>
              <BankConnectionControls connection={external.connection} />
            </article>
          ))}
        </div>

        {!!banking?.unresolved.length && (
          <div className="finance-evidence-review" id="evidence-review">
            <header>
              <div>
                <p className="eyebrow">Needs interpretation</p>
                <h3>Imported activity awaiting your decision</h3>
              </div>
              <span className="finance-status-pill finance-status-pill--warning">
                <AlertTriangle aria-hidden="true" />
                {banking.unresolved.length} open
              </span>
            </header>
            {banking.unresolved.map((link) => {
              const incomingCardMovement =
                account.type === "CREDIT_CARD" &&
                link.observation.direction === "CREDIT" &&
                link.status === "STAGED";
              return (
                <article key={link.observationId}>
                  <div>
                    <strong>
                      {link.observation.counterpartyName ||
                        "Unknown counterparty"}
                    </strong>
                    <small>
                      {DateTime.fromISO(link.observation.activityOn, {
                        zone: APP_TIMEZONE,
                      }).toFormat("d LLL yyyy")}{" "}
                      · {link.needsAttention}
                    </small>
                  </div>
                  {incomingCardMovement ? (
                    <div className="finance-evidence-actions">
                      {!!settlementAccounts.length && (
                        <FinanceForm
                          action={confirmEvidenceTransferAction}
                          submitLabel="Confirm repayment"
                          submitVariant="secondary"
                          formClassName="finance-evidence-transfer-form"
                          showSuccess
                        >
                          <input
                            type="hidden"
                            name="observationId"
                            value={link.observationId}
                          />
                          <FinanceSelect
                            name="otherAccountId"
                            label="Paid from"
                            defaultValue={
                              account.settlementAccountId ??
                              settlementAccounts[0].id
                            }
                            required
                          >
                            {settlementAccounts.map((candidate) => (
                              <option key={candidate.id} value={candidate.id}>
                                {candidate.name}
                              </option>
                            ))}
                          </FinanceSelect>
                        </FinanceForm>
                      )}
                      <FinanceForm
                        action={classifyIncomingEvidenceAction}
                        submitLabel="Classify as refund"
                        submitVariant="ghost"
                        formClassName=""
                        showSuccess
                      >
                        <input
                          type="hidden"
                          name="observationId"
                          value={link.observationId}
                        />
                        <input type="hidden" name="inflowKind" value="REFUND" />
                      </FinanceForm>
                      <FinanceForm
                        action={classifyIncomingEvidenceAction}
                        submitLabel="Other incoming"
                        submitVariant="ghost"
                        formClassName=""
                        showSuccess
                      >
                        <input
                          type="hidden"
                          name="observationId"
                          value={link.observationId}
                        />
                        <input type="hidden" name="inflowKind" value="OTHER" />
                      </FinanceForm>
                    </div>
                  ) : (
                    <div className="finance-evidence-actions">
                      <FinanceForm
                        action={resolveEvidenceAction}
                        submitLabel="Keep as distinct"
                        submitVariant="secondary"
                        formClassName=""
                        showSuccess
                      >
                        <input
                          type="hidden"
                          name="observationId"
                          value={link.observationId}
                        />
                        <input type="hidden" name="decision" value="distinct" />
                      </FinanceForm>
                      <FinanceForm
                        action={resolveEvidenceAction}
                        submitLabel="Ignore evidence"
                        submitVariant="ghost"
                        formClassName=""
                        showSuccess
                      >
                        <input
                          type="hidden"
                          name="observationId"
                          value={link.observationId}
                        />
                        <input type="hidden" name="decision" value="ignore" />
                      </FinanceForm>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </FinanceSection>

      <FinanceSection
        title="Recent movement"
        description="The latest entries that changed, or moved through, this account."
        action={
          <Link
            className="finance-settings-link"
            href={"/finance/transactions?account=" + id}
          >
            View full ledger
          </Link>
        }
      >
        {!ledger.rows.length ? (
          <FinanceEmptyState
            icon={<History aria-hidden="true" />}
            title="Nothing has moved here yet"
            description="The account starts from its observed balance. New transactions will build the history."
          />
        ) : (
          <div className="finance-mini-ledger">
            {ledger.rows.slice(0, 6).map((row) => {
              const Icon =
                row.type === "INCOME"
                  ? ArrowDownLeft
                  : row.type === "EXPENSE"
                    ? ArrowUpRight
                    : ArrowRightLeft;
              return (
                <Link href={"/finance/transactions/" + row.id} key={row.id}>
                  <span>
                    <Icon aria-hidden="true" />
                  </span>
                  <span>
                    <strong>
                      {row.counterparty?.name ||
                        row.expenseCategory?.name ||
                        row.type.toLowerCase()}
                    </strong>
                    <small>{localDisplay(row.occurredAt)}</small>
                  </span>
                  <strong className="finance-number">
                    {row.type === "EXPENSE"
                      ? "− "
                      : row.type === "INCOME"
                        ? "+ "
                        : ""}
                    {formatMoney(row.amountMinor, row.currency)}
                  </strong>
                </Link>
              );
            })}
          </div>
        )}
      </FinanceSection>

      <FinanceSection
        title="Balance check history"
        description="Previous moments when you told Become what this account actually contained."
      >
        {!snapshots.length ? (
          <p className="finance-quiet-copy">
            No balance checks yet. The position remains unavailable until the
            first one is recorded.
          </p>
        ) : (
          <div className="finance-snapshot-list">
            {snapshots.slice(0, 20).map((snapshot, index) => (
              <article key={snapshot.id}>
                <span className="finance-snapshot-marker" aria-hidden="true" />
                <div>
                  <p>
                    {index === 0 && !cursor
                      ? "Latest balance check"
                      : "Balance check"}
                  </p>
                  <strong className="finance-number">
                    {formatMoney(snapshot.balanceMinor, account.currency)}
                  </strong>
                  <time dateTime={snapshot.reconciledAt.toISOString()}>
                    {localDisplay(snapshot.reconciledAt)}
                  </time>
                  {snapshot.notes && <span>{snapshot.notes}</span>}
                </div>
                <WorkspaceDisclosure
                  title={<>Correction options</>}
                  className="finance-disclosure"
                >
                  <div className="finance-details-body">
                    <div className="finance-callout">
                      <AlertTriangle aria-hidden="true" />
                      Correcting or deleting this balance check can change every
                      later recorded position.
                    </div>
                    <div className="finance-correction-form">
                      <FinanceForm
                        action={reconcileAccountAction}
                        submitLabel="Confirm correction"
                        submitVariant="secondary"
                      >
                        <input type="hidden" name="accountId" value={id} />
                        <input
                          type="hidden"
                          name="snapshotId"
                          value={snapshot.id}
                        />
                        <FinanceField
                          label="Correct balance"
                          name="balance"
                          defaultValue={moneyDecimal(
                            snapshot.balanceMinor,
                            account.currency,
                          )}
                          required
                        />
                        <FinanceField
                          label="Correct observed at"
                          name="reconciledAt"
                          type="datetime-local"
                          defaultValue={localInput(snapshot.reconciledAt)}
                          required
                        />
                        <FinanceField
                          label="Correction note"
                          name="notes"
                          defaultValue={snapshot.notes ?? ""}
                        />
                      </FinanceForm>
                      <FinanceForm
                        action={deleteSnapshotAction}
                        submitLabel="Confirm deletion of reconciliation"
                        submitVariant="danger"
                      >
                        <input
                          type="hidden"
                          name="snapshotId"
                          value={snapshot.id}
                        />
                      </FinanceForm>
                    </div>
                  </div>
                </WorkspaceDisclosure>
              </article>
            ))}
          </div>
        )}
        {snapshots.length > 20 && (
          <Link
            className="finance-load-more"
            href={"/finance/accounts/" + id + "?cursor=" + snapshots[19].id}
          >
            Older balance checks
          </Link>
        )}
      </FinanceSection>

      <FinanceSection
        title="Account settings"
        description="Low-frequency controls for how this account participates in Finance."
        action={
          <Settings2 aria-hidden="true" className="finance-heading-icon" />
        }
      >
        <WorkspaceDisclosure
          title={<>Edit account role and lifecycle</>}
          className="finance-disclosure"
        >
          <div className="finance-details-body finance-settings-panel">
            <FinanceForm
              action={updateAccountAction}
              submitLabel="Save account"
              submitVariant="secondary"
            >
              <input type="hidden" name="id" value={id} />
              <FinanceField
                label="Account name"
                name="name"
                required
                defaultValue={account.name}
              />
              <FinanceField
                label={
                  account.type === "CREDIT_CARD"
                    ? "Bank / card issuer"
                    : "Bank / institution"
                }
                name="bankName"
                defaultValue={
                  banking?.externalAccounts[0]?.connection.institutionName ??
                  account.bankName ??
                  ""
                }
                placeholder="Add bank name"
                required={account.type === "CREDIT_CARD"}
                maxLength={120}
              />
              <label className="finance-checkbox-row">
                <input
                  type="checkbox"
                  name="includeInLiquidSavings"
                  aria-label="Include in liquid savings"
                  defaultChecked={account.includeInLiquidSavings}
                />
                <span>
                  <strong>Count this as liquid savings</strong>
                  <small>
                    Use it for reserve coverage and savings-goal capacity.
                  </small>
                </span>
              </label>
            </FinanceForm>
            <div className="finance-danger-zone">
              <p>
                {account.archivedAt
                  ? "Restore this account to include it in current Finance views."
                  : "Archive this account when you no longer use it. Its history stays intact."}
              </p>
              <FinanceForm
                action={archiveAccountAction}
                submitLabel={
                  account.archivedAt ? "Restore account" : "Archive account"
                }
                submitVariant={account.archivedAt ? "secondary" : "danger"}
              >
                <input type="hidden" name="id" value={id} />
                {account.archivedAt && (
                  <input type="hidden" name="restore" value="yes" />
                )}
              </FinanceForm>
            </div>
          </div>
        </WorkspaceDisclosure>
      </FinanceSection>
    </>
  );
}
