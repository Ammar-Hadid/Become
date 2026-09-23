import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { deleteDisposableBrowserUser } from "../../../../../e2e/utils/disposable-user.util";
import { recordObservation } from "@/features/entrepreneurship/problems/services/problem.service";
import { correctObservation } from "@/features/entrepreneurship/observations/services/observation.service";
import {
  correctExplorationClaim,
  createExplorationClaim,
  createExplorationUncertainty,
  publishExplorationSnapshot,
} from "@/features/entrepreneurship/exploration-snapshots/services/exploration-snapshot.service";
import {
  getExplorationSnapshot,
  getExplorationSnapshotHistory,
} from "@/features/entrepreneurship/exploration-snapshots/queries/exploration-snapshot.query";

const enabled = process.env.RUN_ENTREPRENEURSHIP_INTEGRATION === "1";

describe.skipIf(!enabled)("Exploration snapshots", () => {
  let userId = "";
  let email = "";

  beforeEach(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      !/^\/become_entrepreneurship/.test(url.pathname)
    )
      throw new Error("Use the dedicated Entrepreneurship test database.");
    email = `snapshot-${randomUUID()}@example.test`;
    userId = (
      await prisma.user.create({ data: { email, name: "Snapshot QA" } })
    ).id;
  });

  afterEach(async () => {
    if (userId) await deleteDisposableBrowserUser(userId, email);
  });

  it("publishes immutable editions and marks newer learning for review", async () => {
    const niche = await prisma.niche.create({
      data: {
        userId,
        name: "Research operations",
        normalizedName: `research-${randomUUID()}`,
        scope: "Understand founder research workflows.",
      },
    });
    const observation = await recordObservation(userId, null, randomUUID(), {
      sourceKind: "DIRECT_OBSERVATION",
      observedAt: "2026-09-20",
      statement: "Founders keep interview notes in multiple places.",
      sourceDescription: "Observed during a workflow review.",
      nicheId: niche.id,
      marketType: "B2C",
      identityKind: "ANONYMOUS",
      audienceLabel: "Founder",
    });
    const source = await prisma.observation.findFirstOrThrow({
      where: { id: observation.id, userId },
      include: { revisions: true },
    });
    const claim = await createExplorationClaim(userId, randomUUID(), {
      nicheId: niche.id,
      lane: "B2C",
      kind: "OBSERVED",
      statement: "Interview notes are fragmented.",
      citations: [
        {
          observationId: source.id,
          observationRevisionId: source.revisions[0].id,
          stance: "SUPPORTS",
          note: null,
        },
      ],
    });
    const uncertainty = await createExplorationUncertainty(
      userId,
      randomUUID(),
      {
        nicheId: niche.id,
        lane: "B2B",
        statement: "We do not yet know who owns research operations in teams.",
      },
    );
    await publishExplorationSnapshot(userId, randomUUID(), {
      nicheId: niche.id,
      claimIds: [claim.id],
      uncertaintyIds: [uncertainty.id],
    });
    const first = await getExplorationSnapshot(userId, niche.id);
    expect(first).toMatchObject({
      latestEdition: { number: 1 },
      recommendationFacts: { snapshotStale: false },
    });
    const firstRevisionId = first!.latestEdition!.claims[0].claimRevisionId;

    await correctObservation(userId, source.id, randomUUID(), {
      expectedVersion: 1,
      statement:
        "Founders keep interview notes and follow-ups in multiple places.",
      sourceDescription: "Observed during a workflow review.",
      observedAt: "2026-09-20",
      correctionReason: "Restored the follow-up detail.",
      meaningUnchanged: false,
      audienceOverride: false,
    });
    const stale = await getExplorationSnapshot(userId, niche.id);
    expect(stale!.recommendationFacts.snapshotStale).toBe(true);
    expect(stale!.claims[0].needsReview).toBe(true);
    expect(stale!.latestEdition!.claims[0].claimRevisionId).toBe(
      firstRevisionId,
    );
    const correctedSource = await prisma.observation.findFirstOrThrow({
      where: { id: source.id, userId },
      include: { revisions: { orderBy: { version: "desc" }, take: 1 } },
    });

    await correctExplorationClaim(userId, claim.id, randomUUID(), {
      nicheId: niche.id,
      expectedVersion: 1,
      lane: "CROSS_MARKET",
      kind: "INTERPRETATION",
      statement: "Fragmented research records cause follow-up loss.",
      correctionReason: "Separated interpretation from the observed fact.",
      citations: [
        {
          observationId: correctedSource.id,
          observationRevisionId: correctedSource.revisions[0].id,
          stance: "CONTEXT",
          note: "This corrected source grounds the cross-market interpretation.",
        },
      ],
    });
    await publishExplorationSnapshot(userId, randomUUID(), {
      nicheId: niche.id,
      claimIds: [claim.id],
      uncertaintyIds: [uncertainty.id],
    });
    const history = await getExplorationSnapshotHistory(userId, niche.id);
    expect(history.map((edition) => edition.number)).toEqual([2, 1]);
    expect(history[0].claims[0].claimRevisionId).not.toBe(firstRevisionId);
    expect(history[1].claims[0].claimRevisionId).toBe(firstRevisionId);

    await prisma.niche.update({
      where: { id_userId: { id: niche.id, userId } },
      data: { archivedAt: new Date() },
    });
    await expect(
      correctExplorationClaim(userId, claim.id, randomUUID(), {
        nicheId: niche.id,
        expectedVersion: 2,
        lane: "CROSS_MARKET",
        kind: "INTERPRETATION",
        statement: "Archived research remains readable, but immutable.",
        correctionReason: "Attempted change after archiving.",
        citations: [
          {
            observationId: correctedSource.id,
            observationRevisionId: correctedSource.revisions[0].id,
            stance: "CONTEXT",
            note: null,
          },
        ],
      }),
    ).rejects.toThrow(/active exploration/);
  });
});
