import "server-only";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { IMAGE_RECIPE_DEFINITIONS } from "../constants/image-direction.constants";
import { getCotsIdentity } from "@/features/seasons/discovery/queries/cots-collection.query";
import { requireImageDirectionOwner } from "../services/image-direction-owner.service";
import { ensureImageDirectionTemplates } from "../services/image-direction-template.service";
import { savedTemplateAuthoring } from "../schemas/image-template-authoring.schema";
import { livingBannerLedgerSchema } from "@/features/seasons/living/schemas/living-character-banner.schema";

export async function getImageDirectionSettings(userId: string) {
  await requireImageDirectionOwner(userId);
  await ensureImageDirectionTemplates(userId);
  const [versions, seasons] = await Promise.all([
    prisma.imageDirectionTemplateVersion.findMany({
      where: { userId },
      orderBy: { version: "desc" },
    }),
    prisma.userSeason.findMany({
      where: { userId, livingPack: { isNot: null } },
      orderBy: [{ year: "desc" }, { quarter: "desc" }],
      select: {
        id: true,
        year: true,
        quarter: true,
        livingPack: {
          select: {
            characterBanner: true,
            references: {
              orderBy: { revision: "desc" },
              take: 1,
              select: { id: true },
            },
            artwork: {
              where: { approvedAt: { not: null } },
              orderBy: { revision: "desc" },
              select: { id: true, chapter: true, state: true, format: true },
            },
          },
        },
      },
    }),
  ]);
  const identities = await Promise.all(
    seasons.map((season) => getCotsIdentity(userId, season.id)),
  );
  return {
    templates: IMAGE_RECIPE_DEFINITIONS.map(({ key, label }) => {
      const history = versions
        .filter((item) => item.key === key)
        .map((item) => ({
          version: item.version,
          text: item.text,
          publishedAt: item.publishedAt?.toISOString() ?? null,
          authoring: savedTemplateAuthoring(item.authoring),
        }));
      return {
        key,
        label,
        published: history.find((item) => item.publishedAt) ?? null,
        draft: history[0] && !history[0].publishedAt ? history[0] : null,
        history,
      };
    }),
    seasons: seasons.map((season, index) => {
      const previews: { key: string; chapter?: number; href: string }[] = [];
      const reference = season.livingPack?.references[0];
      if (reference)
        previews.push({
          key: "reference-sheet",
          href: `/api/direction/seasons/living/reference/${reference.id}`,
        });
      const parsedBanner = livingBannerLedgerSchema.safeParse(
        season.livingPack?.characterBanner,
      );
      const banner = parsedBanner.success
        ? parsedBanner.data.revisions.at(-1)
        : null;
      for (const [key, kind] of [
        ["banner-desktop", "desktop"],
        ["banner-phone", "phone"],
        ["portrait", "avatar"],
      ] as const) {
        if (banner?.[kind])
          previews.push({
            key,
            href: `/api/direction/seasons/living/banner/${season.year}/${season.quarter}/${banner.revision}/${kind}`,
          });
      }
      const seenScenes = new Set<string>();
      for (const art of season.livingPack?.artwork ?? []) {
        const key = `scene-chapter-${art.chapter}-${art.state.toLowerCase().replaceAll("_", "-")}-${art.format.toLowerCase()}`;
        const slot = `${key}:${art.chapter}`;
        if (seenScenes.has(slot)) continue;
        seenScenes.add(slot);
        previews.push({
          key,
          chapter: art.chapter,
          href: `/api/direction/seasons/living/artwork/${art.id}`,
        });
      }
      return {
        year: season.year,
        quarter: season.quarter,
        label: `${identities[index]?.view.displayName ?? "Unselected character"} · ${season.year} Q${season.quarter}`,
        previews,
      };
    }),
  };
}
