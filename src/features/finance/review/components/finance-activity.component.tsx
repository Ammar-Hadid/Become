import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ScanSearch,
} from "lucide-react";
import type { getFinanceActivity } from "@/features/finance/review/queries/finance-activity.query";

type FinanceActivitySummary = Awaited<ReturnType<typeof getFinanceActivity>>;

const transactionLabel = (count: number) =>
  `${count} ${count === 1 ? "transaction" : "transactions"}`;

export function FinanceActivity({
  activity,
}: {
  activity: FinanceActivitySummary;
}) {
  const todaySettled =
    activity.today.total > 0 &&
    activity.today.needsReview === 0 &&
    activity.today.unresolvedEvidence === 0;
  const todayUnresolved = activity.unresolved.find(
    (item) => item.activityOn === activity.today.date,
  );
  const previousUnresolved = activity.unresolved.find(
    (item) => item.activityOn < activity.today.date,
  );

  return (
    <section
      className="finance-activity"
      aria-labelledby="today-activity-title"
    >
      <div className="finance-activity-primary">
        <header>
          <div>
            <p className="eyebrow">Today&apos;s activity</p>
            <h2 id="today-activity-title">
              {activity.today.total
                ? transactionLabel(activity.today.total)
                : "No booked transactions today"}
            </h2>
          </div>
          <span
            className={
              "finance-status-pill " +
              (todaySettled
                ? "finance-status-pill--positive"
                : activity.today.needsAttention
                  ? "finance-status-pill--warning"
                  : "")
            }
          >
            {todaySettled ? (
              <CheckCircle2 aria-hidden="true" />
            ) : (
              <AlertCircle aria-hidden="true" />
            )}
            {todaySettled
              ? "Reviewed"
              : activity.today.unresolvedEvidence > 0
                ? `${activity.today.unresolvedEvidence} needs interpretation`
                : `${activity.today.needsReview} needs review`}
          </span>
        </header>

        {activity.today.total > 0 ? (
          <dl className="finance-activity-counts">
            <div>
              <dt>Transactions</dt>
              <dd>{activity.today.total}</dd>
            </div>
            <div>
              <dt>Recognized</dt>
              <dd>{activity.today.recognized}</dd>
            </div>
            <div>
              <dt>Needs attention</dt>
              <dd>
                {activity.today.needsAttention +
                  activity.today.unresolvedEvidence}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="finance-activity-empty">
            Activity appears here on its transaction date. Older imported
            activity stays with its original day.
          </p>
        )}

        {activity.today.unknownCounterparties > 0 && (
          <Link
            className="finance-unknown-counterparty"
            href={`/finance/transactions?review=unknown&day=${activity.today.date}`}
          >
            <span className="finance-unknown-counterparty-icon">
              <ScanSearch aria-hidden="true" />
            </span>
            <span>
              <strong>
                {activity.today.unknownCounterparties === 1
                  ? "1 transaction has an unknown counterparty"
                  : `${activity.today.unknownCounterparties} transactions have unknown counterparties`}
              </strong>
              <small>
                Identify the external counterparty before acknowledging the
                transaction.
              </small>
            </span>
            <span>
              Review <ArrowRight aria-hidden="true" />
            </span>
          </Link>
        )}

        {activity.today.unresolvedEvidence > 0 && todayUnresolved && (
          <Link
            className="finance-unknown-counterparty finance-unresolved-evidence"
            href={`/finance/accounts/${todayUnresolved.accountId}#evidence-review`}
          >
            <span className="finance-unknown-counterparty-icon">
              <AlertCircle aria-hidden="true" />
            </span>
            <span>
              <strong>
                {activity.today.unknownUnresolvedCounterparties > 0
                  ? activity.today.unknownUnresolvedCounterparties === 1
                    ? "1 imported movement has an unknown counterparty"
                    : `${activity.today.unknownUnresolvedCounterparties} imported movements have unknown counterparties`
                  : activity.today.unresolvedEvidence === 1
                    ? "1 imported movement needs interpretation"
                    : `${activity.today.unresolvedEvidence} imported movements need interpretation`}
              </strong>
              <small>
                {activity.today.unknownUnresolvedCounterparties > 0
                  ? "Today · review its identity and financial meaning separately."
                  : todayUnresolved.counterpartyName || todayUnresolved.message}
              </small>
            </span>
            <span>
              Review <ArrowRight aria-hidden="true" />
            </span>
          </Link>
        )}

        <div className="finance-activity-actions">
          <Link
            className="finance-link-action finance-link-action--primary"
            href="/finance/transactions?review=today"
          >
            Review today
            <ArrowRight aria-hidden="true" />
          </Link>
          <p>
            Recognition suggests an interpretation. Review records your own
            decision.
          </p>
        </div>
      </div>

      {(activity.previous.needsReview > 0 ||
        activity.previous.unresolvedEvidence > 0) && (
        <details className="finance-previous-activity">
          <summary>
            <span>
              <strong>Previous activity</strong>
              <small>
                {activity.previous.needsReview > 0
                  ? `${transactionLabel(activity.previous.needsReview)} still need review`
                  : `${activity.previous.unresolvedEvidence} older imported movement${activity.previous.unresolvedEvidence === 1 ? "" : "s"} need interpretation`}
              </small>
            </span>
            <span>Show previous</span>
          </summary>
          <div className="finance-previous-activity-body">
            {activity.previous.unknownCounterparties > 0 && (
              <p>
                <ScanSearch aria-hidden="true" />
                {activity.previous.unknownCounterparties === 1
                  ? "1 older transaction has an unknown counterparty."
                  : `${activity.previous.unknownCounterparties} older transactions have unknown counterparties.`}
              </p>
            )}
            {activity.previous.unresolvedEvidence > 0 && previousUnresolved && (
              <Link
                className="finance-previous-evidence-link"
                href={`/finance/accounts/${previousUnresolved.accountId}#evidence-review`}
              >
                <AlertCircle aria-hidden="true" />
                <span>
                  <strong>
                    {activity.previous.unknownUnresolvedCounterparties > 0
                      ? activity.previous.unknownUnresolvedCounterparties === 1
                        ? "1 older imported movement has an unknown counterparty"
                        : `${activity.previous.unknownUnresolvedCounterparties} older imported movements have unknown counterparties`
                      : `${activity.previous.unresolvedEvidence} older imported movement${activity.previous.unresolvedEvidence === 1 ? " needs" : "s need"} interpretation`}
                  </strong>
                  <small>
                    {activity.previous.unknownUnresolvedCounterparties > 0
                      ? "Previous activity · review its identity and financial meaning separately."
                      : previousUnresolved.message}
                  </small>
                </span>
                <ArrowRight aria-hidden="true" />
              </Link>
            )}
            <Link
              className="finance-panel-link"
              href="/finance/transactions?review=previous"
            >
              Review previous activity
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </details>
      )}
    </section>
  );
}
