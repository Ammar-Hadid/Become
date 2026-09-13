import { Prisma } from "@/generated/prisma/client";

/** SQL counterpart of calculateSessionMilliseconds; bounds and instants stay parameters. */
export function sessionFocusedSecondsSql(
  alias: "s" | "session" = "s",
  range?: { start: Date | Prisma.Sql; end: Date | Prisma.Sql },
  now = new Date(),
) {
  const s = alias === "s" ? Prisma.sql`s` : Prisma.sql`session`;
  const start = range
    ? Prisma.sql`GREATEST(${s}."startedAt",${range.start})`
    : Prisma.sql`${s}."startedAt"`;
  const end = Prisma.sql`LEAST(COALESCE(${s}."endedAt",${now}),${now}${range ? Prisma.sql`,${range.end}` : Prisma.empty})`;
  return Prisma.sql`FLOOR(GREATEST(0, EXTRACT(EPOCH FROM (${end}-${start})) - COALESCE((
    SELECT SUM(GREATEST(0, EXTRACT(EPOCH FROM (LEAST(COALESCE(p."endedAt",${end}),${end})-GREATEST(p."startedAt",${start})))))
    FROM session_pause p WHERE p."sessionId"=${s}.id
  ),0)))`;
}
