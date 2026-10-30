import type { ComponentMeta } from "../types/component-meta.types";

export const seasonPreparationComponentMeta = {
  component: {
    name: "SeasonPreparationProgress",
    category: "organisms",
    type: "interactive",
    description:
      "Focus preparation approved 26 October 2026: character identity, one arriving paragraph, full-draft drawer and compact timing/recovery controls.",
    path: "src/components/ui/season-preparation/season-preparation.component.tsx",
  },
  props: {
    name: {
      type: "string",
      required: true,
      description: "Actual selected character name.",
    },
    sourceWork: {
      type: "string",
      required: false,
      description: "Selected source or edition.",
    },
    portraitHref: {
      type: "string | null",
      required: false,
      description:
        "Actual saved character image; missing or failed images are omitted.",
    },
    status: {
      type: "string",
      required: true,
      description: "Feature-owned status; FAILED and PAUSED expose recovery.",
    },
    progress: {
      type: "PreparationProgress | null",
      required: false,
      description:
        "Attempt, start time, phase, complete paragraphs and optional measured estimate.",
    },
    error: {
      type: "string | null",
      required: false,
      description:
        "Safe error details; reconnecting status while otherwise running.",
    },
    busy: {
      type: "boolean",
      required: false,
      description: "Disable command controls during a pending action.",
    },
    paused: {
      type: "boolean",
      required: true,
      description:
        "Pause decorative text motion, separate from generation status.",
    },
    onPause: {
      type: "() => void",
      required: true,
      description: "Feature-owned preparation pause.",
    },
    onResume: {
      type: "() => void",
      required: true,
      description: "Feature-owned resume or explicit retry.",
    },
    onLeave: {
      type: "() => void",
      required: false,
      description: "Save and leave through the feature.",
    },
    titleRef: {
      type: "Ref<HTMLHeadingElement>",
      required: false,
      description: "Stage-navigation focus target.",
    },
  },
  variants: { axes: {}, purpose: {} },
  relationships: {
    commonPartners: [
      "SeasonRitualLayout",
      "AiGeneratedText",
      "LoadingIndicator",
      "Drawer",
      "Tooltip",
      "Button",
    ],
    role: "Show durable preparation progress without implying approval or activation.",
    keyboardSupport:
      "Native paragraph buttons; full-draft drawer traps focus, closes with Escape and restores focus.",
    screenReader:
      "Character heading, labeled paragraph navigation and one status announcement; no per-word live announcements.",
  },
  tokens: {
    spacing: { layout: "--season-preparation-*; --spacing-*" },
    color: {
      accent: "--color-primary",
      text: "--color-text-primary; --color-text-secondary",
    },
    typography: {
      identity: "type-season-entry-title",
      prose: "AiGeneratedText / type-body-lg",
    },
    motion: {
      text: "Living Ink",
      status: "Orbit Arc",
      drawer: "Precision Light",
    },
  },
  aiHints: {
    priority: "high",
    keywords: ["Season preparation", "Focus", "streaming summary"],
    selectionCriteria: {
      choose:
        "Use for connected Season ASSEMBLING, including paused and failed preparation.",
    },
    usage: {
      useCases: ["Research, arriving summary, final validation and recovery"],
      commonPatterns: [
        {
          name: "Pinned reading",
          composition:
            "Follow newest paragraphs until the reader selects one; keep that selection for the current attempt.",
        },
      ],
      antiPatterns: [
        {
          scenario:
            "Use sample prose, artwork or a fabricated countdown in the real flow.",
          reason: "Presentation is not evidence or a reliability guarantee.",
          alternative:
            "Supply actual saved data and an account-derived range, or show the no-estimate fallback.",
        },
      ],
    },
  },
} satisfies ComponentMeta;
