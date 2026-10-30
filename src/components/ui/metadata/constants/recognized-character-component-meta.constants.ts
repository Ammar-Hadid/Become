import type { ComponentMeta } from "../types/component-meta.types";
export const recognizedCharacterComponentMeta = {
  component: {
    name: "RecognizedCharacter",
    category: "molecules",
    type: "display",
    description:
      "Compact inline character recognition approved 16 October 2026, replacing connected onboarding's separate confirmation step.",
    path: "src/components/ui/recognized-character/recognized-character.component.tsx",
  },
  props: {
    name: {
      type: "string",
      required: true,
      description: "Catalogue or saved character name.",
    },
    sourceWork: {
      type: "string",
      required: true,
      description: "Selected edition title.",
    },
    adaptation: {
      type: "string",
      required: true,
      description: "Selected medium and available year.",
    },
    reference: {
      type: "RecognitionImage",
      required: false,
      description:
        "Optional picture with source link; missing/loading/failed pictures never block continuation.",
    },
    actions: {
      type: "ReactNode",
      required: true,
      description:
        "Shared Change character and Change version buttons, with feature-owned callbacks and busy state.",
    },
  },
  variants: { axes: {}, purpose: {} },
  relationships: {
    commonPartners: ["VersionDrawer", "Button", "SeasonRitualLayout"],
    role: "Quiet identity context; never source-image approval.",
    keyboardSupport:
      "Native source link and shared buttons. Edition drawer supports Escape and returns focus to its trigger.",
    screenReader:
      "Named Recognized character section and picture status. Real name, source and edition remain text.",
  },
  tokens: {
    spacing: {
      picture:
        "--recognition-picture-width; --recognition-picture-height; --recognition-picture-width-mobile; --recognition-picture-height-mobile",
      gap: "--spacing-sm; --spacing-lg; --spacing-md",
    },
    color: { picture: "--color-background" },
  },
  aiHints: {
    priority: "high",
    keywords: ["character recognition", "inline identity", "change version"],
    selectionCriteria: {
      choose: "Use inside onboarding World & mood and Summary.",
    },
    usage: {
      useCases: ["Character recognized without a separate confirmation screen"],
      commonPatterns: [
        {
          name: "Correction",
          composition:
            "Feature-owned character lookup; VersionDrawer groups real editions by medium with cover and year.",
        },
      ],
      antiPatterns: [
        {
          scenario:
            "Treat the picture or Continue as source likeness approval.",
          reason:
            "Generation still requires explicit review of authentic originals.",
          alternative:
            "Review originals at the summary gate before image preparation.",
        },
      ],
    },
  },
} satisfies ComponentMeta;
export const versionDrawerComponentMeta = {
  ...recognizedCharacterComponentMeta,
  component: {
    name: "VersionDrawer",
    category: "organisms",
    type: "interactive",
    description:
      "Approved source/adaptation drawer: real editions grouped by medium, with cover, year and selected state.",
    path: "src/components/ui/recognized-character/version-drawer.component.tsx",
  },
  props: {
    open: {
      type: "boolean",
      required: true,
      description: "Feature-owned visibility.",
    },
    works: {
      type: "CharacterEdition[]",
      required: true,
      description:
        "Catalogue-backed edition IDs, titles, media, optional covers and years.",
    },
    selected: {
      type: "number",
      required: true,
      description: "Current edition ID.",
    },
    onSelect: {
      type: "(id: number) => void",
      required: true,
      description: "Feature-owned selection and invalidation.",
    },
    onClose: {
      type: "() => void",
      required: true,
      description: "Close without changing selection.",
    },
    trigger: {
      type: "RefObject<HTMLButtonElement | null>",
      required: true,
      description: "Focus return target.",
    },
  },
} satisfies ComponentMeta;
