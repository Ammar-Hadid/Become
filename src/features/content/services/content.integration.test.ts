import "dotenv/config";
import sharp from "sharp";
import {
  saveContentMedia,
  readContentMedia,
} from "@/features/content/media/services/content-media.service";
import { getMediaStorage } from "@/lib/storage/services/media-storage.service";
import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { Prisma } from "@/generated/prisma/client";
import { executeContentCommand as contentCommand } from "./content-mutation.service";
import { executeThinkingCommand as thinkingCommand } from "@/features/direction/thinking/services/thinking-mutation.service";
import {
  getContentWorkspace,
  getPublicationView,
} from "@/features/content/queries/content.query";
import { getThinkingHistory } from "@/features/direction/thinking/queries/thinking-history.query";
import { getContentHistory } from "@/features/content/history/queries/content-history.query";
import { resolveEvidence } from "@/features/direction/evidence/services/evidence-reference.service";
import {
  getIdea,
  getDecision,
} from "@/features/direction/thinking/queries/thinking.query";
import { getContentAnalytics } from "@/features/content/analytics/queries/content-analytics.query";
import { readContentMeasurement } from "@/features/content/measurements/queries/content-measurement.query";
import { ensureDefaultDomains } from "@/features/domains/defaults/services/ensure-default-domains.service";
import { startSession } from "@/features/sessions/lifecycle/services/start-session.service";
import { completeSession } from "@/features/sessions/lifecycle/services/complete-session.service";
import { saveGoal } from "@/features/direction/services/goal.service";
import { saveExperiment } from "@/features/direction/services/experiment.service";
import {
  getGoalView,
  getExperimentView,
  getDirectionOptions,
} from "@/features/direction/queries/direction.query";
import { changeDirectionLifecycle } from "@/features/direction/services/direction-lifecycle.service";
const run = process.env.RUN_CONTENT_INTEGRATION === "1";
const suite = run ? describe : describe.skip;
suite("Phase 6 canonical PostgreSQL journey", () => {
  const userId = `phase6-test-${randomUUID()}`,
    otherId = `phase6-test-${randomUUID()}`;
  const op = () => randomUUID(),
    today = DateTime.now().setZone("Europe/Amsterdam").toISODate()!,
    yesterday = DateTime.now()
      .setZone("Europe/Amsterdam")
      .minus({ days: 1 })
      .toISODate()!;
  let contentId: string,
    variantId: string,
    ideaId: string,
    publicationId: string;
  const intent = {
    title: "One creative work",
    purpose: "Explain the process",
    audience: "Creators",
    notes: "",
  };
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (
      !["localhost", "127.0.0.1"].includes(url.hostname) ||
      !url.pathname.startsWith("/become_phase6_")
    )
      throw Error("Only an isolated Phase 6 database is allowed");
    for (const id of [userId, otherId]) {
      await prisma.user.create({
        data: {
          id,
          email: `${id}@example.com`,
          name: "Phase 6 disposable integration",
        },
      });
      await ensureDefaultDomains(id);
    }
  });
  afterAll(async () => {
    for (const id of [userId, otherId]) {
      const media = await prisma.contentMedia.findMany({
        where: { userId: id },
        select: { storageKey: true },
      });
      for (const table of [
        "direction_idea_output",
        "direction_decision_reflection",
        "direction_decision_change",
        "direction_decision",
        "content_performance_observation",
        "content_publication_revision",
        "content_publication",
        "session",
        "direction_criterion",
        "experiment_content_source",
        "experiment",
        "direction_goal",
        "content_media",
        "content_variant",
        "content",
      ])
        await prisma.$executeRaw(
          Prisma.sql`DELETE FROM ${Prisma.raw('"' + table + '"')} WHERE "userId"=${id}`,
        );
      await prisma.user.deleteMany({
        where: { id, email: `${id}@example.com` },
      });
      for (const file of media) await getMediaStorage().remove(file.storageKey);
    }
  });
  it("atomically promotes an idea exactly once under concurrent retries", async () => {
    const idea = await thinkingCommand(userId, {
      type: "SAVE_IDEA",
      operationKey: op(),
      draft: {
        title: "Build a creator story",
        notes: "Original thought",
        domainIds: [],
      },
    });
    ideaId = idea.id;
    const input = {
      type: "PROMOTE_IDEA",
      operationKey: op(),
      ideaId,
      destination: "CONTENT",
      draft: intent,
      format: "SHORT_VERTICAL",
    };
    const [a, b] = await Promise.all([
      thinkingCommand(userId, input),
      thinkingCommand(userId, input),
    ]);
    expect(a.id).toBe(b.id);
    contentId = a.id;
    const work = (await getContentWorkspace(userId, contentId))!;
    variantId = work.variants[0].id;
    expect(work.variants).toHaveLength(1);
    expect(work.ideas[0].id).toBe(ideaId);
    expect((await getIdea(userId, ideaId))!.outputs).toHaveLength(1);
    await expect(
      thinkingCommand(userId, {
        ...input,
        draft: { ...intent, title: "Different payload" },
      }),
    ).rejects.toThrow(/different/);
    expect(await prisma.content.count({ where: { userId } })).toBe(1);
  });
  it("rejects ownership mismatches and rolls back failed promotion", async () => {
    await expect(
      contentCommand(otherId, {
        type: "SAVE_CONTENT",
        operationKey: op(),
        contentId,
        expectedVersion: 1,
        draft: intent,
      }),
    ).rejects.toThrow();
    await expect(
      thinkingCommand(otherId, {
        type: "PROMOTE_IDEA",
        operationKey: op(),
        ideaId,
        destination: "CONTENT",
        draft: intent,
        format: "LONG_FORM",
      }),
    ).rejects.toThrow();
    expect(await prisma.content.count({ where: { userId: otherId } })).toBe(0);
  });
  it("keeps independent writing and lifecycle revisions and rejects stale writing", async () => {
    const draft = {
      hook: "A surprising beginning",
      outline: "Three honest lessons",
      script: "A long script",
      productionNotes: "",
    };
    const a = await contentCommand(userId, {
      type: "SAVE_WRITING",
      operationKey: op(),
      contentId,
      variantId,
      expectedWritingVersion: 1,
      draft,
    });
    expect(a.writingVersion).toBe(2);
    await contentCommand(userId, {
      type: "SAVE_VARIANT",
      operationKey: op(),
      contentId,
      variantId,
      expectedVersion: 1,
      name: "Vertical cut",
      format: "SHORT_VERTICAL",
      stage: "READY",
      nextStep: "Release when ready",
      plannedOn: today,
      archived: false,
    });
    await expect(
      contentCommand(userId, {
        type: "SAVE_WRITING",
        operationKey: op(),
        contentId,
        variantId,
        expectedWritingVersion: 1,
        draft: { ...draft, hook: "stale overwrite" },
      }),
    ).rejects.toThrow(/another tab/);
    const w = (await getContentWorkspace(userId, contentId))!;
    expect(w.variants[0].hook).toBe(draft.hook);
    expect(w.variants[0].stage).toBe("READY");
    expect(w.variants[0].publications).toHaveLength(0);
  });
  it("uses the existing timer and does not release or move stage at completion", async () => {
    const w = (await getContentWorkspace(userId, contentId))!;
    const input = {
      domainId: w.timer.domainId,
      activityTypeId: w.timer.activities.find((a) => a.name === "Scripting")!
        .id,
      contentId,
      contentVariantId: variantId,
      description: "Write the hook",
    };
    const started = await startSession(userId, input);
    expect(started.status).toBe("created");
    if (started.status !== "created") throw Error();
    await prisma.session.update({
      where: { id: started.sessionId },
      data: { startedAt: new Date(Date.now() - 120000) },
    });
    const [a, b] = await Promise.all([
      completeSession(userId, started.sessionId, {
        outcome: "A clear draft",
        notes: null,
      }),
      completeSession(userId, started.sessionId, {
        outcome: "A clear draft",
        notes: null,
      }),
    ]);
    expect(a).toEqual(b);
    const work = (await getContentWorkspace(userId, contentId))!;
    expect(work.recordedTime.seconds).toBeGreaterThanOrEqual(120);
    expect(work.sessions[0].contentId).toBe(contentId);
    expect(work.variants[0].publications).toHaveLength(0);
    expect(work.variants[0].stage).toBe("READY");
  });
  it("records one version released to three channels as 1/1/3", async () => {
    const publications = [];
    for (const platform of ["YOUTUBE", "TIKTOK", "INSTAGRAM"]) {
      const channel = await contentCommand(userId, {
        type: "SAVE_CHANNEL",
        operationKey: op(),
        draft: { name: "Main", platform, account: "@creator" },
      });
      publications.push({
        channelId: channel.id,
        publishedTitle: intent.title,
        publishedOn: yesterday,
        url: platform === "YOUTUBE" ? "https://youtu.be/abcdefghijk" : "",
        placement:
          platform === "YOUTUBE"
            ? "Shorts"
            : platform === "INSTAGRAM"
              ? "Reels"
              : "Video",
      });
    }
    const input = {
      type: "PUBLISH",
      operationKey: op(),
      contentId,
      variantId,
      publications,
    };
    await Promise.all([
      contentCommand(userId, input),
      contentCommand(userId, input),
    ]);
    const work = (await getContentWorkspace(userId, contentId))!;
    expect(work.variants[0].publications).toHaveLength(3);
    publicationId = work.variants[0].publications.find(
      (p) => p.channel.platform === "YOUTUBE",
    )!.id;
    const analytics = await getContentAnalytics(userId, "year");
    expect([
      analytics.contentCreated,
      analytics.variantsCreated,
      analytics.publicationsMade,
    ]).toEqual([1, 1, 3]);
    await expect(
      contentCommand(userId, {
        ...input,
        operationKey: op(),
        publications: [
          {
            ...publications[0],
            url: "https://www.youtube.com/shorts/abcdefghijk",
          },
        ],
      }),
    ).rejects.toThrow(/already recorded/);
  });
  it("keeps manual counters dated, nullable and correctable without summing", async () => {
    const earlier = new Date(Date.now() - 3600000).toISOString(),
      later = new Date(Date.now() - 1000).toISOString();
    const first = await contentCommand(userId, {
      type: "RECORD_OBSERVATION",
      operationKey: op(),
      contentId,
      publicationId,
      draft: {
        observedAt: earlier,
        views: "1000",
        likes: "20",
        comments: "0",
        note: "Manual reading",
      },
    });
    await contentCommand(userId, {
      type: "RECORD_OBSERVATION",
      operationKey: op(),
      contentId,
      publicationId,
      draft: {
        observedAt: later,
        views: "1800",
        likes: null,
        comments: null,
        note: "Views only",
      },
    });
    let p = (await getPublicationView(userId, publicationId))!;
    expect(p.latest.views?.value).toBe("1800");
    expect(p.latest.likes?.observedAt).toBe(earlier);
    expect(p.latest.comments?.value).toBe("0");
    await contentCommand(userId, {
      type: "RECORD_OBSERVATION",
      operationKey: op(),
      contentId,
      publicationId,
      supersedesId: first.id,
      reason: "Transcription correction",
      draft: {
        observedAt: earlier,
        views: "900",
        likes: "18",
        comments: "0",
        note: "Corrected",
      },
    });
    p = (await getPublicationView(userId, publicationId))!;
    expect(p.latest.views?.value).toBe("1800");
    expect(p.latest.likes?.value).toBe("18");
    expect(p.observations).toHaveLength(3);
    expect(p.observations.find((o) => o.id === first.id)?.superseded).toBe(
      true,
    );
  });
  it("preserves conclusions while live release corrections change eligibility", async () => {
    const goal = await saveGoal(userId, {
      operationKey: op(),
      draft: {
        title: "Release three times",
        startOn: yesterday,
        targetOn: today,
        domainIds: [],
        criterionMode: "ALL",
        criteria: [
          {
            key: "releases",
            metric: "CONTENT_PUBLICATIONS",
            label: "Release count",
            target: "3",
            contentId,
          },
        ],
      },
    });
    const view = (await getGoalView(userId, goal.id))!;
    expect(view.evaluation.criteria[0].value).toBe("3");
    await changeDirectionLifecycle(userId, {
      kind: "GOAL",
      id: goal.id,
      expectedVersion: goal.version,
      operationKey: op(),
      action: "CONCLUDE",
      reason: "Three recorded releases",
      outcome: "ACHIEVED",
      previewFingerprint: view.evaluation.fingerprint,
    });
    await contentCommand(userId, {
      type: "WITHDRAW_PUBLICATION",
      operationKey: op(),
      contentId,
      publicationId,
      expectedVersion: 1,
      withdrawn: true,
      reason: "This claim was entered for the wrong release",
    });
    const changed = (await getGoalView(userId, goal.id))!;
    expect(changed.evaluation.criteria[0].value).toBe("2");
    expect(changed.conclusionSnapshot!.criteria[0].value).toBe("3");
    expect(changed.liveChangedSinceConclusion).toBe(true);
    await contentCommand(userId, {
      type: "WITHDRAW_PUBLICATION",
      operationKey: op(),
      contentId,
      publicationId,
      expectedVersion: 2,
      withdrawn: false,
      reason: "Verified the manual record",
    });
    await contentCommand(userId, {
      type: "ARCHIVE_CONTENT",
      operationKey: op(),
      contentId,
      expectedVersion: 1,
      archived: true,
    });
    expect((await getContentAnalytics(userId, "year")).publicationsMade).toBe(
      3,
    );
    await contentCommand(userId, {
      type: "ARCHIVE_CONTENT",
      operationKey: op(),
      contentId,
      expectedVersion: 2,
      archived: false,
    });
  });
  it("uses an explicit experiment cohort and preserves sparse decisions", async () => {
    const exp = await saveExperiment(userId, {
      operationKey: op(),
      draft: {
        title: "Try an opening",
        question: "Does this approach feel clearer?",
        approach: "Compare manually and reflect",
        startOn: yesterday,
        targetOn: today,
        domainIds: [],
        criterionMode: "ALL",
        criteria: [
          {
            key: "selected",
            metric: "CONTENT_PUBLICATIONS",
            label: "Selected releases",
            target: "3",
            selectedContentOnly: true,
          },
        ],
        sourceInteractionIds: [],
        sourceContentIds: [contentId],
      },
    });
    const view = (await getExperimentView(userId, exp.id))!;
    expect(view.evaluation.criteria[0].value).toBe("3");
    expect(view.evaluation.contentCohort?.sources).toHaveLength(1);
    const draft = {
      choice: "Use Astra for backend and Sol for frontend",
      reason: "Keep domain integrity and give design real authorship",
      decidedOn: today,
      context: "Phase 6",
      alternatives: "",
      expectedOutcome: "A coherent creator workspace",
      reconsiderWhen: "",
      reviewOn: null,
      contentId,
      experimentId: exp.id,
    };
    const d = await thinkingCommand(userId, {
      type: "SAVE_DECISION",
      operationKey: op(),
      draft,
    });
    await thinkingCommand(userId, {
      type: "REFLECT_DECISION",
      operationKey: op(),
      id: d.id,
      assessment: "MIXED",
      reflection: "Clear ownership; contracts still take care",
      reflectedOn: today,
    });
    const decision = (await getDecision(userId, d.id))!;
    expect(decision.reason).toBe(draft.reason);
    expect(decision.reflections[0].assessment).toBe("MIXED");
    expect(decision.history).toHaveLength(1);
    const archived = await thinkingCommand(userId, {
      type: "ARCHIVE_DECISION",
      operationKey: op(),
      id: d.id,
      expectedVersion: decision.version,
      archived: true,
    });
    const reflection = {
      type: "REFLECT_DECISION",
      operationKey: op(),
      id: d.id,
      assessment: "HELPFUL",
      reflection: "A later reflection after restoring the record",
      reflectedOn: today,
    };
    await expect(thinkingCommand(userId, reflection)).rejects.toThrow(
      "Restore this decision",
    );
    expect((await getDecision(userId, d.id))!.reflections).toHaveLength(1);
    await thinkingCommand(userId, {
      type: "ARCHIVE_DECISION",
      operationKey: op(),
      id: d.id,
      expectedVersion: archived.version,
      archived: false,
    });
    await thinkingCommand(userId, reflection);
    const restored = (await getDecision(userId, d.id))!;
    expect(restored.reflections).toHaveLength(2);
    expect(restored.reason).toBe(draft.reason);
  });
  it("owns thumbnail bytes and preserves independent media revisions", async () => {
    const bytes = await sharp({
      create: { width: 64, height: 36, channels: 3, background: "#e8a83e" },
    })
      .png()
      .toBuffer();
    const command = {
      contentId,
      variantId,
      expectedMediaVersion: 1,
      operationKey: op(),
    };
    const [a, b] = await Promise.all([
      saveContentMedia(userId, command, bytes),
      saveContentMedia(userId, command, bytes),
    ]);
    expect(a.id).toBe(b.id);
    expect(
      (await readContentMedia(userId, a.id))!.bytes.byteLength,
    ).toBeGreaterThan(0);
    expect(await readContentMedia(otherId, a.id)).toBeNull();
    await expect(
      saveContentMedia(userId, { ...command, operationKey: op() }, bytes),
    ).rejects.toThrow();
    const w = (await getContentWorkspace(userId, contentId))!;
    expect(w.variants[0].thumbnail?.id).toBe(a.id);
    expect(w.variants[0].writingVersion).toBe(2);
    await saveContentMedia(userId, {
      ...command,
      expectedMediaVersion: 2,
      operationKey: op(),
    });
    expect(
      (await getContentWorkspace(userId, contentId))!.variants[0].thumbnail,
    ).toBeNull();
    expect(await readContentMedia(userId, a.id)).not.toBeNull();
  });
  it("uses composite foreign keys even when a caller bypasses services", async () => {
    const outsider = await contentCommand(otherId, {
      type: "CREATE_CONTENT",
      operationKey: op(),
      draft: intent,
      format: "LONG_FORM",
    });
    const foreign = (await getContentWorkspace(otherId, outsider.id))!;
    const domain = await prisma.domain.findFirstOrThrow({
      where: { userId, slug: "content" },
      include: { activityTypes: true },
    });
    await expect(
      prisma.session.create({
        data: {
          userId,
          domainId: domain.id,
          activityTypeId: domain.activityTypes[0].id,
          startedAt: new Date(),
          contentId,
          contentVariantId: foreign.variants[0].id,
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.ideaOutput.create({
        data: { userId, ideaId, contentId: outsider.id, kind: "LINKED" },
      }),
    ).rejects.toThrow();
  });
  it("clips publication dates at Amsterdam quarter boundaries", async () => {
    const p = (await getPublicationView(userId, publicationId))!;
    await contentCommand(userId, {
      type: "CORRECT_PUBLICATION",
      operationKey: op(),
      contentId,
      publicationId,
      expectedVersion: p.version,
      draft: {
        channelId: p.channelId,
        publishedTitle: p.publishedTitle,
        publishedOn: "2026-03-31",
        url: p.url,
        placement: p.placement,
      },
      reason: "Historical release date corrected",
    });
    const a = await readContentMeasurement(prisma, {
      userId,
      metric: "CONTENT_PUBLICATIONS",
      start: new Date("2026-03-31T22:00:00Z"),
      end: new Date("2026-04-01T22:00:00Z"),
    });
    expect(a.count).toBe(0);
    const b = await readContentMeasurement(prisma, {
      userId,
      metric: "CONTENT_PUBLICATIONS",
      start: new Date("2026-03-30T22:00:00Z"),
      end: new Date("2026-03-31T22:00:00Z"),
    });
    expect(b.count).toBe(1);
  });
  it("paginates preserved history without leaking another owner's records", async () => {
    const fixture = await thinkingCommand(userId, {
      type: "SAVE_IDEA",
      operationKey: op(),
      draft: {
        title: "History fixture",
        notes: "Original note",
        domainIds: [],
      },
    });
    let version = fixture.version!;
    for (let index = 0; index < 23; index++) {
      const changed = await thinkingCommand(userId, {
        type: "SAVE_IDEA",
        operationKey: op(),
        id: fixture.id,
        expectedVersion: version,
        draft: {
          title: `History fixture ${index}`,
          notes: "Retain prior wording",
          domainIds: [],
        },
      });
      version = changed.version!;
    }
    const view = (await getIdea(userId, fixture.id))!;
    expect(view.history).toHaveLength(20);
    expect(view.historyNextCursor).not.toBeNull();
    const second = await getThinkingHistory(
      userId,
      "idea",
      fixture.id,
      view.historyNextCursor!,
    );
    expect(second.items).toHaveLength(4);
    expect(second.nextCursor).toBeNull();
    expect(
      new Set([...view.history, ...second.items].map((h) => h.id)).size,
    ).toBe(24);
    expect(
      (await getThinkingHistory(otherId, "idea", fixture.id)).items,
    ).toHaveLength(0);
    expect(
      (await getContentHistory(otherId, "observations", publicationId)).items,
    ).toHaveLength(0);
  });
  it("honors an exact corrected release time in results, coverage and evidence", async () => {
    const channel = await contentCommand(userId, {
      type: "SAVE_CHANNEL",
      operationKey: op(),
      draft: {
        name: "Historical corrections",
        platform: "OTHER",
        platformLabel: "Newsletter",
        account: "",
      },
    });
    const release = await contentCommand(userId, {
      type: "PUBLISH",
      operationKey: op(),
      contentId,
      variantId,
      publications: [
        {
          channelId: channel.id,
          publishedTitle: "Historical release",
          publishedOn: yesterday,
          url: "",
          placement: "Issue",
        },
      ],
    });
    const p = (await getContentWorkspace(
      userId,
      contentId,
    ))!.variants[0].publications.find((p) => p.channelId === channel.id)!;
    expect(release.id).toBeDefined();
    const observation = await contentCommand(userId, {
      type: "RECORD_OBSERVATION",
      operationKey: op(),
      contentId,
      publicationId: p.id,
      draft: {
        observedAt: DateTime.fromISO(yesterday, { zone: "Europe/Amsterdam" })
          .plus({ hours: 12 })
          .toISO()!,
        views: "100",
        likes: null,
        comments: null,
        note: "A dated reading",
      },
    });
    expect(
      (await resolveEvidence(prisma, userId, {
        type: "CONTENT_OBSERVATION",
        id: observation.id,
      }))!.item.state,
    ).toBe("QUALIFYING");
    await contentCommand(userId, {
      type: "CORRECT_PUBLICATION",
      operationKey: op(),
      contentId,
      publicationId: p.id,
      expectedVersion: p.version,
      draft: {
        channelId: p.channelId,
        publishedTitle: p.publishedTitle,
        publishedOn: yesterday,
        publishedAt: DateTime.fromISO(yesterday, { zone: "Europe/Amsterdam" })
          .plus({ hours: 13 })
          .toISO()!,
        url: "",
        placement: p.placement,
      },
      reason:
        "The release happened later than this observation on the same day",
    });
    expect((await getPublicationView(userId, p.id))!.latest.views).toBeNull();
    expect(
      (
        await getDirectionOptions(
          userId,
          "contentObservation",
          "Historical release",
        )
      ).items,
    ).toHaveLength(0);
    expect(
      (await resolveEvidence(prisma, userId, {
        type: "CONTENT_OBSERVATION",
        id: observation.id,
      }))!.item.state,
    ).toBe("REVIEW");
    const analytics = await getContentAnalytics(userId, "year");
    expect(
      analytics.publicationGroups.find((g) => g.platform === "OTHER")
        ?.withResults,
    ).toBe(0);
    expect(analytics.recentResults.some((r) => r.publicationId === p.id)).toBe(
      false,
    );
  });
  it("atomically promotes global ideas through canonical Goal and Experiment creation", async () => {
    const idea = await thinkingCommand(userId, {
      type: "SAVE_IDEA",
      operationKey: op(),
      draft: {
        title: "Try a sustainable cadence",
        notes: "Keep the original thought",
        domainIds: [],
      },
    });
    const draft = {
      title: "A sustainable cadence",
      description: "Choose a useful rhythm",
      startOn: yesterday,
      targetOn: today,
      domainIds: [],
      criterionMode: "ALL",
      criteria: [],
    };
    await thinkingCommand(userId, {
      type: "ARCHIVE_IDEA",
      operationKey: op(),
      id: idea.id,
      expectedVersion: idea.version,
      archived: true,
    });
    const before = await prisma.goal.count({ where: { userId } });
    await expect(
      thinkingCommand(userId, {
        type: "PROMOTE_IDEA",
        operationKey: op(),
        ideaId: idea.id,
        destination: "GOAL",
        draft,
      }),
    ).rejects.toThrow(/Restore/);
    expect(await prisma.goal.count({ where: { userId } })).toBe(before);
    await thinkingCommand(userId, {
      type: "ARCHIVE_IDEA",
      operationKey: op(),
      id: idea.id,
      expectedVersion: 2,
      archived: false,
    });
    const goalInput = {
      type: "PROMOTE_IDEA",
      operationKey: op(),
      ideaId: idea.id,
      destination: "GOAL",
      draft,
    };
    const [first, retry] = await Promise.all([
      thinkingCommand(userId, goalInput),
      thinkingCommand(userId, goalInput),
    ]);
    expect(first.id).toBe(retry.id);
    const experiment = await thinkingCommand(userId, {
      type: "PROMOTE_IDEA",
      operationKey: op(),
      ideaId: idea.id,
      destination: "EXPERIMENT",
      draft: {
        title: "Try the cadence",
        question: "What is sustainable?",
        approach: "Try deliberately and reflect",
        startOn: yesterday,
        targetOn: today,
        domainIds: [],
        criterionMode: "ALL",
        criteria: [],
        sourceInteractionIds: [],
        sourceContentIds: [contentId],
        goalId: first.id,
      },
    });
    const saved = (await getIdea(userId, idea.id))!;
    expect(saved.outputsCount).toBe(2);
    expect(saved.outputs.map((o) => o.type).sort()).toEqual([
      "EXPERIMENT",
      "GOAL",
    ]);
    expect(saved.history.filter((h) => h.kind === "PROMOTED")).toHaveLength(2);
    expect((await getExperimentView(userId, experiment.id))!.goal?.id).toBe(
      first.id,
    );
    expect(saved.notes).toBe("Keep the original thought");
  });
});
