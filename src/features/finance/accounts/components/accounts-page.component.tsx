import { WorkspaceDisclosure } from "@/components/ui/workspace/workspace-disclosure.component";
import { Card } from "@/components/ui/cards/card.component";
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
        description="Balances update from your latest manual check, statement or bank sync."
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
          <div className="finance-account-cards">
            {accounts.map((account) => {
              const freshness = account.reconciledAt
                ? Math.floor((now - account.reconciledAt.getTime()) / 86400000)
                : null;
              const liveBalance = account.balanceSource === "LIVE_SYNC";
              const availableBalance =
                liveBalance &&
                account.type !== "CREDIT_CARD" &&
                (account.balanceType === "ITAV" ||
                  account.balanceType === "CLAV");
              const bankFreshness =
                freshness === null
                  ? "Bank balance unavailable"
                  : freshness === 0
                    ? "Bank updated today"
                    : "Bank updated " + freshness + "d ago";
              const balanceQualification =
                account.type === "CREDIT_CARD" && account.balanceMinor !== null
                  ? liveBalance
                    ? `Amount owed${account.balanceIncludesPending ? " · includes pending" : ""} · ${bankFreshness}`
                    : "Amount owed"
                  : liveBalance
                    ? availableBalance
                      ? `Available${account.balanceIncludesPending ? " · includes pending" : ""} · ${bankFreshness}`
                      : `Synced balance${account.balanceIncludesPending ? " · includes pending" : ""} · ${bankFreshness}`
                    : account.reconciledAt
                      ? freshness === 0
                        ? "Updated today"
                        : "Checked " + freshness + "d ago"
                      : "Needs a first check";
              return (
                <Link
                  href={"/finance/accounts/" + account.id}
                  className="finance-account-link"
                  key={account.id}
                  aria-label={
                    account.name +
                    " " +
                    (account.includeInLiquidSavings
                      ? "Included in liquid savings"
                      : "Everyday position")
                  }
                >
                  <Card className="finance-account-tile" spacing="dense">
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
                          (freshness !== null && freshness > 30
                            ? "is-stale"
                            : "")
                        }
                      >
                        {balanceQualification}
                      </span>
                    </span>
                    <ArrowRight aria-hidden="true" />
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
        {archived.length > 0 && (
          <WorkspaceDisclosure
            title={<>Archived accounts ({archived.length})</>}
            className="finance-disclosure"
          >
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
          </WorkspaceDisclosure>
        )}
      </FinanceSection>
    </>
  );
}
