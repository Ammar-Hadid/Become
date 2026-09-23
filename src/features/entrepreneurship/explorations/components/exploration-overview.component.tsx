import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  FileCheck2,
  MessageSquareText,
  Send,
  Shapes,
  Tags,
} from "lucide-react";
import {
  getExploration,
  getExplorationSignals,
  getExplorationSummary,
} from "@/features/entrepreneurship/explorations/queries/exploration.query";
import { explorationWorkspaceHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";
import { getInteractionOptions } from "@/features/entrepreneurship/interactions/queries/interaction.query";
import { EvidenceCapture } from "@/features/entrepreneurship/evidence/components/evidence-capture.component";
import { EvidenceJournal } from "@/features/entrepreneurship/evidence/components/evidence-journal.component";
import { FollowUpRecord } from "@/features/entrepreneurship/follow-ups/components/follow-up.component";
import { getExplorationSnapshot } from "@/features/entrepreneurship/exploration-snapshots/queries/exploration-snapshot.query";

function recommendationHref(
  nicheId: string,
  recommendation: NonNullable<
    Awaited<ReturnType<typeof getExplorationSnapshot>>
  >["recommendation"],
) {
  if (recommendation.code === "RESUME_INTERVIEW" && recommendation.targetId)
    return explorationWorkspaceHref(
      nicheId,
      "conversations",
      `/${recommendation.targetId}/conduct`,
    );
  if (recommendation.code === "RECORD_TEST_OUTCOME" && recommendation.targetId)
    return explorationWorkspaceHref(
      nicheId,
      "offers",
      `/${recommendation.targetId}`,
    );
  if (recommendation.code === "START_TEST" && recommendation.targetId)
    return explorationWorkspaceHref(
      nicheId,
      "so-far-we-know",
      `/problems/${recommendation.targetId}`,
    );
  if (recommendation.code === "START_CONVERSATION" && recommendation.targetId)
    return `${explorationWorkspaceHref(nicheId, "conversations")}?linkedInteractionId=${encodeURIComponent(recommendation.targetId)}`;
  if (recommendation.code === "REVIEW_SNAPSHOT")
    return explorationWorkspaceHref(nicheId, "so-far-we-know", "/review");
  return explorationWorkspaceHref(
    nicheId,
    recommendation.stage === "SCOPE"
      ? "audience"
      : recommendation.stage === "REACH"
        ? "outreach"
        : recommendation.stage === "LEARN"
          ? "conversations"
          : recommendation.stage === "TEST"
            ? "offers"
            : "so-far-we-know",
  );
}

export async function ExplorationOverview({
  userId,
  nicheId,
}: {
  userId: string;
  nicheId: string;
}) {
  const [niche, summary, signals, options, snapshot] = await Promise.all([
    getExploration(userId, nicheId),
    getExplorationSummary(userId, nicheId),
    getExplorationSignals(userId, nicheId),
    getInteractionOptions(userId, nicheId),
    getExplorationSnapshot(userId, nicheId),
  ]);
  const workspaces = [
    {
      key: "audience",
      label: "Audience",
      note: "Shape who this is for",
      value: summary.segments + summary.people + summary.companies,
      icon: Shapes,
    },
    {
      key: "outreach",
      label: "Outreach",
      note: "Move targets into contact",
      value: summary.interactions,
      icon: Send,
    },
    {
      key: "conversations",
      label: "Conversations",
      note: "Keep the exchange intact",
      value: summary.conversations,
      icon: MessageSquareText,
    },
    {
      key: "evidence",
      label: "Evidence",
      note: "Trace what changed your view",
      value: summary.evidence,
      icon: FileCheck2,
    },
    {
      key: "offers",
      label: "Offers",
      note: "Test a promise and terms",
      value: summary.offers,
      icon: Tags,
    },
  ] as const;

  return (
    <div className="direct-workspace overview-workspace">
      <header className="workspace-heading overview-heading">
        <div>
          <h2>Overview</h2>
        </div>
        {!niche?.archivedAt && (
          <EvidenceCapture {...options} triggerVariant="quiet" />
        )}
      </header>

      {snapshot && (
        <section
          className="overview-next-move"
          aria-labelledby="overview-next-move"
        >
          <div>
            <p className="eyebrow">One useful next move</p>
            <h3 id="overview-next-move">{snapshot.recommendation.title}</h3>
            <details>
              <summary>Why this now?</summary>
              <p>{snapshot.recommendation.reason}</p>
            </details>
          </div>
          <Link
            className="workspace-primary-link"
            href={recommendationHref(nicheId, snapshot.recommendation)}
          >
            {snapshot.recommendation.title} <ArrowRight aria-hidden="true" />
          </Link>
        </section>
      )}

      <section
        className="overview-command"
        aria-labelledby="overview-understanding"
      >
        <div className="overview-command-copy">
          <span className="overview-command-icon" aria-hidden="true">
            <BookOpenText />
          </span>
          <div>
            <p className="eyebrow">Central understanding</p>
            <h3 id="overview-understanding">So Far We Know</h3>
            <p>Findings, open questions, and decisions.</p>
          </div>
        </div>
        <dl>
          <div>
            <dt>Problems</dt>
            <dd>{summary.problems}</dd>
          </div>
          <div>
            <dt>Segments</dt>
            <dd>{summary.segments}</dd>
          </div>
          <div>
            <dt>Conversations</dt>
            <dd>{summary.conversations}</dd>
          </div>
        </dl>
        <Link href={explorationWorkspaceHref(nicheId, "so-far-we-know")}>
          Open understanding <ArrowRight aria-hidden="true" />
        </Link>
      </section>

      <nav className="overview-workspaces" aria-label="Workspace shortcuts">
        {workspaces.map(({ key, label, note, value, icon: Icon }) => (
          <Link key={key} href={explorationWorkspaceHref(nicheId, key)}>
            <Icon aria-hidden="true" />
            <span>
              <strong>{label}</strong>
              <small>{note}</small>
            </span>
            <span className="overview-workspace-count">{value}</span>
            <ArrowRight aria-hidden="true" />
          </Link>
        ))}
      </nav>

      <div className="overview-lower-grid">
        <section className="overview-recent">
          <header>
            <div>
              <p className="eyebrow">Recent material</p>
              <h3>Latest evidence</h3>
            </div>
            <Link
              className="business-text-link"
              href={explorationWorkspaceHref(nicheId, "evidence")}
            >
              View all <ArrowRight aria-hidden="true" />
            </Link>
          </header>
          <EvidenceJournal
            data={{ entries: signals.recentEvidence, next: null }}
            nicheId={nicheId}
          />
        </section>
        <aside className="overview-next-actions">
          <header>
            <p className="eyebrow">Committed next moves</p>
            <h3>
              {signals.nextActions.length
                ? `${signals.nextActions.length} follow-ups`
                : "The path is open"}
            </h3>
          </header>
          {signals.nextActions.length ? (
            signals.nextActions.map((record) => (
              <FollowUpRecord key={record.id} record={record} />
            ))
          ) : (
            <p>
              No follow-up is waiting. Use the workspace with the largest
              unanswered question.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
