import {
  readContentMeasurement,
  readContentCohort,
} from "@/features/content/measurements/queries/content-measurement.query";
import {
  resolveEvidence,
  type ResolvedEvidence,
} from "@/features/direction/evidence/services/evidence-reference.service";
import { measurementWindow } from "@/features/direction/measurements/utils/measurement-window.util";
export { measurementWindow } from "@/features/direction/measurements/utils/measurement-window.util";
import type { DirectionCriterion } from "@/generated/prisma/client";
import type {
  CriterionDraft,
  CriterionEvaluation,
  Evaluation,
  SourceItem,
} from "@/features/direction/types/direction.types";
import {
  DirectionError,
  dateLabel,
  fingerprint,
  type DirectionTx,
} from "@/features/direction/services/direction-mutation.service";
import { formatMoney, parseMoney } from "@/lib/money/utils/money.util";
import { formatDuration } from "@/lib/dates/utils/period.util";
import {
  readSourceIncome,
  readBusinessIncome,
  readCompanyPaymentHistory,
  readRecurringRevisionReceipts,
} from "@/features/finance/measurements/queries/finance-measurement.query";
import {
  readConversationMeasurement,
  readRecurringCandidates,
} from "@/features/entrepreneurship/measurements/queries/business-measurement.query";
import { readSessionMeasurement } from "@/features/sessions/measurements/queries/session-measurement.query";
import {
  readEngineeringMeasurement,
  readEngineeringProjectCompletion,
} from "@/features/engineering/measurements/queries/engineering-measurement.query";
import { getEngineeringProjectStatusLabel } from "@/features/engineering/constants/engineering.constants";
import { getSavings } from "@/features/finance/savings/queries/savings.query";
import { METRIC_CATALOG } from "@/features/direction/measurements/constants/metric-catalog.constants";
export function criterionDraft(row: DirectionCriterion): CriterionDraft {
  return {
    selectedOutreachOnly: row.selectedOutreachOnly,
    contentId: row.contentId ?? undefined,
    channelId: row.channelId ?? undefined,
    contentFormat:
      (row.contentFormat as CriterionDraft["contentFormat"]) ?? undefined,
    selectedContentOnly: row.selectedContentOnly || undefined,
    id: row.id,
    key: row.key,
    metric: row.metric as CriterionDraft["metric"],
    label: row.label,
    target: row.target,
    currency: row.currency ?? undefined,
    startOn: dateLabel(row.startOn),
    endOn: dateLabel(row.endOn),
    workSourceId: row.workSourceId ?? undefined,
    companyId: row.companyId ?? undefined,
    offerRevisionId: row.offerRevisionId ?? undefined,
    nicheId: row.nicheId ?? undefined,
    projectId: row.projectId ?? undefined,
    domainId: row.domainId ?? undefined,
    activityTypeId: row.activityTypeId ?? undefined,
    savingsGoalId: row.savingsGoalId ?? undefined,
    evidenceType: row.evidenceType ?? undefined,
    minimumReceived: row.minimumReceived ?? undefined,
    baselineAssertions:
      row.baselineAssertions as CriterionDraft["baselineAssertions"],
  };
}

const source = (
  id: string,
  label: string,
  href: string | null,
  at: Date | null,
  value: string | null,
  note: string | null = null,
  state: SourceItem["state"] = "QUALIFYING",
): SourceItem => ({
  id,
  label,
  href,
  occurredAt: at?.toISOString() ?? null,
  value,
  note,
  state,
});
export async function evaluateCriterion(
  tx: DirectionTx,
  userId: string,
  c: CriterionDraft,
  lifetime: { startOn: string; targetOn?: string },
  at = new Date(),
  outreachIds?: string[],
  offset = 0,
  contentIds?: string[],
): Promise<CriterionEvaluation> {
  c = { ...c, selectedContentOnly: c.selectedContentOnly || undefined };
  outreachIds = c.selectedOutreachOnly ? (outreachIds ?? []) : undefined;
  const window = measurementWindow(c, lifetime, at),
    catalog = METRIC_CATALOG.find((m) => m.key === c.metric)!;
  const e: CriterionEvaluation = {
    id: c.id ?? c.key,
    key: c.key,
    metric: c.metric,
    label: c.label || catalog.name,
    value: null,
    target: c.target || null,
    unit: catalog.unit,
    currency: c.currency ?? null,
    valueLabel: "Not yet assessed",
    targetLabel: c.target || null,
    availability: "NOT_CONFIGURED",
    reached: null,
    qualification: `${catalog.description} ${window.wording}.`,
    exclusions: [],
    caveats: [
      "Become describes recorded evidence; missing records do not prove inactivity.",
      ...(catalog.caveat ? [catalog.caveat] : []),
    ],
    conditions: [],
    sourceCount: 0,
    sources: [],
    nextCursor: null,
    evaluatedAt: at.toISOString(),
    fingerprint: "",
  };
  let contentFingerprint: unknown = null;
  const numeric = (
    value: bigint,
    target: bigint,
    label: string,
    count: number,
    hash: unknown,
  ) => {
    e.value = value.toString();
    e.target = target.toString();
    e.valueLabel = label;
    e.sourceCount = count;
    e.availability = value === 0n ? "RECORDED_ZERO" : "AVAILABLE";
    e.reached = value >= target;
    contentFingerprint = hash;
  };
  if (c.metric === "MANUAL") {
    const assessment = c.id
      ? await tx.criterionAssessment.findFirst({
          where: { criterionId: c.id, userId },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        })
      : null;
    e.qualification = `Your dated judgment of “${c.label || "this outcome"}”, with rationale and source evidence.`;
    if (assessment) {
      const references = assessment.sourceReferences as {
        definition?: string;
        sources?: ResolvedEvidence[];
      };
      const definition = manualDefinition(c, lifetime);
      e.reached = assessment.confirmed;
      e.valueLabel = assessment.confirmed
        ? "Confirmed by your assessment"
        : "Not confirmed by your assessment";
      e.availability = "AVAILABLE";
      const live: unknown[] = [];
      let changed = references.definition !== definition;
      for (const saved of references.sources ?? []) {
        const current = await resolveEvidence(tx, userId, saved.reference);
        const different = !current || current.fingerprint !== saved.fingerprint;
        if (different) changed = true;
        e.sources.push(
          different
            ? {
                ...saved.item,
                href: current?.item.href ?? null,
                state: current ? "REVIEW" : "MISSING",
                note: current
                  ? "Changed since your assessment. Review this evidence."
                  : "Source no longer exists; the assessment retains its historical reference.",
              }
            : current!.item,
        );
        live.push({
          reference: saved.reference,
          fingerprint: current?.fingerprint ?? null,
        });
      }
      e.sourceCount = e.sources.length;
      contentFingerprint = { id: assessment.id, definition, live };
      if (changed) {
        e.reached = null;
        e.availability = "PENDING_REVIEW";
        e.caveats.push(
          "The criterion, horizon, or cited evidence changed after this assessment. Review your judgment.",
        );
      }
      e.caveats.push(
        `Assessed on ${dateLabel(assessment.assessedOn)}. A dated user judgment, not an automatic domain total.`,
      );
      e.caveats.push(assessment.rationale);
    }
  } else if (c.metric === "WORK_SOURCE_INCOME") {
    const workSource = await tx.workSource.findFirst({
      where: { id: c.workSourceId ?? "", userId },
    });
    if (!workSource)
      throw new DirectionError(
        "Choose the exact WorkSource.",
        `criteria.${c.key}.workSourceId`,
      );
    const data = await readSourceIncome(
      tx,
      { userId, ...window, currency: c.currency!, workSourceId: workSource.id },
      offset,
    );
    numeric(
      data.amount,
      parseMoney(c.target, c.currency!),
      formatMoney(data.amount, c.currency!),
      data.count,
      data.hash,
    );
    e.targetLabel = formatMoney(e.target!, c.currency!);
    e.qualification = `Only actual ${c.currency} earned-work income attributed to ${workSource.name}, received ${window.wording}.`;
    e.exclusions = [
      "Other WorkSources; name-only counterparty matches",
      "Student finance, gifts, transfers, refunds and unrelated business receipts",
      "Expected earnings, another currency, and receipts outside these dates",
    ];
    e.sources = data.rows.map((t) =>
      source(
        t.id,
        t.workSource?.name ?? "Recorded income",
        `/finance/transactions/${t.id}`,
        t.occurredAt,
        formatMoney(t.amountMinor, t.currency),
      ),
    );
  } else if (c.metric === "BUSINESS_RECEIPTS") {
    const company = await tx.company.findFirst({
      where: { id: c.companyId ?? "", userId },
    });
    if (!company)
      throw new DirectionError(
        "Choose the company.",
        `criteria.${c.key}.companyId`,
      );
    const data = await readBusinessIncome(
      tx,
      {
        userId,
        ...window,
        currency: c.currency!,
        companyId: company.id,
        offerRevisionId: c.offerRevisionId,
      },
      offset,
    );
    numeric(
      data.amount,
      parseMoney(c.target, c.currency!),
      formatMoney(data.amount, c.currency!),
      data.count,
      data.hash,
    );
    e.targetLabel = formatMoney(e.target!, c.currency!);
    e.qualification = `Only confirmed ${c.currency} receipt portions attributed to ${company.name}${c.offerRevisionId ? " and the selected offer revision" : ""}, received ${window.wording}.`;
    e.exclusions = [
      "The unallocated remainder of a receipt",
      "Other companies/revisions, withdrawn allocations, and pending attribution review",
      "Other currencies and outside-window payments",
    ];
    if (data.pending) {
      e.caveats.push(
        `${data.pending} attribution record(s) need review and are excluded.`,
      );
      if (!e.reached) e.availability = "PENDING_REVIEW";
    }
    e.sources = data.rows.map((a) =>
      source(
        a.id,
        a.company.name,
        `/finance/transactions/${a.transactionId}`,
        a.transaction!.occurredAt,
        formatMoney(a.amountMinor, c.currency!),
      ),
    );
  } else if (
    c.metric === "CONVERSATIONS" ||
    c.metric === "CONVERSATION_COMPANIES"
  ) {
    const niche = c.nicheId
      ? await tx.niche.findFirst({
          where: { id: c.nicheId, userId },
          select: { name: true },
        })
      : null;
    const company = c.companyId
      ? await tx.company.findFirst({
          where: { id: c.companyId, userId },
          select: { name: true },
        })
      : null;
    const data = await readConversationMeasurement(
      tx,
      {
        userId,
        ...window,
        nicheId: c.nicheId,
        companyId: c.companyId,
        distinctCompanies: c.metric === "CONVERSATION_COMPANIES",
        outreachIds,
      },
      offset,
    );
    numeric(
      BigInt(data.count),
      BigInt(c.target),
      `${data.count} ${catalog.unit}`,
      data.recordCount,
      data.hash,
    );
    e.qualification = `${c.metric === "CONVERSATION_COMPANIES" ? "Distinct companies with" : "Logical records of"} conversations${niche ? ` in ${niche.name}` : ""}${company ? ` with ${company.name}` : ""}, ${window.wording}${outreachIds ? ", directly linked to this trial's selected outreach at the same company and in the same exploration" : ""}.`;
    e.exclusions = [
      "Outreach attempts, replies, session time, superseded revisions and withdrawn interactions",
      ...(niche ? ["Conversations recorded in another exploration"] : []),
      ...(outreachIds
        ? [
            "Unlinked or indirectly linked conversations, even during the same week",
          ]
        : []),
    ];
    e.sources = data.rows.map((r) =>
      source(
        r.id,
        r.companySnapshot ? `${r.companySnapshot} · ${r.summary}` : r.summary,
        `/entrepreneurship/interactions/${r.id}`,
        r.occurredAt,
        null,
      ),
    );
    if (c.selectedOutreachOnly && !outreachIds?.length) {
      e.value = null;
      e.reached = null;
      e.availability = "NOT_CONFIGURED";
      e.valueLabel = "Choose this trial's outreach records";
      e.caveats.push(
        "No outreach cohort has been selected. This is not evidence that a configured trial produced zero conversations.",
      );
    }
  } else if (c.metric === "SESSION_TIME") {
    const data = await readSessionMeasurement(
        tx,
        {
          userId,
          contentId: c.contentId,
          contentIds: c.selectedContentOnly ? (contentIds ?? []) : undefined,
          ...window,
          ...c,
        },
        offset,
      ),
      seconds = BigInt(data.seconds);
    numeric(
      seconds,
      BigInt(c.target) * 60n,
      formatDuration(Number(seconds), true),
      data.count,
      data.hash,
    );
    e.targetLabel = `${c.target} minutes`;
    e.unit = "seconds";
    const identities = await Promise.all([
      c.domainId
        ? tx.domain.findFirst({
            where: { id: c.domainId, userId },
            select: { name: true },
          })
        : null,
      c.projectId
        ? tx.engineeringProject.findFirst({
            where: { id: c.projectId, userId },
            select: { name: true },
          })
        : null,
      c.nicheId
        ? tx.niche.findFirst({
            where: { id: c.nicheId, userId },
            select: { name: true },
          })
        : null,
      c.activityTypeId
        ? tx.activityType.findFirst({
            where: { id: c.activityTypeId, domain: { userId } },
            select: { name: true },
          })
        : null,
    ]);
    e.qualification = `Completed session time${
      identities.some(Boolean)
        ? ` for ${identities
            .filter(Boolean)
            .map((i) => i!.name)
            .join(" · ")}`
        : " across recorded domains"
    }, clipped to ${window.wording}.`;
    e.exclusions = [
      "Unfinished sessions, paused time, nonmatching recorded context, and time outside the window",
      "Conversation or outcome claims inferred from time",
    ];
    e.sources = data.rows.map((r) =>
      source(
        r.id,
        r.description || "Completed session",
        `/sessions?session=${r.id}`,
        r.startedAt,
        formatDuration(Number(r.seconds), true),
      ),
    );
  } else if (
    c.metric === "CONTENT_CREATED" ||
    c.metric === "CONTENT_VARIANTS_CREATED" ||
    c.metric === "CONTENT_PUBLICATIONS"
  ) {
    const data = await readContentMeasurement(
      tx,
      {
        userId,
        metric: c.metric,
        ...window,
        contentId: c.contentId,
        channelId: c.channelId,
        contentFormat: c.contentFormat,
        contentIds: c.selectedContentOnly ? (contentIds ?? []) : undefined,
      },
      offset,
    );
    numeric(
      BigInt(data.count),
      BigInt(c.target),
      `${data.count} ${catalog.unit}`,
      data.count,
      data.hash,
    );
    e.sources = data.rows.map((r) =>
      source(r.id, r.title, `/content/${r.contentId}`, r.occurredAt, "1"),
    );
    e.exclusions = [
      "No inference from stages, planned dates or timer sessions.",
      "Withdrawn release claims are excluded; locally archived work retains recorded facts.",
    ];
  } else if (c.metric === "ENGINEERING_EVIDENCE") {
    const data = await readEngineeringMeasurement(
      tx,
      {
        userId,
        ...window,
        projectId: c.projectId,
        evidenceType: c.evidenceType,
      },
      offset,
    );
    numeric(
      BigInt(data.count),
      BigInt(c.target),
      `${data.count} recorded outputs`,
      data.count,
      data.hash,
    );
    e.exclusions = [
      "Sessions without evidence records and nonmatching projects/types/dates",
    ];
    e.sources = data.rows.map((r) =>
      source(
        r.id,
        r.title,
        `/engineering/evidence/${r.id}/edit`,
        r.occurredAt,
        null,
      ),
    );
  } else if (c.metric === "ENGINEERING_PROJECT_COMPLETED") {
    const project = await readEngineeringProjectCompletion(
      tx,
      userId,
      c.projectId ?? "",
    );
    if (!project)
      throw new DirectionError(
        "Choose an existing Engineering project you own.",
        `criteria.${c.key}.projectId`,
      );
    e.value = project.status;
    e.target = "COMPLETED";
    e.valueLabel = getEngineeringProjectStatusLabel(project.status);
    e.targetLabel = "Completed";
    e.availability = "AVAILABLE";
    e.reached = project.status === "COMPLETED";
    e.qualification = `Current Engineering status for ${project.name}; satisfied only when this project's status is Completed.`;
    e.exclusions = [
      "Output records and focus time do not establish project completion",
      "Other projects, including projects with the same name",
    ];
    e.sources = [
      source(
        project.id,
        project.name,
        `/engineering/projects/${project.id}`,
        project.completedOn,
        e.valueLabel,
        project.completedOn
          ? `Recorded completion date: ${dateLabel(project.completedOn)}. Current status determines whether this criterion is met.`
          : "Current status determines whether this criterion is met.",
        e.reached ? "QUALIFYING" : "EXCLUDED",
      ),
    ].slice(offset, offset + 25);
    e.sourceCount = 1;
    contentFingerprint = project;
  } else if (c.metric === "SAVINGS_GOAL") {
    const data = await getSavings(userId, tx),
      goal = data.goals.find((g) => g.id === c.savingsGoalId);
    if (!goal)
      throw new DirectionError(
        "Choose an existing Finance savings goal.",
        `criteria.${c.key}.savingsGoalId`,
      );
    const pool = data.pools.find((p) => p.currency === goal.currency)!;
    e.unit = "funding readiness";
    e.currency = goal.currency;
    e.valueLabel = `${formatMoney(goal.funding.spent, goal.currency)} spent · ${formatMoney(goal.funding.allocated, goal.currency)} allocated · ${formatMoney(goal.funding.gap, goal.currency)} funding gap`;
    e.targetLabel = formatMoney(goal.targetAmountMinor, goal.currency);
    e.availability =
      pool.liquid === null
        ? "PARTIAL"
        : !pool.configured
          ? "NOT_CONFIGURED"
          : goal.completionNeedsReviewAt
            ? "PENDING_REVIEW"
            : "AVAILABLE";
    e.reached =
      e.availability === "AVAILABLE"
        ? goal.funding.spent >= goal.funding.target ||
          (goal.funding.gap === 0n && pool.underfunding === 0n)
        : null;
    e.qualification = `Current Finance funding readiness for ${goal.name}; spending, allocation and reserve remain separate.`;
    e.caveats.push(
      pool.underfunding && pool.underfunding > 0n
        ? `The currency pool is underfunded by ${formatMoney(pool.underfunding, goal.currency)}.`
        : "No new allocation or expense is created by this link.",
    );
    e.sources = [
      source(
        goal.id,
        goal.name,
        `/finance/savings/${goal.id}`,
        null,
        e.valueLabel,
      ),
    ];
    e.sourceCount = 1;
    contentFingerprint = {
      funding: goal.funding,
      pool,
      review: goal.completionNeedsReviewAt,
    };
  } else if (c.metric === "NEW_RECURRING_COMPANY") {
    const candidates = await readRecurringCandidates(
      tx,
      userId,
      c.currency!,
      parseMoney(c.target, c.currency!),
      c.companyId,
      c.offerRevisionId,
      window.start,
      window.end,
    );
    const receiptSources: SourceItem[] = [],
      matched: SourceItem[] = [],
      details: { id: string; hash: unknown }[] = [];
    let uncertain = false;
    let hasTerms = false,
      hasReceipt = false,
      hasNew = false;
    for (const revision of candidates.slice(0, 100)) {
      const acceptance = revision.events.find(
        (event) =>
          event.kind === "ACCEPTED" &&
          event.occurredAt >= window.start &&
          event.occurredAt < window.end,
      );
      if (!acceptance) continue;
      if (
        acceptance.interactionRevision &&
        (acceptance.interactionRevision.interaction.voidedAt ||
          acceptance.interactionRevision.version !==
            acceptance.interactionRevision.interaction.version)
      ) {
        uncertain = true;
        details.push({
          id: revision.id,
          hash: {
            acceptance: acceptance.id,
            sourceVersion: acceptance.interactionRevision.interaction.version,
            voidedAt: acceptance.interactionRevision.interaction.voidedAt,
          },
        });
        continue;
      }
      hasTerms = true;
      const history = await readCompanyPaymentHistory(
        tx,
        userId,
        revision.companyId,
        window.start,
      );
      const assertion = c.baselineAssertions?.find(
        (a) => a.companyId === revision.companyId,
      );
      const isNew =
        history.confirmed > 0
          ? false
          : history.pending > 0
            ? null
            : assertion?.noPriorPaidRelationship === false
              ? false
              : assertion?.noPriorPaidRelationship === true
                ? true
                : null;
      if (isNew === null) uncertain = true;
      if (isNew) hasNew = true;
      const receipts = await readRecurringRevisionReceipts(
        tx,
        userId,
        revision.companyId,
        revision.id,
        c.currency!,
        new Date(
          Math.max(window.start.getTime(), acceptance.occurredAt.getTime()),
        ),
        window.end,
      );
      const amount = receipts.amount;
      const paid =
        amount > 0n &&
        (!c.minimumReceived ||
          amount >= parseMoney(c.minimumReceived, c.currency!));
      if (paid) hasReceipt = true;
      if (receipts.pending) uncertain = true;
      details.push({
        id: revision.id,
        hash: {
          history,
          assertion,
          events: revision.events.map((e) => ({
            id: e.id,
            kind: e.kind,
            at: e.occurredAt,
          })),
          receipt: receipts.hash,
        },
      });
      if (isNew && paid) {
        receiptSources.push(
          ...receipts.records.map((r) =>
            source(
              r.id,
              `${revision.offer.company.name} · attributed receipt`,
              `/finance/transactions/${r.transactionId}`,
              r.occurredAt,
              formatMoney(r.amountMinor, c.currency!),
            ),
          ),
        );
        matched.push(
          source(
            revision.id,
            `${revision.offer.company.name} · ${formatMoney(revision.priceMinor!, c.currency!)} / month`,
            `/entrepreneurship/offers/${revision.offerId}`,
            acceptance.occurredAt,
            `${formatMoney(amount, c.currency!)} received`,
            revision.events.at(-1)?.kind !== "ACCEPTED"
              ? "Historical first-payment milestone; these terms are no longer recorded as accepted."
              : "First receipt under accepted monthly terms; not MRR.",
          ),
        );
      }
    }
    e.value = String(
      new Set(
        matched.map((m) => candidates.find((r) => r.id === m.id)!.companyId),
      ).size,
    );
    e.target = "1";
    e.valueLabel = `${e.value} qualifying newly paying ${e.value === "1" ? "company" : "companies"}`;
    e.targetLabel = `At least ${formatMoney(parseMoney(c.target, c.currency!), c.currency!)} every one month`;
    e.reached =
      matched.length > 0
        ? true
        : uncertain || candidates.length > 100
          ? null
          : false;
    e.availability = e.reached
      ? "AVAILABLE"
      : uncertain
        ? "PENDING_REVIEW"
        : candidates.length > 100
          ? "PARTIAL"
          : "RECORDED_ZERO";
    e.qualification = `First qualifying payment received ${window.wording} under accepted ${c.currency} terms of at least ${c.target} every one month, at the SAME newly paying company and offer revision. New means no paid business relationship before ${window.startOn}.`;
    e.exclusions = [
      "Existing paid customers and newly created rows representing old clients",
      "One-off work or installments of fixed-price work",
      "Unsigned quotes, accepted terms without a receipt, other revisions/companies/currencies",
      "Payments before acceptance, after cancellation, or outside the window",
    ];
    e.conditions = [
      {
        label: "New paid relationship after baseline",
        reached: matched.length
          ? true
          : hasNew
            ? null
            : uncertain
              ? null
              : false,
        detail:
          "Earlier confirmed attributed business income contradicts newness. Incomplete history requires a dated company-specific assertion.",
      },
      {
        label: "Accepted monthly terms",
        reached: hasTerms,
        detail: e.targetLabel,
      },
      {
        label: "Payment under those same terms",
        reached: matched.length ? true : hasReceipt ? null : false,
        detail: c.minimumReceived
          ? `At least ${c.minimumReceived} ${c.currency} explicitly attributed to the same terms.`
          : "A positive confirmed receipt is required; it need not be a full monthly amount.",
      },
    ];
    e.caveats.push(
      "Separate conditions from different companies never combine. Retaining an active-income intention requires your dated manual assessment.",
    );
    if (candidates.length > 100)
      e.caveats.push(
        "More than 100 candidate revisions: narrow the company/revision scope for a complete evaluation.",
      );
    e.sources = [...matched, ...receiptSources].slice(offset, offset + 25);
    e.sourceCount = matched.length + receiptSources.length;
    contentFingerprint = details;
  }
  if (
    window.start > at &&
    !["SAVINGS_GOAL", "ENGINEERING_PROJECT_COMPLETED"].includes(c.metric)
  ) {
    e.caveats.push(
      `This measurement window has not begun. It starts on ${window.startOn}.`,
    );
    if (c.metric !== "MANUAL" && e.availability !== "NOT_CONFIGURED") {
      e.value = null;
      e.valueLabel = `Measurement begins ${window.startOn}`;
      e.reached = null;
      e.availability = "PARTIAL";
    }
  }
  e.nextCursor = offset + 25 < e.sourceCount ? String(offset + 25) : null;
  e.fingerprint = fingerprint({
    definition: { ...c, id: undefined },
    horizon: {
      startOn: c.startOn ?? lifetime.startOn,
      endOn: c.endOn ?? lifetime.targetOn,
    },
    selectedContentIds: c.selectedContentOnly
      ? [...(contentIds ?? [])].sort()
      : undefined,
    selectedOutreachIds: c.selectedOutreachOnly
      ? [...(outreachIds ?? [])].sort()
      : undefined,
    value: e.value,
    reached: e.reached,
    availability: e.availability,
    sources: contentFingerprint,
  });
  return e;
}
export const manualDefinition = (
  c: CriterionDraft,
  lifetime?: { startOn: string; targetOn?: string },
) =>
  fingerprint({
    metric: c.metric,
    label: c.label,
    target: c.target,
    startOn: c.startOn ?? lifetime?.startOn,
    endOn: c.endOn ?? lifetime?.targetOn,
  });
export async function evaluateDirection(
  tx: DirectionTx,
  userId: string,
  criteria: CriterionDraft[],
  lifetime: { startOn: string; targetOn?: string },
  mode: "ALL" | "ANY",
  at = new Date(),
  outreachIds?: string[],
  contentIds?: string[],
): Promise<Evaluation> {
  const values: CriterionEvaluation[] = [];
  for (const criterion of criteria)
    values.push(
      await evaluateCriterion(
        tx,
        userId,
        criterion,
        lifetime,
        at,
        outreachIds,
        0,
        contentIds,
      ),
    );
  const flags = values.map((e) => e.reached);
  const criteriaMet = !flags.length
    ? null
    : mode === "ALL"
      ? flags.includes(false)
        ? false
        : flags.includes(null)
          ? null
          : true
      : flags.includes(true)
        ? true
        : flags.includes(null)
          ? null
          : false;
  const progressSummary = !values.length
    ? "Evidence and your judgment are still needed."
    : values.length === 1
      ? `${values[0].valueLabel}${values[0].targetLabel ? ` · target ${values[0].targetLabel}` : ""}`
      : criteriaMet
        ? "The configured measurable conditions are reached; your conclusion is still needed."
        : `${values.filter((e) => e.reached).length} of ${values.length} criteria reached${flags.includes(null) ? " · some evidence needs review" : ""}`;
  const contentCohort = contentIds?.length
    ? await readContentCohort(tx, userId, contentIds)
    : undefined;
  return {
    contentCohort,
    criteria: values,
    criteriaMet,
    progressSummary,
    evaluatedAt: at.toISOString(),
    fingerprint: fingerprint({
      mode,
      contentCohort,
      definitions: values.map((e) => e.fingerprint),
    }),
  };
}
