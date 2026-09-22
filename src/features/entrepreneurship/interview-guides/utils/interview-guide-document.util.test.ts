import { describe, expect, it } from "vitest";
import {
  interviewGuideQuestionIndex,
  interviewGuideHasContent,
  emptyInterviewGuideDocument,
  starterInterviewGuideDocument,
  validateInterviewGuideDocument,
} from "@/features/entrepreneurship/interview-guides/utils/interview-guide-document.util";

describe("interview guide documents", () => {
  it("extracts a stable ordered question index", () => {
    const document = validateInterviewGuideDocument(
      starterInterviewGuideDocument("B2C"),
    );
    expect(interviewGuideQuestionIndex(document)).toMatchObject([
      { questionId: "b2c-context", position: 0 },
      { questionId: "b2c-current-way", position: 1 },
      { questionId: "b2c-consequence", position: 2 },
    ]);
  });

  it("rejects duplicate question identities", () => {
    const document = starterInterviewGuideDocument("B2B");
    document.content.content![1].attrs!.questionId = "b2b-workflow";
    expect(() => validateInterviewGuideDocument(document)).toThrow(
      /unique, stable question ID/,
    );
  });

  it("keeps prose and formatting around optional questions through validation", () => {
    const document = starterInterviewGuideDocument("B2B");
    document.content.content!.unshift({
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Listen before suggesting" }],
    });
    document.content.content!.push({
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Ask for a concrete example.",
          marks: [{ type: "bold" }, { type: "underline" }],
        },
      ],
    });
    expect(
      validateInterviewGuideDocument(JSON.parse(JSON.stringify(document))),
    ).toEqual(document);
    expect(interviewGuideQuestionIndex(document)).toHaveLength(3);
    expect(interviewGuideHasContent(document)).toBe(true);
  });

  it("allows meaningful prose without questions but rejects a blank guide", () => {
    const document = emptyInterviewGuideDocument();
    expect(interviewGuideHasContent(document)).toBe(false);
    document.content.content = [
      { type: "paragraph", content: [{ type: "text", text: "  \n " }] },
    ];
    expect(interviewGuideHasContent(document)).toBe(false);
    document.content.content[0].content![0].text =
      "Explore their current workflow.";
    const validated = validateInterviewGuideDocument(document);
    expect(interviewGuideHasContent(validated)).toBe(true);
    expect(interviewGuideQuestionIndex(validated)).toEqual([]);
  });

  it("preserves partial question drafts and line breaks without indexing blank probes", () => {
    const document = starterInterviewGuideDocument("B2B");
    const question = document.content.content!.find(
      (node) => node.type === "interviewQuestion",
    )!;
    question.attrs!.prompt = "";
    question.attrs!.probes = ["First probe", "", "Second probe", ""];
    expect(validateInterviewGuideDocument(document)).toEqual(document);
    expect(interviewGuideQuestionIndex(document)[0].probes).toEqual([
      "First probe",
      "Second probe",
    ]);
  });
});
