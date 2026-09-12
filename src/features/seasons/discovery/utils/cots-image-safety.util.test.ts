import { describe, expect, it } from "vitest";
import {
  cotsSafeImageSearchSuffix,
  hasUnsafeCotsImageMetadata,
} from "./cots-image-safety.util";

describe("COTS image safety metadata", () => {
  it.each([
    "Ecchi",
    "Echi",
    "NSFW",
    "R-18",
    "18+",
    "Adult",
    "Large Breasts",
    "Bikini",
    "suggestive",
  ])("rejects the explicit provider tag %s", (tag) => {
    expect(hasUnsafeCotsImageMetadata("Mikasa Ackerman", tag)).toBe(true);
  });

  it("keeps ordinary identity, work and medium tags", () => {
    expect(
      hasUnsafeCotsImageMetadata(
        "Mikasa Ackerman",
        "Attack on Titan, character, anime, scarf",
      ),
    ).toBe(false);
  });

  it("adds bounded negative search terms", () => {
    expect(cotsSafeImageSearchSuffix()).toBe(
      "-nsfw -ecchi -echi -hentai -nude -explicit",
    );
  });
});
