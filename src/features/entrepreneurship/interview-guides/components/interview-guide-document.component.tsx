import { createElement, Fragment, type ReactNode } from "react";
import { Check, Circle, SkipForward } from "lucide-react";
import type {
  InterviewGuideDocument,
  InterviewGuideDocumentNode,
  InterviewGuideQuestionIndexItem,
} from "@/features/entrepreneurship/interview-guides/types/interview-guide.types";

type QuestionState = "active" | "asked" | "skipped" | "upcoming";

function renderText(node: InterviewGuideDocumentNode, key: string) {
  let content: ReactNode = node.text ?? "";
  for (const [index, mark] of (node.marks ?? []).entries()) {
    const markKey = `${key}-mark-${index}`;
    if (mark.type === "bold")
      content = <strong key={markKey}>{content}</strong>;
    if (mark.type === "italic") content = <em key={markKey}>{content}</em>;
    if (mark.type === "underline") content = <u key={markKey}>{content}</u>;
    if (mark.type === "strike") content = <s key={markKey}>{content}</s>;
    if (mark.type === "link") {
      const href = String(mark.attrs?.href ?? "");
      content = (
        <a key={markKey} href={href} target="_blank" rel="noopener noreferrer">
          {content}
        </a>
      );
    }
  }
  return content;
}

function questionFrom(node: InterviewGuideDocumentNode, position: number) {
  return {
    questionId: String(node.attrs?.questionId ?? ""),
    prompt: String(node.attrs?.prompt ?? ""),
    intent:
      typeof node.attrs?.intent === "string" && node.attrs.intent.trim()
        ? node.attrs.intent.trim()
        : null,
    probes: Array.isArray(node.attrs?.probes)
      ? node.attrs.probes
          .map(String)
          .map((probe) => probe.trim())
          .filter(Boolean)
      : [],
    position,
  } satisfies InterviewGuideQuestionIndexItem;
}

function indexQuestionPositions(document: InterviewGuideDocument) {
  const positions = new Map<string, number>();
  const visit = (node: InterviewGuideDocumentNode) => {
    if (node.type === "interviewQuestion")
      positions.set(String(node.attrs?.questionId ?? ""), positions.size);
    node.content?.forEach(visit);
  };
  visit(document.content);
  return positions;
}

export function InterviewGuideDocumentView({
  document,
  activeQuestionId,
  askedQuestionIds = [],
  skippedQuestionIds = [],
  renderQuestionActions,
}: {
  document: InterviewGuideDocument;
  activeQuestionId?: string | null;
  askedQuestionIds?: string[];
  skippedQuestionIds?: string[];
  renderQuestionActions?: (
    question: InterviewGuideQuestionIndexItem,
  ) => ReactNode;
}) {
  const asked = new Set(askedQuestionIds);
  const skipped = new Set(skippedQuestionIds);
  const questionPositions = indexQuestionPositions(document);

  const renderNode = (
    node: InterviewGuideDocumentNode,
    key: string,
  ): ReactNode => {
    if (node.type === "text") return renderText(node, key);
    if (node.type === "hardBreak") return <br key={key} />;

    const children = node.content?.map((child, index) =>
      renderNode(child, `${key}-${index}`),
    );
    if (node.type === "doc") return <Fragment key={key}>{children}</Fragment>;
    if (node.type === "paragraph") return <p key={key}>{children}</p>;
    if (node.type === "bulletList") return <ul key={key}>{children}</ul>;
    if (node.type === "orderedList") return <ol key={key}>{children}</ol>;
    if (node.type === "listItem") return <li key={key}>{children}</li>;
    if (node.type === "heading") {
      const requestedLevel = Number(node.attrs?.level);
      const level =
        requestedLevel >= 1 && requestedLevel <= 6 ? requestedLevel : 2;
      return createElement(`h${level}`, { key }, children);
    }
    if (node.type === "interviewQuestion") {
      const questionId = String(node.attrs?.questionId ?? "");
      const question = questionFrom(
        node,
        questionPositions.get(questionId) ?? 0,
      );
      const state: QuestionState = skipped.has(question.questionId)
        ? "skipped"
        : asked.has(question.questionId)
          ? "asked"
          : question.questionId === activeQuestionId
            ? "active"
            : "upcoming";
      return (
        <section
          key={key}
          className="interview-guide-document-question"
          data-state={state}
          aria-label={`Question ${question.position + 1}`}
        >
          <header>
            <span>
              {state === "asked" ? (
                <Check aria-hidden="true" />
              ) : state === "skipped" ? (
                <SkipForward aria-hidden="true" />
              ) : (
                <Circle aria-hidden="true" />
              )}
              Question {question.position + 1}
            </span>
            {state === "asked" && <small>Asked</small>}
            {state === "skipped" && <small>Skipped</small>}
            {state === "active" && <small>Up next</small>}
          </header>
          <h3>{question.prompt}</h3>
          {question.intent && (
            <p className="interview-guide-question-intent">
              <strong>Listen for</strong>
              {question.intent}
            </p>
          )}
          {question.probes.length > 0 && (
            <div className="interview-guide-question-probes">
              <strong>Optional follow-ups</strong>
              <ul>
                {question.probes.map((probe, index) => (
                  <li key={`${probe}-${index}`}>{probe}</li>
                ))}
              </ul>
            </div>
          )}
          {state === "active" && renderQuestionActions?.(question)}
        </section>
      );
    }
    return null;
  };

  return (
    <div className="interview-guide-document-view">
      {renderNode(document.content, "guide")}
    </div>
  );
}
