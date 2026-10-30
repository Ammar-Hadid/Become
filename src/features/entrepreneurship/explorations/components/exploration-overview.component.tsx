import { Card } from "@/components/ui/cards/card.component";
import { IconFrame } from "@/components/ui/icons/icon-frame.component";
import {
  WorkspaceHeader,
  WorkspaceLink,
  WorkspacePanel,
} from "@/components/ui/workspace/workspace.component";
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
    <div className="direct-workspace business-overview">
      <WorkspaceHeader
        title="Your next move"
        description="Keep learning, one useful step at a time."
        actions={
          !niche?.archivedAt ? (
            <EvidenceCapture {...options} triggerVariant="quiet" />
          ) : undefined
        }
      />
      <div className="business-overview-focus">
        {snapshot && (
          <Card material="elevated-glass" className="business-recommendation">
            <p className="eyebrow">Suggested from your records</p>
            <h3>{snapshot.recommendation.title}</h3>
            <p>{snapshot.recommendation.reason}</p>
            <WorkspaceLink
              href={recommendationHref(nicheId, snapshot.recommendation)}
            >
              {snapshot.recommendation.title}
              <ArrowRight aria-hidden="true" />
            </WorkspaceLink>
          </Card>
        )}
        <WorkspacePanel
          title="So Far We Know"
          description="Your findings, open questions and decisions."
          className="business-understanding"
        >
          <IconFrame treatment="featured" area="entrepreneurship">
            <BookOpenText />
          </IconFrame>
          <dl className="business-understanding-facts">
            <div>
              <dd>{summary.problems}</dd>
              <dt>Problems</dt>
            </div>
            <div>
              <dd>{summary.segments}</dd>
              <dt>Segments</dt>
            </div>
            <div>
              <dd>{summary.conversations}</dd>
              <dt>Conversations</dt>
            </div>
          </dl>
          <WorkspaceLink
            variant="secondary"
            href={explorationWorkspaceHref(nicheId, "so-far-we-know")}
          >
            Open understanding <ArrowRight aria-hidden="true" />
          </WorkspaceLink>
        </WorkspacePanel>
      </div>
      <nav
        className="business-destination-grid"
        aria-label="Workspace shortcuts"
      >
        {workspaces.map(({ key, label, note, value, icon: Icon }) => (
          <Link
            href={explorationWorkspaceHref(nicheId, key)}
            key={key}
            className="business-destination"
          >
            <Card spacing="dense">
              <IconFrame treatment="compact" area="entrepreneurship">
                <Icon />
              </IconFrame>
              <span className="business-destination-value">{value}</span>
              <h3>{label}</h3>
              <p>{note}</p>
              <ArrowRight
                className="business-destination-arrow"
                aria-hidden="true"
              />
            </Card>
          </Link>
        ))}
      </nav>
      <div className="business-overview-bottom">
        <WorkspacePanel
          title="Latest evidence"
          actions={
            <Link
              className="business-text-link"
              href={explorationWorkspaceHref(nicheId, "evidence")}
            >
              View all <ArrowRight aria-hidden="true" />
            </Link>
          }
        >
          <EvidenceJournal
            data={{ entries: signals.recentEvidence, next: null }}
            nicheId={nicheId}
          />
        </WorkspacePanel>
        <WorkspacePanel
          title="Follow-ups"
          description={
            signals.nextActions.length
              ? `${signals.nextActions.length} chosen next actions`
              : "Nothing scheduled right now."
          }
        >
          {signals.nextActions.length ? (
            signals.nextActions.map((record) => (
              <FollowUpRecord key={record.id} record={record} />
            ))
          ) : (
            <WorkspaceLink
              variant="secondary"
              href={explorationWorkspaceHref(nicheId, "outreach")}
            >
              Open outreach <ArrowRight aria-hidden="true" />
            </WorkspaceLink>
          )}
        </WorkspacePanel>
      </div>
    </div>
  );
}
