import Link from "next/link";
import {
  ArrowUpRight,
  Compass,
  MessageSquareText,
  ScanSearch,
  FileCheck2,
  Tags,
} from "lucide-react";
import { Card } from "@/components/ui/cards/card.component";
import { IconFrame } from "@/components/ui/icons/icon-frame.component";
import {
  WorkspaceLink,
  WorkspaceMetric,
  WorkspacePanel,
} from "@/components/ui/workspace/workspace.component";
import { PastExplorations } from "@/features/entrepreneurship/explorations/components/past-explorations.component";
import { getExplorations } from "@/features/entrepreneurship/explorations/queries/exploration.query";
import {
  currentExplorations,
  explorationWorkspaceHref,
} from "@/features/entrepreneurship/explorations/utils/exploration.util";
import {
  StartExplorationForm,
  ExplorationDirectionSummary,
} from "@/features/entrepreneurship/explorations/components/exploration-forms.component";
import {
  businessDate,
  humanize,
} from "@/features/entrepreneurship/shared/utils/business.util";

export async function ExplorationHome({ userId }: { userId: string }) {
  const { current, alsoActive, past } = currentExplorations(
    await getExplorations(userId),
  );
  return (
    <div className="business-home">
      <div className="business-home-primary">
        <Card
          className="business-focus"
          material="elevated-glass"
          aria-label="Current exploration"
        >
          <div className="business-focus-heading">
            <IconFrame treatment="featured" area="entrepreneurship">
              <Compass />
            </IconFrame>
            <p className="eyebrow">
              {current ? "Your current exploration" : "A place to begin"}
            </p>
          </div>
          <h2>{current?.name ?? "What are you curious about?"}</h2>
          <p className="business-focus-question">
            {current?.scope ||
              (current
                ? "Learn who needs this and whether it is worth pursuing."
                : "An idea, a frustration, or a question. You do not need all the answers to start.")}
          </p>
          {current ? (
            <>
              <p className="business-focus-context">
                <ExplorationDirectionSummary
                  marketFocus={current.marketFocus}
                  marketConclusion={current.marketConclusion}
                />
              </p>
              <WorkspaceLink
                href={explorationWorkspaceHref(current.id, "overview")}
              >
                Continue exploring <ArrowUpRight aria-hidden="true" />
              </WorkspaceLink>
            </>
          ) : (
            <StartExplorationForm />
          )}
        </Card>
        <WorkspacePanel
          className="business-home-start"
          title={current ? "Explore another idea" : "A simple rhythm"}
          description={
            current
              ? "Give a new question its own space. Your existing work stays here."
              : "Keep what you learn and let the evidence guide your next step."
          }
        >
          {current ? (
            <StartExplorationForm />
          ) : (
            <ol className="business-start-rhythm">
              <li>
                <span>01</span>
                <div>
                  <strong>Ask a question</strong>
                  <p>Choose something specific to understand.</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>Listen and learn</strong>
                  <p>Keep conversations and useful evidence together.</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>Decide what is worth pursuing</strong>
                  <p>Test an offer when you have a reason to.</p>
                </div>
              </li>
            </ol>
          )}
          <Link className="business-text-link" href="/entrepreneurship/history">
            Across every exploration <ArrowUpRight aria-hidden="true" />
          </Link>
        </WorkspacePanel>
      </div>
      {current && (
        <div className="business-home-metrics" aria-label="Recorded activity">
          <WorkspaceMetric
            label="Evidence entries"
            value={current.summary.evidenceEntries}
            icon={<FileCheck2 />}
          />
          <WorkspaceMetric
            label="Conversations"
            value={current.summary.conversations}
            icon={<MessageSquareText />}
          />
          <WorkspaceMetric
            label="Problems explored"
            value={current.summary.problems}
            icon={<ScanSearch />}
          />
          <WorkspaceMetric
            label="Offers"
            value={current.summary.offers}
            icon={<Tags />}
          />
        </div>
      )}
      {alsoActive.length > 0 && (
        <WorkspacePanel
          title="Other active explorations"
          description="Return to any question when you are ready."
        >
          <div className="business-active-grid">
            {alsoActive.map((n) => (
              <Link
                key={n.id}
                href={explorationWorkspaceHref(n.id, "overview")}
                className="business-active-record"
              >
                <span className="business-kicker">{humanize(n.direction)}</span>
                <h3>{n.name}</h3>
                <p>{n.scope || "No question recorded yet."}</p>
                <span className="business-meta">
                  {n.summary.conversations} conversations · {n.summary.problems}{" "}
                  problems <ArrowUpRight aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </WorkspacePanel>
      )}
      <PastExplorations
        explorations={past.map((exploration) => {
          const statusDate =
            exploration.archivedAt ??
            exploration.decisions[0]?.createdAt ??
            exploration.createdAt;
          return {
            id: exploration.id,
            href: explorationWorkspaceHref(exploration.id, "overview"),
            name: exploration.name,
            scope: exploration.scope ?? "",
            evidenceEntries: exploration.summary.evidenceEntries,
            conversations: exploration.summary.conversations,
            direction: humanize(exploration.direction),
            statusDate: businessDate(statusDate),
            statusDateIso: statusDate.toISOString(),
            archived: Boolean(exploration.archivedAt),
          };
        })}
      />
    </div>
  );
}
