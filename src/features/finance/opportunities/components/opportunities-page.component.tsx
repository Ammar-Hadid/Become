import Link from "next/link";
import { DateTime } from "luxon";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CircleDot,
  Sparkles,
  Waypoints,
} from "lucide-react";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { formatMoney } from "@/lib/money/utils/money.util";
import { FinanceDialog } from "@/features/finance/components/finance-dialog.component";
import {
  FinanceEmptyState,
  FinancePageHeader,
  FinanceSection,
} from "@/features/finance/components/finance-field.component";
import { WorkSourceForm } from "@/features/finance/work-sources/components/work-source-form.component";
import { OpportunityForm } from "@/features/finance/opportunities/components/opportunity-form.component";
import { FinanceForm } from "@/features/finance/components/finance-form.component";
import { archiveWorkSourceAction } from "@/features/finance/work-sources/actions/work-source.action";

const statusCopy = {
  DISCOVERED: "Discovered",
  APPLIED: "Applied",
  ASSESSMENT: "In assessment",
  ACCEPTED: "Accepted",
  REJECTED: "Not selected",
  ABANDONED: "Closed by you",
} as const;

const sourceTypeCopy = {
  EMPLOYER: "Employer",
  CLIENT: "Client",
  PLATFORM: "Platform",
  OTHER: "Work relationship",
} as const;

export async function OpportunitiesPage({ userId }: { userId: string }) {
  const [sources, opportunities, sourceIncome] = await Promise.all([
    prisma.workSource.findMany({
      where: { userId },
      orderBy: [{ archivedAt: "asc" }, { name: "asc" }],
    }),
    prisma.incomeOpportunity.findMany({
      where: { userId },
      include: { resultingWorkSource: true },
      orderBy: [{ archivedAt: "asc" }, { discoveredAt: "desc" }],
    }),
    prisma.financialTransaction.groupBy({
      by: ["workSourceId", "currency"],
      where: {
        userId,
        type: "INCOME",
        workSourceId: { not: null },
      },
      _sum: { amountMinor: true },
    }),
  ]);
  const activeSources = sources.filter((source) => !source.archivedAt);
  const activeOpportunities = opportunities.filter(
    (opportunity) =>
      !opportunity.archivedAt &&
      !["REJECTED", "ABANDONED"].includes(opportunity.status),
  );
  const closedOpportunities = opportunities.filter(
    (opportunity) =>
      opportunity.archivedAt ||
      ["REJECTED", "ABANDONED"].includes(opportunity.status),
  );
  const initialOpportunity = {
    title: "",
    status: "DISCOVERED",
    discoveredAt: DateTime.now()
      .setZone(APP_TIMEZONE)
      .toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS"),
  };
  const opportunityForm = <OpportunityForm initial={initialOpportunity} />;

  return (
    <>
      <FinancePageHeader
        eyebrow="Earning"
        title="Work & opportunities"
        description="The relationships that pay you today, and the possibilities that could become paid work next."
        actions={
          <FinanceDialog
            triggerLabel="Add opportunity"
            title="Could this turn into something?"
            description="Capture the possibility now. You can add milestones and compensation later."
          >
            {opportunityForm}
          </FinanceDialog>
        }
      />

      <section className="finance-work-cockpit">
        <article>
          <span className="finance-panel-icon">
            <BriefcaseBusiness aria-hidden="true" />
          </span>
          <strong>{activeSources.length}</strong>
          <p>active work relationships</p>
        </article>
        <article>
          <span className="finance-panel-icon finance-panel-icon--violet">
            <Waypoints aria-hidden="true" />
          </span>
          <strong>{activeOpportunities.length}</strong>
          <p>open possibilities</p>
        </article>
        <article>
          <span className="finance-panel-icon finance-panel-icon--blue">
            <CheckCircle2 aria-hidden="true" />
          </span>
          <strong>
            {
              opportunities.filter(
                (opportunity) => opportunity.status === "ACCEPTED",
              ).length
            }
          </strong>
          <p>accepted opportunities</p>
        </article>
      </section>

      <FinanceSection
        title="Where income comes from"
        description="Established employers, clients and platforms you already have a compensated relationship with."
        action={
          <FinanceDialog
            triggerLabel="Add work source"
            title="Add a work relationship"
            description="A source is somewhere paid work already happens — an employer, client or platform."
            variant="secondary"
          >
            <WorkSourceForm />
          </FinanceDialog>
        }
      >
        {!sources.length ? (
          <FinanceEmptyState
            icon={<Building2 aria-hidden="true" />}
            title="No established work relationships yet"
            description="When an employer, client or platform becomes a real source of paid work, keep it here."
            action={
              <FinanceDialog
                triggerLabel="Add your first work source"
                title="Add a work relationship"
                variant="secondary"
              >
                <WorkSourceForm />
              </FinanceDialog>
            }
          />
        ) : (
          <div className="finance-source-list">
            {sources.map((source) => {
              const income = sourceIncome.filter(
                (group) => group.workSourceId === source.id,
              );
              return (
                <article
                  key={source.id}
                  className={source.archivedAt ? "is-archived" : ""}
                >
                  <span className="finance-source-avatar">
                    {source.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="finance-source-identity">
                    <div>
                      <h3>{source.name}</h3>
                      {source.archivedAt && (
                        <span className="finance-status-pill finance-status-pill--muted">
                          Archived
                        </span>
                      )}
                    </div>
                    <p>
                      {sourceTypeCopy[source.type]} ·{" "}
                      {source.defaultCompensationType === "UNKNOWN"
                        ? "Compensation varies"
                        : source.defaultCompensationType
                            .toLowerCase()
                            .replaceAll("_", " ")}
                    </p>
                  </div>
                  <div className="finance-source-income">
                    {income.length ? (
                      income.map((group) => (
                        <strong className="finance-number" key={group.currency}>
                          {formatMoney(
                            group._sum.amountMinor ?? 0n,
                            group.currency,
                          )}
                        </strong>
                      ))
                    ) : (
                      <span>No linked income yet</span>
                    )}
                  </div>
                  {!source.archivedAt && (
                    <FinanceDialog
                      triggerLabel="Edit work source"
                      title={"Edit " + source.name}
                      variant="quiet"
                      icon={false}
                    >
                      <WorkSourceForm initial={source} />
                      <div className="finance-danger-zone">
                        <p>
                          Archive this relationship when it is no longer a
                          current source of paid work.
                        </p>
                        <FinanceForm
                          action={archiveWorkSourceAction}
                          submitLabel="Archive work source"
                          submitVariant="danger"
                        >
                          <input type="hidden" name="id" value={source.id} />
                        </FinanceForm>
                      </div>
                    </FinanceDialog>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </FinanceSection>

      <FinanceSection
        title="Possibilities in motion"
        description="Prospective work stays separate from actual income until money is explicitly received."
        action={
          <FinanceDialog
            triggerLabel="Capture another opportunity"
            title="Could this turn into something?"
            variant="secondary"
          >
            {opportunityForm}
          </FinanceDialog>
        }
      >
        {!opportunities.length ? (
          <FinanceEmptyState
            icon={<Sparkles aria-hidden="true" />}
            title="No possibilities in motion"
            description="A role, gig or client lead can begin as a small signal. Capture it before it disappears."
            action={
              <FinanceDialog
                triggerLabel="Add your first opportunity"
                title="Could this turn into something?"
                variant="secondary"
              >
                {opportunityForm}
              </FinanceDialog>
            }
          />
        ) : (
          <>
            <div className="finance-opportunity-list">
              {activeOpportunities.map((opportunity) => (
                <Link
                  key={opportunity.id}
                  href={"/finance/opportunities/" + opportunity.id}
                  className="finance-opportunity-row"
                >
                  <span className="finance-opportunity-status">
                    <CircleDot aria-hidden="true" />
                  </span>
                  <span className="finance-opportunity-identity">
                    <strong>{opportunity.title}</strong>
                    <span>
                      {opportunity.organizationName || "Independent lead"}
                      {opportunity.resultingWorkSource
                        ? " · Now " + opportunity.resultingWorkSource.name
                        : ""}
                    </span>
                  </span>
                  <span className="finance-status-pill finance-status-pill--muted">
                    {statusCopy[opportunity.status]}
                  </span>
                  <ArrowRight aria-hidden="true" />
                </Link>
              ))}
            </div>
            {closedOpportunities.length > 0 && (
              <details className="finance-details finance-archived">
                <summary>
                  Closed opportunities ({closedOpportunities.length})
                </summary>
                <div className="finance-details-body finance-opportunity-list">
                  {closedOpportunities.map((opportunity) => (
                    <Link
                      key={opportunity.id}
                      href={"/finance/opportunities/" + opportunity.id}
                      className="finance-opportunity-row is-closed"
                    >
                      <span className="finance-opportunity-identity">
                        <strong>{opportunity.title}</strong>
                        <span>
                          {opportunity.organizationName || "Independent lead"}
                        </span>
                      </span>
                      <span>{statusCopy[opportunity.status]}</span>
                    </Link>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </FinanceSection>
    </>
  );
}
