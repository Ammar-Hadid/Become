import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  readOfficialTrialReport,
  trialDirectory,
} from "@/features/design-review/character-references/trial-report.service";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (process.env.NODE_ENV === "production")
    return new Response(null, { status: 404 });
  const { id } = await params;
  if (!/^[a-f0-9]{64}$/.test(id)) return new Response(null, { status: 404 });
  const report = await readOfficialTrialReport().catch(() => null);
  if (
    !report?.characters.some((row) =>
      row.references.some(
        (ref) => ref.id === id && ref.group === "From the show",
      ),
    )
  )
    return new Response(null, { status: 404 });
  const bytes = await readFile(
    resolve(trialDirectory, "images", `${id}.webp`),
  ).catch(() => null);
  if (!bytes) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
