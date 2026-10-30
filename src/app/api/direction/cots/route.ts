import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  directionUser,
  directionFailure,
  directionJson,
  directionResponse,
} from "@/features/direction/services/direction-http.service";
import {
  DirectionError,
  jsonValue,
} from "@/features/direction/services/direction-mutation.service";
import { seasonIdentitySchema } from "@/features/seasons/schemas/season.schema";
import {
  emptySeasonDraft,
  seasonCalendar,
} from "@/features/seasons/utils/season-calendar.util";
import { lockSeason } from "@/features/seasons/services/season.service";
import { getCotsCollection } from "@/features/seasons/discovery/queries/cots-collection.query";
import { saveCotsIdentity } from "@/features/seasons/discovery/services/cots-identity.service";
import { suggestCotsIdentity } from "@/features/seasons/discovery/services/cots-suggestion.service";
import { lookupCharacter, getCharacterCandidate, getCharacterWithImages } from "@/features/seasons/discovery/services/character-lookup.service";
import { importCharacterReference } from "@/features/seasons/living/services/living-source-image.service";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const user = await directionUser(request),
      query = new URL(request.url).searchParams;
    const c = seasonIdentitySchema.parse({
      year: Number(query.get("year")),
      quarter: Number(query.get("quarter")),
    });
    return directionResponse(
      await getCotsCollection(user.id, c.year, c.quarter),
    );
  } catch (error) {
    return directionFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = await directionUser(request, true);
    const input = z
      .object({ action: z.string() })
      .passthrough()
      .parse(await directionJson(request));
    let result: unknown;
    switch (input.action) {
      case "LOOKUP_CHARACTER":
        result = await lookupCharacter(input);
        break;
      case "CHARACTER_RECORD":
        result = await getCharacterCandidate(z.object({ candidateId: z.string() }).parse(input).candidateId);
        break;
      case "CHARACTER_IMAGES":
        result = await getCharacterWithImages(z.object({ candidateId: z.string() }).parse(input).candidateId);
        break;
      case "CONFIRM_CHARACTER": {
        const selected = seasonIdentitySchema.extend({ candidateId: z.string(), workId: z.number().int(), expectedIdentityRevision: z.number().int().min(0), association: z.enum(["SAME", "NEW"]).optional() }).parse(input);
        const candidate = await getCharacterCandidate(selected.candidateId);
        const work = candidate.works.find((item) => item.id === selected.workId);
        if (!work) throw new DirectionError("Choose a retrieved character adaptation.");
        const collection = await saveCotsIdentity(user.id, { ...selected, displayName: candidate.name, sourceCategory: work.adaptation === "Manga" ? "comic" : "anime", sourceWork: work.title, adaptation: work.adaptation, externalId: candidate.id });
        let referenceNotice: string | null = null;
        try { await importCharacterReference(user.id, selected); } catch (cause) { referenceNotice = cause instanceof Error ? cause.message : "The reference could not be imported. Upload it in References."; }
        result = { collection, referenceNotice };
        break;
      }
      case "IDENTITY":
        result = await saveCotsIdentity(user.id, input);
        break;
      case "SUGGEST_IDENTITY":
        result = await suggestCotsIdentity(input);
        break;
      case "DEFER_OPENING": {
        const c = seasonIdentitySchema.parse(input);
        const calendar = seasonCalendar(c.year, c.quarter);
        if (["UPCOMING", "ENDED"].includes(calendar.phase))
          throw new DirectionError("Only the current season can be deferred.");
        await prisma.$transaction(async (tx) => {
          const row = await lockSeason(tx, user.id, c.year, c.quarter);
          if (row?.openingCompletedAt || row?.closedAt) return;
          if (row)
            await tx.userSeason.update({
              where: { id: row.id },
              data: { openingDeferredAt: new Date() },
            });
          else {
            const draft = emptySeasonDraft();
            await tx.userSeason.create({
              data: {
                userId: user.id,
                ...c,
                openingDeferredAt: new Date(),
                character: jsonValue(draft.character),
                answers: jsonValue(draft.answers),
              },
            });
          }
        });
        result = { deferred: true };
        break;
      }
      default:
        throw new DirectionError("This curation action is not available.");
    }
    if (!["SUGGEST_IDENTITY", "LOOKUP_CHARACTER", "CHARACTER_IMAGES", "CHARACTER_RECORD"].includes(input.action)) {
      revalidatePath("/direction", "layout");
      revalidatePath("/");
    }
    return directionResponse(result);
  } catch (error) {
    return directionFailure(error);
  }
}
