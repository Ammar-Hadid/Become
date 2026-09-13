import { seasonDraftSchema } from "@/features/seasons/schemas/season.schema";
import type { SeasonDraft } from "@/features/seasons/types/season.types";
import type { ReusableEntityOption } from "@/components/ui/forms/reusable-entity-combobox.component";

export type OpeningRecovery = {
  draft: SeasonDraft;
  primary: ReusableEntityOption | null;
  supporting: ReusableEntityOption[];
  supportNotes: Record<string, string>;
};
const key = (seasonId: string) => `become:opening-deferred:${seasonId}`;

export function rememberOpeningPause(
  seasonId: string | null,
  recovery: OpeningRecovery | null,
  notice: string,
) {
  if (!seasonId) return;
  try {
    sessionStorage.setItem(key(seasonId), JSON.stringify({ recovery, notice }));
  } catch {
    /* The return URL still prevents immediate entry if storage is unavailable. */
  }
  window.dispatchEvent(new Event("become:season-transition-suppressed"));
}

export function readOpeningPause(seasonId: string | null): {
  recovery: OpeningRecovery | null;
  notice: string | null;
} {
  if (!seasonId) return { recovery: null, notice: null };
  try {
    const parsed: unknown = JSON.parse(
      sessionStorage.getItem(key(seasonId)) ?? "null",
    );
    if (!parsed || typeof parsed !== "object")
      return { recovery: null, notice: null };
    const value = parsed as {
      notice?: unknown;
      recovery?: Partial<OpeningRecovery>;
    };
    const notice = typeof value.notice === "string" ? value.notice : null;
    const draft = seasonDraftSchema.safeParse(value.recovery?.draft);
    const isOption = (option: unknown): option is ReusableEntityOption =>
      Boolean(
        option &&
        typeof option === "object" &&
        "id" in option &&
        typeof option.id === "string" &&
        "name" in option &&
        typeof option.name === "string",
      );
    if (
      !draft.success ||
      !value.recovery ||
      !Array.isArray(value.recovery.supporting) ||
      !value.recovery.supporting.every(isOption) ||
      (value.recovery.primary !== null && !isOption(value.recovery.primary)) ||
      !value.recovery.supportNotes ||
      typeof value.recovery.supportNotes !== "object" ||
      Object.values(value.recovery.supportNotes).some(
        (note) => typeof note !== "string",
      )
    )
      return { recovery: null, notice };
    return {
      notice,
      recovery: {
        draft: draft.data,
        primary: value.recovery.primary,
        supporting: value.recovery.supporting,
        supportNotes: value.recovery.supportNotes,
      },
    };
  } catch {
    return { recovery: null, notice: null };
  }
}
