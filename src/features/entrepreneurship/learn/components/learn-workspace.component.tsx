import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  MessageSquareText,
  NotebookPen,
  SearchCheck,
} from "lucide-react";
import { getLearnWorkspace } from "@/features/entrepreneurship/conversations/queries/conversation.query";
import { LearnNavigation } from "@/features/entrepreneurship/learn/components/learn-navigation.component";
import { explorationHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";

export async function LearnWorkspace({
  userId,
  nicheId,
}: {
  userId: string;
  nicheId: string;
}) {
  const counts = await getLearnWorkspace(userId, nicheId);
  const areas = [
    [
      "conversations",
      "Conversations",
      "The two-sided exchange, including interrupted interviews and historical summaries.",
      counts.conversations,
      MessageSquareText,
    ],
    [
      "observations",
      "Observations",
      "Specific things you heard, saw or found — kept apart from interpretation.",
      counts.observations,
      NotebookPen,
    ],
    [
      "sources",
      "Sources",
      "The traceable record behind observations and the claims they inform.",
      counts.sources,
      SearchCheck,
    ],
    [
      "guides",
      "Interview guides",
      "Prompts that support a conversation without forcing it into a questionnaire.",
      counts.guides,
      BookOpenText,
    ],
  ] as const;
  return (
    <div className="exploration-stage">
      <header className="exploration-stage-heading">
        <div>
          <h2>Keep the exchange before you decide what it means.</h2>
          <p>
            Conversations produce messages. You deliberately promote a message
            into an observation; observations may then support or challenge a
            problem.
          </p>
        </div>
      </header>
      <LearnNavigation nicheId={nicheId} />
      <div className="exploration-learn-index">
        {areas.map(([slug, title, description, count, Icon], index) => (
          <Link
            key={slug}
            href={explorationHref(nicheId, `/learn/${slug}`)}
            data-major={index === 0 || undefined}
          >
            <span className="exploration-learn-index-number">0{index + 1}</span>
            <Icon aria-hidden="true" />
            <div>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
            <strong>{count}</strong>
            <ArrowRight aria-hidden="true" />
          </Link>
        ))}
      </div>
    </div>
  );
}
