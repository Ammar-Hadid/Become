import { describe, expect, it } from "vitest";
import {
  latestLivingBanner,
  livingBannerReady,
} from "./living-character-banner.schema";

const image = {
  storageKey: "art.webp",
  prompt: "Character portrait",
  width: 1024,
  height: 1024,
};

describe("Living Season character banner review", () => {
  const approved = {
    revision: 2,
    identityId: "levi",
    profileVersion: 3,
    briefRevision: 4,
    desktop: image,
    phone: image,
    avatar: image,
    quote: "Reviewed quotation",
    attribution: "Character",
    quoteSource: "Reviewed source",
    rightLine: "A short line",
    crop: { x: 0.5, y: 0.5, zoom: 1.24 },
    approvedAt: "2026-10-08T00:00:00.000Z",
  };

  it("accepts only a complete approval for the current identity, profile, and brief", () => {
    expect(livingBannerReady(approved, "levi", 3, 4)).toBe(true);
    expect(livingBannerReady(approved, "levi", 4, 4)).toBe(false);
    expect(livingBannerReady(approved, "levi", 3, 5)).toBe(false);
    expect(livingBannerReady(approved, "different", 3, 4)).toBe(false);
    expect(
      livingBannerReady({ ...approved, approvedAt: undefined }, "levi", 3, 4),
    ).toBe(false);
    expect(
      livingBannerReady({ ...approved, phone: undefined }, "levi", 3, 4),
    ).toBe(false);
    expect(
      livingBannerReady({ ...approved, quoteSource: " " }, "levi", 3, 4),
    ).toBe(false);
  });

  it("uses the newest revision, so a saved draft returns the banner to review", () => {
    const draft = { ...approved, revision: 3, approvedAt: undefined };
    const latest = latestLivingBanner({ revisions: [approved, draft] });
    expect(latest?.revision).toBe(3);
    expect(livingBannerReady(latest, "levi", 3, 4)).toBe(false);
  });
  it("permits no quote without permitting an unattributed quote", () => {
    expect(
      livingBannerReady(
        { ...approved, quote: "", attribution: "", quoteSource: "" },
        "levi",
        3,
        4,
      ),
    ).toBe(true);
    expect(
      livingBannerReady(
        {
          ...approved,
          quote: "Claimed quotation",
          attribution: "",
          quoteSource: "",
        },
        "levi",
        3,
        4,
      ),
    ).toBe(false);
  });
});
