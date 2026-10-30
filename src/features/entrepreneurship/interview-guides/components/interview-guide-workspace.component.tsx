import { Card } from "@/components/ui/cards/card.component";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getInterviewGuide } from "@/features/entrepreneurship/interview-guides/queries/interview-guide.query";
import { getAudienceOptions } from "@/features/entrepreneurship/audiences/queries/audience.query";
import {
  validateInterviewGuideDocument,
  interviewGuideQuestionIndex,
} from "@/features/entrepreneurship/interview-guides/utils/interview-guide-document.util";
import { InterviewGuideEditor } from "@/features/entrepreneurship/interview-guides/components/interview-guide-editor.component";
import { InterviewGuideDocumentView } from "@/features/entrepreneurship/interview-guides/components/interview-guide-document.component";
import { explorationHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";
import { businessDate } from "@/features/entrepreneurship/shared/utils/business.util";

export async function InterviewGuideWorkspace({
  userId,
  nicheId,
  guideId,
  preview = false,
}: {
  userId: string;
  nicheId: string;
  guideId: string;
  preview?: boolean;
}) {
  const [guide, options] = await Promise.all([
    getInterviewGuide(userId, guideId),
    getAudienceOptions(userId, nicheId),
  ]);
  if (!guide || guide.nicheId !== nicheId) notFound();
  const document = validateInterviewGuideDocument(guide.draftDocument);
  const questions = interviewGuideQuestionIndex(document);
  if (preview) {
    return (
      <Card className="interview-guide-preview">
        <header>
          <div>
            <Link href={explorationHref(nicheId, "/conversations/guides")}>
              ← All guides
            </Link>
            <p className="eyebrow">Draft preview · {guide.marketType}</p>
            <h1>{guide.title}</h1>
            <p>{guide.objective}</p>
          </div>
          <Link
            className="become-button become-button--secondary become-button--md"
            href={explorationHref(
              nicheId,
              `/conversations/guides/${guide.id}/edit`,
            )}
          >
            Back to editor
          </Link>
        </header>
        <dl>
          <div>
            <dt>Audience</dt>
            <dd>{guide.segment?.name ?? "Any relevant segment"}</dd>
          </div>
          <div>
            <dt>Expected time</dt>
            <dd>{guide.expectedDurationMinutes} minutes</dd>
          </div>
          <div>
            <dt>Last saved</dt>
            <dd>{businessDate(guide.savedAt)}</dd>
          </div>
          <div>
            <dt>Questions</dt>
            <dd>{questions.length} optional</dd>
          </div>
        </dl>
        <InterviewGuideDocumentView document={document} />
      </Card>
    );
  }
  return (
    <InterviewGuideEditor
      key={guide.id}
      initial={{
        id: guide.id,
        nicheId: guide.nicheId,
        title: guide.title,
        objective: guide.objective,
        marketType: guide.marketType as "B2C" | "B2B",
        segmentId: guide.segmentId,
        segmentName: guide.segment?.name ?? null,
        expectedDurationMinutes: guide.expectedDurationMinutes,
        version: guide.version,
        savedAt: guide.savedAt.toISOString(),
        archived: Boolean(guide.archivedAt),
        document,
        publishedVersion: guide.revisions[0]?.version ?? null,
      }}
      segments={options.segments}
    />
  );
}
