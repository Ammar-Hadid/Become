import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Compass,
  PiggyBank,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getSavings } from "@/features/finance/savings/queries/savings.query";
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
  rebalanceAction,
  saveGoalAction,
} from "@/features/finance/savings/actions/savings-goal.action";

const percent = (part: bigint, whole: bigint) =>
  whole > 0n ? Math.min(100, Number((part * 1000n) / whole) / 10) : 0;

export async function SavingsPage({ userId }: { userId: string }) {
  const { pools, goals } = await getSavings(userId);
  const activeGoals = goals.filter((goal) => !goal.archivedAt);
  const goalForm = (
    <FinanceForm
      action={saveGoalAction}
      submitLabel="Create goal"
      resetOnSuccess
      closeOnSuccess
    >
      <FinanceField
        label="Goal name"
        name="name"
        placeholder="What are you making room for?"
        required
      />
      <div className="finance-form-grid">
        <FinanceField
          label="Currency"
          name="currency"
          defaultValue="EUR"
          required
          maxLength={3}
        />
        <FinanceField
          label="Target cost"
          aria-label="Original target"
          name="target"
          inputMode="decimal"
          required
        />
      </div>
      <p className="finance-form-note">
        Creating a goal sets a direction. It does not move money or change an
        account balance.
      </p>
    </FinanceForm>
  );

  return (
    <>
      <FinancePageHeader
        eyebrow="Direction"
        title="Savings"
        description="See the money you actually hold, the safety you want to protect and the goals you choose to fund."
        actions={
          <FinanceDialog
            triggerLabel="New savings goal"
            title="What are you making room for?"
            description="Give a part of your savings a clear direction."
          >
            {goalForm}
          </FinanceDialog>
        }
      />

      <FinanceSection
        title="Savings direction"
        description="Account balances show what is actually there. Your protected reserve is the safety threshold you want those savings to cover."
      >
        {!pools.length ? (
          <FinanceEmptyState
            icon={<PiggyBank aria-hidden="true" />}
            title="Your savings picture is waiting"
            description="Count an account as liquid savings, or create a goal, to start shaping the plan."
            action={
              <Link className="finance-panel-link" href="/finance/accounts">
                Set up savings accounts <ArrowRight aria-hidden="true" />
              </Link>
            }
          />
        ) : (
          <div className="finance-pool-list">
            {pools.map((pool) => {
              const reserveCovered = pool.reserveCovered ?? 0n;
              const reserveCoverage =
                pool.reserve === null
                  ? 0
                  : pool.reserve === 0n
                    ? 100
                    : percent(reserveCovered, pool.reserve);
              const hasReserveShortfall = (pool.reserveShortfall ?? 0n) > 0n;
              return (
                <article className="finance-pool" key={pool.currency}>
                  <header>
                    <div>
                      <p className="eyebrow">
                        {pool.currency} · Recorded reality
                      </p>
                      <strong className="finance-number">
                        {pool.liquid === null
                          ? "Position unavailable"
                          : formatMoney(pool.liquid, pool.currency)}
                      </strong>
                      <span>Liquid savings across included accounts</span>
                    </div>
                    <span
                      className={
                        "finance-status-pill " +
                        (pool.liquid !== null &&
                        pool.reserve !== null &&
                        !hasReserveShortfall
                          ? "finance-status-pill--positive"
                          : "finance-status-pill--warning")
                      }
                    >
                      {pool.liquid !== null &&
                      pool.reserve !== null &&
                      !hasReserveShortfall ? (
                        <CheckCircle2 aria-hidden="true" />
                      ) : (
                        <AlertTriangle aria-hidden="true" />
                      )}
                      {pool.liquid === null
                        ? "Needs account check"
                        : pool.reserve === null
                          ? "Reserve not set"
                          : hasReserveShortfall
                            ? "Reserve not yet covered"
                            : "Reserve covered"}
                    </span>
                  </header>

                  {pool.reserve !== null && hasReserveShortfall && (
                    <div className="finance-reserve-warning" role="status">
                      <ShieldCheck aria-hidden="true" />
                      <div>
                        <strong>Reserve not yet covered</strong>
                        <p>
                          You&apos;re{" "}
                          {formatMoney(
                            pool.reserveShortfall ?? 0n,
                            pool.currency,
                          )}{" "}
                          below your {formatMoney(pool.reserve, pool.currency)}{" "}
                          protected reserve.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="finance-pool-visual">
                    <div
                      className="finance-reserve-track"
                      role="img"
                      aria-label={
                        pool.reserve === null
                          ? "Protected reserve not configured"
                          : `${reserveCoverage}% of the ${formatMoney(pool.reserve, pool.currency)} protected reserve is covered`
                      }
                    >
                      <span style={{ width: reserveCoverage + "%" }} />
                      {pool.reserve !== null && <i aria-hidden="true" />}
                    </div>
                    <div className="finance-reserve-track-caption">
                      <span>
                        {pool.reserve === null
                          ? "Set a reserve to see coverage"
                          : `${reserveCoverage}% covered`}
                      </span>
                      <span>
                        {pool.reserve === null
                          ? "No safety threshold yet"
                          : `Reserve target ${formatMoney(pool.reserve, pool.currency)}`}
                      </span>
                    </div>
                    <dl>
                      <div>
                        <dt>
                          <i className="is-reality" />
                          Recorded liquid savings
                        </dt>
                        <dd className="finance-number">
                          {pool.liquid === null
                            ? "Unavailable"
                            : formatMoney(pool.liquid, pool.currency)}
                        </dd>
                      </div>
                      <div>
                        <dt>
                          <i className="is-reserve" />
                          Protected reserve
                        </dt>
                        <dd className="finance-number">
                          {pool.reserve === null
                            ? "Not configured"
                            : formatMoney(pool.reserve, pool.currency)}
                        </dd>
                      </div>
                      <div>
                        <dt>
                          <i
                            className={
                              hasReserveShortfall ? "is-shortfall" : "is-above"
                            }
                          />
                          {hasReserveShortfall
                            ? "Reserve shortfall"
                            : "Above reserve"}
                        </dt>
                        <dd className="finance-number">
                          {pool.liquid === null || pool.reserve === null
                            ? "Unavailable"
                            : formatMoney(
                                hasReserveShortfall
                                  ? (pool.reserveShortfall ?? 0n)
                                  : (pool.aboveReserve ?? 0n),
                                pool.currency,
                              )}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {!pool.configured && (
                    <div className="finance-pool-actions">
                      <Link href="/settings/finance">
                        <ShieldCheck aria-hidden="true" />
                        Set a protected reserve
                      </Link>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </FinanceSection>

      <FinanceSection
        title="Savings goals"
        description="Progress shows confirmed goal spending. Funding shows the savings you currently intend to use."
        action={
          <FinanceDialog
            triggerLabel="Create a goal"
            title="What are you making room for?"
            description="A goal creates intention without pretending the money moved."
            variant="secondary"
          >
            {goalForm}
          </FinanceDialog>
        }
      >
        {pools.some((pool) =>
          activeGoals.some((goal) => goal.currency === pool.currency),
        ) && (
          <div className="finance-goal-plan-controls">
            {pools
              .filter((pool) =>
                activeGoals.some((goal) => goal.currency === pool.currency),
              )
              .map((pool) => {
                const aboveReserve = pool.aboveReserve ?? 0n;
                return (
                  <div key={pool.currency}>
                    {pool.underfunding !== null && pool.underfunding > 0n && (
                      <div
                        className="finance-goal-capacity-warning"
                        role="status"
                      >
                        <AlertTriangle aria-hidden="true" />
                        <div>
                          <strong>
                            Goal plan exceeds available capacity by{" "}
                            {formatMoney(pool.underfunding, pool.currency)}
                          </strong>
                          <p>
                            {aboveReserve <= 0n ? (
                              <>
                                Your current goal allocations remain saved, but
                                there is currently no savings above the reserve
                                available to fund them.
                              </>
                            ) : (
                              <>
                                Your current goal allocations remain saved. At
                                present,{" "}
                                {formatMoney(aboveReserve, pool.currency)} is
                                available above the reserve, while{" "}
                                {formatMoney(pool.allocated, pool.currency)} is
                                allocated across goals.
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                    <details className="finance-details finance-goal-rebalance">
                      <summary>Rebalance {pool.currency} allocations</summary>
                      <div className="finance-details-body finance-rebalance-panel">
                        <p>
                          Decide how much of your above-reserve savings you
                          intend for each goal. This does not move money.
                        </p>
                        <FinanceForm
                          action={rebalanceAction}
                          submitLabel="Confirm allocation plan"
                        >
                          <input
                            type="hidden"
                            name="currency"
                            value={pool.currency}
                          />
                          {activeGoals
                            .filter((goal) => goal.currency === pool.currency)
                            .map((goal) => (
                              <FinanceField
                                key={goal.id}
                                label={`${goal.name} allocation (${pool.currency})`}
                                name={"allocation:" + goal.id}
                                defaultValue={moneyDecimal(
                                  goal.allocatedAmountMinor,
                                  pool.currency,
                                )}
                                inputMode="decimal"
                                required
                              />
                            ))}
                        </FinanceForm>
                      </div>
                    </details>
                  </div>
                );
              })}
          </div>
        )}
        {!goals.length ? (
          <FinanceEmptyState
            icon={<Compass aria-hidden="true" />}
            title="Give your savings somewhere to go"
            description="A thoughtful goal turns an abstract balance into a direction you care about."
            action={
              <FinanceDialog
                triggerLabel="Create your first goal"
                title="What are you making room for?"
                variant="secondary"
              >
                {goalForm}
              </FinanceDialog>
            }
          />
        ) : (
          <div className="finance-goal-grid">
            {goals.map((goal) => {
              const spentPercent = percent(
                goal.funding.spent,
                goal.funding.target,
              );
              const fundedPercent = percent(
                goal.funding.funded,
                goal.funding.remaining,
              );
              return (
                <Link
                  key={goal.id}
                  href={"/finance/savings/" + goal.id}
                  aria-label={goal.name + " savings goal"}
                  className={
                    "finance-goal " + (goal.archivedAt ? "is-archived" : "")
                  }
                >
                  <header>
                    <span className="finance-goal-icon">
                      <Sparkles aria-hidden="true" />
                    </span>
                    <span className="finance-status-pill finance-status-pill--muted">
                      {goal.archivedAt ? "Archived" : goal.status.toLowerCase()}
                    </span>
                  </header>
                  <div className="finance-goal-copy">
                    <h3>{goal.name}</h3>
                    <p className="finance-number">
                      {formatMoney(goal.funding.remaining, goal.currency)} left
                      of {formatMoney(goal.funding.target, goal.currency)}
                    </p>
                  </div>
                  <div className="finance-goal-progress">
                    <div>
                      <span>
                        Confirmed progress <strong>{spentPercent}%</strong>
                      </span>
                      <i>
                        <b style={{ width: spentPercent + "%" }} />
                      </i>
                    </div>
                    <div>
                      <span>
                        Remaining cost funded <strong>{fundedPercent}%</strong>
                      </span>
                      <i>
                        <b
                          className="is-funded"
                          style={{ width: fundedPercent + "%" }}
                        />
                      </i>
                    </div>
                  </div>
                  <dl>
                    <div>
                      <dt>Allocated now</dt>
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
                  <span className="finance-goal-open">
                    Open goal <ArrowRight aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </FinanceSection>
    </>
  );
}
