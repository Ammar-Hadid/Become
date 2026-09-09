import { notFound } from "next/navigation";
import Link from "next/link";
import { DateTime } from "luxon";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  CircleDot,
  Sparkles,
} from "lucide-react";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { formatMoney, moneyDecimal } from "@/lib/money/utils/money.util";
import {
  FinancePageHeader,
  FinanceSection,
  FinanceSelect,
} from "@/features/finance/components/finance-field.component";
import { FinanceDialog } from "@/features/finance/components/finance-dialog.component";
import { FinanceForm } from "@/features/finance/components/finance-form.component";
import { OpportunityForm } from "@/features/finance/opportunities/components/opportunity-form.component";
import { WorkSourceForm } from "@/features/finance/work-sources/components/work-source-form.component";
import {
  archiveOpportunityAction,
  createAcceptedSourceAction,
  linkAcceptedSourceAction,
} from "@/features/finance/opportunities/actions/income-opportunity.action";

const statusCopy = {
  DISCOVERED: "Discovered",
  APPLIED: "Applied",
  ASSESSMENT: "In assessment",
  ACCEPTED: "Accepted",
  REJECTED: "Not selected",
  ABANDONED: "Closed by you",
} as const;

export async function OpportunityDetail({
  userId,
  id,
}: {
  userId: string;
  id: string;
}) {
  const opportunity = await prisma.incomeOpportunity.findFirst({
    where: { id, userId },
    include: { resultingWorkSource: true },
  });
  if (!opportunity) notFound();
  const [sources, receipts] = await Promise.all([
    prisma.workSource.findMany({
      where: { userId, archivedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.financialTransaction.groupBy({
      by: ["currency"],
      where: { userId, incomeOpportunityId: id, type: "INCOME" },
      _sum: { amountMinor: true },
    }),
  ]);
  const local = (date?: Date | null) =>
    date
      ? DateTime.fromJSDate(date)
        .setZone(APP_TIMEZONE)
        .toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS")
      : "";
  const milestones = [
    ["Discovered", opportunity.discoveredAt],
    ["Applied", opportunity.appliedAt],
    ["Assessment", opportunity.assessmentAt],
    ["Closed", opportunity.closedAt],
  ].filter((entry): entry is [string, Date] => entry[1] instanceof Date);

  return (
    <>
      <Link className="finance-back-link" href="/finance/opportunities">
        <ArrowLeft aria-hidden="true" />
        Work & opportunities
      </Link>
      <FinancePageHeader
        eyebrow={statusCopy[opportunity.status]}
        title={opportunity.title}
        description={
          opportunity.organizationName ||
          "An independent possibility in your earning life."
        }
      />

      {opportunity.status === "ACCEPTED" &&
        !opportunity.resultingWorkSourceId &&
        !opportunity.archivedAt && (
          <section className="finance-accepted-panel">
            <span className="finance-accepted-icon">
              <Sparkles aria-hidden="true" />
            </span>
            <div>
              <p className="eyebrow">A possibility became real</p>
              <h2>Accepted. Choose what comes next.</h2>
              <p>
                Keep the opportunity as history, then connect it to a real work
                relationship now or later.
              </p>
            </div>
            <div className="finance-accepted-actions">
              <FinanceDialog
                triggerLabel="Create WorkSource"
                title="Create the new work relationship"
                description="Use the accepted opportunity as a starting point."
                variant="secondary"
                icon={false}
              >
                <WorkSourceForm
                  action={createAcceptedSourceAction}
                  opportunityId={id}
                  initial={{
                    name: opportunity.organizationName || opportunity.title,
                    type: "OTHER",
                    defaultCompensationType:
                      opportunity.compensationType ?? "UNKNOWN",
                    notes: opportunity.notes,
                  }}
                />
              </FinanceDialog>
              {sources.length > 0 && (
                <FinanceDialog
                  triggerLabel="Link existing WorkSource"
                  title="Connect an existing relationship"
                  description="Choose the established source this opportunity became."
                  variant="quiet"
                  icon={false}
                >
                  <FinanceForm
                    action={linkAcceptedSourceAction}
                    submitLabel="Confirm link"
                  >
                    <input type="hidden" name="opportunityId" value={id} />
                    <FinanceSelect
                      label="Existing work source"
                      name="sourceId"
                      required
                    >
                      <option value="">Choose a source</option>
                      {sources.map((source) => (
                        <option key={source.id} value={source.id}>
                          {source.name}
                        </option>
                      ))}
                    </FinanceSelect>
                  </FinanceForm>
                </FinanceDialog>
              )}
              <Link href="/finance/opportunities">Not now</Link>
            </div>
          </section>
        )}

      {opportunity.resultingWorkSource && (
        <div className="finance-source-connection">
          <Building2 aria-hidden="true" />
          <div>
            <span>This became an established relationship</span>
            <strong>
              Resulting work source: {opportunity.resultingWorkSource.name}
            </strong>
          </div>
        </div>
      )}

      <section className="finance-opportunity-overview mb-3xl">

        <article className="finance-opportunity-value">
          <span className="finance-panel-icon">
            <CircleDollarSign aria-hidden="true" />
          </span>
          <p>Confirmed income</p>
          {receipts.length ? (
            receipts.map((receipt) => (
              <strong className="finance-number" key={receipt.currency}>
                {formatMoney(receipt._sum.amountMinor ?? 0n, receipt.currency)}
              </strong>
            ))
          ) : (
            <strong>No income linked yet</strong>
          )}
          <small>
            Only money explicitly received and connected to this opportunity.
          </small>
        </article>

        <article className="finance-opportunity-value">
          <span className="finance-panel-icon finance-panel-icon--violet">
            <Sparkles aria-hidden="true" />
          </span>
          <p>Prospective value</p>
          <strong className="finance-number">
            {opportunity.expectedAmountMinor !== null &&
              opportunity.expectedCurrency
              ? formatMoney(
                opportunity.expectedAmountMinor,
                opportunity.expectedCurrency,
              )
              : "Not estimated"}
          </strong>
          <small>An expectation only. It never counts as actual income.</small>
        </article>

      </section>

      <FinanceSection
        title="The path so far"
        description="Milestones belong to the opportunity. Actual payments remain separate financial facts."
      >
        <ol className="finance-opportunity-timeline">
          {milestones.map(([label, value], index) => (
            <li key={label} className="flex items-center!">

              <span className="border">
                {index === milestones.length - 1 ? (
                  <CheckCircle2 aria-hidden="true" />
                ) : (
                  <CircleDot aria-hidden="true" />
                )}
              </span>

              <div>
                <strong>{label}</strong>
                <time dateTime={value.toISOString()}>
                  {DateTime.fromJSDate(value)
                    .setZone(APP_TIMEZONE)
                    .toFormat("d LLL yyyy, HH:mm")}
                </time>
              </div>

            </li>
          ))}
        </ol>
      </FinanceSection>



      {!opportunity.archivedAt && (
        <FinanceSection
          title="Opportunity details"
          description="Update the status, milestones or expected compensation as the possibility develops."
        >
          <details className="finance-details">
            <summary>Edit opportunity</summary>
            <div className="finance-details-body finance-settings-panel">
              <OpportunityForm
                initial={{
                  ...opportunity,
                  discoveredAt: local(opportunity.discoveredAt),
                  appliedAt: local(opportunity.appliedAt),
                  assessmentAt: local(opportunity.assessmentAt),
                  closedAt: local(opportunity.closedAt),
                  expectedAmount:
                    opportunity.expectedAmountMinor !== null &&
                      opportunity.expectedCurrency
                      ? moneyDecimal(
                        opportunity.expectedAmountMinor,
                        opportunity.expectedCurrency,
                      )
                      : "",
                }}
              />
              <div className="finance-danger-zone">
                <div>
                  <strong>Archive this opportunity</strong>
                  <p>Its milestones and linked history remain available.</p>
                </div>
                <FinanceForm
                  action={archiveOpportunityAction}
                  submitLabel="Archive opportunity"
                  submitVariant="danger"
                >
                  <input type="hidden" name="id" value={id} />
                </FinanceForm>
              </div>
            </div>
          </details>
        </FinanceSection>
      )}

      {opportunity.archivedAt && (
        <Link className="finance-back-link" href="/finance/opportunities">
          Return to earning overview <ArrowRight aria-hidden="true" />
        </Link>
      )}
    </>
  );
}
