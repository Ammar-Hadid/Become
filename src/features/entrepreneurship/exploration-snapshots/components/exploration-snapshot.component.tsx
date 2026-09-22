import Link from "next/link";
import {
  ArrowRight,
  AlertTriangle,
  Clock3,
  FileClock,
  MessageCircleQuestion,
  Quote,
} from "lucide-react";
import { getExplorationSnapshot } from "@/features/entrepreneurship/exploration-snapshots/queries/exploration-snapshot.query";
import { getObservationChoices } from "@/features/entrepreneurship/problems/queries/problem.query";
import { explorationHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";
import { businessDate } from "@/features/entrepreneurship/shared/utils/business.util";
import { ExplorationFieldNotes } from "@/features/entrepreneurship/exploration-snapshots/components/exploration-field-notes.component";
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

function recommendationHref(snapshot: Snapshot, nicheId: string) {
  const recommendation = snapshot.recommendation;
  if (recommendation.code === "RESUME_INTERVIEW" && recommendation.targetId)
    return explorationHref(
      nicheId,
      `/learn/conversations/${recommendation.targetId}/conduct`,
    );
  if (recommendation.code === "RECORD_TEST_OUTCOME" && recommendation.targetId)
    return explorationHref(nicheId, `/test/offers/${recommendation.targetId}`);
  if (recommendation.code === "START_TEST" && recommendation.targetId)
    return explorationHref(
      nicheId,
      `/decide/problems/${recommendation.targetId}`,
    );
  if (recommendation.code === "START_CONVERSATION" && recommendation.targetId)
    return `${explorationHref(nicheId, "/learn/conversations")}?linkedInteractionId=${encodeURIComponent(recommendation.targetId)}`;
  if (recommendation.code === "REVIEW_SNAPSHOT")
    return explorationHref(nicheId, "/snapshot/review");
  return explorationHref(nicheId, `/${recommendation.stage.toLowerCase()}`);
}

function SnapshotClaimRow({
  claim,
  featured = false,
  editable = false,
  observations,
}: {
  claim: SnapshotClaim;
  featured?: boolean;
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

  return (
    <article
      className="exploration-snapshot-claim"
      data-featured={featured || undefined}
    >
      <div className="exploration-snapshot-claim-copy">
        <div className="exploration-snapshot-claim-label">
          <span>
            {revision.kind === "OBSERVED" ? "Observed" : "Interpretation"}
          </span>
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
                })),
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
      {revision.citations.length > 0 && (
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
  const featuredId = claims.reduce<SnapshotClaim | null>((strongest, claim) => {
    if (!strongest) return claim;
    const count = claim.revisions[0]?.citations.length ?? 0;
    const strongestCount = strongest.revisions[0]?.citations.length ?? 0;
    return count > strongestCount ? claim : strongest;
  }, null)?.id;
  return (
    <section
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
              featured={claim.id === featuredId && lane !== "CROSS_MARKET"}
              editable={editable}
              observations={observations}
            />
          ))}
        </div>
      ) : (
        <div className="exploration-snapshot-lane-empty">
          <Quote aria-hidden="true" />
          <p>No current finding for this market yet.</p>
          <span>Keep a source in Learn, then decide what it changes here.</span>
        </div>
      )}
    </section>
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
  const [snapshot, observations] = await Promise.all([
    getExplorationSnapshot(userId, nicheId),
    review ? getObservationChoices(userId, nicheId) : Promise.resolve([]),
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
  const nextHref = recommendationHref(snapshot, nicheId);
  const editable = review && !snapshot.niche.archivedAt;

  return (
    <div className="exploration-snapshot-layout">
      <section className="exploration-snapshot-editorial">
        <header className="exploration-snapshot-heading">
          <div>
            <p className="eyebrow">
              {review ? "Review the record" : "So far we know"}
            </p>
            <h2>
              {review
                ? "What belongs in the next edition?"
                : "Current understanding from real conversations"}
            </h2>
            <p>
              {review
                ? "Add findings and unknowns, trace them to observations, then publish a historical edition when the picture is useful."
                : "A living record of what you observed, what you infer, and where the evidence still pulls in different directions."}
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
          <div className="exploration-snapshot-empty">
            <Quote aria-hidden="true" />
            <div>
              <h3>Your understanding is still open.</h3>
              <p>
                Define who you are exploring, then keep a real conversation or
                source. Snapshot will become useful as those records turn into
                explicit observations and findings.
              </p>
            </div>
            <div className="business-actions">
              <Link
                className="finance-dialog-trigger"
                href={explorationHref(nicheId, "/scope")}
              >
                Define the scope
              </Link>
              <Link
                className="finance-dialog-trigger finance-dialog-trigger--secondary"
                href={explorationHref(nicheId, "/learn/sources")}
              >
                Record a source
              </Link>
            </div>
          </div>
        )}

        <ExplorationFieldNotes inline>
          <section className="exploration-field-note exploration-field-note--major">
            <p className="eyebrow">Largest uncertainty</p>
            {snapshot.uncertainties.length > 0 ? (
              <>
                <ul className="exploration-uncertainty-list">
                  {snapshot.uncertainties.map((uncertainty, index) => {
                    const revision = uncertainty.revisions[0];
                    if (!revision) return null;
                    return (
                      <li key={uncertainty.id}>
                        <div>
                          <span>
                            {index === 0
                              ? "Largest unknown"
                              : `Open question ${index + 1}`}
                          </span>
                          <h3>{revision.statement}</h3>
                        </div>
                        {editable && (
                          <SnapshotUncertaintyActions
                            uncertainty={{
                              id: uncertainty.id,
                              nicheId: uncertainty.nicheId,
                              version: uncertainty.version,
                              lane: revision.lane,
                              statement: revision.statement,
                            }}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
                <p>
                  Keep this visible until evidence resolves it. An unknown is
                  not a problem claim and does not become one automatically.
                </p>
              </>
            ) : (
              <>
                <h3>What could still change your mind?</h3>
                <p>Name the highest-value unknown during snapshot review.</p>
              </>
            )}
          </section>
          <section className="exploration-field-note exploration-field-note--action">
            <p className="eyebrow">Next useful move</p>
            <h3>{snapshot.recommendation.title}</h3>
            <p>{snapshot.recommendation.reason}</p>
            <Link className="exploration-next-move" href={nextHref}>
              {snapshot.recommendation.title} <ArrowRight aria-hidden="true" />
            </Link>
          </section>
          <section className="exploration-field-note exploration-field-note--coverage">
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
            className="exploration-field-note-links"
            aria-label="Snapshot actions"
          >
            <Link href={explorationHref(nicheId, "/snapshot/review")}>
              <MessageCircleQuestion aria-hidden="true" /> Review living record
            </Link>
            <Link href={explorationHref(nicheId, "/snapshot/history")}>
              <FileClock aria-hidden="true" /> Snapshot history
            </Link>
            {snapshot.latestMaterialAt && (
              <p>
                <Clock3 aria-hidden="true" /> Latest material{" "}
                {businessDate(snapshot.latestMaterialAt)}
              </p>
            )}
          </nav>
        </ExplorationFieldNotes>

        <footer
          className="exploration-snapshot-lineage"
          aria-label="Insight lineage"
        >
          <p className="eyebrow">Insight lineage</p>
          {[
            ["Reach", "Outreach"],
            ["Learn", "Conversation"],
            ["Observation", "What was noticed"],
            ["Decide", "Problem shaped"],
            ["Test", "Offer tried"],
          ].map(([label, detail], index) => (
            <div key={label}>
              <strong>{label}</strong>
              <small>{detail}</small>
              {index < 4 && <ArrowRight aria-hidden="true" />}
            </div>
          ))}
        </footer>
      </section>
    </div>
  );
}
