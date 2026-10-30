export type SoundShape = "tap" | "glide" | "chime" | "pulse" | "fall" | "rise";
export type SoundTexture = "glass" | "warm" | "air" | "metal" | "deep";
export type NavigationProfile =
  | "threshold"
  | "aperture"
  | "slipstream"
  | "soft-dock"
  | "phase-lock"
  | "horizon"
  | "relay"
  | "gravity";

export type SoundOption = {
  id: string;
  name: string;
  character: string;
  use: string;
  moment?: string;
  durationMs: number;
  shape: SoundShape;
  texture: SoundTexture;
  notes: number[];
  navigationProfile?: NavigationProfile;
};

export type SoundCategory = {
  id: string;
  number: string;
  name: string;
  purpose: string;
  examples: string;
  restraint: string;
  recommended: string;
  minimum: number;
  maximum: number;
  options: SoundOption[];
};
