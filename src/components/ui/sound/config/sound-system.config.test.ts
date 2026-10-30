import { describe, expect, it } from "vitest";
import { allSoundOptions, chosenSoundIds } from "../constants/sound-catalog.constants";
import { SOUND_EVENT_CUES } from "./sound-system.config";

describe("approved interface sound assignments", () => {
  it("only assigns approved, existing recipes", () => {
    const existing = new Set(allSoundOptions.map((option) => option.id));
    const approved = new Set(chosenSoundIds);
    for (const cue of Object.values(SOUND_EVENT_CUES)) {
      expect(existing.has(cue)).toBe(true);
      expect(approved.has(cue)).toBe(true);
    }
  });

  it("gives opening, area entry, and return distinct cues", () => {
    expect(new Set([
      SOUND_EVENT_CUES.layerOpened,
      SOUND_EVENT_CUES.areaEntered,
      SOUND_EVENT_CUES.returned,
    ]).size).toBe(3);
  });
});
