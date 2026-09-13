import "dotenv/config";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import pg from "pg";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  createReviewFixture,
  requireReviewTestDatabase,
} from "./review-fixture.service";
import { addReviewArtworkFixture } from "./review-artwork-fixture.service";
import { getReviewFacts } from "@/features/reviews/facts/queries/review-facts.query";
import { getReviewView } from "@/features/reviews/persistence/queries/review.query";
import { mutateReview } from "@/features/reviews/persistence/services/review.service";
import { getReviewEvidence } from "@/features/reviews/evidence/queries/review-evidence.query";
import { getSeasonTransition } from "@/features/seasons/transition/queries/season-transition.query";
import { mutateSeasonTransition } from "@/features/seasons/transition/services/season-transition.service";
import { getCurrentContext } from "@/features/reviews/retrieval/queries/current-context.query";
import { getTargetedRetrieval } from "@/features/reviews/retrieval/queries/targeted-retrieval.query";
import { emptySeasonDraft } from "@/features/seasons/utils/season-calendar.util";
import { deleteDisposableBrowserUser } from "../../../../../e2e/utils/disposable-user.util";

const at = new Date("2026-09-13T12:00:00Z"),
  identity = { timeframe: "season" as const, startOn: "2026-04-01" };
const writing = {
  reflection: "A small finished thing taught me more than the large plan.",
  carryForward: "Keep a clear stopping point.",
  leaveBehind: "Expanding the promise before testing it.",
  selectedMomentKeys: [] as string[],
};
describe.runIf(process.env.RUN_REVIEW_INTEGRATION === "1")(
  "Phase 7 real PostgreSQL contracts",
  () => {
    let f: Awaited<ReturnType<typeof createReviewFixture>>, email: string;
    const extras: { id: string; email: string }[] = [];
    beforeEach(async () => {
      requireReviewTestDatabase();
      email = `phase7-${randomUUID()}@example.test`;
      const user = await prisma.user.create({
        data: {
          id: randomUUID(),
          name: "Disposable review integration",
          email,
        },
      });
      f = await createReviewFixture(user.id);
    });
    afterEach(async () => {
      vi.restoreAllMocks();
      await deleteDisposableBrowserUser(f.userId, email);
      for (const user of extras.splice(0))
        await deleteDisposableBrowserUser(user.id, user.email);
    });
    afterAll(() => prisma.$disconnect());

    it("qualifies paused time, Content cross-posts, money, and stable facts without volatile reference timestamps", async () => {
      const facts = await getReviewFacts(f.userId, identity, at),
        later = await getReviewFacts(
          f.userId,
          identity,
          new Date(at.getTime() + 5000),
        );
      expect(facts.fingerprint).toBe(later.fingerprint);
      expect(facts.time.seconds).toBe(30600);
      expect(facts.time.buckets.reduce((n, b) => n + b.seconds, 0)).toBe(30600);
      expect(facts.metrics.find((m) => m.key === "content.works")?.value).toBe(
        "1",
      );
      expect(
        facts.metrics.find((m) => m.key === "content.variants")?.value,
      ).toBe("1");
      expect(
        facts.metrics.find((m) => m.key === "content.publications")?.value,
      ).toBe("2");
      expect(
        facts.metrics.find((m) => m.key === "content.observations")
          ?.qualification,
      ).toContain("not period gains");
      const sources = await getReviewEvidence(
        f.userId,
        {
          ...identity,
          metricKey: "sessions.focused",
          fingerprint: facts.fingerprint,
        },
        at,
      );
      expect(sources.total).toBe(3);
      expect(
        sources.items.map((s) => Number(s.value)).reduce((a, b) => a + b, 0),
      ).toBe(30600);
      const engineering = await getReviewEvidence(
        f.userId,
        {
          ...identity,
          metricKey: "engineering.evidence",
          fingerprint: facts.fingerprint,
        },
        at,
      );
      expect(engineering.items[0].href).toBe(
        `/engineering/evidence/${f.evidenceId}/edit`,
      );
      const publications = await getReviewEvidence(
        f.userId,
        {
          ...identity,
          metricKey: "content.publications",
          fingerprint: facts.fingerprint,
        },
        at,
      );
      const publication = await prisma.publication.findUniqueOrThrow({
        where: { id: f.publicationIds[0] },
      });
      expect(
        publications.items.every(
          (source) =>
            source.href ===
            `/content/${f.contentId}?variant=${publication.variantId}`,
        ),
      ).toBe(true);
      expect(facts.payloadBytes).toBe(Buffer.byteLength(JSON.stringify(facts)));
      expect(facts.identity.persona.groundedProfile).toBeNull();
    });

    it("captures exact owned domain time series including zero and disabled domains without rewriting editions", async () => {
      const content = await prisma.domain.findUniqueOrThrow({
        where: { userId_slug: { userId: f.userId, slug: "content" } },
        include: { activityTypes: true },
      });
      await prisma.session.update({
        where: { id: f.sessionIds[1] },
        data: {
          domainId: content.id,
          activityTypeId: content.activityTypes[0].id,
          engineeringContext: null,
        },
      });
      await prisma.domain.update({
        where: { id: content.id },
        data: { enabled: false },
      });
      const other = await prisma.user.create({
        data: {
          id: randomUUID(),
          name: "Other disposable owner",
          email: `phase7-${randomUUID()}@example.test`,
        },
      });
      extras.push(other);
      const otherFixture = await createReviewFixture(other.id);
      const view = await getReviewView(f.userId, identity, undefined, at);
      const series = view.facts.time.domainBreakdown!.series;
      expect(series).toHaveLength(
        await prisma.domain.count({ where: { userId: f.userId } }),
      );
      expect(series.some((d) => d.domainId === otherFixture.domainId)).toBe(
        false,
      );
      expect(
        series
          .find((d) => d.domainId === f.domainId)
          ?.buckets.map((b) => b.seconds),
      ).toEqual([9000, 0, 14400]);
      expect(
        series
          .find((d) => d.domainId === content.id)
          ?.buckets.map((b) => b.seconds),
      ).toEqual([0, 7200, 0]);
      expect(series.find((d) => d.domainId === content.id)?.seconds).toBe(7200);
      expect(
        series
          .filter((d) => ![f.domainId, content.id].includes(d.domainId))
          .every(
            (d) => d.seconds === 0 && d.buckets.every((b) => b.seconds === 0),
          ),
      ).toBe(true);
      expect(series.reduce((sum, d) => sum + d.seconds, 0)).toBe(
        view.facts.time.seconds,
      );
      for (let i = 0; i < view.facts.time.buckets.length; i++) {
        expect(series.reduce((sum, d) => sum + d.buckets[i].seconds, 0)).toBe(
          view.facts.time.buckets[i].seconds,
        );
      }
      const saved = await mutateReview(
        f.userId,
        {
          type: "FINALIZE",
          ...identity,
          expectedVersion: view.version,
          fingerprint: view.facts.fingerprint,
          operationKey: randomUUID(),
        },
        at,
      );
      const captured = saved.view.facts.time.domainBreakdown;
      await prisma.session.update({
        where: { id: f.sessionIds[1] },
        data: { endedAt: new Date("2026-05-18T11:00:00Z") },
      });
      await prisma.domain.update({
        where: { id: content.id },
        data: { name: "Renamed after capture" },
      });
      const frozen = await getReviewView(
        f.userId,
        identity,
        saved.view.edition!.id,
        at,
      );
      expect(frozen.facts.time.domainBreakdown).toEqual(captured);
      const live = await getReviewFacts(f.userId, identity, at);
      expect(
        live.time.domainBreakdown!.series.find(
          (d) => d.domainId === content.id,
        ),
      ).toMatchObject({ seconds: 10800, label: "Renamed after capture" });
      expect(live.fingerprint).not.toBe(frozen.facts.fingerprint);
    });

    it("clips pauses across calendar quarters and DST and keeps unfinished time explicitly provisional", async () => {
      const crossing = await prisma.session.create({
        data: {
          userId: f.userId,
          domainId: f.domainId,
          activityTypeId: f.activityTypeId,
          engineeringContext: "PERSONAL",
          startedAt: new Date("2026-06-30T21:00Z"),
          endedAt: new Date("2026-07-01T01:00Z"),
        },
      });
      await prisma.sessionPause.create({
        data: {
          sessionId: crossing.id,
          startedAt: new Date("2026-06-30T21:30Z"),
          endedAt: new Date("2026-06-30T22:30Z"),
        },
      });
      const dst = await prisma.session.create({
        data: {
          userId: f.userId,
          domainId: f.domainId,
          activityTypeId: f.activityTypeId,
          engineeringContext: "PERSONAL",
          startedAt: new Date("2026-03-29T00:00Z"),
          endedAt: new Date("2026-03-29T03:00Z"),
        },
      });
      await prisma.sessionPause.create({
        data: {
          sessionId: dst.id,
          startedAt: new Date("2026-03-29T00:30Z"),
          endedAt: new Date("2026-03-29T02:30Z"),
        },
      });
      expect(
        (await getReviewFacts(f.userId, identity, at, ["sessions"])).time
          .seconds,
      ).toBe(32400);
      expect(
        (
          await getReviewFacts(
            f.userId,
            { timeframe: "month", startOn: "2026-07-01" },
            at,
            ["sessions"],
          )
        ).time.seconds,
      ).toBe(9000);
      expect(
        (
          await getReviewFacts(
            f.userId,
            { timeframe: "month", startOn: "2026-03-01" },
            at,
            ["sessions"],
          )
        ).time.seconds,
      ).toBe(3600);
      const active = await prisma.session.create({
        data: {
          userId: f.userId,
          domainId: f.domainId,
          activityTypeId: f.activityTypeId,
          engineeringContext: "PERSONAL",
          startedAt: new Date("2026-09-13T10:00Z"),
        },
      });
      await prisma.sessionPause.create({
        data: {
          sessionId: active.id,
          startedAt: new Date("2026-09-13T11:00Z"),
        },
      });
      const current = await getReviewFacts(
        f.userId,
        { timeframe: "month", startOn: "2026-09-01" },
        at,
        ["sessions"],
      );
      expect(current.time.seconds).toBe(0);
      expect(current.time.provisionalSeconds).toBe(3600);
      expect(
        current.time.domainBreakdown!.series.find(
          (d) => d.domainId === f.domainId,
        ),
      ).toMatchObject({ seconds: 0, provisionalSeconds: 3600 });
      expect(current.time.provisionalLabel).toContain("provisional");
      expect((await getSeasonTransition(f.userId, {}, at)).autoEligible).toBe(
        false,
      );
      await expect(
        mutateSeasonTransition(
          f.userId,
          {
            type: "BEGIN",
            startOn: identity.startOn,
            expectedVersion: 0,
            operationKey: randomUUID(),
            clientId: randomUUID(),
          },
          at,
        ),
      ).rejects.toThrow("running or paused");
    });

    it("preserves final editions across corrections, rejects stale writing and makes amendments explicit and idempotent", async () => {
      let saved = await mutateReview(
        f.userId,
        {
          type: "SAVE",
          ...identity,
          writing,
          expectedVersion: 0,
          operationKey: randomUUID(),
        },
        at,
      );
      await expect(
        mutateReview(
          f.userId,
          {
            type: "SAVE",
            ...identity,
            writing: { ...writing, reflection: "stale overwrite" },
            expectedVersion: 0,
            operationKey: randomUUID(),
          },
          at,
        ),
      ).rejects.toThrow();
      const command = {
        type: "FINALIZE",
        ...identity,
        expectedVersion: saved.view.version,
        fingerprint: saved.view.facts.fingerprint,
        operationKey: randomUUID(),
      };
      const [a, b] = await Promise.all([
        mutateReview(f.userId, command, at),
        mutateReview(f.userId, command, at),
      ]);
      expect(a.view.edition!.id).toBe(b.view.edition!.id);
      expect(
        await prisma.reviewEdition.count({
          where: { userId: f.userId, kind: "FINALIZED" },
        }),
      ).toBe(1);
      const original = JSON.stringify(a.view.facts);
      await prisma.financialTransaction.update({
        where: { id: f.incomeId },
        data: { amountMinor: 47000n },
      });
      const frozen = await getReviewView(
        f.userId,
        identity,
        a.view.edition!.id,
        at,
      );
      expect(JSON.stringify(frozen.facts)).toBe(original);
      expect(frozen.liveChanged).toBe(true);
      expect(frozen.writing).toEqual(writing);
      const source = await getReviewEvidence(
        f.userId,
        {
          ...identity,
          metricKey: "finance.income.BUSINESS_REVENUE:EUR",
          editionId: a.view.edition!.id,
          fingerprint: a.view.facts.fingerprint,
        },
        at,
      );
      expect(source.items[0].value).toBe("45000");
      expect(source.period).toEqual(a.view.facts.period);
      saved = {
        error: null,
        view: await getReviewView(f.userId, identity, undefined, at),
      };
      const amended = await mutateReview(
        f.userId,
        {
          type: "AMEND",
          ...identity,
          writing: {
            ...writing,
            reflection:
              "Keep the original meaning; record the corrected payment.",
          },
          supersedesId: a.view.edition!.id,
          expectedVersion: saved.view.version,
          fingerprint: saved.view.facts.fingerprint,
          operationKey: randomUUID(),
        },
        at,
      );
      expect(amended.view.edition!.supersedesId).toBe(a.view.edition!.id);
      expect(
        await prisma.reviewEdition.count({ where: { userId: f.userId } }),
      ).toBe(2);
      expect(
        (await getReviewView(f.userId, identity, a.view.edition!.id, at))
          .writing.reflection,
      ).toBe(writing.reflection);
      await expect(
        mutateReview(
          f.userId,
          {
            type: "SAVE",
            ...identity,
            writing,
            expectedVersion: amended.view.version,
            operationKey: randomUUID(),
          },
          at,
        ),
      ).rejects.toThrow("explicit amendment");
    });

    it("keeps distinct companies, actual classified money and confirmed allocations separate from offers", async () => {
      const userId = f.userId,
        occurredAt = new Date("2026-06-20T10:00Z");
      const company = await prisma.company.create({
        data: {
          userId,
          name: "Disposable company",
          normalizedName: "disposable company",
        },
      });
      for (let i = 0; i < 3; i++) {
        const interaction = await prisma.interaction.create({
          data: { userId, voidedAt: i === 2 ? at : null },
        });
        await prisma.interactionRevision.create({
          data: {
            userId,
            interactionId: interaction.id,
            version: 1,
            companyId: company.id,
            companySnapshot: company.name,
            kind: "CONVERSATION",
            channel: "OTHER",
            occurredAt,
            summary: `Conversation ${i}`,
          },
        });
      }
      const income = await prisma.financialTransaction.findUniqueOrThrow({
        where: { id: f.incomeId },
      });
      for (const [kind, amount] of [
        ["EARNED_WORK", 10000n],
        ["GIFT", 7000n],
      ] as const)
        await prisma.financialTransaction.create({
          data: {
            userId,
            accountId: income.accountId,
            type: "INCOME",
            inflowKind: kind,
            amountMinor: amount,
            currency: "EUR",
            occurredAt,
          },
        });
      const usd = await prisma.financialAccount.create({
        data: {
          userId,
          name: "Disposable dollars",
          currency: "USD",
          type: "CHECKING",
        },
      });
      await prisma.financialTransaction.create({
        data: {
          userId,
          accountId: usd.id,
          type: "INCOME",
          inflowKind: "BUSINESS_REVENUE",
          amountMinor: 1200n,
          currency: "USD",
          occurredAt,
        },
      });
      for (const [amount, pending] of [
        [20000n, false],
        [15000n, true],
      ] as const)
        await prisma.businessReceiptAllocation.create({
          data: {
            userId,
            transactionId: income.id,
            originalTransactionId: income.id,
            companyId: company.id,
            amountMinor: amount,
            currencySnapshot: "EUR",
            occurredAtSnapshot: occurredAt,
            companySnapshot: company.name,
            needsReviewAt: pending ? at : null,
          },
        });
      const offer = await prisma.offer.create({
        data: { userId, companyId: company.id },
      });
      const revision = await prisma.offerRevision.create({
        data: {
          userId,
          offerId: offer.id,
          companyId: company.id,
          version: 1,
          title: "Unpaid recurring proposal",
          scope: "A proposed project",
          companySnapshot: company.name,
          priceBasis: "RECURRING",
          priceMinor: 90000n,
          currency: "EUR",
          intervalUnit: "MONTH",
          intervalCount: 1,
        },
      });
      await prisma.offerEvent.create({
        data: {
          userId,
          offerId: offer.id,
          offerRevisionId: revision.id,
          kind: "ACCEPTED",
          occurredAt,
          sourceDescription: "Explicit recorded acceptance, no payment",
        },
      });
      const facts = await getReviewFacts(userId, identity, at);
      const metric = (key: string) => facts.metrics.find((m) => m.key === key);
      expect(metric("entrepreneurship.companies")?.value).toBe("1");
      expect(metric("entrepreneurship.CONVERSATION")?.value).toBe("2");
      expect(metric("finance.income.BUSINESS_REVENUE:EUR")?.value).toBe(
        "45000",
      );
      expect(metric("finance.income.BUSINESS_REVENUE:USD")?.value).toBe("1200");
      expect(metric("finance.income.GIFT:EUR")?.value).toBe("7000");
      expect(metric("entrepreneurship.receipts:EUR")?.value).toBe("20000");
      expect(metric("entrepreneurship.offers")?.value).toBe("1");
      const scoped = await getTargetedRetrieval(
        userId,
        { type: "INCOME", ...identity, currency: "EUR", companyId: company.id },
        at,
      );
      expect(scoped.metrics[0].value).toBe("20000");
      expect(scoped.total).toBe(1);
    });

    it("gives yearly reviews distinct saved chapters without attributing the whole year to one COTS", async () => {
      await prisma.userSeason.create({
        data: {
          userId: f.userId,
          year: 2026,
          quarter: 1,
          title: "Earlier chapter",
          intention: "Start with a useful question",
        },
      });
      await prisma.userSeason.create({
        data: {
          userId: f.userId,
          year: 2026,
          quarter: 4,
          title: "Future planned chapter",
        },
      });
      const facts = await getReviewFacts(
        f.userId,
        { timeframe: "year", startOn: "2026-01-01" },
        at,
      );
      expect(facts.identity.seasonId).toBeNull();
      expect(facts.identity.persona.profileStatus).toBe("NO_COTS");
      expect(facts.seasonChapters?.map((s) => s.quarter)).toEqual([1, 2]);
      expect(facts.time.seconds).toBe(30600);
      const early = await getReviewFacts(
        f.userId,
        { timeframe: "year", startOn: "2026-01-01" },
        new Date("2026-02-01T12:00Z"),
      );
      expect(early.seasonChapters?.map((s) => s.quarter)).toEqual([1]);
    });

    it("removes only the active legacy tone while retaining saved historical JSON", async () => {
      const legacy = { ...emptySeasonDraft().character, tone: "RUTHLESS" };
      const snapshot = {
        character: legacy,
        note: "Keep this historical meaning",
      };
      await prisma.userSeason.update({
        where: { id: f.seasonId },
        data: { character: legacy, closingSnapshot: snapshot },
      });
      const sql = await readFile(
        new URL(
          "../../../../../prisma/migrations/20260913010000_phase7_reviews/migration.sql",
          import.meta.url,
        ),
        "utf8",
      );
      const statement = sql
        .split("\n")
        .find((line) => line.startsWith('UPDATE "user_season"'))!;
      expect(statement).toContain("character - 'tone'");
      await prisma.$executeRawUnsafe(statement);
      const saved = await prisma.userSeason.findUniqueOrThrow({
        where: { id: f.seasonId },
      });
      expect(saved.character).not.toHaveProperty("tone");
      expect(saved.closingSnapshot).toEqual(snapshot);
    });

    it("separates the actual saved opening intention from later wording", async () => {
      await prisma.seasonChange.create({
        data: {
          userId: f.userId,
          seasonId: f.seasonId,
          version: 1,
          kind: "OPENED",
          operationKey: randomUUID(),
          fingerprint: "fixture",
          reason: "Opened",
          snapshot: { ...emptySeasonDraft(), intention: "First saved promise" },
          createdAt: new Date("2026-04-02T10:00Z"),
        },
      });
      const facts = await getReviewFacts(f.userId, identity, at);
      expect(facts.identity.originalIntention).toBe("First saved promise");
      expect(facts.identity.intention).toContain("quiet mornings");
      const goal = await getTargetedRetrieval(
        f.userId,
        { type: "GOAL", id: f.goalId },
        at,
      );
      expect(goal.records[0].fields.title).toBe("Finish one useful piece");
      await expect(
        getTargetedRetrieval(
          "another-user",
          { type: "GOAL", id: f.goalId },
          at,
        ),
      ).rejects.toThrow("not found");
    });

    it("rejects changed writing before BEGIN even when the preview facts are identical", async () => {
      const preview = await getReviewView(f.userId, identity, undefined, at);
      const saved = await mutateReview(
        f.userId,
        {
          type: "SAVE",
          ...identity,
          writing,
          expectedVersion: preview.version,
          operationKey: randomUUID(),
        },
        at,
      );
      expect(saved.view.facts.fingerprint).toBe(preview.facts.fingerprint);
      await expect(
        mutateSeasonTransition(
          f.userId,
          {
            type: "BEGIN",
            startOn: identity.startOn,
            expectedVersion: 0,
            clientId: randomUUID(),
            operationKey: randomUUID(),
            factsFingerprint: preview.facts.fingerprint,
            previewReviewVersion: preview.version,
            previewEditionId: null,
          },
          at,
        ),
      ).rejects.toThrow("writing changed");
      expect(
        await prisma.reviewEdition.count({ where: { userId: f.userId } }),
      ).toBe(0);
    });

    it("requires ended periods and fresh evidence at finalization", async () => {
      const open = { timeframe: "month", startOn: "2026-09-01" };
      const preview = await getReviewView(f.userId, open, undefined, at);
      await expect(
        mutateReview(
          f.userId,
          {
            type: "FINALIZE",
            ...open,
            expectedVersion: 0,
            fingerprint: preview.facts.fingerprint,
            operationKey: randomUUID(),
          },
          at,
        ),
      ).rejects.toThrow("calendar period ends");
      const ended = await getReviewView(f.userId, identity, undefined, at);
      await prisma.financialTransaction.update({
        where: { id: f.incomeId },
        data: { notes: "Corrected evidence note" },
      });
      await expect(
        mutateReview(
          f.userId,
          {
            type: "FINALIZE",
            ...identity,
            expectedVersion: 0,
            fingerprint: ended.facts.fingerprint,
            operationKey: randomUUID(),
          },
          at,
        ),
      ).rejects.toThrow("Evidence changed");
      expect(
        await prisma.reviewEdition.count({ where: { userId: f.userId } }),
      ).toBe(0);
    });

    it("serializes two tabs, preserves progress and deferral, and completes once into the existing opening", async () => {
      const clientA = randomUUID(),
        clientB = randomUUID();
      expect((await getSeasonTransition(f.userId, {}, at)).autoEligible).toBe(
        true,
      );
      const begin = {
        type: "BEGIN",
        startOn: identity.startOn,
        expectedVersion: 0,
        clientId: clientA,
        operationKey: randomUUID(),
      };
      const first = await mutateSeasonTransition(f.userId, begin, at),
        id = first.transition.editionId;
      expect(
        (await mutateSeasonTransition(f.userId, begin, at)).transition
          .editionId,
      ).toBe(id);
      await expect(
        mutateSeasonTransition(
          f.userId,
          {
            ...begin,
            clientId: clientB,
            expectedVersion: first.transition.version,
            operationKey: randomUUID(),
          },
          at,
        ),
      ).rejects.toThrow("another tab");
      let view = (
        await mutateSeasonTransition(
          f.userId,
          {
            type: "ADVANCE",
            startOn: identity.startOn,
            expectedVersion: first.transition.version,
            clientId: clientA,
            operationKey: randomUUID(),
            movement: 3,
          },
          at,
        )
      ).transition;
      expect(view.movement).toBe(3);
      expect(view.completedMovements).toBe(3);
      expect(view.editionId).toBe(id);
      expect(
        await prisma.reviewEdition.count({ where: { userId: f.userId } }),
      ).toBe(1);
      view = (
        await mutateSeasonTransition(
          f.userId,
          {
            type: "ADVANCE",
            startOn: identity.startOn,
            expectedVersion: view.version,
            clientId: clientA,
            operationKey: randomUUID(),
            movement: 1,
          },
          at,
        )
      ).transition;
      expect(view.movement).toBe(1);
      expect(view.completedMovements).toBe(3);
      await expect(
        mutateSeasonTransition(
          f.userId,
          {
            type: "COMPLETE",
            startOn: identity.startOn,
            expectedVersion: view.version,
            clientId: clientA,
            operationKey: randomUUID(),
          },
          at,
        ),
      ).rejects.toThrow("Reach the closing beat");
      view = (
        await mutateSeasonTransition(
          f.userId,
          {
            type: "DEFER",
            startOn: identity.startOn,
            expectedVersion: view.version,
            clientId: clientA,
            operationKey: randomUUID(),
          },
          at,
        )
      ).transition;
      expect(view.disposition).toBe("DEFERRED");
      expect(
        (
          await getSeasonTransition(
            f.userId,
            {},
            new Date(at.getTime() + 86400000),
          )
        ).autoEligible,
      ).toBe(false);
      view = (
        await mutateSeasonTransition(
          f.userId,
          {
            ...begin,
            clientId: clientB,
            expectedVersion: view.version,
            operationKey: randomUUID(),
          },
          at,
        )
      ).transition;
      expect(view.movement).toBe(1);
      expect(view.editionId).toBe(id);
      for (const movement of [2, 3])
        view = (
          await mutateSeasonTransition(
            f.userId,
            {
              type: "ADVANCE",
              startOn: identity.startOn,
              expectedVersion: view.version,
              clientId: clientB,
              operationKey: randomUUID(),
              movement,
            },
            at,
          )
        ).transition;
      const complete = {
        type: "COMPLETE",
        startOn: identity.startOn,
        expectedVersion: view.version,
        clientId: clientB,
        operationKey: randomUUID(),
      };
      const finished = (await mutateSeasonTransition(f.userId, complete, at))
        .transition;
      expect(finished.destinationHref).toBe(
        "/direction/seasons/2026/3/opening?fromFinale=1",
      );
      expect(
        (await mutateSeasonTransition(f.userId, complete, at)).transition
          .disposition,
      ).toBe("COMPLETED");
      const replay = await getSeasonTransition(
        f.userId,
        { startOn: identity.startOn, includeReview: true },
        at,
      );
      expect(replay.replay).toBe(true);
      expect(replay.destinationHref).toBe("/reviews/season/2026-04-01");
      expect(
        (await prisma.goal.findUniqueOrThrow({ where: { id: f.goalId } }))
          .status,
      ).toBe("ACTIVE");
      expect(
        await prisma.reviewEdition.count({ where: { userId: f.userId } }),
      ).toBe(1);
    });

    it("uses real participation, skips missed-quarter cascades, and supports sparse/no-COTS and already-opened users", async () => {
      const email = `phase7-empty-${randomUUID()}@example.test`,
        user = await prisma.user.create({
          data: { id: randomUUID(), email, name: "Empty disposable" },
        });
      extras.push(user);
      expect((await getSeasonTransition(user.id, {}, at)).from).toBeNull();
      await prisma.userSeason.create({
        data: { userId: user.id, year: 2026, quarter: 1 },
      });
      expect((await getSeasonTransition(user.id, {}, at)).from).toBeNull();
      await prisma.userSeason.update({
        where: {
          userId_year_quarter: { userId: user.id, year: 2026, quarter: 1 },
        },
        data: { openingCompletedAt: new Date("2026-01-02") },
      });
      expect((await getSeasonTransition(user.id, {}, at)).from?.startOn).toBe(
        "2026-01-01",
      );
      const quiet = await mutateSeasonTransition(
        user.id,
        {
          type: "BEGIN",
          startOn: "2026-01-01",
          expectedVersion: 0,
          clientId: randomUUID(),
          operationKey: randomUUID(),
        },
        at,
      );
      expect(quiet.transition.review!.facts.identity.characterName).toBe("");
      await prisma.userSeason.create({
        data: {
          userId: f.userId,
          year: 2025,
          quarter: 4,
          title: "Older chapter",
        },
      });
      await prisma.userSeason.create({
        data: {
          userId: f.userId,
          year: 2026,
          quarter: 3,
          openingCompletedAt: at,
        },
      });
      expect((await getSeasonTransition(f.userId, {}, at)).from?.startOn).toBe(
        "2026-04-01",
      );
      expect(
        (await getSeasonTransition(f.userId, {}, at)).destinationHref,
      ).toBe("/");
      const skip = await mutateSeasonTransition(
        f.userId,
        {
          type: "SKIP",
          startOn: identity.startOn,
          expectedVersion: 0,
          clientId: randomUUID(),
          operationKey: randomUUID(),
        },
        at,
      );
      expect(skip.transition.autoEligible).toBe(false);
      expect((await getSeasonTransition(f.userId, {}, at)).from?.startOn).toBe(
        identity.startOn,
      );
    });

    it("keeps original intention targets and conclusion events after a later reopen", async () => {
      const draft = {
        title: "Original commitment",
        description: "Make two useful builds",
        startOn: "2026-04-01",
        targetOn: "2026-06-30",
        domainIds: [f.domainId],
        criterionMode: "ALL",
        criteria: [
          {
            key: "evidence",
            metric: "ENGINEERING_EVIDENCE",
            label: "Useful builds",
            target: "2",
            domainId: f.domainId,
          },
        ],
      };
      await prisma.goalChange.updateMany({
        where: { goalId: f.goalId },
        data: { snapshot: { draft }, createdAt: new Date("2026-03-31T10:00Z") },
      });
      await prisma.goalChange.create({
        data: {
          userId: f.userId,
          goalId: f.goalId,
          version: 2,
          operationKey: randomUUID(),
          fingerprint: "fixture",
          kind: "EDITED",
          reason: "Reduced scope after testing the first version",
          snapshot: {
            draft: {
              ...draft,
              criteria: [{ ...draft.criteria[0], target: "1" }],
            },
          },
          createdAt: new Date("2026-05-01T10:00Z"),
        },
      });
      await prisma.goalChange.create({
        data: {
          userId: f.userId,
          goalId: f.goalId,
          version: 3,
          operationKey: randomUUID(),
          fingerprint: "fixture",
          kind: "CONCLUDE",
          reason: "This small promise is complete",
          snapshot: { command: { outcome: "ACHIEVED" } },
          createdAt: new Date("2026-06-24T10:00Z"),
        },
      });
      await prisma.goalChange.create({
        data: {
          userId: f.userId,
          goalId: f.goalId,
          version: 4,
          operationKey: randomUUID(),
          fingerprint: "fixture",
          kind: "REOPEN",
          reason: "A further question remains",
          snapshot: { command: { action: "REOPEN" } },
          createdAt: new Date("2026-07-04T10:00Z"),
        },
      });
      await prisma.goal.update({
        where: { id: f.goalId },
        data: {
          startOn: new Date("2026-10-01"),
          targetOn: new Date("2026-12-31"),
        },
      });
      const facts = await getReviewFacts(f.userId, identity, at);
      expect(facts.intentions[0].originalTarget).toContain("2");
      expect(facts.intentions[0].status).toBe("CONCLUDED");
      expect(
        facts.metrics.find((m) => m.key === "direction.goals")?.sourceCount,
      ).toBe(1);
    });

    it("binds ownership, decision changes/reflections, scoped questions and pagination freshness", async () => {
      const focused = await getTargetedRetrieval(
        f.userId,
        { type: "FOCUSED_TIME", ...identity, domainId: f.domainId },
        at,
      );
      expect(focused.metrics[0].value).toBe("30600");
      const decision = await getTargetedRetrieval(
        f.userId,
        { type: "DECISION", id: f.decisionId, section: "reflections" },
        at,
      );
      expect(decision.records[0].fields.reason).toContain("broad version");
      expect(decision.records[0].events[0].details.assessment).toBe("HELPFUL");
      await expect(
        getTargetedRetrieval(
          "another-user",
          { type: "DECISION", id: f.decisionId },
          at,
        ),
      ).rejects.toThrow("not found");
      await expect(
        getTargetedRetrieval(
          "another-user",
          { type: "FOCUSED_TIME", ...identity, domainId: f.domainId },
          at,
        ),
      ).rejects.toThrow("not found");
      await prisma.session.createMany({
        data: Array.from({ length: 30 }, (_, i) => ({
          userId: f.userId,
          domainId: f.domainId,
          activityTypeId: f.activityTypeId,
          engineeringContext: "PERSONAL",
          startedAt: new Date(Date.UTC(2026, 5, 1, 0, i)),
          endedAt: new Date(Date.UTC(2026, 5, 1, 0, i + 1)),
        })),
      });
      const page = await getTargetedRetrieval(
        f.userId,
        { type: "FOCUSED_TIME", ...identity, domainId: f.domainId },
        at,
      );
      expect(page.total).toBe(33);
      expect(page.sources).toHaveLength(25);
      expect(page.nextCursor).not.toBeNull();
      const next = await getTargetedRetrieval(
        f.userId,
        {
          type: "FOCUSED_TIME",
          ...identity,
          domainId: f.domainId,
          cursor: page.nextCursor!,
          fingerprint: page.fingerprint,
        },
        at,
      );
      expect(next.sources).toHaveLength(8);
      expect(
        next.sources.some((s) => page.sources.some((p) => p.key === s.key)),
      ).toBe(false);
      await prisma.session.update({
        where: { id: f.sessionIds[0] },
        data: { outcome: "Corrected outcome" },
      });
      await expect(
        getTargetedRetrieval(
          f.userId,
          {
            type: "FOCUSED_TIME",
            ...identity,
            domainId: f.domainId,
            cursor: page.nextCursor!,
            fingerprint: page.fingerprint,
          },
          at,
        ),
      ).rejects.toThrow("changed");
    });

    it("keeps retired artwork and provenance in an edition without inventing a persona", async () => {
      const art = await addReviewArtworkFixture(
        f.userId,
        f.seasonId,
        f.contentId,
      );
      const view = await getReviewView(f.userId, identity, undefined, at);
      expect(view.facts.identity.persona.profileStatus).toBe(
        "AWAITING_PHASE_8_PROFILE",
      );
      expect(view.facts.identity.persona.groundedProfile).toBeNull();
      expect(
        view.facts.identity.persona.approvedSources[0].attributionStatus,
      ).toBe("UNKNOWN");
      const final = await mutateReview(
        f.userId,
        {
          type: "FINALIZE",
          ...identity,
          expectedVersion: 0,
          fingerprint: view.facts.fingerprint,
          operationKey: randomUUID(),
        },
        at,
      );
      await prisma.seasonMediaUse.updateMany({
        where: { mediaId: art.mediaId },
        data: { retiredAt: at },
      });
      const replay = await getReviewView(
        f.userId,
        identity,
        final.view.edition!.id,
        at,
      );
      expect(replay.facts.identity.media[0].id).toBe(art.mediaId);
      expect(replay.liveChanged).toBe(true);
    });

    it("bounds larger history and UTF-8 packets while aggregating every eligible source", async () => {
      const long = "約束🌿".repeat(1500),
        draft = emptySeasonDraft();
      await prisma.userSeason.update({
        where: { id: f.seasonId },
        data: {
          intention: long,
          character: {
            ...draft.character,
            name: "Test identity",
            motivation: long,
            avoid: long,
            standards: Array.from({ length: 12 }, (_, i) => ({
              key: String(i),
              trait: long.slice(0, 160),
              behavior: long,
            })),
          },
          answers: {
            ...draft.answers,
            carryForward: long,
            leaveBehind: long,
            protect: long,
            meaningful: long,
          },
        },
      });
      await prisma.engineeringEvidence.createMany({
        data: Array.from({ length: 1500 }, (_, i) => ({
          userId: f.userId,
          type: "CONCEPT_LEARNED",
          title: `Fixture evidence ${i}`,
          details: long,
          occurredAt: new Date("2026-06-10T10:00Z"),
        })),
      });
      const spy = vi.spyOn(pg.Client.prototype, "query"),
        before = spy.mock.calls.length,
        start = performance.now();
      const facts = await getReviewFacts(f.userId, identity, at);
      const queries = spy.mock.calls.length - before;
      expect(
        facts.metrics.find((m) => m.key === "engineering.evidence")
          ?.sourceCount,
      ).toBe(1501);
      expect(facts.moments.length).toBeLessThanOrEqual(18);
      expect(facts.payloadBytes).toBeLessThanOrEqual(96 * 1024);
      expect(queries).toBeLessThan(80);
      const context = await getCurrentContext(
        f.userId,
        {},
        new Date("2026-06-29T12:00Z"),
      );
      expect(context.payloadBytes).toBeLessThanOrEqual(32 * 1024);
      console.info("Phase 7 large-fixture verification", {
        records: 1501,
        reviewBytes: facts.payloadBytes,
        personaBytes: facts.identity.persona.payloadBytes,
        currentBytes: context.payloadBytes,
        reviewQueries: queries,
        elapsedMs: Math.round(performance.now() - start),
      });
    }, 30000);
  },
);
