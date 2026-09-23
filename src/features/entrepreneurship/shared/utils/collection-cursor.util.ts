export type CollectionCursor = { date: Date; id: string };

export function readCollectionCursor(value?: string): CollectionCursor | null {
  if (!value || value.length > 1000) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString());
    if (
      typeof parsed.id !== "string" ||
      parsed.id.length > 100 ||
      typeof parsed.date !== "string"
    )
      return null;
    const date = new Date(parsed.date);
    return Number.isFinite(date.getTime()) ? { date, id: parsed.id } : null;
  } catch {
    return null;
  }
}

export function writeCollectionCursor(value: CollectionCursor): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function collectionSearch(value?: string): string | null {
  const query = value?.trim().slice(0, 200);
  return query ? `%${query.replace(/[\\%_]/g, "\\$&")}%` : null;
}
