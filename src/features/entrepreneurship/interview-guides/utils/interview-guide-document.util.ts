import {
  INTERVIEW_GUIDE_ALLOWED_MARKS,
  INTERVIEW_GUIDE_ALLOWED_NODES,
} from "@/features/entrepreneurship/interview-guides/constants/interview-guide.constants";
import type {
  InterviewGuideDocument,
  InterviewGuideDocumentNode,
  InterviewGuideQuestionIndexItem,
} from "@/features/entrepreneurship/interview-guides/types/interview-guide.types";
import { BusinessError } from "@/features/entrepreneurship/shared/types/business.types";

const nodeTypes = new Set<string>(INTERVIEW_GUIDE_ALLOWED_NODES);
const markTypes = new Set<string>(INTERVIEW_GUIDE_ALLOWED_MARKS);
const questionIdPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]{7,99}$/;

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, max: number, label: string) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new BusinessError(`${label} is missing or too long.`);
  return value.trim();
}

function optionalText(value: unknown, max: number, label: string) {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || value.length > max)
    throw new BusinessError(`${label} is too long.`);
  return value.trim() || null;
}

export function validateInterviewGuideDocument(
  value: unknown,
): InterviewGuideDocument {
  if (!record(value) || value.schemaVersion !== 1 || !record(value.content))
    throw new BusinessError("This interview guide is not a readable document.");
  if (JSON.stringify(value).length > 250_000)
    throw new BusinessError("Keep this interview guide under 250 KB.");

  let nodes = 0;
  const questionIds = new Set<string>();
  const visit = (
    candidate: unknown,
    depth: number,
  ): InterviewGuideDocumentNode => {
    if (!record(candidate) || typeof candidate.type !== "string")
      throw new BusinessError(
        "This interview guide contains an invalid block.",
      );
    nodes += 1;
    if (nodes > 2_000 || depth > 12)
      throw new BusinessError("This interview guide is too complex to save.");
    if (!nodeTypes.has(candidate.type))
      throw new BusinessError(
        `The ${candidate.type} block is not supported in interview guides.`,
      );
    if (candidate.text != null && typeof candidate.text !== "string")
      throw new BusinessError("This interview guide contains invalid text.");
    if (typeof candidate.text === "string" && candidate.text.length > 20_000)
      throw new BusinessError("Split very long text into smaller paragraphs.");
    if (candidate.marks != null) {
      if (!Array.isArray(candidate.marks))
        throw new BusinessError(
          "This interview guide contains invalid formatting.",
        );
      for (const mark of candidate.marks) {
        if (
          !record(mark) ||
          typeof mark.type !== "string" ||
          !markTypes.has(mark.type)
        )
          throw new BusinessError(
            "This interview guide contains unsupported formatting.",
          );
        if (mark.type === "link") {
          const href = record(mark.attrs) ? mark.attrs.href : null;
          if (
            typeof href !== "string" ||
            href.length > 2_048 ||
            !/^(https?:|mailto:)/i.test(href)
          )
            throw new BusinessError(
              "Interview guide links must use http, https, or mailto.",
            );
        }
      }
    }
    if (candidate.type === "interviewQuestion") {
      if (!record(candidate.attrs))
        throw new BusinessError(
          "An interview question is missing its details.",
        );
      const questionId = text(
        candidate.attrs.questionId,
        100,
        "The interview question ID",
      );
      if (!questionIdPattern.test(questionId) || questionIds.has(questionId))
        throw new BusinessError(
          "Every interview question needs a unique, stable question ID.",
        );
      questionIds.add(questionId);
      text(candidate.attrs.prompt, 2_000, "The interview question");
      optionalText(candidate.attrs.intent, 2_000, "The question intent");
      if (
        !Array.isArray(candidate.attrs.probes) ||
        candidate.attrs.probes.length > 20
      )
        throw new BusinessError("A question can have up to 20 probes.");
      candidate.attrs.probes.forEach((probe) =>
        text(probe, 1_000, "An interview probe"),
      );
    }
    const content = candidate.content;
    if (content != null && !Array.isArray(content))
      throw new BusinessError(
        "This interview guide contains invalid nested content.",
      );
    return {
      type: candidate.type,
      ...(typeof candidate.text === "string" ? { text: candidate.text } : {}),
      ...(record(candidate.attrs) ? { attrs: candidate.attrs } : {}),
      ...(Array.isArray(candidate.marks)
        ? {
            marks: candidate.marks.map((mark) => {
              const raw = mark as Record<string, unknown>;
              const attrs = record(raw.attrs) ? raw.attrs : undefined;
              return { type: String(raw.type), ...(attrs ? { attrs } : {}) };
            }),
          }
        : {}),
      ...(Array.isArray(content)
        ? { content: content.map((child) => visit(child, depth + 1)) }
        : {}),
    };
  };

  const content = visit(value.content, 0);
  if (content.type !== "doc")
    throw new BusinessError(
      "An interview guide must begin with a document block.",
    );
  return { schemaVersion: 1, content };
}

export function interviewGuideQuestionIndex(
  document: InterviewGuideDocument,
): InterviewGuideQuestionIndexItem[] {
  const questions: InterviewGuideQuestionIndexItem[] = [];
  const visit = (node: InterviewGuideDocumentNode) => {
    if (node.type === "interviewQuestion" && node.attrs) {
      questions.push({
        questionId: String(node.attrs.questionId),
        prompt: String(node.attrs.prompt),
        intent:
          typeof node.attrs.intent === "string" && node.attrs.intent.trim()
            ? node.attrs.intent.trim()
            : null,
        probes: Array.isArray(node.attrs.probes)
          ? node.attrs.probes.map(String)
          : [],
        position: questions.length,
      });
    }
    node.content?.forEach(visit);
  };
  visit(document.content);
  return questions;
}

export function emptyInterviewGuideDocument(): InterviewGuideDocument {
  return {
    schemaVersion: 1,
    content: { type: "doc", content: [{ type: "paragraph" }] },
  };
}

export function starterInterviewGuideDocument(
  market: "B2C" | "B2B",
): InterviewGuideDocument {
  const questions =
    market === "B2C"
      ? [
          [
            "b2c-context",
            "Tell me about the last time you encountered this problem.",
          ],
          ["b2c-current-way", "How do you handle it today?"],
          ["b2c-consequence", "What happens when it is not solved?"],
        ]
      : [
          ["b2b-workflow", "Walk me through how your team handles this today."],
          ["b2b-impact", "Who feels the impact and how is it measured?"],
          [
            "b2b-decision",
            "How would a change like this be evaluated and approved?",
          ],
        ];
  return {
    schemaVersion: 1,
    content: {
      type: "doc",
      content: questions.map(([questionId, prompt]) => ({
        type: "interviewQuestion",
        attrs: { questionId, prompt, intent: "", probes: [] },
      })),
    },
  };
}
