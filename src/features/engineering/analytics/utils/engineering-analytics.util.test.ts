import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { buildEngineeringAnalytics } from "@/features/engineering/analytics/utils/engineering-analytics.util";

const zone = "Europe/Amsterdam";

describe("Engineering analytics", () => {
  it("treats activity, context, and project as independent dimensions", () => {
    const now = DateTime.fromISO("2026-09-04T15:00", { zone });
    const startedAt = DateTime.fromISO("2026-09-04T10:00", { zone })
      .toUTC()
      .toJSDate();
    const endedAt = DateTime.fromISO("2026-09-04T11:00", { zone })
      .toUTC()
      .toJSDate();
    const analytics = buildEngineeringAnalytics(
      [
        {
          startedAt,
          endedAt,
          engineeringContext: "UNI",
          activityType: { id: "learning", name: "Learning" },
          engineeringProject: null,
        },
        {
          startedAt,
          endedAt,
          engineeringContext: "PERSONAL",
          activityType: { id: "coding", name: "Coding" },
          engineeringProject: {
            id: "become",
            name: "Become",
            context: "PROFESSIONAL",
            technologies: [
              { technology: { id: "react", name: "React" } },
              { technology: { id: "typescript", name: "TypeScript" } },
            ],
          },
        },
      ],
      [],
      "week",
      now,
    );

    expect(analytics.totalSeconds).toBe(7200);
    expect(analytics.activities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Learning", seconds: 3600 }),
        expect.objectContaining({ label: "Coding", seconds: 3600 }),
      ]),
    );
    expect(analytics.contexts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Uni", seconds: 3600 }),
        expect.objectContaining({ label: "Personal", seconds: 3600 }),
      ]),
    );
    expect(analytics.projects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "No project", seconds: 3600 }),
        expect.objectContaining({ label: "Become", seconds: 3600 }),
      ]),
    );
    expect(analytics.workedProjectContexts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Professional",
          projectCount: 1,
        }),
        expect.objectContaining({ label: "Personal", projectCount: 0 }),
      ]),
    );
    expect(analytics.technologies).toEqual([
      { id: "react", label: "React", seconds: 3600 },
      { id: "typescript", label: "TypeScript", seconds: 3600 },
    ]);
    expect(analytics.totalSeconds).toBe(7200);
  });

  it("counts evidence by occurrence time and type", () => {
    const now = DateTime.fromISO("2026-09-04T15:00", { zone });
    const analytics = buildEngineeringAnalytics(
      [],
      [
        {
          type: "FEATURE_COMPLETED",
          occurredAt: DateTime.fromISO("2026-09-03T12:00", { zone })
            .toUTC()
            .toJSDate(),
        },
      ],
      "week",
      now,
    );

    expect(
      analytics.evidence.find((item) => item.type === "FEATURE_COMPLETED"),
    ).toMatchObject({ count: 1, previousCount: 0 });
  });

  it("associates a project session with each stack technology without inflating the total", () => {
    const now = DateTime.fromISO("2026-09-04T15:00", { zone });
    const analytics = buildEngineeringAnalytics(
      [
        {
          startedAt: DateTime.fromISO("2026-09-04T10:00", { zone })
            .toUTC()
            .toJSDate(),
          endedAt: DateTime.fromISO("2026-09-04T12:00", { zone })
            .toUTC()
            .toJSDate(),
          engineeringContext: "PROFESSIONAL",
          activityType: { id: "architecture", name: "Architecture" },
          engineeringProject: {
            id: "auctus",
            name: "Auctus",
            context: "PERSONAL",
            technologies: [
              { technology: { id: "react", name: "React" } },
              { technology: { id: "postgresql", name: "PostgreSQL" } },
            ],
          },
        },
      ],
      [],
      "week",
      now,
    );

    expect(analytics.totalSeconds).toBe(7200);
    expect(analytics.technologies).toEqual([
      { id: "postgresql", label: "PostgreSQL", seconds: 7200 },
      { id: "react", label: "React", seconds: 7200 },
    ]);
    expect(
      analytics.technologies.reduce((total, item) => total + item.seconds, 0),
    ).toBe(14_400);
    expect(
      analytics.workedProjectContexts.find((item) => item.id === "PERSONAL"),
    ).toMatchObject({ projectCount: 1 });
  });

  it("counts each project once by project context when it was actually worked on", () => {
    const now = DateTime.fromISO("2026-09-04T15:00", { zone });
    const project = {
      id: "become",
      name: "Become",
      context: "PERSONAL" as const,
      technologies: [],
    };
    const analytics = buildEngineeringAnalytics(
      [
        {
          startedAt: DateTime.fromISO("2026-09-03T10:00", { zone })
            .toUTC()
            .toJSDate(),
          endedAt: DateTime.fromISO("2026-09-03T11:00", { zone })
            .toUTC()
            .toJSDate(),
          engineeringContext: "UNI",
          activityType: { id: "learning", name: "Learning" },
          engineeringProject: project,
        },
        {
          startedAt: DateTime.fromISO("2026-09-04T10:00", { zone })
            .toUTC()
            .toJSDate(),
          endedAt: DateTime.fromISO("2026-09-04T11:00", { zone })
            .toUTC()
            .toJSDate(),
          engineeringContext: "PROFESSIONAL",
          activityType: { id: "coding", name: "Coding" },
          engineeringProject: project,
        },
      ],
      [],
      "week",
      now,
    );

    expect(
      analytics.workedProjectContexts.find((item) => item.id === "PERSONAL"),
    ).toMatchObject({ projectCount: 1 });
    expect(
      analytics.workedProjectContexts.reduce(
        (total, item) => total + item.projectCount,
        0,
      ),
    ).toBe(1);
    expect(analytics.contexts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Uni", seconds: 3600 }),
        expect.objectContaining({ label: "Professional", seconds: 3600 }),
      ]),
    );
  });
});
