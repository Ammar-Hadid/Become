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
  FinanceSection,
} from "@/features/finance/components/finance-field.component";
import {
  archiveAccountAction,
  deleteSnapshotAction,
  reconcileAccountAction,
  updateAccountAction,
} from "@/features/finance/accounts/actions/financial-account.action";
import { getFinancialPosition } from "@/features/finance/accounts/queries/financial-position.query";
import { getFinancialLedger } from "@/features/finance/transactions/queries/financial-ledger.query";

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
  const [position, ledger] = await Promise.all([
    getFinancialPosition(userId, at),
    getFinancialLedger(userId, { account: id }),
  ]);
  const current = position.find((item) => item.id === id);
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

  const reconciliationForm = (
    <FinanceForm
      action={reconcileAccountAction}
      submitLabel="Record observed balance"
      resetOnSuccess
      closeOnSuccess
    >
      <input type="hidden" name="accountId" value={id} />
      <FinanceField
        label={"What does this account contain? (" + account.currency + ")"}
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
        This tells Become what the account actually contained at this moment.
        Transactions after it determine the recorded position above.
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

      <section className="finance-account-hero">
        <div>
          <p className="eyebrow">Current recorded position</p>
          <strong className="finance-number">
            {current?.balanceMinor === null ||
            current?.balanceMinor === undefined
              ? "Unavailable"
              : formatMoney(current.balanceMinor, account.currency)}
          </strong>
          <p>
            {account.archivedAt
              ? "Position when this account was archived."
              : "Latest trusted balance plus all movement recorded after it."}
          </p>
        </div>
        <dl>
          <div>
            <dt>
              <Clock3 aria-hidden="true" />
              Last checked
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
              Confidence
            </dt>
            <dd>
              {reconciliationAge === null
                ? "Needs a first balance check"
                : reconciliationAge > 30
                  ? "Ready for an update"
                  : reconciliationAge === 0
                    ? "Checked today"
                    : "Checked " + reconciliationAge + " days ago"}
            </dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>
              {account.includeInLiquidSavings
                ? "Contributes to liquid savings"
                : "Everyday financial position"}
            </dd>
          </div>
        </dl>
      </section>

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
                <details className="finance-details">
                  <summary>Correction options</summary>
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
                </details>
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
        <details className="finance-details">
          <summary>Edit account role and lifecycle</summary>
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
        </details>
      </FinanceSection>
    </>
  );
}
