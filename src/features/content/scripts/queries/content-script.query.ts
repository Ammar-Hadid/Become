import { prisma } from "@/lib/db/adapters/prisma.adapter";
import type {
  ContentScriptView,
  ScriptDocument,
  ScriptSummary,
} from "@/features/content/scripts/types/content-script.types";
import {
  scriptDocumentFromText,
  scriptHasContent,
  scriptWordCount,
  validateScriptDocument,
} from "@/features/content/scripts/utils/content-script-document.util";

export function getScriptSummary(row: {
  script: string;
  scriptDocument: unknown;
  scriptSavedAt: Date | null;
  writingSavedAt: Date;
}): ScriptSummary {
  const document =
    (row.scriptDocument as ScriptDocument | null) ??
    scriptDocumentFromText(row.script);
  const hasContent = scriptHasContent(document);
  return {
    hasContent,
    wordCount: scriptWordCount(document),
    savedAt:
      row.scriptSavedAt?.toISOString() ??
      (hasContent ? row.writingSavedAt.toISOString() : null),
  };
}

export async function getContentScript(
  userId: string,
  contentId: string,
  variantId: string,
): Promise<ContentScriptView | null> {
  const row = await prisma.contentVariant.findFirst({
    where: { id: variantId, contentId, userId },
    include: { content: { select: { title: true, archivedAt: true } } },
  });
  if (!row) return null;
  return {
    contentId,
    variantId,
    contentTitle: row.content.title,
    variantName: row.name,
    returnHref: `/content/${contentId}?variant=${encodeURIComponent(variantId)}`,
    document:
      row.scriptDocument === null
        ? scriptDocumentFromText(row.script)
        : validateScriptDocument(row.scriptDocument),
    scriptVersion: row.scriptVersion,
    savedAt:
      row.scriptSavedAt?.toISOString() ??
      (row.script.trim() ? row.writingSavedAt.toISOString() : null),
    readOnly: Boolean(row.archivedAt || row.content.archivedAt),
  };
}
