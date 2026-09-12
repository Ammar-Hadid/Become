import { describe, it, expect } from "vitest";
import {
  publicationIdentity,
  validatePublicationDate,
} from "./publication-identity.util";
const draft = {
  channelId: "channel",
  publishedTitle: "A work",
  publishedOn: "2026-03-29",
  url: "",
  placement: "Shorts",
};
describe("release identity and dates", () => {
  it("normalizes watch, short and share forms to one release", () => {
    const keys = [
      "https://youtu.be/abcdefghijk?t=1",
      "https://www.youtube.com/shorts/abcdefghijk?si=share",
      "https://www.youtube.com/watch?v=abcdefghijk&list=playlist",
    ].map(
      (url) => publicationIdentity("YOUTUBE", "version", { ...draft, url }).key,
    );
    expect(new Set(keys).size).toBe(1);
  });
  it("does not deduplicate distinct channel publications without a URL", () => {
    expect(publicationIdentity("TIKTOK", "version", draft).key).not.toBe(
      publicationIdentity("INSTAGRAM", "version", {
        ...draft,
        channelId: "second",
      }).key,
    );
  });
  it("rejects unsafe URLs and wrong platform hosts", () => {
    for (const url of [
      "javascript:alert(1)",
      "https://person:secret@youtube.com/watch?v=abcdefghijk",
      "https://youtube.com.attacker.test/watch?v=abcdefghijk",
    ])
      expect(() =>
        publicationIdentity("YOUTUBE", "v", { ...draft, url }),
      ).toThrow();
  });
  it("uses Amsterdam dates across the spring DST transition", () => {
    expect(() =>
      validatePublicationDate(
        { ...draft, publishedAt: "2026-03-28T23:30:00Z" },
        new Date("2026-03-30T00:00:00Z"),
      ),
    ).not.toThrow();
    expect(() =>
      validatePublicationDate(
        { ...draft, publishedAt: "2026-03-29T22:30:00Z" },
        new Date("2026-03-30T00:00:00Z"),
      ),
    ).toThrow();
  });
  it("does not accept a planned future date as publication", () =>
    expect(() =>
      validatePublicationDate(
        { ...draft, publishedOn: "2026-04-01" },
        new Date("2026-03-30T00:00:00Z"),
      ),
    ).toThrow());
});
