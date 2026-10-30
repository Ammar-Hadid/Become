export const CHARACTER_WORKSPACE_SECTIONS = [
  {
    id: "sources",
    label: "Source material",
    singular: "source",
    description:
      "Add canonical sources to ground the character in reviewed material.",
    explanation:
      "Sources anchor the character's voice and canon in material you can review. A citation makes a claim traceable; it does not verify that claim for you.",
    influence: {
      percent: 100,
      label: "Foundational",
      detail: "The evidence layer behind every sourced voice and canon detail.",
    },
    points: [
      "Gives speech and canon details a traceable source",
      "Keeps character responses tied to reviewed material",
    ],
  },
  {
    id: "speechPatterns",
    label: "Speech patterns",
    singular: "pattern",
    description:
      "Describe how the character chooses words and structures replies.",
    explanation:
      "Speech patterns describe the habits that make a reply sound like this character: pacing, word choice, and how they react to uncertainty.",
    influence: {
      percent: 100,
      label: "Voice-defining",
      detail: "Shapes phrasing across almost every C.O.T.S. reply.",
    },
    points: [
      "Guides sentence shape and characteristic wording",
      "Keeps the voice recognizable without changing facts",
    ],
  },
  {
    id: "signaturePhrases",
    label: "Signature phrases",
    singular: "phrase",
    description: "Keep a small collection of verified recurring language.",
    explanation:
      "Verified recurring phrases add a familiar accent when they fit. They should never become a script or appear in every reply.",
    influence: {
      percent: 40,
      label: "Occasional accent",
      detail: "Adds recognizable wording sparingly, when context fits.",
    },
    points: [
      "Adds occasional recognizable language",
      "Never forces a catchphrase or invents a quotation",
    ],
  },
  {
    id: "canonReferences",
    label: "Canon references",
    singular: "reference",
    description:
      "Record relationships and events C.O.T.S may mention accurately.",
    explanation:
      "Canon references let C.O.T.S. mention relationships and events naturally when they fit the conversation. Every detail needs a source.",
    influence: {
      percent: 60,
      label: "Contextual",
      detail: "Enriches relevant moments without steering every reply.",
    },
    points: [
      "Supports natural references to people and events",
      "Keeps those references tied to cited material",
    ],
  },
] as const;

export type CharacterWorkspaceSectionId =
  (typeof CHARACTER_WORKSPACE_SECTIONS)[number]["id"];
