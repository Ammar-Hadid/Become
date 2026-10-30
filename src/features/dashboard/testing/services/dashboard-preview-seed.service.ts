/**
 * Populates only the explicitly disposable local dashboard-preview account.
 * Run with: node --import tsx src/features/dashboard/testing/services/dashboard-preview-seed.service.ts
 */
import "dotenv/config";
import { DateTime } from "luxon";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { getSeasonForDate } from "@/lib/dates/utils/period.util";
import { APP_TIMEZONE } from "@/lib/config/environment.config";

const PREVIEW_EMAIL = "demotest@gmail.com";
const PREFIX = "[Dashboard preview]";

async function main() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Dashboard preview records may only be seeded locally.");

  const user = await prisma.user.findUnique({
    where: { email: PREVIEW_EMAIL },
    include: { domains: { include: { activityTypes: true } } },
  });
  if (!user) throw new Error(`Create the temporary ${PREVIEW_EMAIL} account through local sign-up first.`);
  const engineering = user.domains.find((domain) => domain.slug === "engineering");
  const finance = user.domains.find((domain) => domain.slug === "finance");
  const content = user.domains.find((domain) => domain.slug === "content");
  if (!engineering || !finance || !content)
    throw new Error("Default domains are missing from the preview account.");

  const now = DateTime.now().setZone(APP_TIMEZONE);
  const currentSeason = getSeasonForDate(now);
  const season = await prisma.userSeason.upsert({
    where: { userId_year_quarter: { userId: user.id, year: currentSeason.year, quarter: currentSeason.season } },
    create: {
      userId: user.id,
      year: currentSeason.year,
      quarter: currentSeason.season,
      title: "Build the Foundation",
      intention: "Finish meaningful work and keep a clear record of it.",
      openingCompletedAt: now.toJSDate(),
    },
    update: { title: "Build the Foundation", openingCompletedAt: now.toJSDate() },
  });

  const projectNames = ["Interaction model", "Finance ledger", "Publishing flow"];
  const projects = [];
  for (const [index, name] of projectNames.entries()) {
    let project = await prisma.engineeringProject.findFirst({
      where: { userId: user.id, name: `${PREFIX} ${name}` },
    });
    if (!project) {
      project = await prisma.engineeringProject.create({
        data: {
          userId: user.id,
          name: `${PREFIX} ${name}`,
          description: "A real project record for the isolated dashboard design account.",
          context: "PERSONAL",
          status: index === 0 ? "COMPLETED" : "ACTIVE",
          startedOn: new Date(`${currentSeason.start.toISODate()}T00:00:00Z`),
          completedOn: index === 0 ? new Date(`${now.minus({ days: 2 }).toISODate()}T00:00:00Z`) : null,
        },
      });
    }
    projects.push(project);
  }

  let goal = await prisma.goal.findFirst({
    where: { userId: user.id, title: "Finish 3 projects", archivedAt: null },
  });
  if (!goal) {
    goal = await prisma.goal.create({
      data: {
        userId: user.id,
        title: "Finish 3 projects",
        description: "Ship three Engineering projects before the Season closes.",
        startOn: new Date(`${currentSeason.start.toISODate()}T00:00:00Z`),
        targetOn: new Date(`${currentSeason.end.minus({ days: 1 }).toISODate()}T00:00:00Z`),
        criterionMode: "ALL",
      },
    });
  }
  for (const [index, project] of projects.entries()) {
    await prisma.directionCriterion.upsert({
      where: { goalId_key: { goalId: goal.id, key: `project-${index + 1}` } },
      create: {
        userId: user.id,
        goalId: goal.id,
        key: `project-${index + 1}`,
        position: index,
        metric: "ENGINEERING_PROJECT_COMPLETED",
        label: project.name.replace(`${PREFIX} `, ""),
        target: "",
        projectId: project.id,
      },
      update: { projectId: project.id },
    });
  }
  await prisma.seasonGoal.upsert({
    where: { seasonId_goalId: { seasonId: season.id, goalId: goal.id } },
    create: { userId: user.id, seasonId: season.id, goalId: goal.id, role: "PRIMARY" },
    update: { role: "PRIMARY" },
  });

  let workSource = await prisma.workSource.findFirst({
    where: { userId: user.id, name: `${PREFIX} Studio contract` },
  });
  if (!workSource) {
    workSource = await prisma.workSource.create({
      data: {
        userId: user.id,
        name: `${PREFIX} Studio contract`,
        type: "CLIENT",
        defaultCompensationType: "HOURLY",
      },
    });
  }
  // Keep the preview within the current Season so a prior-Season ceremony
  // does not interrupt dashboard visual review.
  await prisma.session.deleteMany({
    where: {
      userId: user.id,
      description: { startsWith: PREFIX },
      startedAt: { lt: currentSeason.start.toJSDate() },
    },
  });

  const entries = [
    { daysAgo: 4, hours: 5.5, domain: finance, activity: "Paid work", description: "Client dashboard design" },
    { daysAgo: 3, hours: 7, domain: engineering, activity: "Coding", description: "Implement the dashboard" },
    { daysAgo: 2, hours: 3, domain: finance, activity: "Paid work", description: "Studio handoff and review" },
    { daysAgo: 1, hours: 2, domain: content, activity: "Scripting", description: "Draft release narrative" },
    { daysAgo: 0, hours: 3.5, domain: finance, activity: "Paid work", description: "Studio design review" },
  ] as const;
  for (const entry of entries) {
    const activity = entry.domain.activityTypes.find((item) => item.name === entry.activity);
    if (!activity) throw new Error(`Missing activity: ${entry.activity}`);
    const start = now.startOf("day").minus({ days: entry.daysAgo }).plus({ hours: 9 });
    const description = entry.description;
    const existing = await prisma.session.findFirst({
      where: {
        userId: user.id,
        description: { in: [description, `${PREFIX} ${description}`] },
        startedAt: start.toJSDate(),
      },
      select: { id: true, description: true },
    });
    if (existing) {
      if (existing.description !== description)
        await prisma.session.update({ where: { id: existing.id }, data: { description } });
      continue;
    }
    await prisma.session.create({
      data: {
        userId: user.id,
        domainId: entry.domain.id,
        activityTypeId: activity.id,
        description,
        startedAt: start.toJSDate(),
        endedAt: start.plus({ hours: entry.hours }).toJSDate(),
        ...(entry.domain.slug === "engineering" ? { engineeringContext: "PERSONAL" as const } : {}),
        ...(entry.domain.slug === "finance" ? {
          financeActivityKind: "PAID_WORK" as const,
          financeCompensationType: "HOURLY" as const,
          workSourceId: workSource.id,
        } : {}),
      },
    });
  }
  console.log(`Seeded dashboard preview data for ${PREVIEW_EMAIL}; Season dates remain current.`);
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
