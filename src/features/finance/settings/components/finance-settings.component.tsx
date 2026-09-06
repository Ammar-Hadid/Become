import Link from "next/link";
import { ArrowRight, ShieldCheck, Tags, UsersRound } from "lucide-react";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { moneyDecimal } from "@/lib/money/utils/money.util";
import { FinanceForm } from "@/features/finance/components/finance-form.component";
import { FinanceDialog } from "@/features/finance/components/finance-dialog.component";
import { FinanceField } from "@/features/finance/components/finance-field.component";
import { saveReserveAction } from "@/features/finance/settings/actions/finance-policy.action";

export async function FinanceSettings({ userId }: { userId: string }) {
  const policies = await prisma.financeCurrencyPolicy.findMany({
    where: { userId },
    orderBy: { currency: "asc" },
  });
  const reserveForm = (
    <FinanceForm
      action={saveReserveAction}
      submitLabel="Save reserve"
      closeOnSuccess
    >
      <div className="finance-form-grid">
        <FinanceField
          label="Currency"
          name="currency"
          defaultValue="EUR"
          required
          maxLength={3}
        />
        <FinanceField
          label="Protected reserve"
          name="reserve"
          inputMode="decimal"
        />
      </div>
      <p className="finance-form-note">
        Leave the amount blank to keep the reserve unconfigured. Enter zero only
        when you deliberately want no protected reserve.
      </p>
    </FinanceForm>
  );

  return (
    <div className="finance-settings">
      <header className="finance-settings-heading">
        <p className="eyebrow">Finance preferences</p>
        <h2>Shape the rules around your money.</h2>
        <p>
          Set the decisions that guide your finances without interrupting the
          everyday flow of transactions and accounts.
        </p>
      </header>

      <section className="finance-settings-section">
        <div className="finance-settings-intro">
          <span>
            <ShieldCheck aria-hidden="true" />
          </span>
          <div>
            <h3>Savings safety</h3>
            <p>
              A protected reserve is the part of liquid savings your plan tries
              to keep untouched. It guides allocations; it never blocks real
              spending.
            </p>
          </div>
        </div>

        {policies.length ? (
          <div className="finance-policy-list">
            {policies.map((policy) => (
              <article key={policy.id}>
                <header>
                  <span className="finance-policy-currency">
                    {policy.currency}
                  </span>
                  <div>
                    <h4>{policy.currency} protected reserve</h4>
                    <p>
                      {policy.protectedReserveMinor === null
                        ? "Not configured"
                        : "Used before calculating savings available for goals"}
                    </p>
                  </div>
                </header>
                <FinanceForm
                  action={saveReserveAction}
                  submitLabel="Update reserve"
                >
                  <input
                    type="hidden"
                    name="currency"
                    value={policy.currency}
                  />
                  <FinanceField
                    label={"Protected reserve (" + policy.currency + ")"}
                    name="reserve"
                    inputMode="decimal"
                    defaultValue={
                      policy.protectedReserveMinor === null
                        ? ""
                        : moneyDecimal(
                            policy.protectedReserveMinor,
                            policy.currency,
                          )
                    }
                  />
                </FinanceForm>
              </article>
            ))}
            <FinanceDialog
              triggerLabel="Add currency reserve"
              title="Set a protected reserve"
              description="Choose the safety threshold for another currency."
              variant="quiet"
              className="finance-add-reserve-action"
            >
              {reserveForm}
            </FinanceDialog>
          </div>
        ) : (
          <div className="finance-settings-empty">
            <ShieldCheck aria-hidden="true" />
            <div>
              <strong>No protected reserve yet</strong>
              <p>
                Configure one when you want your savings plan to protect a
                minimum safety buffer.
              </p>
            </div>
            <FinanceDialog
              triggerLabel="Configure currency reserve"
              title="Set a protected reserve"
              icon={false}
            >
              {reserveForm}
            </FinanceDialog>
          </div>
        )}
      </section>

      <section className="finance-settings-section" id="categories">
        <div className="finance-settings-intro">
          <span>
            <Tags aria-hidden="true" />
          </span>
          <div>
            <h3>Expense categories</h3>
            <p>Control how expenses are classified.</p>
          </div>
        </div>
        <div className="finance-settings-group-content">
          <Link
            href="/settings/finance/categories"
            className="finance-settings-navigation-action"
          >
            Manage categories
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="finance-settings-section" id="counterparties">
        <div className="finance-settings-intro">
          <span>
            <UsersRound aria-hidden="true" />
          </span>
          <div>
            <h3>Counterparties</h3>
            <p>
              Manage the people and organizations associated with your
              transactions.
            </p>
          </div>
        </div>
        <div className="finance-settings-group-content">
          <Link
            href="/settings/finance/counterparties"
            className="finance-settings-navigation-action"
          >
            Manage counterparties
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
