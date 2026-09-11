import { prisma } from "@/lib/db/adapters/prisma.adapter";
import {
  DirectionError,
  jsonValue,
  requireVersion,
} from "@/features/direction/services/direction-mutation.service";
import { lockSeason } from "@/features/seasons/services/season.service";
import { cotsIdentityCommand } from "@/features/seasons/discovery/schemas/cots-discovery.schema";
import {
  cotsCategory,
  COTS_CATEGORY_VERSION,
} from "@/features/seasons/discovery/constants/cots-category.constants";
import {
  getCotsCollection,
  getCotsIdentity,
} from "@/features/seasons/discovery/queries/cots-collection.query";
import { emptySeasonDraft } from "@/features/seasons/utils/season-calendar.util";
export async function saveCotsIdentity(userId: string, input: unknown) {
  const c = cotsIdentityCommand.parse(input);
  await prisma.$transaction(async (tx) => {
    const season = await lockSeason(tx, userId, c.year, c.quarter);
    if (!season || season.closedAt)
      throw new DirectionError(
        "Save an editable season opening before choosing your inspiration.",
      );
    const active = await getCotsIdentity(userId, season.id, tx);
    requireVersion(active?.row.revision ?? 0, c.expectedIdentityRevision);
    const nameChanged =
      active &&
      active.row.displayName.toLocaleLowerCase() !==
        c.displayName.toLocaleLowerCase();
    const priorContext =
      active && c.association !== "NEW" ? active.row.contexts[0] : null;
    const sourceEntityId =
      c.externalId ??
      (!nameChanged && c.association !== "NEW"
        ? priorContext?.sourceEntityId
        : null) ??
      null;
    const contextChanged =
      !priorContext ||
      priorContext.category !== c.sourceCategory ||
      priorContext.sourceWork !== c.sourceWork ||
      priorContext.adaptation !== c.adaptation ||
      priorContext.language !== c.language ||
      priorContext.sourceEntityId !== sourceEntityId ||
      nameChanged;
    if (nameChanged && !c.association)
      throw new DirectionError(
        "Confirm whether this is the same inspiration or a new identity. Existing collections will be preserved.",
        "association",
        409,
      );
    if (active && c.association === "NEW")
      await tx.seasonCotsIdentity.update({
        where: { id: active.row.id },
        data: { active: false },
      });
    const identity =
      !active || c.association === "NEW"
        ? await tx.seasonCotsIdentity.create({
            data: {
              userId,
              seasonId: season.id,
              displayName: c.displayName,
              subjectKind: cotsCategory(c.sourceCategory)!.subjectKind,
            },
          })
        : await tx.seasonCotsIdentity.update({
            where: { id: active.row.id },
            data: {
              displayName: c.displayName,
              subjectKind: cotsCategory(c.sourceCategory)!.subjectKind,
              ...(contextChanged ? { revision: { increment: 1 } } : {}),
            },
          });
    if (contextChanged) {
      await tx.seasonCotsContext.create({
        data: {
          userId,
          identityId: identity.id,
          revision: (priorContext?.revision ?? 0) + 1,
          category: c.sourceCategory,
          registryVersion: COTS_CATEGORY_VERSION,
          sourceWork: c.sourceWork,
          adaptation: c.adaptation,
          language: c.language,
          sourceEntityId,
        },
      });
    }
    // Deliberate confirmation changes the identity record, not the autosave version.
    // Draft writes reconcile these identity-owned fields before committing.
    await tx.userSeason.update({
      where: { id: season.id },
      data: {
        character: jsonValue({
          ...emptySeasonDraft().character,
          ...(season.character as object),
          name: c.displayName,
          sourceCategory: c.sourceCategory,
          sourceWork: c.sourceWork,
          adaptation: c.adaptation,
        }),
      },
    });
    if (!active) {
      await tx.seasonMediaUse.updateMany({
        where: { userId, seasonId: season.id, identityId: null },
        data: { identityId: identity.id },
      });
      await tx.seasonQuote.updateMany({
        where: { userId, seasonId: season.id, identityId: null },
        data: { identityId: identity.id },
      });
    }
  });
  return getCotsCollection(userId, c.year, c.quarter);
}
