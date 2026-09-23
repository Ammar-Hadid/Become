import { describe, expect, it } from "vitest";
import {
  boundSynthesisContext,
  synthesisFreshness,
  validateSynthesisOutput,
} from "./synthesis-context.util";
import type {
  SynthesisContext,
  SynthesisOutput,
} from "../types/synthesis.types";
const context: SynthesisContext = {
  schemaVersion: 1,
  exploration: { id: "exploration", name: "Research", scope: null },
  materialFingerprint: "material",
  baseUnderstandingFingerprint: "understanding",
  contextFingerprint: "",
  coverage: {
    eligibleSources: 1,
    includedSources: 1,
    omittedSources: 0,
    eligibleUnderstanding: 0,
    includedUnderstanding: 0,
    omittedUnderstanding: 0,
  },
  metrics: { OBSERVATION: 1 },
  sources: [
    {
      key: "OBSERVATION:one",
      type: "OBSERVATION",
      id: "one",
      revisionId: "revision",
      label: "Observed",
      excerpt: "A source",
      href: "/entrepreneurship",
      occurredAt: "2026-09-22T00:00:00.000Z",
      fingerprint: "source",
    },
  ],
  understanding: [],
};
const output: SynthesisOutput = {
  schemaVersion: 1,
  title: "What we learned",
  summary: "One observed workflow.",
  findings: [
    {
      claimId: null,
      kind: "FACT",
      lane: "B2C",
      statement: "People keep notes.",
      sourceKeys: ["OBSERVATION:one"],
    },
  ],
  nextQuestions: [],
  limitations: "One source.",
};
describe("reviewed synthesis context", () => {
  it("bounds UTF-8 input while preserving complete-set freshness and omission counts", () => {
    const many = {
      ...context,
      coverage: { ...context.coverage, eligibleSources: 300 },
      sources: Array.from({ length: 200 }, (_, i) => ({
        ...context.sources[0],
        id: String(i),
        key: `OBSERVATION:${i}`,
        excerpt: "語".repeat(1600),
      })),
    };
    const bounded = boundSynthesisContext(many);
    expect(
      Buffer.byteLength(JSON.stringify(bounded), "utf8"),
    ).toBeLessThanOrEqual(65536);
    expect(bounded.materialFingerprint).toBe("material");
    expect(bounded.coverage.omittedSources).toBe(300 - bounded.sources.length);
    expect(bounded.sources.length).toBeGreaterThan(0);
  });
  it("rejects citations outside the exact provider context", () => {
    expect(() =>
      validateSynthesisOutput(
        {
          ...output,
          findings: [
            {
              ...output.findings[0],
              sourceKeys: ["OBSERVATION:someone-elses-source"],
            },
          ],
        },
        context,
      ),
    ).toThrow(/not in the reviewed/);
  });
  it("requires citations for findings, while allowing explicitly uncertain ideas", () => {
    expect(() =>
      validateSynthesisOutput(
        { ...output, findings: [{ ...output.findings[0], sourceKeys: [] }] },
        context,
      ),
    ).toThrow(/need a source/);
    expect(
      validateSynthesisOutput(
        {
          ...output,
          findings: [
            { ...output.findings[0], kind: "HYPOTHESIS", sourceKeys: [] },
          ],
        },
        context,
      ).findings[0].kind,
    ).toBe("HYPOTHESIS");
  });
  it("does not turn understanding changes into source staleness", () => {
    expect(
      synthesisFreshness(context, {
        ...context,
        baseUnderstandingFingerprint: "accepted-revisions",
      }),
    ).toEqual({ refreshRecommended: false, unpublishedChanges: true });
    expect(
      synthesisFreshness(context, {
        ...context,
        materialFingerprint: "source-withdrawn",
      }).refreshRecommended,
    ).toBe(true);
  });
});
