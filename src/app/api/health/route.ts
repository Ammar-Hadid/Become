import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db/adapters/prisma.adapter";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const commit = (
      await readFile(path.join(process.cwd(), "RELEASE_COMMIT"), "utf8")
    ).trim();
    if (!/^[0-9a-f]{40}$/.test(commit))
      throw new Error("Invalid release metadata");
    return Response.json(
      { status: "ok", commit },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
