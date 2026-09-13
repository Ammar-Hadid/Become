import { seasonDraftSchema } from "@/features/seasons/schemas/season.schema";
import { emptySeasonDraft } from "@/features/seasons/utils/season-calendar.util";

/** Historical JSON is left intact; deprecated inputs never escape into active contracts. */
export function seasonCharacter(value: unknown) {
  const row =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const defaults = emptySeasonDraft().character;
  const keys = Object.keys(seasonDraftSchema.shape.character.shape);
  const active = Object.fromEntries(
    Object.entries(row).filter(([key]) => keys.includes(key)),
  );
  return seasonDraftSchema.shape.character.parse({ ...defaults, ...active });
}
