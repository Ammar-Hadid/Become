import { describe, expect, it } from "vitest";
import {
  interviewGuideQuestionIndex,
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
});
