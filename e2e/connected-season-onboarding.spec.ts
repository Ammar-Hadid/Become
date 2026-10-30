import "dotenv/config";
import { randomUUID } from "node:crypto";
import { test, expect } from "./utils/browser-test.util";
import { prisma } from "../src/lib/db/adapters/prisma.adapter";
import type { SeasonOnboardingView } from "../src/features/seasons/living/onboarding/onboarding.service";
import type {
  OnboardingDraft,
  OnboardingStage,
} from "../src/features/seasons/living/onboarding/onboarding.schema";

// Real authentication/SSR entry; provider/worker checkpoints are controlled API fixtures.
// This verifies the connected composition and command binding without paid generation.
test("connected journey shares the approved shell through preparation, imagery and explicit activation", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  const email = `connected-season-${randomUUID()}@example.test`;
  await page.getByTestId("name-input").fill("Disposable connected Season QA");
  await page.getByTestId("email-input").fill(email);
  await page
    .getByTestId("password-input")
    .fill("disposable-connected-season-password");
  await page.getByTestId("auth-submit").click();
  await expect(page.getByTestId("season-opening-ritual")).toBeVisible();
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const season = await prisma.userSeason.create({
    data: {
      userId: user.id,
      year: 2027,
      quarter: 2,
      character: {},
      answers: {},
    },
  });
  const endpoint = "/api/direction/seasons/onboarding?year=2027&quarter=2";
  const response = await page.request.get(endpoint);
  expect(response.ok()).toBe(true);
  const view: SeasonOnboardingView = await response.json();
  const art = "/design-review/character-workspace-v3/levi-desktop-v2.webp";
  const phoneArt = "/design-review/character-workspace-v3/levi-phone-v2.webp";
  const portrait = "/design-review/character-workspace-v3/levi-avatar.webp";
  const identity = {
    id: "fixture-identity",
    identityRevision: 1,
    displayName: "Review Character",
    subjectKind: "FICTIONAL" as const,
    sourceCategory: "anime" as const,
    registryVersion: 1,
    discoveryContextId: "fixture-context",
    discoveryRevision: 1,
    sourceWork: "Review Work",
    adaptation: "TV anime",
    language: "en",
    savedAt: new Date().toISOString(),
  };
  const draft: OnboardingDraft = {
    profile: {
      characterName: identity.displayName,
      sourceWork: identity.sourceWork,
      adaptation: identity.adaptation,
      outputLanguage: "en",
      sources: [
        {
          id: "source",
          title: "Fixture source",
          url: "https://example.test/source",
          notes: "Illustrative evidence for a browser fixture.",
        },
      ],
      personality: {
        description: "Exact saved personality excerpt.",
        sourceIds: ["source"],
      },
      speechPatterns: [
        { description: "Exact saved voice excerpt.", sourceIds: ["source"] },
      ],
      signaturePhrases: [],
      canonReferences: [],
      responseToSuccess: "Quiet acknowledgment",
      responseToSetback: "Concrete next action",
      responseToRecovery: "Recognize the effort",
      visualDirection: "Recognizable features",
      visualBoundaries: "No invented identifying marks",
    },
    visualIntent: {
      feeling: "Quiet",
      demeanor: "Attentive",
      anchors: "Recognizable features",
      atmosphere: "Morning light",
      avoid: "Exaggeration",
    },
    summary:
      "Exact saved personality excerpt. [source]\n\nExact saved voice excerpt.\n\nThe approved world develops through seven chapters.",
    bannerCopy: {
      quote: "",
      attribution: "",
      quoteSource: "",
      rightLine: "A deliberate next attempt",
    },
  };
  const setStage = (stage: OnboardingStage) => {
    view.run = {
      preparationProgress: null,
      id: "fixture-run",
      revision: (view.run?.revision ?? 0) + 1,
      stage,
      status: "WAITING",
      chapter: view.run?.chapter ?? 1,
      question: null,
      error: null,
      draft,
      completedTasks: [],
      pendingImageCount: 0,
      bannerMethod: "AI",
      portraitMethod: "AI",
      identityCurrent: true,
    };
  };
  const actions: string[] = [];
  let preparationPollFails = true;
  let preparationCanFinish = false;
  let activationFails = true;
  let identitySaveFails = true;
  let cropRefreshFails = false;
  let savedEdition: number | null = null;
  await page.route("**/api/direction/cots**", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({
        json: { identity: view.pack.identity, selectionRevision: 0 },
      });
    const body = route.request().postDataJSON();
    if (body.action === "LOOKUP_CHARACTER")
      return route.fulfill({
        json: {
          suggestedId: identity.id,
          suggestedWorkId: 1,
          candidates: [
            {
              id: identity.id,
              name: identity.displayName,
              nativeName: "",
              aliases: [],
              description: "Fixture",
              sourceUrl: "https://example.test/source",
              imageUrl: portrait,
              images: [
                {
                  href: portrait,
                  alt: "Fixture reference",
                  sourceUrl: "https://example.test/source",
                  sourceLabel: "Fixture",
                },
              ],
              works: [
                {
                  id: 1,
                  title: identity.sourceWork,
                  adaptation: identity.adaptation,
                  year: 2013,
                },
                {
                  id: 2,
                  title: "Review Work · second edition",
                  adaptation: "TV anime",
                  year: 2017,
                },
              ],
            },
          ],
        },
      });
    expect(body.action).toBe("CONFIRM_CHARACTER");
    expect(body.workId).toBe(2);
    if (identitySaveFails) {
      identitySaveFails = false;
      return route.fulfill({
        status: 503,
        json: { error: "Temporary save failure" },
      });
    }
    savedEdition = body.workId;
    view.pack.identity = {
      ...identity,
      sourceEntityId: identity.id,
      sourceWork: "Review Work · second edition",
    };
    return route.fulfill({
      json: {
        collection: { identity: view.pack.identity, selectionRevision: 1 },
        referenceNotice: null,
      },
    });
  });
  await page.route("**/api/direction/seasons/onboarding**", async (route) => {
    if (route.request().method() === "GET") {
      if (cropRefreshFails) {
        cropRefreshFails = false;
        return route.fulfill({
          status: 503,
          json: { error: "Temporary portrait refresh failure" },
        });
      }
      if (view.run?.stage === "ASSEMBLING") {
        if (preparationPollFails) {
          preparationPollFails = false;
          return route.fulfill({
            status: 503,
            json: { error: "Temporary preparation refresh failure" },
          });
        }
        if (preparationCanFinish) setStage("SUMMARY");
        else
          view.run.preparationProgress = {
            attempt: "connected-preparation",
            startedAt: new Date().toISOString(),
            phase: "writing",
            paragraphs: [
              "Saved preparation paragraph one.",
              "Saved preparation paragraph two.",
            ],
            estimate: { minMs: 130000, maxMs: 255000, samples: 6 },
          };
      }
      return route.fulfill({ json: view });
    }
    const body = route.request().postDataJSON();
    actions.push(body.action);
    if (body.action === "prepare") {
      view.pack.packId = "fixture-pack";
      view.pack.sourceImages = [
        {
          id: "fixture-original",
          label: "Fixture original",
          href: portrait,
          sourceUrl: "https://example.test/source",
          provenance: "UPLOAD",
          approved: true,
        },
      ];
      view.pack.originalsApproved = 1;
      setStage("WORLD");
    } else if (body.action === "start") {
      expect(body.sourceImageIds).toBeUndefined();
      expect(body.characterLikenessConfirmed).toBeUndefined();
      view.pack.setting = body.setting;
      view.pack.visualBrief = body.visualDirection;
      view.pack.profile = draft.profile;
      setStage("ASSEMBLING");
      view.run!.status = "QUEUED";
      view.run!.preparationProgress = {
        attempt: "connected-preparation",
        startedAt: new Date().toISOString(),
        phase: "writing",
        paragraphs: ["Saved preparation paragraph one."],
        estimate: { minMs: 130000, maxMs: 255000, samples: 6 },
      };
    } else if (body.action === "pause") {
      view.run!.status = "PAUSED";
    } else if (body.action === "resume") {
      view.run!.status = "QUEUED";
    } else if (body.action === "approve-summary") {
      expect(body.sourceImageIds).toEqual(["fixture-original"]);
      expect(body.characterLikenessConfirmed).toBe(true);
      setStage("BANNER_PREPARATION");
    } else if (body.action === "set-artwork-method")
      view.run!.bannerMethod = body.method;
    else if (body.action === "generate-artwork") {
      view.pack.banner = {
        revision: 1,
        approved: false,
        current: true,
        desktopHref: art,
        phoneHref: phoneArt,
        avatarHref: body.target === "PORTRAIT" ? portrait : null,
        dimensions: {
          desktop: { width: 1792, height: 768 },
          phone: { width: 768, height: 1365 },
          avatar: { width: 768, height: 768 },
        },
        desktopPrompt: null,
        phonePrompt: null,
        avatarPrompt: null,
        quote: "",
        attribution: "",
        quoteSource: "",
        rightLine: "A deliberate next attempt",
        crop: { x: 0.5, y: 0.5, zoom: 1 },
      };
      setStage(body.target === "PORTRAIT" ? "PORTRAIT" : "BANNER");
    } else if (body.action === "approve-banner")
      setStage("PORTRAIT_PREPARATION");
    else if (body.action === "approve-portrait") {
      view.pack.banner!.approved = true;
      setStage("SCENE_METHOD");
    } else if (body.action === "select-scenes-method") {
      view.pack.creation.method = "AI";
      view.pack.slots = view.pack.slots.map((slot) => ({
        ...slot,
        latestId: `${slot.chapter}-${slot.state}-${slot.format}`,
        previewHref: slot.format === "MOBILE" ? phoneArt : art,
        latestApproved: true,
      }));
      setStage("SCENES");
    } else if (body.action === "approve-chapter") {
      const chapter = view.run!.chapter;
      setStage(chapter === 7 ? "READY" : "SCENES");
      view.run!.chapter = chapter === 7 ? 7 : chapter + 1;
      view.pack.approvedCount = chapter * 6;
    } else if (body.action === "activate") {
      if (activationFails) {
        activationFails = false;
        return route.fulfill({
          status: 503,
          json: {
            error:
              "Fixture activation failed. Your reviewed pack is preserved.",
          },
        });
      }
      setStage("ACTIVE");
    }
    return route.fulfill({ json: view });
  });
  await page.route("**/api/direction/seasons/living", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.action).toBe("save-banner-crop");
    view.pack.banner!.crop = { x: body.x, y: body.y, zoom: body.zoom };
    return route.fulfill({ json: { error: null } });
  });
  // Let the candidate's initial identity request settle before deliberately
  // replacing its document. WebKit reports an intercepted request started during
  // that unload as a CORS page error, even though the app catches the rejection.
  const initialIdentity = page.waitForResponse(
    (response) =>
      response.url().includes("/api/direction/cots?year=2027&quarter=2") &&
      response.request().method() === "GET",
  );
  await page.goto("/season-onboarding-candidate?year=2027&quarter=2");
  await (await initialIdentity).finished();
  await expect(
    page.getByRole("button", { name: "Pause motion", exact: true }),
  ).toBeVisible();
  await page.goto("/direction/seasons/2027/2/opening");
  await expect(page.locator(".become-season-ritual")).toHaveAttribute(
    "data-split",
    "true",
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Who will inspire this Season?",
  );
  await page
    .getByRole("textbox", { name: "Character name", exact: true })
    .fill(identity.displayName);
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Character name", exact: true }),
  ).toHaveValue(identity.displayName);
  await expect(
    page.getByRole("button", { name: /^(Pause|Resume) motion$/ }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Find my character", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Shape the world of your Season.",
  );
  await expect(
    page.getByRole("region", { name: "Recognized character" }),
  ).toContainText(identity.displayName);
  await expect(
    page.getByRole("button", { name: "Yes, this character" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Change version", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Choose your version" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close version selection" }).click();
  await expect(
    page.getByRole("dialog", { name: "Choose your version" }),
  ).not.toBeVisible();
  await expect(page.locator(".opening-step-numeral")).toHaveText("02");
  await page
    .getByRole("textbox", {
      name: "Where should this Season take place?",
      exact: true,
    })
    .fill("A coastal observatory");
  await page
    .getByRole("textbox", { name: "How should it feel and look?", exact: true })
    .fill("Quiet midnight light");
  await page
    .getByRole("button", { name: "Change character", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Find my character", exact: true })
    .click();
  await expect(
    page.getByLabel("Where should this Season take place?", { exact: true }),
  ).toHaveValue("A coastal observatory");
  await expect(
    page.getByLabel("How should it feel and look?", { exact: true }),
  ).toHaveValue("Quiet midnight light");
  await page
    .getByRole("button", { name: "Change version", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Choose your version" })
    .getByRole("button", { name: /Review Work · second edition/ })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Choose your version" }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("region", { name: "Recognized character" }),
  ).toContainText("Review Work · second edition");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight + 1,
    ),
  ).toBe(true);
  await expect(page.locator(".become-drawer-backdrop")).toHaveCount(0);
  await page.screenshot({
    path: `/private/tmp/connected-season-world-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "The character could not be saved" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Where should this Season take place?", { exact: true }),
  ).toHaveValue("A coastal observatory");
  expect(savedEdition).toBeNull();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator(".preparation-stage")).toHaveAttribute(
    "data-composition",
    "focus",
  );
  await expect(page.locator(".become-season-ritual")).toHaveAttribute(
    "data-split",
    "false",
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    identity.displayName,
  );
  await expect(page.locator(".preparation-portrait img")).toHaveAttribute(
    "src",
    new URL(portrait, page.url()).href,
  );
  await expect(
    page.getByRole("button", { name: "Save & leave", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Save and leave", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Preview controls" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reading room" })).toHaveCount(
    0,
  );
  await expect(page.getByText("Reconnecting…", { exact: true })).toBeVisible();
  await expect(page.locator(".preparation-prose")).toContainText(
    "Saved preparation paragraph two.",
  );
  await expect(page.getByText("Reconnecting…", { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Pause preparation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Resume preparation" }),
  ).toBeVisible();
  await expect(page.locator(".preparation-prose")).toContainText(
    "Saved preparation paragraph two.",
  );
  await page.getByRole("button", { name: "Resume preparation" }).click();
  await expect(
    page.getByRole("button", { name: "Pause preparation", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `/tmp/become-connected-focus-${testInfo.project.name}.png`,
    fullPage: true,
  });
  preparationCanFinish = true;
  await expect(page.locator('[data-stage="SUMMARY"]')).toBeVisible();
  await expect(
    page.getByText("Temporary preparation refresh failure", { exact: true }),
  ).toHaveCount(0);
  expect(savedEdition).toBe(2);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Here’s the Season we’ll create.",
  );
  await expect(page.locator(".become-ambient-light")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: /^(Pause|Resume) motion$/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Approve and continue", exact: true }),
  ).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Approve and continue", exact: true })
    .click();
  await expect(page.locator(".become-season-ritual")).toHaveAttribute(
    "data-split",
    "false",
  );
  await expect(
    page.locator('[aria-label="Season phases"] [aria-current="step"]'),
  ).toContainText("Imagery");
  await page
    .getByRole("button", { name: "or upload manually", exact: true })
    .click();
  await expect(page.locator(".become-artwork-upload")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Use AI instead", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create banners", exact: true })
    .click();
  await page.getByRole("button", { name: "Mobile", exact: true }).click();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Approve banners and continue", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create profile portrait", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Adjust portrait", exact: true })
    .click();
  const portraitDialog = page.getByRole("dialog", {
    name: `Adjust ${identity.displayName}'s profile picture`,
  });
  cropRefreshFails = true;
  await portraitDialog
    .getByRole("button", { name: "Use this picture", exact: true })
    .click();
  await expect(portraitDialog.getByRole("alert")).toContainText(
    "This picture could not be saved. Try again.",
  );
  expect(errors).toEqual([]);
  await portraitDialog
    .getByRole("button", { name: "Use this picture", exact: true })
    .click();
  await expect(portraitDialog).not.toBeVisible();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", {
      name: "Approve profile and choose scene creation",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Let AI create them", exact: true })
    .click();
  for (let chapter = 1; chapter <= 7; chapter++) {
    for (const format of ["Desktop", "Mobile"]) {
      await page.getByRole("button", { name: format, exact: true }).click();
      for (const pace of ["On track", "In progress", "Behind pace"])
        await page.getByRole("button", { name: pace, exact: true }).click();
    }
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", {
        name:
          chapter === 7
            ? "Approve final chapter"
            : "Approve and create next chapter",
        exact: true,
      })
      .click();
  }
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Your Season is ready.",
  );
  await expect(page.locator(".activation-recap")).toContainText(
    "42 reviewed compositions",
  );
  await expect(page.locator(".activation-recap")).toContainText(
    "7 chapters · 3 pace states",
  );
  await expect(page.locator(".activation-recap")).toContainText(
    "Exact saved personality excerpt.",
  );
  await expect(page.locator(".activation-recap")).toContainText(
    "A coastal observatory",
  );
  await page.locator(".activation-recap").scrollIntoViewIfNeeded();
  await expect(page.locator(".activation-recap")).toHaveAttribute(
    "data-motion",
    "running",
  );
  await expect(
    page.getByRole("button", { name: /^(Pause|Resume) motion$/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Activate Season", exact: true }),
  ).toBeEnabled();
  expect(actions).not.toContain("activate");
  await page.screenshot({
    path: `/private/tmp/connected-season-ready-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Activate Season", exact: true })
    .evaluate((el) => {
      if (el instanceof HTMLButtonElement) {
        el.click();
        el.click();
      }
    });
  await expect(
    page.locator(".activation-review").getByRole("alert"),
  ).toContainText("Fixture activation failed");
  expect(actions.filter((action) => action === "activate")).toHaveLength(1);
  await expect(page.locator(".activation-recap")).toContainText(
    "42 reviewed compositions",
  );
  await page
    .getByRole("button", { name: "Activate Season", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Your Season is ready to live.",
      exact: true,
    }),
  ).toBeVisible();
  expect(actions.filter((action) => action === "activate")).toHaveLength(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  expect(view.pack.seasonId).toBe(season.id);
});
