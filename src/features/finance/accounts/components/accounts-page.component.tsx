import Link from "next/link";
import { DateTime } from "luxon";
import { ArrowRight, Landmark } from "lucide-react";
import { FinanceDialog } from "@/features/finance/components/finance-dialog.component";
import {
  FinanceEmptyState,
  FinancePageHeader,
  FinanceSection,
} from "@/features/finance/components/finance-field.component";
import { getFinancialPosition } from "@/features/finance/accounts/queries/financial-position.query";
import { FinancialAccountForm } from "@/features/finance/accounts/components/financial-account-form.component";
import { FINANCIAL_ACCOUNT_TYPES } from "@/features/finance/accounts/constants/financial-account.constants";
import { formatMoney } from "@/lib/money/utils/money.util";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { AccountArtwork } from "@/features/finance/accounts/components/account-artwork.component";

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
    <FinancialAccountForm
      settlementAccounts={accounts}
      defaultReconciledAt={DateTime.now()
        .setZone(APP_TIMEZONE)
        .toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS")}
    />
  );

  return (
    <>
      <FinancePageHeader
        eyebrow="Position"
        title="Accounts"
        description="Your balances, bank connections and latest updates."
        actions={
          <>
            <Link className="finance-link-action" href="/finance/connections">
              Bank connections
            </Link>
            <FinanceDialog
              triggerLabel="Add account"
              title="Bring an account into view"
              description="Name the account and tell Become what it actually contains right now."
            >
              {accountForm}
            </FinanceDialog>
          </>
        }
      />

      <FinanceSection
        title="Current accounts"
        description="Positions use the freshest qualified manual, statement or live balance evidence available for each account."
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
                  <AccountArtwork
                    name={account.name}
                    type={account.type}
                    institutionName={account.institutionName}
                    compact
                  />
                  <span className="finance-account-identity">
                    <strong>{account.name}</strong>
                    <span>
                      {
                        FINANCIAL_ACCOUNT_TYPES.find(
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
                        : formatMoney(
                            account.type === "CREDIT_CARD" &&
                              account.balanceMinor < 0n
                              ? -account.balanceMinor
                              : account.balanceMinor,
                            account.currency,
                          )}
                    </strong>
                    <span
                      className={
                        "finance-account-freshness " +
                        (freshness !== null && freshness > 30 ? "is-stale" : "")
                      }
                    >
                      {account.type === "CREDIT_CARD" &&
                      account.balanceMinor !== null
                        ? "Amount owed"
                        : account.reconciledAt
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
