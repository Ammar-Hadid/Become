import { currencySchema } from "@/lib/money/schemas/currency.schema";
import type { CriterionDraft } from "@/features/direction/types/direction.types";
import { criterionSchema } from "@/features/direction/schemas/direction.schema";
import {
  DirectionError,
  storedDate,
  type DirectionTx,
} from "@/features/direction/services/direction-mutation.service";
import { parseMoney } from "@/lib/money/utils/money.util";
const scopes: Record<CriterionDraft["metric"], string[]> = {
  MANUAL: [],
  WORK_SOURCE_INCOME: ["workSourceId"],
  BUSINESS_RECEIPTS: ["companyId", "offerRevisionId"],
  NEW_RECURRING_COMPANY: ["companyId", "offerRevisionId"],
  CONVERSATIONS: ["companyId", "nicheId"],
  CONVERSATION_COMPANIES: ["companyId", "nicheId"],
  SESSION_TIME: [
    "domainId",
    "activityTypeId",
    "projectId",
    "nicheId",
    "companyId",
  ],
  ENGINEERING_EVIDENCE: ["projectId"],
  SAVINGS_GOAL: ["savingsGoalId"],
};
const referenceKeys = [
  "workSourceId",
  "companyId",
  "offerRevisionId",
  "nicheId",
  "projectId",
  "domainId",
  "activityTypeId",
  "savingsGoalId",
] as const;
export async function validateCriterion(
  tx: DirectionTx,
  userId: string,
  input: CriterionDraft,
) {
  const data = criterionSchema.parse(input);
  const field = (key: string, message: string): never => {
    throw new DirectionError(message, `criteria.${data.key}.${key}`);
  };
  for (const key of referenceKeys)
    if (data[key] && !scopes[data.metric].includes(key))
      field(key, "This source does not qualify this metric.");
  if (
    data.selectedOutreachOnly &&
    !["CONVERSATIONS", "CONVERSATION_COMPANIES"].includes(data.metric)
  )
    field(
      "selectedOutreachOnly",
      "Selected outreach only applies to conversation criteria.",
    );
  const rows = await Promise.all([
    data.workSourceId
      ? tx.workSource.findFirst({ where: { id: data.workSourceId, userId } })
      : null,
    data.companyId
      ? tx.company.findFirst({ where: { id: data.companyId, userId } })
      : null,
    data.offerRevisionId
      ? tx.offerRevision.findFirst({
          where: { id: data.offerRevisionId, userId },
        })
      : null,
    data.nicheId
      ? tx.niche.findFirst({ where: { id: data.nicheId, userId } })
      : null,
    data.projectId
      ? tx.engineeringProject.findFirst({
          where: { id: data.projectId, userId },
        })
      : null,
    data.domainId
      ? tx.domain.findFirst({ where: { id: data.domainId, userId } })
      : null,
    data.activityTypeId
      ? tx.activityType.findFirst({
          where: {
            id: data.activityTypeId,
            domainId: data.domainId,
            domain: { userId },
          },
        })
      : null,
    data.savingsGoalId
      ? tx.savingsGoal.findFirst({ where: { id: data.savingsGoalId, userId } })
      : null,
  ]);
  referenceKeys.forEach((key, i) => {
    if (data[key] && !rows[i])
      field(key, "Choose an available source you own.");
  });
  if (data.metric === "WORK_SOURCE_INCOME" && !data.workSourceId)
    field("workSourceId", "Choose the exact WorkSource whose income counts.");
  if (data.metric === "BUSINESS_RECEIPTS" && !data.companyId)
    field("companyId", "Choose the company whose attributed receipts count.");
  if (data.metric === "SAVINGS_GOAL" && !data.savingsGoalId)
    field("savingsGoalId", "Choose an existing Finance savings goal.");
  if (data.activityTypeId && !data.domainId)
    field("domainId", "Choose the activity's domain.");
  if (
    data.offerRevisionId &&
    data.companyId &&
    rows[2] &&
    "companyId" in rows[2] &&
    rows[2].companyId !== data.companyId
  )
    field("offerRevisionId", "These terms belong to another company.");
  if (
    data.metric === "SESSION_TIME" &&
    data.projectId &&
    rows[5] &&
    "slug" in rows[5] &&
    rows[5].slug !== "engineering"
  )
    field("projectId", "Engineering projects require the Engineering domain.");
  if (
    data.metric === "SESSION_TIME" &&
    (data.nicheId || data.companyId) &&
    rows[5] &&
    "slug" in rows[5] &&
    rows[5].slug !== "entrepreneurship"
  )
    field("domainId", "Business session context requires Entrepreneurship.");
  if (data.evidenceType && data.metric !== "ENGINEERING_EVIDENCE")
    field(
      "evidenceType",
      "Evidence type applies only to Engineering evidence.",
    );
  if (
    (data.baselineAssertions?.length || data.minimumReceived) &&
    data.metric !== "NEW_RECURRING_COMPANY"
  )
    field(
      "baselineAssertions",
      "Relationship qualifications apply only to the recurring-company milestone.",
    );
  const assertions = data.baselineAssertions ?? [];
  if (new Set(assertions.map((a) => a.companyId)).size !== assertions.length)
    field("baselineAssertions", "Review each company baseline once.");
  if (
    assertions.length &&
    (await tx.company.count({
      where: { userId, id: { in: assertions.map((a) => a.companyId) } },
    })) !== assertions.length
  )
    field("baselineAssertions", "Choose companies you own.");
  const monetary = [
    "WORK_SOURCE_INCOME",
    "BUSINESS_RECEIPTS",
    "NEW_RECURRING_COMPANY",
  ].includes(data.metric);
  let currency: string | null = null,
    targetMinor: bigint | null = null,
    minimumReceivedMinor: bigint | null = null;
  if (monetary) {
    try {
      currency = currencySchema.parse(data.currency ?? "");
      targetMinor = parseMoney(data.target, currency);
      if (targetMinor <= 0n) field("target", "Choose a positive target.");
      if (data.minimumReceived) {
        minimumReceivedMinor = parseMoney(data.minimumReceived, currency);
        if (minimumReceivedMinor <= 0n)
          field("minimumReceived", "Choose a positive received amount.");
      }
    } catch (error) {
      if (error instanceof DirectionError) throw error;
      field("target", (error as Error).message);
    }
  } else if (
    !["MANUAL", "SAVINGS_GOAL"].includes(data.metric) &&
    (!/^\d+$/.test(data.target) ||
      !Number.isSafeInteger(Number(data.target)) ||
      BigInt(data.target) <= 0n)
  )
    field(
      "target",
      data.metric === "SESSION_TIME"
        ? "Enter a positive whole number of recorded minutes."
        : "Enter a positive whole-number target.",
    );
  return { ...data, targetMinor, currency, minimumReceivedMinor };
}
export async function saveCriteria(
  tx: DirectionTx,
  userId: string,
  owner: { goalId: string } | { experimentId: string },
  drafts: CriterionDraft[],
) {
  const existing = await tx.directionCriterion.findMany({
    where: { userId, ...owner },
  });
  for (let position = 0; position < drafts.length; position++) {
    if (drafts[position].selectedOutreachOnly && "goalId" in owner)
      throw new DirectionError(
        "Selected outreach belongs to an experiment's explicit source set.",
        `criteria.${drafts[position].key}.selectedOutreachOnly`,
      );
    const validated = await validateCriterion(tx, userId, drafts[position]);
    const { id, startOn, endOn, baselineAssertions, ...rest } = validated;
    const prior = existing.find((c) => c.key === validated.key);
    if (id && prior?.id !== id)
      throw new DirectionError(
        "This criterion belongs to a different definition.",
        `criteria.${validated.key}`,
      );
    const data = {
      ...rest,
      selectedOutreachOnly: rest.selectedOutreachOnly ?? false,
      ...owner,
      userId,
      position,
      startOn: startOn ? storedDate(startOn) : null,
      endOn: endOn ? storedDate(endOn) : null,
      baselineAssertions: baselineAssertions ?? [],
      workSourceId: rest.workSourceId ?? null,
      companyId: rest.companyId ?? null,
      offerRevisionId: rest.offerRevisionId ?? null,
      nicheId: rest.nicheId ?? null,
      projectId: rest.projectId ?? null,
      domainId: rest.domainId ?? null,
      activityTypeId: rest.activityTypeId ?? null,
      savingsGoalId: rest.savingsGoalId ?? null,
      evidenceType: rest.evidenceType ?? null,
      minimumReceived: rest.minimumReceived ?? null,
    };
    if (prior)
      await tx.directionCriterion.update({ where: { id: prior.id }, data });
    else await tx.directionCriterion.create({ data });
  }
  await tx.directionCriterion.deleteMany({
    where: { userId, ...owner, key: { notIn: drafts.map((c) => c.key) } },
  });
}
