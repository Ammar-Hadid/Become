import { livingArtworkSlots } from "@/features/seasons/living/utils/living-artwork-prompt.util";
import type { LivingSeasonFacts } from "@/features/seasons/living/types/living-season.types";
type SlotKey = { chapter: number; state: string; format: string };

export type ArtworkRecord = SlotKey & {
  id: string;
  revision: number;
  width?: number;
  height?: number;
  identityId: string;
  briefRevision: number;
  approvedAt: Date | null;
  sceneAttemptId?: string | null;
  focalX?: number;
  focalY?: number;
};

export function slotKey(slot: SlotKey) {
  return `${slot.chapter}:${slot.state}:${slot.format}`;
}

export function currentArtwork(
  rows: ArtworkRecord[],
  identityId: string,
  briefRevision: number,
  sceneAttemptId?: string | null,
) {
  const current = rows.filter(
    (row) =>
      row.identityId === identityId &&
      row.briefRevision === briefRevision &&
      (sceneAttemptId === undefined ||
        (row.sceneAttemptId ?? null) === sceneAttemptId),
  );
  const latest = new Map<string, ArtworkRecord>();
  const approved = new Map<string, ArtworkRecord>();
  for (const row of current) {
    const key = slotKey(row);
    if (!latest.has(key) || latest.get(key)!.revision < row.revision)
      latest.set(key, row);
    if (
      row.approvedAt &&
      (!approved.has(key) || approved.get(key)!.revision < row.revision)
    )
      approved.set(key, row);
  }
  return {
    latest,
    approved,
    missingForActivation: livingArtworkSlots.filter(
      (slot) => !latest.get(slotKey(slot))?.approvedAt,
    ),
  };
}

export function selectLivingScene(
  approved: Map<string, ArtworkRecord>,
  facts: Pick<LivingSeasonFacts, "chapter" | "state">,
) {
  const state =
    facts.state === "INSUFFICIENT_EVIDENCE" ? "NEUTRAL" : facts.state;
  const desktop = approved.get(
    slotKey({ chapter: facts.chapter, state, format: "DESKTOP" }),
  );
  const mobile = approved.get(
    slotKey({ chapter: facts.chapter, state, format: "MOBILE" }),
  );
  const fallbackDesktop = approved.get(
    slotKey({ chapter: 1, state: "NEUTRAL", format: "DESKTOP" }),
  );
  const fallbackMobile = approved.get(
    slotKey({ chapter: 1, state: "NEUTRAL", format: "MOBILE" }),
  );
  if (!desktop || !mobile || !fallbackDesktop || !fallbackMobile) return null;
  return { desktop, mobile, fallbackDesktop, fallbackMobile };
}
