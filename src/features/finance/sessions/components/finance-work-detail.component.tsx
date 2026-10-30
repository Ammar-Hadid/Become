import { WorkspaceDisclosure } from "@/components/ui/workspace/workspace-disclosure.component";
import { Card } from "@/components/ui/cards/card.component";
import { calculateSessionMilliseconds } from "@/features/sessions/timing/utils/session-duration.util";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DateTime } from "luxon";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  ReceiptText,
  Settings2,
} from "lucide-react";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { formatMoney } from "@/lib/money/utils/money.util";
import { getFinanceWorkOptions } from "@/features/finance/queries/finance-options.query";
import { FinanceForm } from "@/features/finance/components/finance-form.component";
import {
  FinanceEmptyState,
  FinancePageHeader,
  FinanceSelect,
  FinanceSection,
} from "@/features/finance/components/finance-field.component";
import { correctFinanceSessionAction } from "@/features/finance/sessions/actions/finance-session.action";

const activityCopy = {
  PAID_WORK: "Paid work",
  OPPORTUNITY_SEARCH: "Opportunity search",
  APPLICATION: "Application",
  ASSESSMENT: "Assessment",
  FINANCE_ADMIN: "Finance admin",
} as const;

const compensationCopy = {
  HOURLY: "Hourly",
  FIXED: "Fixed fee",
  TASK_BASED: "Task based",
  UNKNOWN: "Not specified",
} as const;

export async function FinanceWorkDetail({
  userId,
  id,
}: {
  userId: string;
  id: string;
}) {
  const session = await prisma.session.findFirst({
    where: { id, userId, endedAt: { not: null }, domain: { slug: "finance" } },
    include: {
      pauses: true,
      workSource: true,
      incomeOpportunity: true,
      paymentAllocations: { include: { transaction: true } },
    },
  });
  if (!session) notFound();
  const options = await getFinanceWorkOptions(userId);
  const minutes = Math.round(calculateSessionMilliseconds(session) / 60_000);
  const isPaidWork = session.financeActivityKind === "PAID_WORK";
  const activity = session.financeActivityKind
    ? activityCopy[session.financeActivityKind]
    : "Unclassified Finance activity";

  return (
    <>
      <Link className="finance-back-link" href="/finance/opportunities">
        <ArrowLeft aria-hidden="true" />
        Work & opportunities
      </Link>
      <FinancePageHeader
        eyebrow={activity}
        title={session.description || "Finance work session"}
        description={`${DateTime.fromJSDate(session.startedAt)
          .setZone(APP_TIMEZONE)
          .toFormat("d LLL yyyy, HH:mm")} · ${minutes} min recorded`}
      />

      <Card
        material="elevated-glass"
        className="finance-detail-focus finance-detail-focus--work"
      >
        <span className="finance-work-session-icon">
          <BriefcaseBusiness aria-hidden="true" />
        </span>
        <div>
          <p className="eyebrow">Work context</p>
          <strong>{session.workSource?.name ?? "No work source linked"}</strong>
          <span>
            {session.incomeOpportunity?.title
              ? `Connected to ${session.incomeOpportunity.title}`
              : "No opportunity linked"}
          </span>
        </div>
        <dl>
          <div>
            <dt>
              <Clock3 aria-hidden="true" /> Time recorded
            </dt>
            <dd>{minutes} min</dd>
          </div>
          <div>
            <dt>
              <ReceiptText aria-hidden="true" /> Payment state
            </dt>
            <dd>
              {isPaidWork
                ? session.paymentAttributionCompleteAt
                  ? "Fully accounted for"
                  : "Review still needed"
                : "Not a paid-work session"}
            </dd>
          </div>
        </dl>
      </Card>

      <FinanceSection
        title="Payments connected to this work"
        description="Work and money remain separate facts until you explicitly connect them."
        action={
          session.paymentAttributionCompleteAt ? (
            <span className="finance-status-pill finance-status-pill--positive">
              <CheckCircle2 aria-hidden="true" /> Accounted for
            </span>
          ) : undefined
        }
      >
        {!session.paymentAllocations.length ? (
          <FinanceEmptyState
            icon={<ReceiptText aria-hidden="true" />}
            title="No income connected yet"
            description={
              isPaidWork
                ? "When payment arrives, connect it from the income transaction so this work can be accounted for."
                : "This activity does not need a payment connection."
            }
          />
        ) : (
          <div className="finance-work-payment-list">
            {session.paymentAllocations.map((allocation) => (
              <Link
                href={`/finance/transactions/${allocation.transactionId}`}
                key={allocation.transactionId}
              >
                <span>
                  <strong>Received payment</strong>
                  <small>
                    {DateTime.fromJSDate(allocation.transaction.occurredAt)
                      .setZone(APP_TIMEZONE)
                      .toFormat("d LLL yyyy")}
                  </small>
                </span>
                <strong className="finance-number">
                  {formatMoney(
                    allocation.amountMinor,
                    allocation.transaction.currency,
                  )}
                </strong>
                <ArrowRight aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </FinanceSection>

      {session.financeActivityKind &&
        session.financeActivityKind !== "FINANCE_ADMIN" && (
          <FinanceSection
            title="Work details"
            description="The context recorded when this session happened. Corrections never create income or rewrite payment history."
            action={<Settings2 className="finance-heading-icon" />}
          >
            <dl className="finance-work-context-list">
              <div>
                <dt>Activity</dt>
                <dd>{activity}</dd>
              </div>
              {isPaidWork && (
                <div>
                  <dt>Compensation</dt>
                  <dd>
                    {session.financeCompensationType
                      ? compensationCopy[session.financeCompensationType]
                      : "Not specified"}
                  </dd>
                </div>
              )}
              <div>
                <dt>Work source</dt>
                <dd>{session.workSource?.name ?? "Unassigned"}</dd>
              </div>
              <div>
                <dt>Opportunity</dt>
                <dd>{session.incomeOpportunity?.title ?? "Unassigned"}</dd>
              </div>
            </dl>
            <WorkspaceDisclosure
              title={<>Correct work details</>}
              className="finance-disclosure"
            >
              <div className="finance-details-body finance-settings-panel">
                <FinanceForm
                  action={correctFinanceSessionAction}
                  submitLabel="Confirm Finance metadata"
                  submitVariant="secondary"
                >
                  <input type="hidden" name="sessionId" value={id} />
                  {isPaidWork && (
                    <>
                      <FinanceSelect
                        label="Work source"
                        name="workSourceId"
                        defaultValue={session.workSourceId ?? ""}
                      >
                        <option value="">Unassigned</option>
                        {options.workSources.map((source) => (
                          <option key={source.id} value={source.id}>
                            {source.name}
                          </option>
                        ))}
                      </FinanceSelect>
                      <FinanceSelect
                        label="Compensation type"
                        name="financeCompensationType"
                        defaultValue={
                          session.financeCompensationType ?? "UNKNOWN"
                        }
                      >
                        {Object.entries(compensationCopy).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </FinanceSelect>
                    </>
                  )}
                  <FinanceSelect
                    label="Opportunity"
                    name="incomeOpportunityId"
                    defaultValue={session.incomeOpportunityId ?? ""}
                  >
                    <option value="">Unassigned</option>
                    {options.opportunities.map((opportunity) => (
                      <option key={opportunity.id} value={opportunity.id}>
                        {opportunity.title}
                      </option>
                    ))}
                  </FinanceSelect>
                  {isPaidWork && (
                    <>
                      <FinanceSelect
                        label="Is payment for this work complete?"
                        aria-label="Payment completeness"
                        name="completeness"
                        defaultValue="unsure"
                      >
                        <option value="yes">
                          Yes, it is fully accounted for
                        </option>
                        <option value="no">No, more payment is expected</option>
                        <option value="unsure">I’m not sure yet</option>
                      </FinanceSelect>
                      <p className="finance-form-note">
                        Only your explicit confirmation marks this work fully
                        accounted for, including an intentional zero outcome.
                      </p>
                    </>
                  )}
                </FinanceForm>
              </div>
            </WorkspaceDisclosure>
          </FinanceSection>
        )}
    </>
  );
}
