import { CompanyWorkSourceForm } from "@/features/entrepreneurship/market/components/company-work-source.component";
import { CompanyReceipts } from "@/features/finance/business-receipts/components/company-receipts.component";
import {
  FollowUpForm,
  FollowUpRecord,
} from "@/features/entrepreneurship/follow-ups/components/follow-up.component";
import { InteractionForm } from "@/features/entrepreneurship/interactions/components/interaction-form.component";
import { InteractionJournal } from "@/features/entrepreneurship/interactions/components/interaction-journal.component";
import { getInteractionOptions } from "@/features/entrepreneurship/interactions/queries/interaction.query";
import { notFound } from "next/navigation";
import { BusinessLink as Link } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { BusinessBackLink } from "@/features/entrepreneurship/explorations/components/business-back-link.component";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  MarketForm,
  DirectionForm,
} from "@/features/entrepreneurship/market/components/market-form.component";
import { MarketMenu } from "@/features/entrepreneurship/market/components/market-menu.component";
import {
  businessDate,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";
export async function MarketDetail({
  userId,
  kind,
  id,
  nicheId,
  returnTo,
}: {
  userId: string;
  id: string;
  kind: string;
  nicheId?: string;
  returnTo?: string;
}) {
  if (kind !== "companies" && kind !== "niches") notFound();
  const company =
    kind === "companies"
      ? await prisma.company.findFirst({
          where: { id, userId: userId },
          include: {
            niches: { include: { niche: true } },
            workSources: { include: { workSource: true } },
          },
        })
      : null;
  const niche =
    kind === "niches"
      ? await prisma.niche.findFirst({
          where: { id, userId: userId },
          include: {
            companies: { include: { company: true } },
            decisions: { orderBy: { createdAt: "desc" } },
          },
        })
      : null;
  const record = company ?? niche;
  if (!record) notFound();
  const workSources = company
    ? await prisma.workSource.findMany({
        where: { userId, archivedAt: null },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];
  const options = company ? await getInteractionOptions(userId, nicheId) : null;
  const followUps = company
    ? await prisma.followUp.findMany({
        where: { userId: userId, companyId: id },
        orderBy: { dueOn: "asc" },
      })
    : [];
  const niches = await prisma.niche.findMany({
    where: { userId: userId, archivedAt: null },
    orderBy: { name: "asc" },
  });
  return (
    <>
      <BusinessBackLink
        returnTo={returnTo}
        fallbackHref="/entrepreneurship/market"
        className="business-back"
      >
        ← Market
      </BusinessBackLink>
      <header className="business-section-heading business-page-heading">
        <div>
          <p className="eyebrow">
            {record.archivedAt ? "Archived · " : ""}
            {company ? "Company" : "Exploration"}
          </p>
          <h2>{record.name}</h2>
          {company?.website && (
            <a
              className="business-text-link"
              href={company.website}
              target="_blank"
              rel="noreferrer"
            >
              Visit website ↗
            </a>
          )}
        </div>
        <div className="business-actions">
          {company && options && (
            <InteractionForm
              {...options}
              companyId={id}
              companyName={company.name}
            />
          )}
          <MarketForm
            kind={company ? "company" : "niche"}
            record={record}
            niches={niches}
          />
          <MarketMenu
            kind={company ? "company" : "niche"}
            id={id}
            archived={Boolean(record.archivedAt)}
          />
        </div>
      </header>
      <div className="business-detail-grid">
        <div className="business-detail-main">
          <section className="business-detail-section">
            <h3>{company ? "Context" : "Exploration scope"}</h3>
            <p className="business-prose">
              {company
                ? company.notes || "No context recorded yet."
                : niche?.scope || "No scope recorded yet."}
            </p>
          </section>
          {company && (
            <section className="business-detail-section">
              <h3>Interactions</h3>
              <InteractionJournal
                userId={userId}
                companyId={id}
                nicheId={nicheId}
              />
            </section>
          )}
          {company && (
            <>
              <section className="business-detail-section">
                <div className="business-row-heading">
                  <h3>Work relationship</h3>
                  <CompanyWorkSourceForm
                    companyId={id}
                    companyName={company.name}
                    workSources={workSources}
                  />
                </div>
                {company.workSources.length ? (
                  company.workSources.map(({ workSource }) => (
                    <p key={workSource.id}>
                      <Link
                        className="business-text-link"
                        href={`/finance/opportunities#work-source-${workSource.id}`}
                      >
                        {workSource.name}
                        {workSource.archivedAt ? " · archived" : ""} ↗
                      </Link>
                    </p>
                  ))
                ) : (
                  <p className="business-hint">No WorkSource connected yet.</p>
                )}
              </section>
              {nicheId && (
                <p className="business-hint">
                  Work relationships and receipts belong to this shared company
                  across all explorations.
                </p>
              )}
              <CompanyReceipts userId={userId} companyId={id} />
            </>
          )}
          {niche && (
            <>
              <section className="business-detail-section">
                <div className="business-row-heading">
                  <h3>Direction · {humanize(niche.direction)}</h3>
                  <DirectionForm id={id} direction={niche.direction} />
                </div>
                {niche.decisions.map((decision) => (
                  <article key={decision.id} className="business-record-row">
                    <p className="business-meta">
                      {businessDate(decision.createdAt)} ·{" "}
                      {humanize(decision.direction)}
                    </p>
                    <p className="business-prose">{decision.rationale}</p>
                  </article>
                ))}
              </section>
              <section className="business-detail-section">
                <h3>Companies in this niche</h3>
                <div className="business-related-list">
                  {niche.companies.map(({ company: item }) => (
                    <Link
                      key={item.id}
                      className="business-text-link"
                      href={`/entrepreneurship/market/companies/${item.id}`}
                    >
                      {item.name}
                      {item.archivedAt ? " · archived" : ""}
                    </Link>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
        <aside className="business-aside">
          {company && (
            <section className="business-detail-section">
              <h3>Next actions</h3>
              <FollowUpForm target={{ companyId: id }} />
              {followUps.map((followUp) => (
                <FollowUpRecord key={followUp.id} record={followUp} />
              ))}
            </section>
          )}
          <section className="business-aside-section">
            <p className="eyebrow">At a glance</p>
            <p className="mt-lg">Added {businessDate(record.createdAt)}</p>
            {company && (
              <>
                <p className="mt-lg">
                  {company.niches.map((link) => link.niche.name).join(" · ") ||
                    "No niche linked"}
                </p>
                <p className="mt-lg">
                  A company is context. Conversations and observations hold what
                  you actually learned.
                </p>
              </>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
