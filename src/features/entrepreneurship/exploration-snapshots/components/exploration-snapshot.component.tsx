import { Card } from "@/components/ui/cards/card.component";
import Link from "next/link";
import {
  ArrowRight,
  AlertTriangle,
  FileClock,
  MessageCircleQuestion,
  Quote,
} from "lucide-react";
import { getExplorationSnapshot } from "@/features/entrepreneurship/exploration-snapshots/queries/exploration-snapshot.query";
import { getObservationChoices } from "@/features/entrepreneurship/problems/queries/problem.query";
import { explorationWorkspaceHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";
import {
  businessDate,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";
import { ExplorationSnapshotLanes } from "@/features/entrepreneurship/exploration-snapshots/components/exploration-snapshot-lanes.component";
import {
  SnapshotClaimForm,
  SnapshotPublishForm,
  SnapshotUncertaintyForm,
} from "@/features/entrepreneurship/exploration-snapshots/components/exploration-snapshot-forms.component";
import type { ObservationChoice } from "@/features/entrepreneurship/exploration-snapshots/components/exploration-snapshot-forms.component";
import {
  SnapshotClaimActions,
  SnapshotUncertaintyActions,
} from "@/features/entrepreneurship/exploration-snapshots/components/exploration-snapshot-row-actions.component";
import { getSynthesisWorkspace } from "@/features/entrepreneurship/synthesis/queries/synthesis-workspace.query";
import { SynthesisReview } from "@/features/entrepreneurship/synthesis/components/synthesis-review.component";
import {
  synthesisSourceSchema,
  type SynthesisSource,
} from "@/features/entrepreneurship/synthesis/schemas/synthesis.schema";

type Snapshot = NonNullable<Awaited<ReturnType<typeof getExplorationSnapshot>>>;
type SnapshotClaim = Snapshot["claims"][number];

const laneCopy = {
  B2C: {
    index: "01",
    title: "Consumers",
    note: "Individuals buying or using the product for themselves.",
  },
  B2B: {
    index: "02",
    title: "Businesses",
    note: "Teams, operators and buyers working within an organisation.",
  },
  CROSS_MARKET: {
    index: "03",
    title: "Cross-market notes",
    note: "Patterns and tensions that cross consumer and business contexts.",
  },
} as const;

function sourceManifest(value: unknown): SynthesisSource[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const sources = (value as { sources?: unknown }).sources;
  if (!Array.isArray(sources)) return [];
  return sources.flatMap((source) => {
    const parsed = synthesisSourceSchema.safeParse(source);
    return parsed.success ? [parsed.data] : [];
  });
}

function SnapshotClaimRow({
  claim,
  editable = false,
  observations,
}: {
  claim: SnapshotClaim;
  editable?: boolean;
  observations: ObservationChoice[];
}) {
  const revision = claim.revisions[0];
  if (!revision) return null;
  const supports = revision.citations.filter(
    (citation) => citation.stance === "SUPPORTS",
  );
  const contradicts = revision.citations.filter(
    (citation) => citation.stance === "CONTRADICTS",
  );
  const manifest = sourceManifest(revision.sourceManifest);

  return (
    <article className="exploration-snapshot-claim">
      <div className="exploration-snapshot-claim-copy">
        <div className="exploration-snapshot-claim-label">
          <span>{humanize(revision.kind)}</span>
          {claim.needsReview && (
            <span className="exploration-snapshot-review-flag" role="note">
              <AlertTriangle aria-hidden="true" /> Source changed · review
            </span>
          )}
          {editable && (
            <SnapshotClaimActions
              claim={{
                id: claim.id,
                nicheId: claim.nicheId,
                version: claim.version,
                lane: revision.lane,
                kind: revision.kind,
                statement: revision.statement,
                citations: revision.citations.map((citation) => ({
                  observationId: citation.observationId,
                  observationRevisionId: citation.observationRevisionId,
                  stance: citation.stance,
                  note: citation.note,
                  sourceName: citation.observationRevision.statement,
                })),
                sourceManifest: sourceManifest(revision.sourceManifest),
              }}
              observations={observations}
            />
          )}
        </div>
        <p>{revision.statement}</p>
      </div>
      <div className="exploration-snapshot-claim-meta">
        <span className="exploration-source-count" data-tone="support">
          <i aria-hidden="true" /> {supports.length} support
        </span>
        <span className="exploration-source-count" data-tone="challenge">
          <i aria-hidden="true" /> {contradicts.length} challenge
        </span>
        <time dateTime={revision.createdAt.toISOString()}>
          {businessDate(revision.createdAt)}
        </time>
      </div>
      {(revision.citations.length > 0 || manifest.length > 0) && (
        <details className="exploration-snapshot-sources">
          <summary>Review source trail</summary>
          <ul>
            {revision.citations.map((citation) => (
              <li key={citation.id}>
                <span>{citation.stance.toLowerCase()}</span>
                <p>{citation.observationRevision.statement}</p>
                {(citation.note ||
                  citation.observationRevision.sourceDescription) && (
                  <small>
                    {citation.note ??
                      citation.observationRevision.sourceDescription}
                  </small>
                )}
              </li>
            ))}
            {manifest.map((source) => (
              <li key={source.key}>
                <span>
                  {humanize(source.type)} ·{" "}
                  {claim.sourceStates[source.key] ?? "unavailable"}
                </span>
                <p>{source.excerpt}</p>
                <Link href={source.href}>
                  Open original source <ArrowRight aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}

function SnapshotLane({
  lane,
  claims,
  editable,
  observations,
}: {
  lane: keyof typeof laneCopy;
  claims: SnapshotClaim[];
  editable: boolean;
  observations: ObservationChoice[];
}) {
  const copy = laneCopy[lane];
  return (
    <Card
      material="glass"
      spacing="dense"
      className="exploration-snapshot-lane"
      aria-labelledby={`lane-${lane}`}
    >
      <header>
        <span aria-hidden="true">{copy.index}</span>
        <div>
          <h3 id={`lane-${lane}`}>{copy.title}</h3>
          <p>{copy.note}</p>
        </div>
      </header>
      {claims.length > 0 ? (
        <div className="exploration-snapshot-claim-list">
          {claims.map((claim) => (
            <SnapshotClaimRow
              key={claim.id}
              claim={claim}
              editable={editable}
              observations={observations}
            />
          ))}
        </div>
      ) : (
        <div className="exploration-snapshot-lane-empty">
          <Quote aria-hidden="true" />
          <p>No current finding for this market yet.</p>
          <span>
            Keep a source in Evidence, then decide what it changes here.
          </span>
        </div>
      )}
    </Card>
  );
}

export async function ExplorationSnapshot({
  userId,
  nicheId,
  review = false,
}: {
  userId: string;
  nicheId: string;
  review?: boolean;
}) {
  const [snapshot, observations, synthesis] = await Promise.all([
    getExplorationSnapshot(userId, nicheId),
    review ? getObservationChoices(userId, nicheId) : Promise.resolve([]),
    getSynthesisWorkspace(userId, nicheId),
  ]);
  if (!snapshot) return null;
  const latestDate = snapshot.latestEdition?.publishedAt ?? new Date();
  const isStale = Boolean(
    snapshot.latestEdition &&
    snapshot.latestMaterialAt &&
    snapshot.latestMaterialAt > snapshot.latestEdition.publishedAt,
  );
  const claimLabels = snapshot.claims.flatMap((claim) =>
    claim.revisions[0]
      ? [{ id: claim.id, label: claim.revisions[0].statement }]
      : [],
  );
  const uncertaintyLabels = snapshot.uncertainties.flatMap((uncertainty) =>
    uncertainty.revisions[0]
      ? [{ id: uncertainty.id, label: uncertainty.revisions[0].statement }]
      : [],
  );
  const lane = (value: string) =>
    snapshot.claims.filter((claim) => claim.revisions[0]?.lane === value);
  const editable = review && !snapshot.niche.archivedAt;

  return (
    <div className="exploration-snapshot-layout direct-workspace">
      <section className="exploration-snapshot-editorial">
        <header className="exploration-snapshot-heading">
          <div>
            <p className="eyebrow">
              {review ? "Review the record" : "So far we know"}
            </p>
            <h2>
              {review ? "What belongs in the next edition?" : "So Far We Know"}
            </h2>
            <p>
              {review
                ? "Add findings and unknowns, trace them to observations, then publish a historical edition when the picture is useful."
                : "Accepted findings, open questions, and the sources behind them."}
            </p>
          </div>
          <div className="exploration-snapshot-edition">
            <span>
              {snapshot.latestEdition
                ? `Edition ${snapshot.latestEdition.number}`
                : "Living draft"}
            </span>
            <time dateTime={latestDate.toISOString()}>
              {businessDate(latestDate)}
            </time>
            <span data-stale={isStale || undefined}>
              {isStale
                ? "New material to review"
                : snapshot.latestEdition
                  ? "Up to date"
                  : "Not published yet"}
            </span>
          </div>
        </header>

        <SynthesisReview
          key={
            synthesis.proposal
              ? `${synthesis.proposal.id}:${synthesis.proposal.status}`
              : (synthesis.latest?.editionId ?? "empty")
          }
          nicheId={nicheId}
          workspace={synthesis}
          archived={Boolean(snapshot.niche.archivedAt)}
        />

        {editable && (
          <div className="exploration-snapshot-authoring">
            <SnapshotClaimForm nicheId={nicheId} observations={observations} />
            <SnapshotUncertaintyForm nicheId={nicheId} />
            {(claimLabels.length > 0 || uncertaintyLabels.length > 0) && (
              <SnapshotPublishForm
                nicheId={nicheId}
                claims={claimLabels}
                uncertainties={uncertaintyLabels}
              />
            )}
          </div>
        )}

        {snapshot.claims.length > 0 ? (
          <ExplorationSnapshotLanes>
            <SnapshotLane
              lane="B2C"
              claims={lane("B2C")}
              editable={editable}
              observations={observations}
            />
            <SnapshotLane
              lane="B2B"
              claims={lane("B2B")}
              editable={editable}
              observations={observations}
            />
            <SnapshotLane
              lane="CROSS_MARKET"
              claims={lane("CROSS_MARKET")}
              editable={editable}
              observations={observations}
            />
          </ExplorationSnapshotLanes>
        ) : (
          <div className="snapshot-manual-empty">
            <div>
              <p className="eyebrow">Manual record</p>
              <h3>No accepted findings yet.</h3>
            </div>
            <Link
              className="business-text-link"
              href={explorationWorkspaceHref(
                nicheId,
                "so-far-we-know",
                "/review",
              )}
            >
              Review the record <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        )}

        <details className="snapshot-secondary-context">
          <summary>Questions, coverage, and history</summary>
          <div>
            <section>
              <p className="eyebrow">Open questions</p>
              {snapshot.uncertainties.length > 0 ? (
                <>
                  <ul className="exploration-uncertainty-list">
                    {snapshot.uncertainties.map((uncertainty, index) => {
                      const revision = uncertainty.revisions[0];
                      if (!revision) return null;
                      const manifest = sourceManifest(revision.sourceManifest);
                      return (
                        <li key={uncertainty.id}>
                          <div>
                            <span>
                              {humanize(revision.kind)} ·{" "}
                              {index === 0
                                ? "Largest unknown"
                                : `Open question ${index + 1}`}
                            </span>
                            <h3>{revision.statement}</h3>
                            {manifest.length > 0 && (
                              <details className="exploration-snapshot-sources">
                                <summary>
                                  Review source trail · {manifest.length}
                                </summary>
                                <ul>
                                  {manifest.map((source) => (
                                    <li key={source.key}>
                                      <span>
                                        {humanize(source.type)} ·{" "}
                                        {uncertainty.sourceStates[source.key] ??
                                          "unavailable"}
                                      </span>
                                      <p>{source.excerpt}</p>
                                      <Link href={source.href}>
                                        Open original source{" "}
                                        <ArrowRight aria-hidden="true" />
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            )}
                          </div>
                          {editable && (
                            <SnapshotUncertaintyActions
                              uncertainty={{
                                id: uncertainty.id,
                                nicheId: uncertainty.nicheId,
                                version: uncertainty.version,
                                lane: revision.lane,
                                kind: revision.kind,
                                statement: revision.statement,
                                sourceManifest: sourceManifest(
                                  revision.sourceManifest,
                                ),
                              }}
                            />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                <p>No open question has been recorded.</p>
              )}
            </section>
            <section>
              <p className="eyebrow">Coverage</p>
              <dl className="exploration-snapshot-coverage">
                {[
                  ["Targets", snapshot.coverage.targets],
                  ["Conversations", snapshot.coverage.conversations],
                  ["Observations", snapshot.coverage.observations],
                  ["Problems", snapshot.coverage.problems],
                  ["Tests", snapshot.coverage.tests],
                  ["Outcomes", snapshot.coverage.outcomes],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <nav
              className="snapshot-secondary-links"
              aria-label="Understanding actions"
            >
              <Link
                href={explorationWorkspaceHref(
                  nicheId,
                  "so-far-we-know",
                  "/review",
                )}
              >
                <MessageCircleQuestion aria-hidden="true" /> Review living
                record
              </Link>
              <Link
                href={explorationWorkspaceHref(
                  nicheId,
                  "so-far-we-know",
                  "/history",
                )}
              >
                <FileClock aria-hidden="true" /> Snapshot history
              </Link>
            </nav>
          </div>
        </details>
      </section>
    </div>
  );
}
