import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { ensureDefaultDomains } from "@/features/domains/defaults/services/ensure-default-domains.service";
import { emptySeasonDraft } from "@/features/seasons/utils/season-calendar.util";

/** Disposable local fixtures only. Never seed, migrate, or repair a real user here. */
export function requireReviewTestDatabase() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !url.pathname.startsWith("/become_phase7_")
  )
    throw new Error(
      "Phase 7 fixtures require a dedicated local become_phase7_ database.",
    );
}
export async function createReviewFixture(
  userId: string,
  options: { splitDomains?: boolean } = {},
) {
  requireReviewTestDatabase();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (
    !user.email.startsWith("phase7-") ||
    !user.email.endsWith("@example.test")
  )
    throw new Error("Not a disposable Phase 7 user.");
  await ensureDefaultDomains(userId);
  const engineering = await prisma.domain.findUniqueOrThrow({
    where: { userId_slug: { userId, slug: "engineering" } },
    include: { activityTypes: true },
  });
  const contentDomain = options.splitDomains
    ? await prisma.domain.findUniqueOrThrow({
        where: { userId_slug: { userId, slug: "content" } },
        include: { activityTypes: true },
      })
    : null;
  const season = await prisma.userSeason.create({
    data: {
      userId,
      year: 2026,
      quarter: 2,
      title: "Make room for the work",
      intention:
        "Publish a useful piece, finish a small build, and protect quiet mornings.",
      answers: {
        carryForward: "Small promises I can keep",
        leaveBehind: "Starting everything at once",
        protect: "An evening without a screen",
        meaningful: "One thing used by someone else",
        deferredSteps: [],
      },
      character: emptySeasonDraft().character,
      stage: 4,
      openingCompletedAt: new Date("2026-04-02T10:00:00Z"),
      createdAt: new Date("2026-04-01T09:00:00Z"),
    },
  });
  const sessions = [];
  for (const [day, description, hours] of [
    ["2026-04-12", "Make the small version work", 3],
    ["2026-05-18", "A clear explanation and a working example", 2],
    ["2026-06-22", "The last rough edge", 4],
  ] as const) {
    const sessionDomain =
      day === "2026-05-18" && contentDomain ? contentDomain : engineering;
    sessions.push(
      await prisma.session.create({
        data: {
          userId,
          domainId: sessionDomain.id,
          activityTypeId: sessionDomain.activityTypes[0].id,
          engineeringContext:
            sessionDomain.id === engineering.id ? "PERSONAL" : null,
          startedAt: new Date(`${day}T08:00:00Z`),
          endedAt: new Date(
            `${day}T${String(8 + hours).padStart(2, "0")}:00:00Z`,
          ),
          description,
          outcome:
            "Saved a working increment and wrote down the next question.",
        },
      }),
    );
  }
  await prisma.sessionPause.create({
    data: {
      sessionId: sessions[0].id,
      startedAt: new Date("2026-04-12T09:00:00Z"),
      endedAt: new Date("2026-04-12T09:30:00Z"),
    },
  });
  const evidence = await prisma.engineeringEvidence.create({
    data: {
      userId,
      type: "FEATURE_COMPLETED",
      title: "The first useful version",
      details:
        "A small working tool with one complete journey. The next step is to watch someone use it.",
      occurredAt: new Date("2026-06-22T11:00:00Z"),
      sessionId: sessions[2].id,
    },
  });
  const account = await prisma.financialAccount.create({
    data: {
      userId,
      name: "Disposable current account",
      type: "CHECKING",
      currency: "EUR",
    },
  });
  const income = await prisma.financialTransaction.create({
    data: {
      userId,
      accountId: account.id,
      type: "INCOME",
      inflowKind: "BUSINESS_REVENUE",
      currency: "EUR",
      amountMinor: 45000n,
      occurredAt: new Date("2026-06-20T10:00:00Z"),
      notes: "Payment received for the completed small project.",
    },
  });
  const content = await prisma.content.create({
    data: {
      userId,
      title: "What a small finished project taught me",
      purpose: "Show the useful decisions as well as the result.",
      createdAt: new Date("2026-05-14T10:00:00Z"),
    },
  });
  const variant = await prisma.contentVariant.create({
    data: {
      userId,
      contentId: content.id,
      name: "One useful idea",
      format: "SHORT_VERTICAL",
      stage: "READY",
      hook: "The constraint that finally made this finishable",
      createdAt: new Date("2026-05-15T10:00:00Z"),
    },
  });
  const publications = [];
  for (const platform of ["YOUTUBE", "INSTAGRAM"] as const) {
    const channel = await prisma.channel.create({
      data: {
        userId,
        name: "Disposable studio",
        platform,
        identity: randomUUID(),
      },
    });
    publications.push(
      await prisma.publication.create({
        data: {
          userId,
          variantId: variant.id,
          channelId: channel.id,
          publishedTitle: "Start small enough to finish",
          publishedOn: new Date("2026-06-15"),
          identityKey: randomUUID(),
        },
      }),
    );
  }
  await prisma.performanceObservation.create({
    data: {
      userId,
      publicationId: publications[0].id,
      observedAt: new Date("2026-06-19T10:00:00Z"),
      views: 420n,
      note: "Manual lifetime reading.",
    },
  });
  const goal = await prisma.goal.create({
    data: {
      userId,
      title: "Finish one useful piece",
      description: "Build something small enough to place in someone's hands.",
      startOn: new Date("2026-04-01"),
      targetOn: new Date("2026-06-30"),
      createdAt: new Date("2026-04-01T07:00:00Z"),
    },
  });
  const draft = {
    title: goal.title,
    description: goal.description,
    startOn: "2026-04-01",
    targetOn: "2026-06-30",
    domainIds: [engineering.id],
    criterionMode: "ALL",
    criteria: [],
  };
  await prisma.goalChange.create({
    data: {
      userId,
      goalId: goal.id,
      version: 1,
      operationKey: randomUUID(),
      fingerprint: "fixture",
      kind: "CREATED",
      reason: "A smaller commitment I can finish.",
      snapshot: { draft },
      createdAt: new Date("2026-04-01T07:00:00Z"),
    },
  });
  await prisma.seasonGoal.create({
    data: { userId, seasonId: season.id, goalId: goal.id, role: "PRIMARY" },
  });
  const decision = await prisma.decision.create({
    data: {
      userId,
      choice: "Keep this release to one complete journey",
      reason: "The broad version kept growing before anyone could use it.",
      decidedOn: new Date("2026-05-20"),
      reconsiderWhen: "After three people try the first version",
      goalId: goal.id,
      seasonId: season.id,
      createdAt: new Date("2026-05-20T09:00:00Z"),
    },
  });
  await prisma.decisionReflection.create({
    data: {
      userId,
      decisionId: decision.id,
      assessment: "HELPFUL",
      reflection:
        "The smaller promise made it possible to finish. I still need feedback before making it bigger.",
      reflectedOn: new Date("2026-06-24"),
    },
  });
  return {
    userId,
    seasonId: season.id,
    sessionIds: sessions.map((s) => s.id),
    domainId: engineering.id,
    activityTypeId: engineering.activityTypes[0].id,
    evidenceId: evidence.id,
    incomeId: income.id,
    contentId: content.id,
    publicationIds: publications.map((p) => p.id),
    goalId: goal.id,
    decisionId: decision.id,
  };
}
