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
import { discoverCots } from "@/features/seasons/discovery/services/cots-discovery.service";
import {
  selectCotsCandidate,
  confirmCotsSelection,
  cotsPreflight,
} from "@/features/seasons/discovery/services/cots-curation.service";
import { importCotsSelection } from "@/features/seasons/discovery/services/cots-import.service";
import { saveSeasonQuote } from "@/features/seasons/media/services/season-media.service";
import {
  seasonMediaCommand,
  quoteDraftSchema,
} from "@/features/seasons/media/schemas/season-media.schema";
import {
  getCotsLibrary,
  changeCotsMediaUse,
  changeCotsQuoteUse,
} from "@/features/seasons/discovery/services/cots-library.service";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const user = await directionUser(request),
      query = new URL(request.url).searchParams;
    if (query.get("pending") === "1") {
      const jobs = await prisma.seasonCotsSelection.findMany({
        where: {
          userId: user.id,
          OR: [
            { status: "PENDING" },
            { status: "IMPORTING", leaseUntil: { lt: new Date() } },
          ],
          season: { closedAt: null },
        },
        include: { season: { select: { year: true, quarter: true } } },
        orderBy: { createdAt: "asc" },
        take: 20,
      });
      const lease = await prisma.seasonCotsSelection.findFirst({
        where: {
          userId: user.id,
          status: "IMPORTING",
          leaseUntil: { gt: new Date() },
          season: { closedAt: null },
        },
        select: { leaseUntil: true },
        orderBy: { leaseUntil: "asc" },
      });
      return directionResponse({
        jobs: jobs.map((v) => ({ ...v.season, selectionId: v.id })),
        nextWakeAt: lease?.leaseUntil?.toISOString() ?? null,
      });
    }
    const c = seasonIdentitySchema.parse({
      year: Number(query.get("year")),
      quarter: Number(query.get("quarter")),
    });
    if (query.get("library") === "1")
      return directionResponse(
        await getCotsLibrary(user.id, c.year, c.quarter),
      );
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
      case "IDENTITY":
        result = await saveCotsIdentity(user.id, input);
        break;
      case "SUGGEST_IDENTITY":
        result = await suggestCotsIdentity(input);
        break;
      case "DISCOVER":
        result = await discoverCots(user.id, input);
        break;
      case "SELECT":
        result = await selectCotsCandidate(user.id, input);
        break;
      case "CONFIRM":
        result = await confirmCotsSelection(user.id, input);
        break;
      case "IMPORT":
        result = await importCotsSelection(user.id, input);
        break;
      case "RETRY":
        result = await importCotsSelection(user.id, input, true);
        break;
      case "PREFLIGHT":
        result = await cotsPreflight(user.id, input);
        break;
      case "REUSE_IMAGE":
      case "MEDIA_PREFERENCES":
        result = await changeCotsMediaUse(user.id, input);
        break;
      case "QUOTE_PREFERENCES":
        result = await changeCotsQuoteUse(user.id, input);
        break;
      case "MANUAL_TEXT": {
        const c = seasonMediaCommand
          .omit({ expectedVersion: true })
          .extend({
            expectedSelectionRevision: z.number().int().min(0),
            draft: quoteDraftSchema,
          })
          .parse(input);
        await saveSeasonQuote(
          user.id,
          { ...c, expectedVersion: 0 },
          c.expectedSelectionRevision,
        );
        result = await getCotsCollection(user.id, c.year, c.quarter);
        break;
      }
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
    if (!["DISCOVER", "SUGGEST_IDENTITY", "SELECT"].includes(input.action)) {
      revalidatePath("/direction", "layout");
      revalidatePath("/");
    }
    return directionResponse(result);
  } catch (error) {
    return directionFailure(error);
  }
}
