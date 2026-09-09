import { BusinessLink as Link } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { APP_TIMEZONE } from "@/lib/config/environment.config";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  businessDate,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";
import { ObservationCorrection } from "@/features/entrepreneurship/observations/components/observation-correction.component";
import { CorrectionMenu } from "@/features/entrepreneurship/shared/components/correction-menu.component";
import { withdrawObservationAction } from "@/features/entrepreneurship/observations/actions/observation.action";
export async function ObservationDetail({
  userId,
  id,
  revisionId,
}: {
  userId: string;
  id: string;
  revisionId?: string;
}) {
  const observation = await prisma.observation.findFirst({
    where: { id, userId: userId },
    include: {
      revisions: {
        orderBy: { version: "desc" },
        include: {
          interactionRevision: true,
          evidence: { include: { problem: true } },
        },
      },
    },
  });
  if (!observation) notFound();
  const source = revisionId
    ? observation.revisions.find((r) => r.id === revisionId)
    : observation.revisions[0];
  if (!source) notFound();
  return (
    <>
      <Link className="business-back" href="/entrepreneurship/interactions">
        ← Field notes
      </Link>
      <header className="business-section-heading">
        <div>
          <p className="eyebrow">
            {observation.voidedAt ? "Withdrawn source" : humanize(source.kind)}{" "}
            · {humanize(source.wordingMode)}
          </p>
          <h2>{source.companySnapshot ?? "Observation"}</h2>
          <p>Observed {businessDate(source.observedAt)}</p>
        </div>
        {!observation.voidedAt && source.version === observation.version && (
          <div className="business-actions">
            <ObservationCorrection
              id={id}
              version={observation.version}
              statement={source.statement}
              sourceDescription={source.sourceDescription}
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
      <section className="business-original-claim">
        <p className="eyebrow">
          Recorded source words · revision {source.version}
        </p>
        <p>{source.statement}</p>
      </section>
      <section className="business-detail-section">
        <h3>Where this came from</h3>
        <p className="business-prose">{source.sourceDescription}</p>
        {source.interactionRevision && (
          <>
            <p className="business-hint">
              From this exact interaction version:
            </p>
            <p className="business-prose">
              {source.interactionRevision.summary}
            </p>
            <Link
              href={`/entrepreneurship/interactions/${source.interactionId}`}
              className="business-text-link"
            >
              Open current interaction ↗
            </Link>
          </>
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
      </section>
      <section className="business-detail-section">
        <h3>Used to examine</h3>
        {observation.revisions
          .flatMap((r) => r.evidence)
          .map((evidence) => (
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
          ))}
      </section>
      {observation.revisions.length > 1 && (
        <details className="business-disclosure">
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
