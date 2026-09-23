import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { ensureDefaultDomains } from "@/features/domains/defaults/services/ensure-default-domains.service";
import { startSession } from "./start-session.service";
import { completeSession } from "./complete-session.service";
import { correctSessionDuration } from "./correct-session-duration.service";
import { transitionSession } from "./transition-session.service";
import { getTimerSnapshot } from "@/features/sessions/timer/queries/timer-snapshot.query";
import { calculateSessionMilliseconds } from "@/features/sessions/timing/utils/session-duration.util";
import { sessionFocusedSecondsSql } from "@/features/sessions/timing/utils/session-duration-sql.util";
import { readSessionMeasurement } from "@/features/sessions/measurements/queries/session-measurement.query";
import type { StartSessionInput } from "@/features/sessions/schemas/session.schema";

describe.skipIf(process.env.RUN_SESSION_INTEGRATION !== "1")(
  "session lifecycle (PostgreSQL)",
  () => {
    let userId: string;
    let otherId: string;
    let input: StartSessionInput;
    beforeEach(async () => {
      if (
        !["localhost", "127.0.0.1", "[::1]"].includes(
          new URL(process.env.DATABASE_URL!).hostname,
        )
      )
        throw new Error("Local PostgreSQL required");
      const create = () =>
        prisma.user.create({
          data: {
            name: "Timer test",
            email: `pause-${randomUUID()}@example.test`,
          },
        });
      userId = (await create()).id;
      otherId = (await create()).id;
      await ensureDefaultDomains(userId);
      const domain = await prisma.domain.findFirstOrThrow({
        where: { userId, slug: "engineering" },
        include: { activityTypes: true },
      });
      input = {
        domainId: domain.id,
        activityTypeId: domain.activityTypes[0].id,
        engineeringContext: "PERSONAL",
        description: "Keep this context",
      };
    });
    afterEach(async () => {
      await prisma.user.deleteMany({
        where: { id: { in: [userId, otherId].filter(Boolean) } },
      });
    });
    const start = async () => {
      const result = await startSession(userId, input);
      if (result.status !== "created") throw Error(result.status);
      return result;
    };
    const complete = (id: string, outcome = "Saved") =>
      completeSession(userId, id, { outcome, notes: null });

    it("corrects completed focused duration across pauses and reporting while rejecting stale or foreign edits", async () => {
      const original = await start();
      const now = Date.now();
      const startedAt = new Date(now - 3 * 3600000);
      const originalEnd = new Date(now - 5 * 60000);
      const correctedEnd = new Date(now - 3600000);
      await prisma.session.update({
        where: { id: original.sessionId },
        data: { startedAt },
      });
      await complete(original.sessionId);
      await prisma.session.update({
        where: { id: original.sessionId },
        data: { endedAt: originalEnd },
      });
      await prisma.sessionPause.create({
        data: {
          sessionId: original.sessionId,
          startedAt: new Date(now - 2 * 3600000),
          endedAt: new Date(now - 90 * 60000),
        },
      });

      expect(
        (
          await correctSessionDuration(
            otherId,
            original.sessionId,
            5400,
            originalEnd,
          )
        ).status,
      ).toBe("not-found");
      const corrected = await correctSessionDuration(
        userId,
        original.sessionId,
        5400,
        originalEnd,
      );
      expect(corrected.status).toBe("ok");
      if (corrected.status !== "ok") return;
      expect(corrected.session.endedAt).toBe(correctedEnd.toISOString());
      expect(corrected.session.durationSeconds).toBe(5400);
      expect(corrected.session.totalPausedMilliseconds).toBe(1800000);
      expect(
        (
          await correctSessionDuration(
            userId,
            original.sessionId,
            1800,
            originalEnd,
          )
        ).status,
      ).toBe("conflict");
      expect(
        (
          await correctSessionDuration(
            userId,
            original.sessionId,
            10000,
            correctedEnd,
          )
        ).status,
      ).toBe("invalid-duration");
      expect(
        (
          await correctSessionDuration(
            userId,
            original.sessionId,
            24 * 3600 + 1,
            correctedEnd,
          )
        ).status,
      ).toBe("invalid-duration");
      const measurement = await readSessionMeasurement(prisma, {
        userId,
        start: new Date(now - 4 * 3600000),
        end: new Date(now),
      });
      expect(measurement.seconds).toBe("5400");

      const earlier = await correctSessionDuration(
        userId,
        original.sessionId,
        1800,
        correctedEnd,
      );
      expect(earlier.status).toBe("ok");
      if (earlier.status === "ok") {
        expect(earlier.session.durationSeconds).toBe(1800);
        expect(earlier.session.totalPausedMilliseconds).toBe(0);
      }
    });

    it("retains one session through repeated pauses, rejects new starts, and completes paused without charging the break", async () => {
      const original = await start();
      await prisma.session.update({
        where: { id: original.sessionId },
        data: { startedAt: new Date(Date.now() - 7200000) },
      });
      let timer = await getTimerSnapshot(userId);
      for (let i = 0; i < 2; i++) {
        const paused = await transitionSession(
          userId,
          original.sessionId,
          "pause",
          timer.revision,
        );
        expect(paused.status).toBe("ok");
        expect(paused.timer.activeSession?.status).toBe("PAUSED");
        expect((await startSession(userId, input)).status).toBe(
          "already-active",
        );
        const retry = await transitionSession(
          userId,
          original.sessionId,
          "pause",
          timer.revision,
        );
        expect(retry.timer.revision).toBe(paused.timer.revision);
        const resumed = await transitionSession(
          userId,
          original.sessionId,
          "resume",
          paused.timer.revision,
        );
        expect(resumed.timer.activeSession?.id).toBe(original.sessionId);
        timer = resumed.timer;
      }
      const paused = await transitionSession(
        userId,
        original.sessionId,
        "pause",
        timer.revision,
      );
      const frozen = paused.timer.activeSession!.accumulatedActiveMilliseconds;
      const farFuture = await getTimerSnapshot(
        userId,
        DateTime.utc().plus({ days: 30 }),
      );
      expect(farFuture.activeSession!.accumulatedActiveMilliseconds).toBe(
        frozen,
      );
      const saved = await complete(original.sessionId);
      expect(saved.status).toBe("completed");
      if (saved.status !== "completed") return;
      expect(saved.session.accumulatedActiveMilliseconds).toBe(frozen);
      expect(saved.session.description).toBe(input.description);
      expect(saved.session.engineeringContext).toBe("PERSONAL");
      expect(saved.timer.activeSession).toBeNull();
      expect(
        await prisma.sessionPause.count({
          where: { sessionId: original.sessionId },
        }),
      ).toBe(3);
      expect(
        await prisma.sessionPause.count({
          where: { sessionId: original.sessionId, endedAt: null },
        }),
      ).toBe(0);
      expect(
        (
          await transitionSession(
            userId,
            original.sessionId,
            "resume",
            saved.timer.revision,
          )
        ).status,
      ).toBe("conflict");
    });

    it("serializes competing starts and transitions without replaying stale intent", async () => {
      const starts = await Promise.all([
        startSession(userId, input),
        startSession(userId, input),
      ]);
      expect(starts.map((r) => r.status).sort()).toEqual([
        "already-active",
        "created",
      ]);
      const first = starts.find((r) => r.status === "created")!;
      if (first.status !== "created") return;
      const pauses = await Promise.all([
        transitionSession(
          userId,
          first.sessionId,
          "pause",
          first.timer.revision,
        ),
        transitionSession(
          userId,
          first.sessionId,
          "pause",
          first.timer.revision,
        ),
      ]);
      expect(pauses[0].timer.revision).toBe(pauses[1].timer.revision);
      const resumed = await transitionSession(
        userId,
        first.sessionId,
        "resume",
        pauses[0].timer.revision,
      );
      expect(
        (
          await transitionSession(
            userId,
            first.sessionId,
            "pause",
            first.timer.revision,
          )
        ).status,
      ).toBe("conflict");
      expect(
        (
          await transitionSession(
            otherId,
            first.sessionId,
            "pause",
            resumed.timer.revision,
          )
        ).status,
      ).toBe("not-found");
      expect(
        (
          await completeSession(otherId, first.sessionId, {
            notes: null,
            outcome: null,
          })
        ).status,
      ).toBe("not-found");
      const results = await Promise.all([
        transitionSession(
          userId,
          first.sessionId,
          "pause",
          resumed.timer.revision,
        ),
        complete(first.sessionId),
      ]);
      expect(results[1].status).toBe("completed");
      expect((await getTimerSnapshot(userId)).activeSession).toBeNull();
      expect(
        await prisma.sessionPause.count({
          where: { sessionId: first.sessionId, endedAt: null },
        }),
      ).toBe(0);
    });

    it("creates evidence once and completion retries preserve a newer active session", async () => {
      const first = await start();
      const finish = () =>
        completeSession(userId, first.sessionId, {
          outcome: "Original",
          notes: null,
          engineeringEvidence: {
            type: "BUG_SOLVED",
            title: "Once",
            details: null,
          },
        });
      const [a, b] = await Promise.all([finish(), finish()]);
      if (a.status !== "completed" || b.status !== "completed")
        throw Error("Completion failed");
      expect(a.session).toEqual(b.session);
      expect(
        await prisma.engineeringEvidence.count({
          where: { sessionId: first.sessionId },
        }),
      ).toBe(1);
      const next = await start();
      const retried = await complete(
        first.sessionId,
        "Must not replace original",
      );
      if (retried.status !== "completed") throw Error("Retry failed");
      expect(retried.session).toEqual(a.session);
      expect(retried.timer.activeSession?.id).toBe(next.sessionId);
      expect(retried.timer.revision).toBe(next.timer.revision);
    });

    it("matches SQL/TypeScript clipping and excludes break-only measurement sources", async () => {
      const created = await start();
      const at = (iso: string) => new Date(iso);
      const session = await prisma.session.update({
        where: { id: created.sessionId },
        data: {
          startedAt: at("2026-03-28T23:59:59.400Z"),
          endedAt: at("2026-03-30T02:00:00Z"),
          pauses: {
            create: [
              {
                startedAt: at("2026-03-29T00:00:00Z"),
                endedAt: at("2026-03-29T00:00:00.400Z"),
              },
              {
                startedAt: at("2026-03-29T00:00:01Z"),
                endedAt: at("2026-03-30T01:00:00Z"),
              },
            ],
          },
        },
        include: { pauses: true },
      });
      const now = at("2026-04-01T00:00:00Z");
      for (const range of [
        undefined,
        { start: at("2026-03-29T00:00:00Z"), end: at("2026-03-29T12:00:00Z") },
        { start: at("2026-03-29T01:00:00Z"), end: at("2026-03-30T00:00:00Z") },
      ]) {
        const [sql] = await prisma.$queryRaw<
          { seconds: number }[]
        >`SELECT ${sessionFocusedSecondsSql("s", range, now)}::float8 AS seconds FROM session s WHERE id=${session.id}`;
        expect(sql.seconds).toBe(
          Math.floor(
            calculateSessionMilliseconds(
              session,
              now.getTime(),
              range && {
                start: range.start.getTime(),
                end: range.end.getTime(),
              },
            ) / 1000,
          ),
        );
      }
      const measurement = await readSessionMeasurement(prisma, {
        userId,
        start: at("2026-03-29T01:00:00Z"),
        end: at("2026-03-30T00:00:00Z"),
      });
      expect(measurement).toMatchObject({ seconds: "0", count: 0, rows: [] });
    });
  },
);
