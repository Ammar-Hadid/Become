import { readOfficialTrialReport } from "@/features/design-review/character-references/trial-report.service";
export const runtime = "nodejs";
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production")
    return new Response(null, { status: 404 });
  const query = new URL(request.url).searchParams;
  const characterId = Number(query.get("characterId")),
    workId = Number(query.get("workId"));
  const report = await readOfficialTrialReport().catch(() => null);
  const character = report?.characters.find(
    (row) =>
      row.characterId === characterId &&
      row.works.some((work) => work.id === workId),
  );
  if (!character)
    return Response.json(
      { error: "This trial has no retrieved character/version record." },
      { status: 404 },
    );
  return Response.json(
    {
      references:
        character.workId === workId
          ? character.references.filter((ref) => ref.group === "From the show")
          : [],
      warnings:
        character.workId === workId
          ? character.warnings
          : [
              "This version is outside the three-character source trial. Add authentic references manually.",
            ],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
