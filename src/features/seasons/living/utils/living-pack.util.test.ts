import { expect, it } from "vitest";
import { currentArtwork, selectLivingScene } from "./living-pack.util";
import { livingArtworkSlots } from "./living-artwork-prompt.util";

it("requires the latest revision of every desktop and phone slot to be approved", () => {
  const approvedAt = new Date("2026-10-01T12:00:00Z");
  const rows = livingArtworkSlots.map((slot, index) => ({ ...slot, id: String(index), revision: 1, identityId: "goku", briefRevision: 1, approvedAt: approvedAt as Date | null }));
  expect(currentArtwork(rows, "goku", 1).missingForActivation).toHaveLength(0);
  rows.push({ ...rows[0], id: "new", revision: 2, approvedAt: null });
  expect(currentArtwork(rows, "goku", 1).missingForActivation).toEqual([livingArtworkSlots[0]]);
  expect(currentArtwork(rows, "other", 1).missingForActivation).toHaveLength(42);
});

it("selects scenery and character as the same chapter/state pair", () => {
  const approvedAt = new Date("2026-10-01T12:00:00Z");
  const rows = livingArtworkSlots.map((slot, index) => ({ ...slot, id: String(index), revision: 1, identityId: "ari", briefRevision: 2, approvedAt }));
  const approved = currentArtwork(rows, "ari", 2).approved;
  const behind = selectLivingScene(approved, { chapter: 4, state: "FAR_BEHIND" });
  expect(behind?.desktop).toMatchObject({ chapter: 4, state: "FAR_BEHIND", format: "DESKTOP" });
  expect(behind?.mobile).toMatchObject({ chapter: 4, state: "FAR_BEHIND", format: "MOBILE" });
  const unknown = selectLivingScene(approved, { chapter: 4, state: "INSUFFICIENT_EVIDENCE" });
  expect(unknown?.mobile).toMatchObject({ chapter: 4, state: "NEUTRAL", format: "MOBILE" });
});
