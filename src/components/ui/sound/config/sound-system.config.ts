/** Edit sound assignments and playback levels here; the recipe catalog owns each cue. */
export const SOUND_EVENT_CUES = {
  controlConfirmed: "pulse-pin",
  layerOpened: "aperture",
  areaEntered: "horizon",
  returned: "gravity",
  saveConfirmed: "soft-ascent",
  attentionArrived: "pending-line",
  actionBlocked: "red-offset",
  focusStarted: "ignition",
  focusResumed: "ignition",
  focusPaused: "hold",
  focusFinished: "closure",
  seasonMilestone: "season-seal",
  cotsAnswerReady: "thought-arrives",
} as const;

export type SoundEvent = keyof typeof SOUND_EVENT_CUES;

export const SOUND_SYSTEM_CONFIG = {
  storageKey: "become.interface-sound.v1",
  defaultEnabled: true,
  /** 0–1; the Web Audio renderer applies its own safe output ceiling. */
  volume: 0.55,
  minimumGapMs: 90,
  attentionGapMs: 3000,
} as const;
