import { z } from "zod";
import {
  DirectionError,
  fingerprint,
  type DirectionTx,
} from "@/features/direction/services/direction-mutation.service";
import type { SourceItem } from "@/features/direction/types/direction.types";
export const evidenceReferenceSchema = z
  .object({
    type: z.enum([
      "INTERACTION",
      "SESSION",
      "ENGINEERING_EVIDENCE",
      "TRANSACTION",
      "OFFER_REVISION",
    ]),
    id: z.string().min(1).max(100),
  })
  .strict();
export type EvidenceReference = z.infer<typeof evidenceReferenceSchema>;
export type ResolvedEvidence = {
  reference: EvidenceReference;
  fingerprint: string;
  item: SourceItem;
};
export async function resolveEvidence(
  tx: DirectionTx,
  userId: string,
  reference: EvidenceReference,
): Promise<ResolvedEvidence | null> {
  let record: unknown = null,
    label = "Evidence",
    href: string | null = null,
    at: Date | null = null,
    valid = true;
  const { id, type } = reference;
  if (type === "INTERACTION") {
    const row = await tx.interaction.findFirst({
      where: { id, userId },
      include: { revisions: { orderBy: { version: "desc" }, take: 1 } },
    });
    if (row) {
      record = { version: row.version, voidedAt: row.voidedAt };
      label = row.revisions[0]?.summary ?? label;
      at = row.revisions[0]?.occurredAt ?? null;
      href = `/entrepreneurship/interactions/${id}`;
      valid = !row.voidedAt;
    }
  } else if (type === "SESSION") {
    const row = await tx.session.findFirst({ where: { id, userId } });
    if (row) {
      record = row;
      label = row.description || "Recorded session";
      at = row.startedAt;
      href = `/sessions?session=${id}`;
      valid = Boolean(row.endedAt);
    }
  } else if (type === "ENGINEERING_EVIDENCE") {
    const row = await tx.engineeringEvidence.findFirst({
      where: { id, userId },
    });
    if (row) {
      record = row;
      label = row.title;
      at = row.occurredAt;
      href = `/engineering/evidence/${id}/edit`;
    }
  } else if (type === "TRANSACTION") {
    const row = await tx.financialTransaction.findFirst({
      where: { id, userId },
    });
    if (row) {
      record = row;
      label = row.notes || "Recorded transaction";
      at = row.occurredAt;
      href = `/finance/transactions/${id}`;
    }
  } else if (type === "OFFER_REVISION") {
    const row = await tx.offerRevision.findFirst({
      where: { id, userId },
      include: {
        events: {
          where: { retractedAt: null },
          orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        },
      },
    });
    if (row) {
      record = row;
      label = `${row.companySnapshot} · ${row.title} · revision ${row.version}`;
      at = row.proposedAt;
      href = `/entrepreneurship/offers/${row.offerId}`;
    }
  }
  if (!record) return null;
  return {
    reference,
    fingerprint: fingerprint(record),
    item: {
      id,
      label,
      href,
      occurredAt: at?.toISOString() ?? null,
      value: null,
      note: valid
        ? "Evidence for your judgment; no automatic qualification is inferred."
        : "This source is withdrawn or not complete.",
      state: valid ? "QUALIFYING" : "REVIEW",
    },
  };
}
export async function resolveEvidenceSet(
  tx: DirectionTx,
  userId: string,
  references: EvidenceReference[],
) {
  const results: ResolvedEvidence[] = [];
  for (const reference of references) {
    const resolved = await resolveEvidence(tx, userId, reference);
    if (!resolved || resolved.item.state === "REVIEW")
      throw new DirectionError(
        "Choose available, completed evidence you own.",
        "sources",
      );
    results.push(resolved);
  }
  return results;
}
