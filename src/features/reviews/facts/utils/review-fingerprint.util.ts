import { createHash } from "node:crypto";
/** Key ordering and transport/evaluation timestamps must not defeat content reuse. */
export function reviewFingerprint(value: unknown): string {
  const normalize = (v: unknown): unknown => {
    if (typeof v === "bigint") return v.toString();
    if (v instanceof Date) return v.toISOString();
    if (Array.isArray(v)) return v.map(normalize);
    if (v && typeof v === "object")
      return Object.fromEntries(
        Object.entries(v)
          .filter(([, x]) => x !== undefined)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, x]) => [k, normalize(x)]),
      );
    return v;
  };
  return createHash("sha256")
    .update(JSON.stringify(normalize(value)))
    .digest("hex");
}
export function payloadBytes(value: unknown) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}
