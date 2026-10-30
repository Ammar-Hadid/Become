import { Card } from "@/components/ui/cards/card.component";
import { BusinessLink as Link } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { BusinessBackLink } from "@/features/entrepreneurship/explorations/components/business-back-link.component";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { getObservationDetail } from "@/features/entrepreneurship/observations/queries/observation.query";
import {
  businessDate,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";
import { ObservationCorrection } from "@/features/entrepreneurship/observations/components/observation-correction.component";
import { CorrectionMenu } from "@/features/entrepreneurship/shared/components/correction-menu.component";
import { withdrawObservationAction } from "@/features/entrepreneurship/observations/actions/observation.action";
import { AudienceSummary } from "@/features/entrepreneurship/audiences/components/audience-fields.component";
import { getAudienceOptions } from "@/features/entrepreneurship/audiences/queries/audience.query";
export async function ObservationDetail({
  userId,
  id,
  revisionId,
  nicheId,
  returnTo,
}: {
  userId: string;
  id: string;
  revisionId?: string;
  nicheId?: string;
  returnTo?: string;
}) {
  const observation = await getObservationDetail(userId, id);
  if (
    !observation ||
    (nicheId && observation.revisions[0]?.nicheId !== nicheId)
  )
    notFound();
  const source = revisionId
    ? observation.revisions.find((r) => r.id === revisionId)
    : observation.revisions[0];
  if (!source) notFound();
  const audienceOptions = await getAudienceOptions(userId, nicheId);
  const usedEvidence = observation.revisions.flatMap((r) => r.evidence);
  return (
    <>
      <BusinessBackLink
        className="business-back"
        returnTo={returnTo}
        fallbackHref="/entrepreneurship/evidence"
      >
        ← Evidence journal
      </BusinessBackLink>
      <header className="business-section-heading business-page-heading">
        <div>
          <p className="eyebrow">
            {observation.voidedAt ? "Withdrawn source" : humanize(source.kind)}{" "}
            · {humanize(source.wordingMode)}
          </p>
          <h2>
            {source.personSnapshot ??
              source.companySnapshot ??
              source.audienceLabel ??
              "Observation"}
          </h2>
          <p>Observed {businessDate(source.observedAt)}</p>
        </div>
        {!observation.voidedAt && source.version === observation.version && (
          <div className="business-actions">
            <ObservationCorrection
              id={id}
              version={observation.version}
              statement={source.statement}
              sourceDescription={source.sourceDescription}
              audience={source}
              segments={audienceOptions.segments}
              date={DateTime.fromJSDate(source.observedAt, {
                zone: APP_TIMEZONE,
              }).toISODate()!}
            />
            <CorrectionMenu
              label="Observation actions"
              title="Withdraw observation"
              description="The source remains in historical judgments, but stops counting as current evidence."
              action={withdrawObservationAction.bind(null, id)}
            />
          </div>
        )}
      </header>
      {source.version !== observation.version && (
        <p className="business-hint">
          Historical source version {source.version}.{" "}
          <Link
            className="business-text-link"
            href={`/entrepreneurship/observations/${id}`}
          >
            Open current observation ↗
          </Link>
        </p>
      )}
      <section className="business-original-claim business-focus-statement">
        <p className="eyebrow">
          {source.sourceKind === "MESSAGE"
            ? "Observation kept from a message"
            : "Recorded source words"}{" "}
          · revision {source.version}
        </p>
        <p>{source.statement}</p>
      </section>
      <div className="business-observation-grid">
        <Card
          material="glass"
          spacing="dense"
          className="business-zone business-source-zone"
        >
          <div className="business-row-heading">
            <div>
              <p className="eyebrow">Provenance</p>
              <h3>Where this came from</h3>
            </div>
          </div>
          <p className="business-prose">{source.sourceDescription}</p>
          <p className="mt-lg text-body-sm text-text-secondary">
            <AudienceSummary {...source} />
          </p>
          {source.audienceContext?.description && (
            <p className="business-hint mt-sm">
              {source.audienceContext.description}
            </p>
          )}
          {source.interactionRevision && (
            <div className="business-source-context">
              <p className="business-hint">
                From this exact interaction version
              </p>
              <p className="business-hint mt-sm">
                <AudienceSummary {...source.interactionRevision} />
              </p>
              {source.audienceContextId !==
                source.interactionRevision.audienceContextId && (
                <p className="business-hint mt-sm">
                  This observation has an attributed audience boundary. The
                  original interaction&apos;s context remains above.
                </p>
              )}
              <p className="business-prose">
                {source.interactionRevision.summary}
              </p>
              <Link
                href={`/entrepreneurship/interactions/${source.interactionId}`}
                className="business-text-link"
              >
                Open current interaction ↗
              </Link>
            </div>
          )}
          {source.sourceMessageRevision && source.sourceMessage && (
            <div className="business-source-context">
              <p className="business-hint">Exact conversation excerpt used</p>
              <blockquote className="business-prose">
                “{source.sourceMessageRevision.body}”
              </blockquote>
              <p className="business-meta mt-sm">
                {source.sourceMessageRevision.speakerNameSnapshot} ·{" "}
                {humanize(source.sourceMessageRevision.channel)} ·{" "}
                {businessDate(source.sourceMessageRevision.occurredAt)}
              </p>
              {(source.sourceMessage.voidedAt ||
                source.sourceMessage.revisions[0]?.id !==
                  source.sourceMessageRevision.id) && (
                <p className="business-review-flag">
                  Source changed since this observation. The exact wording above
                  remains pinned for historical truth.
                </p>
              )}
              <Link
                href={`/entrepreneurship/interactions/${source.sourceMessageRevision.interactionId}`}
                className="business-text-link"
              >
                Open current conversation ↗
              </Link>
            </div>
          )}
          {source.sourceUrl && (
            <a
              href={source.sourceUrl}
              className="business-text-link"
              target="_blank"
              rel="noreferrer"
            >
              Open public source ↗
            </a>
          )}
        </Card>
        <Card
          material="glass"
          spacing="dense"
          className="business-zone business-usage-zone"
        >
          <div className="business-row-heading">
            <div>
              <p className="eyebrow">Interpretation</p>
              <h3>Used to examine</h3>
            </div>
          </div>
          {usedEvidence.length ? (
            usedEvidence.map((evidence) => (
              <article className="business-outcome" key={evidence.id}>
                <Link
                  className="business-text-link"
                  href={`/entrepreneurship/problems/${evidence.problemId}`}
                >
                  {evidence.problem.title}
                </Link>
                <p className="business-meta">
                  {humanize(evidence.stance)}
                  {evidence.withdrawnAt ? " · withdrawn interpretation" : ""}
                </p>
                <p className="business-prose">{evidence.explanation}</p>
              </article>
            ))
          ) : (
            <p className="business-inline-empty">
              This observation has not been linked to a problem yet.
            </p>
          )}
        </Card>
      </div>
      {observation.revisions.length > 1 && (
        <details className="business-disclosure business-zone">
          <summary>Earlier source versions</summary>
          <div>
            {observation.revisions.slice(1).map((revision) => (
              <article key={revision.id}>
                <p className="business-meta">
                  Recorded {businessDate(revision.createdAt)}
                </p>
                <p className="business-prose">{revision.statement}</p>
                <p className="business-hint">{revision.sourceDescription}</p>
              </article>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
