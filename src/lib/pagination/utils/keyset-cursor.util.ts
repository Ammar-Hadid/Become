import { z } from "zod";
const cursorSchema = z.tuple([
  z.iso.datetime({ offset: true }),
  z.string().min(1).max(100),
]);
export function encodeCursor(at: Date, id: string) {
  return Buffer.from(JSON.stringify([at.toISOString(), id])).toString(
    "base64url",
  );
}
export function decodeCursor(cursor?: string) {
  if (!cursor) return null;
  const value = z.string().max(500).parse(cursor);
  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(value, "base64url").toString());
  } catch {
    decoded = null;
  }
  const [at, id] = cursorSchema.parse(decoded);
  return { at: new Date(at), id };
}
