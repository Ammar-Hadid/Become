import { describe, expect, it } from "vitest";
import type { SeasonTransitionView } from "@/features/reviews/contracts/types/review.types";
import type { SeasonView } from "@/features/seasons/types/season.types";
import { getSeasonAttentionItems } from "./season-attention.util";

const now = new Date("2026-10-06T12:00:00Z");

function season(overrides: Partial<SeasonView> = {}): SeasonView {
  return {
    year: 2026,
    quarter: 4,
    id: "current-season",
    openingCompletedAt: "2026-10-01T09:00:00Z",
    openingDeferred: false,
    closedAt: null,
    calendar: { label: "Season 4 · 2026", phase: "LIVING" },
    ...overrides,
  } as SeasonView;
}

function transition(
  overrides: Partial<SeasonTransitionView> = {},
): SeasonTransitionView {
  return {
    from: {
      year: 2026,
      quarter: 3,
      startOn: "2026-07-01",
      label: "Season 3 · 2026",
    },
    finaleHref: "/direction/seasons/2026/3/finale",
    disposition: "AVAILABLE",
    ...overrides,
  } as SeasonTransitionView;
}

describe("Season attention", () => {
  it("turns an available finale into a clickable dashboard item", () => {
    expect(
      getSeasonAttentionItems({
        season: season(),
        transition: transition(),
        transitionUnavailable: false,
        now,
      }),
    ).toEqual([
      {
        id: "season-finale-2026-07-01",
        text: "Season 3 · 2026 has a chapter to close. Read the finale.",
        href: "/direction/seasons/2026/3/finale",
        area: "season",
      },
    ]);
  });

  it("keeps paused finale and opening actions separate, with their recovery notices", () => {
    const items = getSeasonAttentionItems({
      season: season({ openingCompletedAt: null, openingDeferred: true }),
      transition: transition({ disposition: "DEFERRED" }),
      transitionUnavailable: false,
      transitionNotice: "Your finale is paused.",
      openingNotice: "Your opening is paused.",
      now,
    });
    expect(
      items.map(({ text, href, detail }) => ({ text, href, detail })),
    ).toEqual([
      {
        text: "Season 3 · 2026 finale is paused. Resume the finale.",
        href: "/direction/seasons/2026/3/finale",
        detail: "Your finale is paused.",
      },
      {
        text: "Season 4 · 2026 opening is paused. Resume the opening.",
        href: "/direction/seasons/2026/4/opening",
        detail: "Your opening is paused.",
      },
    ]);
  });

  it("uses replay for a skipped finale and omits completed work", () => {
    expect(
      getSeasonAttentionItems({
        season: season(),
        transition: transition({ disposition: "SKIPPED" }),
        transitionUnavailable: false,
        now,
      })[0]?.href,
    ).toBe("/direction/seasons/2026/3/finale?replay=1");
    expect(
      getSeasonAttentionItems({
        season: season(),
        transition: transition({ disposition: "COMPLETED" }),
        transitionUnavailable: false,
        now,
      }),
    ).toEqual([]);
  });

  it("offers reviews on transition failure and never prompts an ended Season opening", () => {
    const items = getSeasonAttentionItems({
      season: season({
        openingCompletedAt: null,
        calendar: {
          label: "Season 4 · 2026",
          phase: "ENDED",
        } as SeasonView["calendar"],
      }),
      transitionUnavailable: true,
      now,
    });
    expect(items).toEqual([
      {
        id: "season-transition-unavailable",
        text: "The Season transition could not be loaded. Open Reviews.",
        href: "/reviews",
        area: "season",
      },
    ]);
  });
});
