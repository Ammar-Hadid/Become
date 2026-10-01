import { PDFParse } from "pdf-parse";
import { z } from "zod";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { FinanceError } from "@/features/finance/types/finance.types";
import {
  ingestFinancialEvidence,
  projectFinancialEvidence,
  findEvidenceOverlapCandidates,
  resolveFinancialEvidence,
} from "@/features/finance/evidence/services/financial-evidence.service";
import { counterpartyNameIdentity } from "@/features/finance/evidence/utils/financial-evidence.util";
import {
  parseStatementCsv,
  parseStatementPdfText,
  statementFileHash,
} from "../utils/statement-parser.util";
const mappingSchema = z.object({
  date: z.string().optional(),
  amount: z.string().optional(),
  description: z.string().optional(),
  counterparty: z.string().optional(),
  reference: z.string().optional(),
  direction: z.string().optional(),
  currency: z.string().optional(),
  positiveDirection: z.enum(["DEBIT", "CREDIT"]).optional(),
});
export async function previewStatementImport(
  userId: string,
  accountId: string,
  file: { name: string; data: Uint8Array },
  mapping: unknown = {},
) {
  const account = await prisma.financialAccount.findFirst({
    where: { id: accountId, userId, archivedAt: null },
  });
  if (!account) throw new FinanceError("Choose an owned active account.");
  if (!file.data.length || file.data.length > 2 * 1024 * 1024)
    throw new FinanceError("Use a CSV or text PDF file up to 2 MB.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(-180);
  const fileHash = statementFileHash(file.data);
  const existing = await prisma.financialStatementImport.findUnique({
    where: { userId_accountId_fileHash: { userId, accountId, fileHash } },
  });
  if (existing?.status === "CONFIRMED") return { id: existing.id };
  const columns = mappingSchema.parse(mapping);
  let format = "CSV";
  let text: string;
  if (Buffer.from(file.data.slice(0, 5)).toString() === "%PDF-") {
    format = "TEXT_PDF";
    const parser = new PDFParse({
      data: file.data,
      isEvalSupported: false,
      stopAtErrors: true,
    });
    try {
      const result = await parser.getText({ first: 100 });
      if (result.total > 100)
        throw new FinanceError(
          "Split this PDF into at most 100 pages per import.",
        );
      text = result.text;
    } catch (error) {
      if (error instanceof FinanceError) throw error;
      throw new FinanceError(
        "Could not extract a supported text PDF. Scanned or encrypted statements cannot be imported.",
      );
    } finally {
      await parser.destroy();
    }
  } else {
    if (!/\.(csv|tsv|txt)$/i.test(file.name))
      throw new FinanceError("Choose CSV, TSV or a text-based PDF.");
    text = new TextDecoder("utf-8", { fatal: true }).decode(file.data);
  }
  const parsed =
    format === "CSV"
      ? parseStatementCsv(text, account.currency, columns)
      : parseStatementPdfText(
          text,
          account.currency,
          columns.positiveDirection,
        );
  const days = parsed.rows.map((x) => x.activityDate).sort();
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId + ":finance-evidence"},0))`;
      const existingBatch = await tx.financialStatementImport.findUnique({
        where: { userId_accountId_fileHash: { userId, accountId, fileHash } },
      });
      if (existingBatch) {
        await tx.$queryRaw`SELECT id FROM financial_statement_import WHERE id=${existingBatch.id} AND "userId"=${userId} FOR UPDATE`;
        const current = await tx.financialStatementImport.findUniqueOrThrow({
          where: { id: existingBatch.id, userId },
        });
        if (current.status === "CONFIRMED") return { id: current.id };
        // A remapped preview is replaced only before confirmation; old observations stay immutable and ignored.
        await tx.financialEvidenceLink.updateMany({
          where: { userId, observation: { importId: existingBatch.id } },
          data: { status: "IGNORED" },
        });
      }
      const batch = existingBatch
        ? await tx.financialStatementImport.update({
            where: { id: existingBatch.id, userId },
            data: {
              format,
              errors: parsed.errors,
              status: "PREVIEW",
              coverageFromOn: days[0] ?? null,
              coverageThroughOn: days.at(-1) ?? null,
            },
          })
        : await tx.financialStatementImport.create({
            data: {
              userId,
              accountId,
              fileName: safeName,
              fileHash,
              format,
              errors: parsed.errors,
              coverageFromOn: days[0] ?? null,
              coverageThroughOn: days.at(-1) ?? null,
            },
          });
      for (const row of parsed.rows) {
        const evidence = await ingestFinancialEvidence(
          userId,
          {
            source: "STATEMENT_IMPORT",
            accountId,
            importId: batch.id,
            occurrenceKey: `statement:${fileHash}:line:${row.line}`,
            reference: row.reference,
            amountMinor: row.amountMinor,
            currency: row.currency,
            status: "BOOKED",
            direction: row.direction,
            activityDate: row.activityDate,
            counterpartyName: row.counterpartyName,
            counterpartyIdentity: row.counterpartyName
              ? counterpartyNameIdentity(row.counterpartyName)
              : null,
            description: row.description,
            raw: row.raw,
            deferProjection: true,
          },
          tx,
        );
        const observed =
          await tx.financialEvidenceObservation.findUniqueOrThrow({
            where: { id: evidence.id },
          });
        const candidates = await findEvidenceOverlapCandidates(
          tx,
          userId,
          observed,
          accountId,
        );
        await tx.financialEvidenceLink.update({
          where: { observationId: evidence.id },
          data: {
            status: candidates.length ? "DUPLICATE_REVIEW" : "STAGED",
            transactionId: null,
            resolvedAt: null,
            duplicateCandidates: candidates.map((x) => x.id),
            needsAttention: candidates.length
              ? "Confirm whether this row overlaps an existing event."
              : null,
          },
        });
      }
      // Equal unreferenced rows need an explicit multiplicity decision before confirmation.
      const observations = await tx.financialEvidenceObservation.findMany({
        where: {
          userId,
          importId: batch.id,
          externalReference: null,
          link: { status: "STAGED" },
        },
        select: { id: true, fingerprint: true },
      });
      const repeated = new Map<string, string[]>();
      for (const observation of observations) {
        repeated.set(observation.fingerprint, [
          ...(repeated.get(observation.fingerprint) ?? []),
          observation.id,
        ]);
      }
      for (const ids of repeated.values()) {
        if (ids.length < 2) continue;
        await tx.financialEvidenceLink.updateMany({
          where: { userId, observationId: { in: ids } },
          data: {
            status: "DUPLICATE_REVIEW",
            needsAttention:
              "This statement contains identical unreferenced rows. Confirm each distinct purchase or skip an extra row.",
          },
        });
      }
      return { id: batch.id };
    },
    { timeout: 60000 },
  );
}
export async function confirmStatementImport(userId: string, importId: string) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId + ":finance-evidence"},0))`;
      await tx.$queryRaw`SELECT id FROM financial_statement_import WHERE id=${importId} AND "userId"=${userId} FOR UPDATE`;
      const batch = await tx.financialStatementImport.findFirst({
        where: { id: importId, userId },
        include: { observations: { include: { link: true } } },
      });
      if (!batch) throw new FinanceError("Statement is unavailable.");
      if (batch.status === "CONFIRMED") return { id: batch.id };
      if (
        !(await tx.financialAccount.findFirst({
          where: { id: batch.accountId, userId, archivedAt: null },
        }))
      )
        throw new FinanceError(
          "Choose an active owned account before confirming this statement.",
        );
      if (Array.isArray(batch.errors) && batch.errors.length)
        throw new FinanceError(
          "Resolve every parsing error before importing this statement.",
        );
      if (batch.observations.some((x) => x.link?.status === "DUPLICATE_REVIEW"))
        throw new FinanceError(
          "Resolve possible overlaps in the preview before confirming this statement.",
        );
      const active = batch.observations.filter(
        (x) => x.link?.status === "STAGED",
      );
      if (!active.length)
        throw new FinanceError("This statement has no valid transaction rows.");
      await tx.financialStatementImport.update({
        where: { id: batch.id, userId },
        data: { status: "CONFIRMING" },
      });
      for (const observation of active) {
        if (observation.link?.resolvedAt && observation.link.transactionId)
          await resolveFinancialEvidence(
            userId,
            observation.id,
            "duplicate",
            observation.link.transactionId,
            tx,
          );
        else
          await projectFinancialEvidence(
            tx,
            userId,
            observation.id,
            !!observation.link?.resolvedAt,
          );
      }
      await tx.financialStatementImport.update({
        where: { id: batch.id, userId },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
      });
      const account = await tx.financialAccount.findUniqueOrThrow({
        where: { id: batch.accountId, userId },
      });
      if (account.dataSource === "MANUAL")
        await tx.financialAccount.update({
          where: { id: account.id, userId },
          data: { dataSource: "STATEMENT_IMPORT" },
        });
      return { id: batch.id };
    },
    { timeout: 60000 },
  );
}
