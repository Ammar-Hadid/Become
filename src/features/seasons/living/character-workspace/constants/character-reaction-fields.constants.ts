export const CHARACTER_REACTION_FIELDS = [
  { id: "responseToSuccess", label: "Reaction to success", limit: 800 },
  { id: "responseToSetback", label: "Reaction to setback", limit: 800 },
  { id: "responseToRecovery", label: "Reaction to recovery", limit: 800 },
  {
    id: "visualDirection",
    label: "Visual identity and expressions",
    limit: 2000,
  },
  { id: "visualBoundaries", label: "Visual boundaries", limit: 1500 },
] as const;

export type CharacterReactionFieldId =
  (typeof CHARACTER_REACTION_FIELDS)[number]["id"];
