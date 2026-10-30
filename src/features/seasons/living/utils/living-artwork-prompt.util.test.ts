import { expect, it } from "vitest";
import { livingArtworkPrompt, livingArtworkSlots, livingReferencePrompt } from "./living-artwork-prompt.util";

it("defines 42 desktop and phone compositions with a protected phone character", () => {
  expect(livingArtworkSlots).toHaveLength(42);
  expect(new Set(livingArtworkSlots.map((slot) => `${slot.chapter}:${slot.state}:${slot.format}`)).size).toBe(42);
  const prompt = livingArtworkPrompt({ characterName: "Ari", sourceWork: "Example", adaptation: "", visualDirection: "Gentle expression", visualBoundaries: "No combat" }, "A bakery", "Warm modern anime", { chapter: 3, state: "FAR_BEHIND", format: "MOBILE" });
  expect(prompt).toContain("complete face");
  expect(prompt).toContain("recompose");
  expect(prompt).toContain("No combat");
});

it("makes the reference sheet establish character and setting continuity", () => {
  const prompt = livingReferencePrompt({ characterName: "Ari", sourceWork: "Example", adaptation: "English dub", visualDirection: "Gentle expression", visualBoundaries: "No combat" }, "A bakery", "Warm modern anime");
  expect(prompt).toContain("Ari");
  expect(prompt).toContain("bakery");
  expect(prompt).toContain("range of expressions");
});
