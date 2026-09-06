import Link from "next/link";
import { DateTime } from "luxon";
import {
  ArrowRight,
  Banknote,
  Landmark,
  PiggyBank,
  Smartphone,
  WalletCards,
} from "lucide-react";
import { FinanceForm } from "@/features/finance/components/finance-form.component";
import { FinanceDialog } from "@/features/finance/components/finance-dialog.component";
import {
  FinanceEmptyState,
  FinanceField,
  FinancePageHeader,
  FinanceSelect,
  FinanceSection,
} from "@/features/finance/components/finance-field.component";
import { createAccountAction } from "@/features/finance/accounts/actions/financial-account.action";
import { getFinancialPosition } from "@/features/finance/accounts/queries/financial-position.query";
import { formatMoney } from "@/lib/money/utils/money.util";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { prisma } from "@/lib/db/adapters/prisma.adapter";

const accountTypes = [
  ["CHECKING", "Current / checking"],
  ["SAVINGS", "Savings"],
  ["CASH", "Cash"],
  ["DIGITAL_WALLET", "Digital wallet"],
  ["OTHER", "Other"],
] as const;

const accountIcon = {
  CHECKING: Landmark,
  SAVINGS: PiggyBank,
  CASH: Banknote,
  DIGITAL_WALLET: Smartphone,
  OTHER: WalletCards,
} as const;

export async function AccountsPage({ userId }: { userId: string }) {
  const [accounts, archived] = await Promise.all([
    getFinancialPosition(userId),
    prisma.financialAccount.findMany({
      where: { userId, archivedAt: { not: null } },
      orderBy: { name: "asc" },
    }),
  ]);
  const now = DateTime.now().toMillis();
  const accountForm = (
    <FinanceForm
      action={createAccountAction}
      submitLabel="Create account & reconcile"
      resetOnSuccess
      closeOnSuccess
    >
      <FinanceField
        name="name"
        label="Account name"
        placeholder="e.g. ING Everyday"
        required
        maxLength={120}
      />
      <div className="finance-form-grid">
        <FinanceSelect name="type" label="Account type" defaultValue="CHECKING">
          {accountTypes.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </FinanceSelect>
        <FinanceField
          name="currency"
          label="Currency"
          defaultValue="EUR"
          required
          maxLength={3}
        />
      </div>
      <label className="finance-checkbox-row">
        <input
          type="checkbox"
          name="includeInLiquidSavings"
          aria-label="Include in liquid savings"
        />
        <span>
          <strong>Count this as liquid savings</strong>
          <small>
            Use this balance when calculating reserve and goal capacity.
          </small>
        </span>
      </label>
      <div className="finance-form-grid">
        <FinanceField
          name="balance"
          label="What does it contain now?"
          aria-label="Current balance"
          inputMode="decimal"
          required
        />
        <FinanceField
          name="reconciledAt"
          label="Observed at (Amsterdam)"
          type="datetime-local"
          required
          defaultValue={DateTime.now()
            .setZone(APP_TIMEZONE)
            .toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS")}
        />
      </div>
      <p className="finance-form-note">
        This observed balance becomes the trusted starting point. Future
        transactions move the recorded position from there.
      </p>
    </FinanceForm>
  );

  return (
    <>
      <FinancePageHeader
        eyebrow="Position"
        title="Accounts"
        description="Where your money lives, and the latest position Become can establish from what you recorded."
        actions={
          <FinanceDialog
            triggerLabel="Add account"
            title="Bring an account into view"
            description="Name the account and tell Become what it actually contains right now."
          >
            {accountForm}
          </FinanceDialog>
        }
      />

      <FinanceSection
        title="Current accounts"
        description="Recorded positions, not live bank feeds. Fresh reconciliations keep this picture trustworthy."
      >
        {!accounts.length ? (
          <FinanceEmptyState
            icon={<Landmark aria-hidden="true" />}
            title="No accounts in view yet"
            description="Add the places you hold money, then Finance can turn movement into a reliable position."
            action={
              <FinanceDialog
                triggerLabel="Add your first account"
                title="Bring an account into view"
                description="Start with the account you use most."
                variant="secondary"
              >
                {accountForm}
              </FinanceDialog>
            }
          />
        ) : (
          <div className="finance-account-list">
            {accounts.map((account) => {
              const Icon = accountIcon[account.type];
              const freshness = account.reconciledAt
                ? Math.floor((now - account.reconciledAt.getTime()) / 86400000)
                : null;
              return (
                <Link
                  href={"/finance/accounts/" + account.id}
                  className="finance-account-row"
                  key={account.id}
                  aria-label={
                    account.name +
                    " " +
                    (account.includeInLiquidSavings
                      ? "Included in liquid savings"
                      : "Everyday position")
                  }
                >
                  <span className="finance-account-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <span className="finance-account-identity">
                    <strong>{account.name}</strong>
                    <span>
                      {
                        accountTypes.find(
                          ([value]) => value === account.type,
                        )?.[1]
                      }
                      {" · "}
                      {account.includeInLiquidSavings
                        ? "Included in liquid savings"
                        : "Everyday position"}
                    </span>
                  </span>
                  <span className="finance-account-balance">
                    <strong className="finance-number">
                      {account.balanceMinor === null
                        ? "Unavailable"
                        : formatMoney(account.balanceMinor, account.currency)}
                    </strong>
                    <span
                      className={
                        "finance-account-freshness " +
                        (freshness !== null && freshness > 30 ? "is-stale" : "")
                      }
                    >
                      {account.reconciledAt
                        ? freshness === 0
                          ? "Updated today"
                          : "Checked " + freshness + "d ago"
                        : "Needs a first check"}
                    </span>
                  </span>
                  <ArrowRight aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        )}
        {archived.length > 0 && (
          <details className="finance-details finance-archived">
            <summary>Archived accounts ({archived.length})</summary>
            <div className="finance-details-body">
              {archived.map((account) => (
                <Link
                  className="finance-archived-row"
                  href={"/finance/accounts/" + account.id}
                  key={account.id}
                >
                  <span>{account.name}</span>
                  <span>{account.currency}</span>
                </Link>
              ))}
            </div>
          </details>
        )}
      </FinanceSection>
    </>
  );
}
