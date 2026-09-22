import { notFound } from "next/navigation";
import Link from "next/link";
import { getInterviewGuide } from "@/features/entrepreneurship/interview-guides/queries/interview-guide.query";
import { getAudienceOptions } from "@/features/entrepreneurship/audiences/queries/audience.query";
import {
  validateInterviewGuideDocument,
  interviewGuideQuestionIndex,
} from "@/features/entrepreneurship/interview-guides/utils/interview-guide-document.util";
import { InterviewGuideEditor } from "@/features/entrepreneurship/interview-guides/components/interview-guide-editor.component";
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
      <article className="interview-guide-preview">
        <header>
          <div>
            <p className="eyebrow">Guide preview · {guide.marketType}</p>
            <h2>{guide.title}</h2>
            <p>{guide.objective}</p>
          </div>
          <Link
            className="finance-dialog-trigger finance-dialog-trigger--secondary"
            href={explorationHref(nicheId, `/learn/guides/${guide.id}/edit`)}
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
        </dl>
        <ol>
          {questions.map((question, index) => (
            <li key={question.questionId}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{question.prompt}</h3>
                {question.intent && (
                  <p>
                    <strong>Intent</strong> {question.intent}
                  </p>
                )}
                {question.probes.length > 0 && (
                  <ul>
                    {question.probes.map((probe) => (
                      <li key={probe}>{probe}</li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
      </article>
    );
  }
  return (
    <InterviewGuideEditor
      key={guide.version}
      initial={{
        id: guide.id,
        nicheId: guide.nicheId,
        title: guide.title,
        objective: guide.objective,
        marketType: guide.marketType as "B2C" | "B2B",
        segmentId: guide.segmentId,
        expectedDurationMinutes: guide.expectedDurationMinutes,
        version: guide.version,
        savedAt: guide.savedAt.toISOString(),
        archived: Boolean(guide.archivedAt),
        document,
        questions,
        publishedVersion: guide.revisions[0]?.version ?? null,
      }}
      segments={options.segments}
    />
  );
}
