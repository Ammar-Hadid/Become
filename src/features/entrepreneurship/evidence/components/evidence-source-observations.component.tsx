"use client";

import { useId, useState } from "react";
import NextLink from "next/link";
import { ArrowUpRight, ExternalLink, MessageSquareText } from "lucide-react";
import { AudienceSummary } from "@/features/entrepreneurship/audiences/components/audience-fields.component";
import type { EvidenceSourceDetailData } from "@/features/entrepreneurship/evidence/components/evidence-source-detail.component";
import { BusinessLink as Link } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import {
  explorationWorkspaceHref,
  withExplorationReturn,
} from "@/features/entrepreneurship/explorations/utils/exploration.util";
import {
  businessDate,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";

const INITIAL_OBSERVATIONS = 3;
const OBSERVATION_STEP = 5;

type Observation = EvidenceSourceDetailData["observations"][number];

function ObservationDetailLink({
  observation,
  nicheId,
  returnTo,
}: {
  observation: Observation;
  nicheId?: string;
  returnTo: string;
}) {
  const className = "business-text-link";
  const children = (
    <>
      Open observation <ArrowUpRight aria-hidden="true" className="size-4" />
    </>
  );
  if (nicheId && observation.nicheId === nicheId) {
    return (
      <Link
        className={className}
        href={withExplorationReturn(
          explorationWorkspaceHref(
            nicheId,
            "evidence",
            `/observations/${observation.id}`,
          ),
          returnTo,
        )}
      >
        {children}
      </Link>
    );
  }
  return (
    <NextLink
      className={className}
      href={`/entrepreneurship/observations/${observation.id}`}
    >
      {children}
    </NextLink>
  );
}

function ObservationCard({
  observation,
  position,
  nicheId,
  returnTo,
  sourceAudienceContextId,
}: {
  observation: Observation;
  position: number;
  nicheId?: string;
  returnTo: string;
  sourceAudienceContextId: string | null;
}) {
  const audienceChanged =
    observation.audienceContextId !== sourceAudienceContextId;
  return (
    <article className="border-border py-xl border-b first:pt-0 last:border-0 last:pb-0">
      <div className="gap-lg flex flex-wrap items-start justify-between">
        <div>
          <p className="eyebrow">Observation {position}</p>
          <p className="business-meta mt-sm">
            {humanize(observation.kind)} · {humanize(observation.wordingMode)} ·
            revision {observation.version}
          </p>
        </div>
        <time
          className="text-body-sm text-text-muted"
          dateTime={observation.observedAt.toISOString()}
        >
          {businessDate(observation.observedAt)}
        </time>
      </div>

      {observation.wordingMode === "QUOTE" ? (
        <blockquote className="business-prose text-text-primary mt-lg">
          “{observation.statement}”
        </blockquote>
      ) : (
        <p className="business-prose text-text-primary mt-lg">
          {observation.statement}
        </p>
      )}

      <div className="mt-xl">
        <p className="text-body-sm text-text-secondary">
          <span className="text-text-muted">
            {humanize(observation.sourceKind)} ·{" "}
          </span>
          {observation.sourceDescription}
        </p>
        <p className="text-body-sm text-text-secondary mt-md">
          <AudienceSummary {...observation} />
        </p>
        {audienceChanged && (
          <p className="business-hint mt-sm">
            Audience attributed for this observation differs from the source
            record.
            {observation.audienceContext?.description
              ? ` ${observation.audienceContext.description}`
              : ""}
          </p>
        )}
        {observation.correctionReason && (
          <div className="border-border mt-md pl-md border-l">
            <p className="eyebrow">Correction note</p>
            <p className="business-hint mt-sm">
              {observation.correctionReason}
            </p>
          </div>
        )}
        <div className="business-meta mt-md">
          <span>{humanize(observation.identityKind)}</span>
          {observation.nicheSnapshot && (
            <>
              <span aria-hidden="true">·</span>
              <span>{observation.nicheSnapshot}</span>
            </>
          )}
        </div>
      </div>

      <div className="mt-lg gap-lg flex flex-wrap">
        <ObservationDetailLink
          observation={observation}
          nicheId={nicheId}
          returnTo={returnTo}
        />
        {observation.sourceUrl && (
          <a
            className="business-text-link"
            href={observation.sourceUrl}
            rel="noreferrer"
            target="_blank"
          >
            Open original source
            <ExternalLink aria-hidden="true" className="size-4" />
          </a>
        )}
      </div>
    </article>
  );
}

export function EvidenceSourceObservations({
  observations,
  nicheId,
  returnTo,
  sourceAudienceContextId,
}: {
  observations: EvidenceSourceDetailData["observations"];
  nicheId?: string;
  returnTo: string;
  sourceAudienceContextId: string | null;
}) {
  const listId = useId();
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(INITIAL_OBSERVATIONS, observations.length),
  );
  const remaining = observations.length - visibleCount;
  const revealCount = Math.min(OBSERVATION_STEP, remaining);

  return (
    <section className="business-detail-section">
      <div className="business-row-heading">
        <div>
          <p className="eyebrow">Drawn from this source</p>
          <h3>Kept observations</h3>
        </div>
        <p className="business-count" aria-live="polite">
          Showing {visibleCount} of {observations.length}
        </p>
      </div>

      {observations.length ? (
        <>
          <ol id={listId} className="grid">
            {observations.slice(0, visibleCount).map((observation, index) => (
              <li key={observation.id}>
                <ObservationCard
                  observation={observation}
                  position={index + 1}
                  nicheId={nicheId}
                  returnTo={returnTo}
                  sourceAudienceContextId={sourceAudienceContextId}
                />
              </li>
            ))}
          </ol>
          {remaining > 0 && (
            <button
              aria-controls={listId}
              className="finance-dialog-trigger finance-dialog-trigger--secondary mt-xl"
              type="button"
              onClick={() =>
                setVisibleCount((current) =>
                  Math.min(current + OBSERVATION_STEP, observations.length),
                )
              }
            >
              {remaining <= OBSERVATION_STEP
                ? `Show all ${remaining} remaining`
                : `Show next ${revealCount}`}
            </button>
          )}
        </>
      ) : (
        <div className="business-empty">
          <MessageSquareText aria-hidden="true" />
          <h3>No observations kept from this source.</h3>
          <p>The conversation remains useful source context on its own.</p>
        </div>
      )}
    </section>
  );
}
