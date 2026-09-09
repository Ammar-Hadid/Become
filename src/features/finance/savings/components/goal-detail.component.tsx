import { notFound } from "next/navigation";
import Link from "next/link";
import { DateTime } from "luxon";
import { AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getSavings } from "@/features/finance/savings/queries/savings.query";
import { formatMoney, moneyDecimal } from "@/lib/money/utils/money.util";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { FinanceForm } from "@/features/finance/components/finance-form.component";
import { FinanceDialog } from "@/features/finance/components/finance-dialog.component";
import {
  FinanceField,
  FinancePageHeader,
  FinanceSection,
  FinanceSelect,
} from "@/features/finance/components/finance-field.component";
import {
  archiveGoalAction,
  purchaseGoalAction,
  rebalanceAction,
  saveGoalAction,
} from "@/features/finance/savings/actions/savings-goal.action";
import { TransactionForm } from "@/features/finance/transactions/components/transaction-form.component";
import { getCounterpartyOptions } from "@/features/finance/counterparties/queries/counterparty.query";
import { getFinancialTransactionAccountOptions } from "@/features/finance/transactions/queries/financial-transaction-account-options.query";

const percent = (part: bigint, whole: bigint) =>
  whole > 0n ? Math.min(100, Number((part * 1000n) / whole) / 10) : 0;

export async function GoalDetail({
  userId,
  id,
}: {
  userId: string;
  id: string;
}) {
  const { goals } = await getSavings(userId);
  const goal = goals.find((item) => item.id === id);
  if (!goal) notFound();
  const [accounts, categories, counterparties] = await Promise.all([
    getFinancialTransactionAccountOptions(userId, goal.currency),
    prisma.expenseCategory.findMany({ where: { userId, archivedAt: null } }),
    getCounterpartyOptions(userId),
  ]);
  const spentPercent = percent(goal.funding.spent, goal.funding.target);
  const fundedPercent = percent(goal.funding.funded, goal.funding.remaining);

  const purchaseForm = accounts.length ? (
    <TransactionForm
      action={purchaseGoalAction}
      closeOnSuccess
      accounts={accounts}
      categories={categories}
      counterparties={counterparties}
      initial={{
        type: "EXPENSE",
        amount: "",
        currency: goal.currency,
        accountId: accounts[0].id,
        occurredAt: DateTime.now()
          .setZone(APP_TIMEZONE)
          .toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS"),
      }}
    >
      <input type="hidden" name="goalId" value={id} />
      <div className="finance-form-emphasis">
        <FinanceField
          label="How much of this purchase fulfilled the goal?"
          aria-label="Amount of this expense that counts toward the goal"
          name="spending"
          inputMode="decimal"
          required
        />
        <FinanceField
          label={
            "Release from its savings allocation (up to " +
            moneyDecimal(goal.allocatedAmountMinor, goal.currency) +
            ")"
          }
          aria-label="Reduce current savings allocation"
          name="release"
          defaultValue="0"
          inputMode="decimal"
        />
      </div>
      <label className="finance-checkbox-row">
        <input type="checkbox" name="complete" />
        <span>
          <strong>The goal itself is now fulfilled</strong>
          <small>
            This is a deliberate status choice, separate from the amount spent.
          </small>
        </span>
      </label>
    </TransactionForm>
  ) : null;

  return (
    <>
      <Link className="finance-back-link" href="/finance/savings">
        <ArrowLeft aria-hidden="true" />
        All savings goals
      </Link>
      <FinancePageHeader
        eyebrow={
          goal.archivedAt
            ? "Archived goal"
            : goal.status.toLowerCase() + " savings goal"
        }
        title={goal.name}
        description={
          formatMoney(goal.funding.remaining, goal.currency) +
          " remaining from a " +
          formatMoney(goal.funding.target, goal.currency) +
          " target."
        }
        actions={
          !goal.archivedAt && accounts.length ? (
            <FinanceDialog
              triggerLabel="Add goal purchase"
              title={"Record progress on " + goal.name}
              description="Record the real expense, then say how much of it fulfilled this goal."
            >
              {purchaseForm}
            </FinanceDialog>
          ) : undefined
        }
      />

      {goal.completionNeedsReviewAt && (
        <div className="finance-callout" role="status">
          <AlertTriangle aria-hidden="true" />
          Goal spending changed after completion. Confirm the objective is still
          fulfilled, or reopen it in goal settings.
        </div>
      )}

      <section className="finance-goal-hero">
        <h2 className="sr-only">Goal funding and spending</h2>
        <div className="finance-goal-ring">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="52" />
            <circle
              className="is-progress"
              cx="60"
              cy="60"
              r="52"
              pathLength="100"
              strokeDasharray={spentPercent + " 100"}
            />
          </svg>
          <span>
            <strong>{spentPercent}%</strong>
            <small>fulfilled</small>
          </span>
        </div>
        <div className="finance-goal-hero-copy">
          <p className="eyebrow">Confirmed progress</p>
          <strong className="finance-number">
            {formatMoney(goal.funding.spent, goal.currency)}
          </strong>
          <p>
            This is spending explicitly confirmed toward the goal — an actual
            financial fact, not a plan.
          </p>
        </div>
        <dl>
          <div>
            <dt>Original target</dt>
            <dd className="finance-number">
              {formatMoney(goal.targetAmountMinor, goal.currency)}
            </dd>
          </div>
          <div>
            <dt>Still needed</dt>
            <dd className="finance-number">
              {formatMoney(goal.funding.remaining, goal.currency)}
            </dd>
          </div>
          <div>
            <dt>Allocated intention</dt>
            <dd className="finance-number">
              {formatMoney(goal.funding.allocated, goal.currency)}
            </dd>
          </div>
          <div>
            <dt>Funding gap</dt>
            <dd className="finance-number">
              {formatMoney(goal.funding.gap, goal.currency)}
            </dd>
          </div>
        </dl>
      </section>

      <FinanceSection
        title="Funding intention"
        description="Choose how much of your current savings plan points toward this goal. No money is moved."
      >
        <div className="finance-goal-funding">
          <div>
            <span>
              Remaining cost funded <strong>{fundedPercent}%</strong>
            </span>
            <i>
              <b style={{ width: fundedPercent + "%" }} />
            </i>
          </div>
          <FinanceForm
            key={goal.allocatedAmountMinor.toString()}
            action={rebalanceAction}
            submitLabel="Update allocation"
            submitVariant="secondary"
          >
            <input type="hidden" name="currency" value={goal.currency} />
            <FinanceField
              label={"Allocate to this goal (" + goal.currency + ")"}
              name={"allocation:" + goal.id}
              defaultValue={moneyDecimal(
                goal.allocatedAmountMinor,
                goal.currency,
              )}
              inputMode="decimal"
              required
            />
          </FinanceForm>
        </div>
        {goal.funding.overAllocated > 0n && (
          <div className="finance-callout">
            <AlertTriangle aria-hidden="true" />
            Allocation is{" "}
            {formatMoney(goal.funding.overAllocated, goal.currency)} above the
            remaining cost. Release the excess explicitly above.
          </div>
        )}
      </FinanceSection>

      {!goal.archivedAt && !accounts.length && (
        <FinanceSection title="Record a goal purchase">
          <p className="finance-quiet-copy">
            Add an active {goal.currency} account before recording a purchase
            for this goal.
          </p>
        </FinanceSection>
      )}

      {!goal.archivedAt && (
        <FinanceSection
          title="Goal settings"
          description="Change the target or lifecycle only when the goal itself has changed."
        >
          <details className="finance-details">
            <summary>Edit goal details</summary>
            <div className="finance-details-body finance-settings-panel">
              <FinanceForm
                action={saveGoalAction}
                submitLabel="Save goal"
                submitVariant="secondary"
              >
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="currency" value={goal.currency} />
                <FinanceField
                  label="Goal name"
                  name="name"
                  defaultValue={goal.name}
                  required
                />
                <FinanceField
                  label={"Original target (" + goal.currency + ")"}
                  name="target"
                  defaultValue={moneyDecimal(
                    goal.targetAmountMinor,
                    goal.currency,
                  )}
                  required
                />
                <FinanceSelect
                  label="Status"
                  name="status"
                  defaultValue={goal.status}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                  <option value="COMPLETED">Completed</option>
                </FinanceSelect>
                <label className="finance-checkbox-row">
                  <input type="checkbox" name="confirmBelowSpent" />
                  <span>
                    <strong>Confirm a target below recorded spending</strong>
                    <small>
                      Only use this when correcting the original target.
                    </small>
                  </span>
                </label>
              </FinanceForm>
              <div className="finance-danger-zone">
                <div>
                  <strong>Archive this goal</strong>
                  <p>
                    Its history stays intact. Any current allocation must be
                    released explicitly.
                  </p>
                </div>
                <FinanceForm
                  action={archiveGoalAction}
                  submitLabel="Archive goal"
                  submitVariant="danger"
                >
                  <input type="hidden" name="id" value={id} />
                  <label className="finance-checkbox-row">
                    <input type="checkbox" name="release" />
                    <span>
                      <strong>
                        Release{" "}
                        {formatMoney(goal.allocatedAmountMinor, goal.currency)}
                      </strong>
                      <small>
                        Return this intention to unallocated savings.
                      </small>
                    </span>
                  </label>
                </FinanceForm>
              </div>
            </div>
          </details>
        </FinanceSection>
      )}

      {goal.archivedAt && (
        <div className="finance-archive-note">
          <CheckCircle2 aria-hidden="true" />
          This goal is archived. Its confirmed spending remains part of your
          financial history.
        </div>
      )}
    </>
  );
}
